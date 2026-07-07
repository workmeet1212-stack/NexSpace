import { Request, Response } from 'express';
import { z } from 'zod';
import { Sprint, ISprint, SprintStatus } from '../models/Sprint.model';
import { Task } from '../models/Task.model';
import { Project } from '../models/Project.model';
import { ActivityLog } from '../models/ActivityLog.model';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { notifySprintStarted, notifySprintCompleted } from '../services/notification.service';

// Validation schemas
const createSprintSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    goal: z.string().max(500).optional(),
    startDate: z.string(),
    endDate: z.string(),
    capacity: z.number().min(0).optional(),
    projectId: z.string(),
  }),
});

const updateSprintSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    goal: z.string().max(500).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    capacity: z.number().min(0).optional(),
  }),
});

// Create sprint
export const createSprint = async (req: Request, res: Response): Promise<void> => {
  const { name, goal, startDate, endDate, capacity, projectId } = createSprintSchema.parse(req.body).body;
  const userId = req.userId!;

  // Check project exists
  const project = await Project.findById(projectId);
  if (!project || project.isDeleted) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  // Check if there's already an active sprint
  const activeSprint = await Sprint.findOne({
    project: projectId,
    status: 'active',
  });

  if (activeSprint) {
    errorResponse({
      res,
      message: 'An active sprint already exists. Complete it first.',
      statusCode: 400,
    });
    return;
  }

  const sprint = new Sprint({
    name,
    goal: goal || '',
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    project: projectId,
    workspace: project.workspace,
    createdBy: userId,
    capacity: capacity || 0,
    status: 'planned',
  });

  await sprint.save();

  successResponse({
    res,
    data: sprint,
    message: 'Sprint created successfully',
    statusCode: 201,
  });
};

// Get sprints by project
export const getSprintsByProject = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;

  const sprints = await Sprint.find({ project: projectId })
    .populate('createdBy', 'name email avatar')
    .sort({ createdAt: -1 });

  // Get task counts for each sprint
  const sprintsWithStats = await Promise.all(
    sprints.map(async (sprint) => {
      const stats = await Task.aggregate([
        {
          $match: {
            sprint: sprint._id,
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] },
            },
            totalPoints: { $sum: '$storyPoints' },
            completedPoints: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Done'] }, '$storyPoints', 0],
              },
            },
          },
        },
      ]);

      const sprintStats = stats[0] || {
        total: 0,
        completed: 0,
        totalPoints: 0,
        completedPoints: 0,
      };

      return {
        ...sprint.toObject(),
        stats: sprintStats,
      };
    })
  );

  successResponse({
    res,
    data: sprintsWithStats,
    message: 'Sprints fetched successfully',
  });
};

// Get sprint by ID
export const getSprintById = async (req: Request, res: Response): Promise<void> => {
  const { sprintId } = req.params;

  const sprint = await Sprint.findById(sprintId)
    .populate('createdBy', 'name email avatar')
    .populate('project', 'name identifier');

  if (!sprint) {
    errorResponse({ res, message: 'Sprint not found', statusCode: 404 });
    return;
  }

  // Get sprint tasks
  const tasks = await Task.find({ sprint: sprintId, isDeleted: false })
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email avatar');

  successResponse({
    res,
    data: { ...sprint.toObject(), tasks },
    message: 'Sprint fetched successfully',
  });
};

// Update sprint
export const updateSprint = async (req: Request, res: Response): Promise<void> => {
  const { sprintId } = req.params;
  const updates = updateSprintSchema.parse(req.body).body;

  const sprint = await Sprint.findById(sprintId);

  if (!sprint) {
    errorResponse({ res, message: 'Sprint not found', statusCode: 404 });
    return;
  }

  if (updates.startDate) updates.startDate = new Date(updates.startDate) as any;
  if (updates.endDate) updates.endDate = new Date(updates.endDate) as any;

  Object.assign(sprint, updates);
  await sprint.save();

  successResponse({
    res,
    data: sprint,
    message: 'Sprint updated successfully',
  });
};

