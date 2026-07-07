import { Request, Response } from 'express';
import { z } from 'zod';
import { Task, ITask, Priority } from '../models/Task.model';
import { Project } from '../models/Project.model';
import { ActivityLog, ActivityAction } from '../models/ActivityLog.model';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse';
import mongoose from 'mongoose';

// Validation schemas
const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(500),
    description: z.any().optional(),
    status: z.string().default('Todo'),
    priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).default('none'),
    projectId: z.string(),
    assignees: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
    dueDate: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    storyPoints: z.number().min(0).max(100).optional(),
    parentTask: z.string().optional().nullable(),
    sprint: z.string().optional().nullable(),
  }),
});

const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.any().optional(),
    status: z.string().optional(),
    priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
    assignees: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
    dueDate: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    storyPoints: z.number().min(0).max(100).optional(),
    sprint: z.string().optional().nullable(),
  }),
});

const moveTaskSchema = z.object({
  body: z.object({
    newStatus: z.string(),
    newOrder: z.number(),
  }),
});

// Create task
export const createTask = async (req: Request, res: Response): Promise<void> => {
  const taskData = createTaskSchema.parse(req.body).body;
  const userId = req.userId!;
  const io = req.app.get('io');

  // Get project
  const project = await Project.findById(taskData.projectId);
  if (!project || project.isDeleted) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  // Get max order for the status
  const maxOrder = await Task.findOne({
    project: taskData.projectId,
    status: taskData.status,
    isDeleted: false,
  }).sort({ order: -1 });

  const task = new Task({
    ...taskData,
    workspace: project.workspace,
    project: taskData.projectId,
    createdBy: userId,
    order: maxOrder ? maxOrder.order + 1 : 0,
    dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
    startDate: taskData.startDate ? new Date(taskData.startDate) : null,
    assignees: taskData.assignees || [],
    labels: taskData.labels || [],
  });

  await task.save();

  // Populate
  await task.populate('assignees', 'name email avatar');
  await task.populate('createdBy', 'name email avatar');

  // Create activity log
  await ActivityLog.create({
    project: project._id,
    task: task._id,
    user: userId,
    action: 'created',
    description: `Created task "${task.title}"`,
    metadata: { taskId: task.taskId },
  });

  // Emit socket event
  if (io) {
    io.to(`project:${taskData.projectId}`).emit('task:created', task);
  }

  successResponse({
    res,
    data: task,
    message: 'Task created successfully',
    statusCode: 201,
  });
};

// Get tasks
export const getTasks = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;
  const {
    status,
    priority,
    assignee,
    sprint,
    search,
    page = '1',
    limit = '50',
  } = req.query;

  const query: any = {
    project: projectId,
    isDeleted: false,
  };

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (assignee) query.assignees = assignee;
  if (sprint) query.sprint = sprint;

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { taskId: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  const [tasks, total] = await Promise.all([
    Task.find(query)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ order: 1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Task.countDocuments(query),
  ]);

  paginatedResponse({
    res,
    data: tasks,
    page: pageNum,
    limit: limitNum,
    total,
    message: 'Tasks fetched successfully',
  });
};

// Get task by ID
export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId)
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('parentTask', 'taskId title')
    .populate('subTasks', 'taskId title status')
    .populate('sprint', 'name status');

  if (!task || task.isDeleted) {
    errorResponse({ res, message: 'Task not found', statusCode: 404 });
    return;
  }

  successResponse({
    res,
    data: task,
    message: 'Task fetched successfully',
  });
};

// Update task
export const updateTask = async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const updates = updateTaskSchema.parse(req.body).body;
  const userId = req.userId!;
  const io = req.app.get('io');

  const task = await Task.findById(taskId);

  if (!task || task.isDeleted) {
    errorResponse({ res, message: 'Task not found', statusCode: 404 });
    return;
  }

  // Track changes for activity log
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

  if (updates.title && updates.title !== task.title) {
    changes.push({ field: 'title', oldValue: task.title, newValue: updates.title });
  }

  if (updates.status && updates.status !== task.status) {
    changes.push({ field: 'status', oldValue: task.status, newValue: updates.status });
    if (updates.status === 'Done') {
      updates['completedAt'] = new Date();
    }
  }

  if (updates.priority && updates.priority !== task.priority) {
    changes.push({ field: 'priority', oldValue: task.priority, newValue: updates.priority });
  }

  // Apply updates
  Object.keys(updates).forEach((key) => {
    const value = updates[key as keyof typeof updates];
    if (value !== undefined) {
      if (key === 'dueDate' || key === 'startDate') {
        (task as any)[key] = value ? new Date(value) : null;
      } else {
        (task as any)[key] = value;
      }
    }
  });

  await task.save();

  // Create activity logs
  for (const change of changes) {
    await ActivityLog.create({
      project: task.project,
      task: task._id,
      user: userId,
      action: `${change.field}_changed` as ActivityAction,
      description: `Changed ${change.field} from "${change.oldValue}" to "${change.newValue}"`,
      changes: change,
      metadata: { taskId: task.taskId },
    });
  }

  // Populate
  await task.populate('assignees', 'name email avatar');
  await task.populate('createdBy', 'name email avatar');

  // Emit socket event
  if (io) {
    io.to(`project:${task.project}`).emit('task:updated', task);
  }

  successResponse({
    res,
    data: task,
    message: 'Task updated successfully',
  });
};

