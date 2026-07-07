import { Request, Response } from 'express';
import { z } from 'zod';
import {
  generateTaskDescription,
  suggestLabels,
  summarizeComments,
  chatWithProjectContext,
  planSprint,
  analyzeProjectRisks,
  generateStandup,
} from '../services/ai.service';
import { Project } from '../models/Project.model';
import { Task } from '../models/Task.model';
import { Comment } from '../models/Comment.model';
import { Sprint } from '../models/Sprint.model';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { redis, RedisKeys, TTL } from '../config/redis';

// Validation schemas
const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1),
    projectId: z.string(),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional(),
  }),
});

const generateDescriptionSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    projectId: z.string(),
  }),
});

const suggestLabelsSchema = z.object({
  body: z.object({
    taskId: z.string(),
    existingLabels: z.array(z.string()),
  }),
});

const summarizeCommentsSchema = z.object({
  body: z.object({
    taskId: z.string(),
  }),
});

const planSprintSchema = z.object({
  body: z.object({
    projectId: z.string(),
    goal: z.string(),
    capacity: z.number().min(1),
  }),
});

const riskAnalysisSchema = z.object({
  body: z.object({
    projectId: z.string(),
  }),
});

const standupSchema = z.object({
  body: z.object({
    projectId: z.string().optional(),
  }),
});

// Chat with AI (streaming)
export const chat = async (req: Request, res: Response): Promise<void> => {
  const { message, projectId, history = [] } = chatSchema.parse(req.body).body;
  const userId = req.userId!;

  // Verify project access
  const project = await Project.findById(projectId)
    .populate('members.user', 'name email avatar')
    .populate('workspace', 'name');

  if (!project || project.isDeleted) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  // Get project context
  const tasks = await Task.find({ project: projectId, isDeleted: false })
    .populate('assignees', 'name email avatar')
    .limit(50);

  const sprints = await Sprint.find({ project: projectId })
    .sort({ createdAt: -1 })
    .limit(10);

  const projectData = {
    projectName: project.name,
    tasks: tasks.map((t) => ({
      taskId: t.taskId,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignees: t.assignees,
    })),
    members: project.members.map((m: any) => ({
      name: m.user?.name || 'Unknown',
      role: m.role,
    })),
    sprints: sprints.map((s) => ({
      name: s.name,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
    })),
  };

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Stream response
  await chatWithProjectContext(
    message,
    projectData,
    history,
    (chunk) => {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    },
    () => {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  );
};

// Generate task description
export const generateDescription = async (req: Request, res: Response): Promise<void> => {
  const { title, projectId } = generateDescriptionSchema.parse(req.body).body;

  const project = await Project.findById(projectId);
  if (!project || project.isDeleted) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  const projectContext = `${project.name} - ${project.description}`;

  const result = await generateTaskDescription(title, projectContext);

  successResponse({
    res,
    data: result,
    message: 'Description generated',
  });
};

// Suggest labels
export const getLabelSuggestions = async (req: Request, res: Response): Promise<void> => {
  const { taskId, existingLabels } = suggestLabelsSchema.parse(req.body).body;

  const task = await Task.findById(taskId);
  if (!task || task.isDeleted) {
    errorResponse({ res, message: 'Task not found', statusCode: 404 });
    return;
  }

  const description = typeof task.description === 'string'
    ? task.description
    : JSON.stringify(task.description);

  const labels = await suggestLabels(task.title, description, existingLabels);

  successResponse({
    res,
    data: labels,
    message: 'Labels suggested',
  });
};

// Summarize comments
export const getCommentsSummary = async (req: Request, res: Response): Promise<void> => {
  const { taskId } = summarizeCommentsSchema.parse(req.body).body;

  const comments = await Comment.find({ task: taskId, isDeleted: false })
    .populate('author', 'name')
    .sort({ createdAt: 1 });

  if (comments.length === 0) {
    successResponse({
      res,
      data: { summary: 'No comments yet', keyPoints: [], decisions: [], actionItems: [] },
      message: 'No comments to summarize',
    });
    return;
  }

  const commentsData = comments.map((c) => ({
    author: (c.author as any)?.name || 'Unknown',
    content: typeof c.content === 'string' ? c.content : JSON.stringify(c.content),
    createdAt: c.createdAt.toISOString(),
  }));

  const summary = await summarizeComments(commentsData);

  successResponse({
    res,
    data: summary,
    message: 'Comments summarized',
  });
};

// Plan sprint
export const planSprintAI = async (req: Request, res: Response): Promise<void> => {
  const { projectId, goal, capacity } = planSprintSchema.parse(req.body).body;

  const project = await Project.findById(projectId).populate('members.user', 'name');
  if (!project || project.isDeleted) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  // Get backlog tasks
  const backlogTasks = await Task.find({
    project: projectId,
    isDeleted: false,
    sprint: null,
    status: { $ne: 'Done' },
  }).limit(50);

  const teamMembers = project.members.map((m: any) => ({
    name: m.user?.name || 'Unknown',
  }));

  const plan = await planSprint(goal, capacity, backlogTasks, teamMembers);

  successResponse({
    res,
    data: plan,
    message: 'Sprint plan generated',
  });
};

// Risk analysis
export const getRiskAnalysis = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = riskAnalysisSchema.parse(req.body).body;

  const project = await Project.findById(projectId);
  if (!project || project.isDeleted) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  const tasks = await Task.find({ project: projectId, isDeleted: false });
  const activeSprint = await Sprint.findOne({ project: projectId, status: 'active' });

  const risks = await analyzeProjectRisks({
    name: project.name,
    tasks,
    activeSprint,
  });

  successResponse({
    res,
    data: risks,
    message: 'Risk analysis complete',
  });
};

// Generate standup
export const getStandup = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = standupSchema.parse(req.body).body;
  const userId = req.userId!;

  // Get user's tasks
  const [completedYesterday, inProgressToday, blockers] = await Promise.all([
    // Completed yesterday
    Task.find({
      assignees: userId,
      completedAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      status: 'Done',
      isDeleted: false,
    }).populate('blockedBy'),
    // In progress today
    Task.find({
      assignees: userId,
      status: { $in: ['In Progress', 'In Review'] },
      isDeleted: false,
    }).populate('blockedBy'),
    // Blocked tasks
    Task.find({
      assignees: userId,
      blockedBy: { $exists: true, $ne: [] },
      isDeleted: false,
    }).populate('blockedBy'),
  ]);

  const standup = await generateStandup(userId!, req.user?.name || 'User', {
    completedYesterday,
    inProgressToday,
    blockers,
  });

  successResponse({
    res,
    data: standup,
    message: 'Standup generated',
  });
};