// Start sprint
export const startSprint = async (req: Request, res: Response): Promise<void> => {
  const { sprintId } = req.params;
  const userId = req.userId!;
  const io = req.app.get('io');

  const sprint = await Sprint.findById(sprintId);

  if (!sprint) {
    errorResponse({ res, message: 'Sprint not found', statusCode: 404 });
    return;
  }

  // Check if another sprint is active
  const activeSprint = await Sprint.findOne({
    project: sprint.project,
    status: 'active',
    _id: { $ne: sprintId },
  });

  if (activeSprint) {
    errorResponse({
      res,
      message: 'Another sprint is already active',
      statusCode: 400,
    });
    return;
  }

  sprint.status = 'active';
  await sprint.save();

  // Get project members
  const project = await Project.findById(sprint.project).populate('members.user');

  // Send notifications
  if (project && project.members) {
    const memberIds = project.members.map((m: any) => m.user._id.toString()).filter((id: string) => id !== userId);
    await notifySprintStarted(memberIds, sprint, project);
  }

  // Create activity log
  await ActivityLog.create({
    project: sprint.project,
    task: null,
    user: userId,
    action: 'sprint_started',
    description: `Started sprint "${sprint.name}"`,
    metadata: { sprintId: sprint._id.toString() },
  });

  // Emit socket event
  if (io) {
    io.to(`project:${sprint.project}`).emit('sprint:started', sprint);
  }

  successResponse({
    res,
    data: sprint,
    message: 'Sprint started successfully',
  });
};

// Complete sprint
export const completeSprint = async (req: Request, res: Response): Promise<void> => {
  const { sprintId } = req.params;
  const { moveToSprintId } = req.body;
  const userId = req.userId!;
  const io = req.app.get('io');

  const sprint = await Sprint.findById(sprintId);

  if (!sprint) {
    errorResponse({ res, message: 'Sprint not found', statusCode: 404 });
    return;
  }

  if (sprint.status !== 'active') {
    errorResponse({
      res,
      message: 'Only active sprints can be completed',
      statusCode: 400,
    });
    return;
  }

  // Calculate velocity
  const completedTasks = await Task.find({
    sprint: sprintId,
    status: 'Done',
    isDeleted: false,
  });

  const velocity = completedTasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);

  sprint.status = 'completed';
  sprint.completedAt = new Date();
  sprint.velocity = velocity;
  await sprint.save();

  // Move incomplete tasks
  const incompleteTasks = await Task.find({
    sprint: sprintId,
    status: { $ne: 'Done' },
    isDeleted: false,
  });

  if (incompleteTasks.length > 0) {
    if (moveToSprintId) {
      await Task.updateMany(
        { sprint: sprintId, status: { $ne: 'Done' }, isDeleted: false },
        { $set: { sprint: moveToSprintId } }
      );
    } else {
      // Move to backlog (remove sprint)
      await Task.updateMany(
        { sprint: sprintId, status: { $ne: 'Done' }, isDeleted: false },
        { $set: { sprint: null } }
      );
    }
  }

  // Get project members
  const project = await Project.findById(sprint.project).populate('members.user');

  // Send notifications
  if (project && project.members) {
    const memberIds = project.members.map((m: any) => m.user._id.toString()).filter((id: string) => id !== userId);
    await notifySprintCompleted(memberIds, sprint, project);
  }

  // Create activity log
  await ActivityLog.create({
    project: sprint.project,
    task: null,
    user: userId,
    action: 'sprint_completed',
    description: `Completed sprint "${sprint.name}" with ${velocity} story points`,
    metadata: { sprintId: sprint._id.toString(), velocity },
  });

  // Emit socket event
  if (io) {
    io.to(`project:${sprint.project}`).emit('sprint:completed', sprint);
  }

  successResponse({
    res,
    data: {
      sprint,
      velocity,
      movedTasks: incompleteTasks.length,
    },
    message: 'Sprint completed successfully',
  });
};

// Delete sprint
export const deleteSprint = async (req: Request, res: Response): Promise<void> => {
  const { sprintId } = req.params;

  const sprint = await Sprint.findById(sprintId);

  if (!sprint) {
    errorResponse({ res, message: 'Sprint not found', statusCode: 404 });
    return;
  }

  if (sprint.status === 'active') {
    errorResponse({
      res,
      message: 'Cannot delete an active sprint',
      statusCode: 400,
    });
    return;
  }

  // Remove sprint from tasks
  await Task.updateMany({ sprint: sprintId }, { $set: { sprint: null } });

  await Sprint.findByIdAndDelete(sprintId);

  successResponse({
    res,
    data: null,
    message: 'Sprint deleted successfully',
  });
};

// Get active sprint
export const getActiveSprint = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;

  const sprint = await Sprint.findOne({
    project: projectId,
    status: 'active',
  })
    .populate('createdBy', 'name email avatar');

  if (!sprint) {
    successResponse({
      res,
      data: null,
      message: 'No active sprint',
    });
    return;
  }

  // Get sprint tasks
  const tasks = await Task.find({ sprint: sprint._id, isDeleted: false })
    .populate('assignees', 'name email avatar')
    .sort({ order: 1 });

  successResponse({
    res,
    data: { ...sprint.toObject(), tasks },
    message: 'Active sprint fetched',
  });
};