// Bulk update tasks
export const bulkUpdateTasks = async (req: Request, res: Response): Promise<void> => {
  const { taskIds, updates } = req.body;
  const userId = req.userId!;
  const io = req.app.get('io');

  const result = await Task.updateMany(
    { _id: { $in: taskIds }, isDeleted: false },
    { $set: updates }
  );

  // Get updated tasks
  const tasks = await Task.find({ _id: { $in: taskIds } })
    .populate('assignees', 'name email avatar');

  // Emit socket events
  if (io) {
    tasks.forEach((task) => {
      io.to(`project:${task.project}`).emit('task:updated', task);
    });
  }

  successResponse({
    res,
    data: { modifiedCount: result.modifiedCount },
    message: `${result.modifiedCount} tasks updated`,
  });
};

// Move task (drag and drop)
export const moveTask = async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const { newStatus, newOrder } = moveTaskSchema.parse(req.body).body;
  const userId = req.userId!;
  const io = req.app.get('io');

  const task = await Task.findById(taskId);

  if (!task || task.isDeleted) {
    errorResponse({ res, message: 'Task not found', statusCode: 404 });
    return;
  }

  const oldStatus = task.status;

  // Update the moved task
  task.status = newStatus;
  task.order = newOrder;
  if (newStatus === 'Done') {
    task.completedAt = new Date();
  }
  await task.save();

  // Reorder other tasks in the new column
  await Task.updateMany(
    {
      project: task.project,
      status: newStatus,
      _id: { $ne: task._id },
      order: { $gte: newOrder },
      isDeleted: false,
    },
    { $inc: { order: 1 } }
  );

  // Create activity log if status changed
  if (oldStatus !== newStatus) {
    await ActivityLog.create({
      project: task.project,
      task: task._id,
      user: userId,
      action: 'moved',
      description: `Moved from "${oldStatus}" to "${newStatus}"`,
      changes: { field: 'status', oldValue: oldStatus, newValue: newStatus },
      metadata: { taskId: task.taskId },
    });
  }

  // Emit socket event
  if (io) {
    io.to(`project:${task.project}`).emit('task:moved', {
      taskId: task._id,
      newStatus,
      newOrder,
      oldStatus,
    });
  }

  successResponse({
    res,
    data: task,
    message: 'Task moved successfully',
  });
};

// Delete task (soft delete)
export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const userId = req.userId!;
  const io = req.app.get('io');

  const task = await Task.findById(taskId);

  if (!task) {
    errorResponse({ res, message: 'Task not found', statusCode: 404 });
    return;
  }

  task.isDeleted = true;
  task.deletedAt = new Date();
  await task.save();

  // Create activity log
  await ActivityLog.create({
    project: task.project,
    task: task._id,
    user: userId,
    action: 'deleted',
    description: `Deleted task "${task.title}"`,
    metadata: { taskId: task.taskId },
  });

  // Emit socket event
  if (io) {
    io.to(`project:${task.project}`).emit('task:deleted', {
      taskId: task._id,
      projectId: task.project,
    });
  }

  successResponse({
    res,
    data: null,
    message: 'Task deleted successfully',
  });
};

// Restore task
export const restoreTask = async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId);

  if (!task) {
    errorResponse({ res, message: 'Task not found', statusCode: 404 });
    return;
  }

  task.isDeleted = false;
  task.deletedAt = null;
  await task.save();

  successResponse({
    res,
    data: task,
    message: 'Task restored successfully',
  });
};

// Get activity log for task
export const getTaskActivity = async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params;

  const activities = await ActivityLog.find({ task: taskId })
    .populate('user', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(50);

  successResponse({
    res,
    data: activities,
    message: 'Activity log fetched successfully',
  });
};
