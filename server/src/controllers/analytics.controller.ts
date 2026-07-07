import { Request, Response } from 'express';
import { Task } from '../models/Task.model';
import { Sprint } from '../models/Sprint.model';
import { Project, ITaskStatus } from '../models/Project.model';
import { ActivityLog } from '../models/ActivityLog.model';
import { Workspace } from '../models/Workspace.model';
import { successResponse, errorResponse } from '../utils/apiResponse';
import mongoose from 'mongoose';

// Get project overview
export const getProjectOverview = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project || project.isDeleted) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  // Tasks by status
  const tasksByStatus = await Task.aggregate([
    {
      $match: { project: new mongoose.Types.ObjectId(projectId), isDeleted: false },
    },
    {
      $group: { _id: '$status', count: { $sum: 1 } },
    },
  ]);

  // Tasks by priority
  const tasksByPriority = await Task.aggregate([
    {
      $match: { project: new mongoose.Types.ObjectId(projectId), isDeleted: false },
    },
    {
      $group: { _id: '$priority', count: { $sum: 1 } },
    },
  ]);

  // Total tasks
  const totalTasks = await Task.countDocuments({
    project: projectId,
    isDeleted: false,
  });

  // Completed tasks
  const completedTasks = tasksByStatus.find(
    (t) => t._id === 'Done'
  )?.count || 0;

  // Overdue tasks
  const overdueTasks = await Task.countDocuments({
    project: projectId,
    dueDate: { $lt: new Date() },
    status: { $ne: 'Done' },
    isDeleted: false,
  });

  // Active members
  const activeProject = await Project.findById(projectId).populate('members.user', 'name email avatar');
  const activeMembers = activeProject?.members.length || 0;

  successResponse({
    res,
    data: {
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      overdueTasks,
      activeMembers,
      tasksByStatus: tasksByStatus.reduce((acc: any, t) => {
        acc[t._id] = t.count;
        return acc;
      }, {}),
      tasksByPriority: tasksByPriority.reduce((acc: any, t) => {
        acc[t._id] = t.count;
        return acc;
      }, {}),
    },
    message: 'Project overview fetched',
  });
};

// Get burndown data
export const getBurndownData = async (req: Request, res: Response): Promise<void> => {
  const { sprintId } = req.params;

  const sprint = await Sprint.findById(sprintId);
  if (!sprint) {
    errorResponse({ res, message: 'Sprint not found', statusCode: 404 });
    return;
  }

  // Get all tasks in sprint
  const tasks = await Task.find({ sprint: sprintId, isDeleted: false });

  // Calculate total story points
  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  // Calculate ideal burndown
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const pointsPerDay = totalPoints / (totalDays || 1);

  const ideal: Array<{ date: string; points: number }> = [];
  for (let i = 0; i <= totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    ideal.push({
      date: date.toISOString().split('T')[0],
      points: Math.max(0, totalPoints - pointsPerDay * i),
    });
  }

  // Calculate actual burndown based on completed tasks
  const completedTasks = tasks.filter((t) => t.status === 'Done' && t.completedAt);

  // Group by completion date
  const completionByDate: Record<string, number> = {};
  completedTasks.forEach((t) => {
    if (t.completedAt) {
      const dateKey = t.completedAt.toISOString().split('T')[0];
      completionByDate[dateKey] = (completionByDate[dateKey] || 0) + (t.storyPoints || 0);
    }
  });

  // Build actual burndown line
  const actual: Array<{ date: string; points: number }> = [];
  let remainingPoints = totalPoints;

  for (let i = 0; i <= totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];
    remainingPoints -= completionByDate[dateKey] || 0;
    actual.push({
      date: dateKey,
      points: Math.max(0, remainingPoints),
    });
  }

  successResponse({
    res,
    data: { ideal, actual, totalPoints, sprintDays: totalDays },
    message: 'Burndown data fetched',
  });
};

// Get velocity data
export const getVelocityData = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;

  const sprints = await Sprint.find({
    project: projectId,
    status: 'completed',
  })
    .sort({ completedAt: -1 })
    .limit(5);

  const velocityData = sprints.map((sprint) => ({
    name: sprint.name,
    velocity: sprint.velocity,
    capacity: sprint.capacity,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
  }));

  const avgVelocity = velocityData.length > 0
    ? Math.round(velocityData.reduce((sum, s) => sum + s.velocity, 0) / velocityData.length)
    : 0;

  successResponse({
    res,
    data: {
      sprints: velocityData.reverse(),
      averageVelocity: avgVelocity,
    },
    message: 'Velocity data fetched',
  });
};

// Get team workload
export const getTeamWorkload = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId).populate('members.user', 'name email avatar');
  if (!project) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  // Get tasks grouped by assignee
  const workloadData = await Task.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
        isDeleted: false,
        status: { $ne: 'Done' },
      },
    },
    {
      $unwind: '$assignees',
    },
    {
      $group: {
        _id: '$assignees',
        taskCount: { $sum: 1 },
        totalPoints: { $sum: '$storyPoints' },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ['$dueDate', new Date()] },
                  { $ne: ['$status', 'Done'] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  // Map user info
  const memberWorkload = project.members.map((member: any) => {
    const workload = workloadData.find((w) => w._id.toString() === member.user._id.toString());
    return {
      user: member.user,
      taskCount: workload?.taskCount || 0,
      totalPoints: workload?.totalPoints || 0,
      overdue: workload?.overdue || 0,
      isOverloaded: (workload?.taskCount || 0) > 10,
    };
  });

  successResponse({
    res,
    data: memberWorkload.sort((a, b) => b.taskCount - a.taskCount),
    message: 'Team workload fetched',
  });
};

// Get activity chart data
export const getActivityData = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;
  const { days = '30' } = req.query;

  const daysNum = parseInt(days as string);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);

  const activities = await ActivityLog.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        count: { $sum: 1 },
        actions: {
          $push: '$action',
        },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // Fill in missing days
  const activityData: Array<{ date: string; count: number }> = [];
  for (let i = 0; i <= daysNum; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];
    const existing = activities.find((a) => a._id === dateKey);
    activityData.push({
      date: dateKey,
      count: existing?.count || 0,
    });
  }

  successResponse({
    res,
    data: activityData,
    message: 'Activity data fetched',
  });
};

// Get workspace stats
export const getWorkspaceStats = async (req: Request, res: Response): Promise<void> => {
  const { workspaceId } = req.params;

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    errorResponse({ res, message: 'Workspace not found', statusCode: 404 });
    return;
  }

  // Get all projects
  const projects = await Project.find({
    workspace: workspaceId,
    isDeleted: false,
  });

  const projectIds = projects.map((p) => p._id);

  // Get counts
  const [
    totalTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    activeMembers,
  ] = await Promise.all([
    Task.countDocuments({ project: { $in: projectIds }, isDeleted: false }),
    Task.countDocuments({ project: { $in: projectIds }, status: 'Done', isDeleted: false }),
    Task.countDocuments({
      project: { $in: projectIds },
      status: { $in: ['In Progress', 'In Review'] },
      isDeleted: false,
    }),
    Task.countDocuments({
      project: { $in: projectIds },
      dueDate: { $lt: new Date() },
      status: { $ne: 'Done' },
      isDeleted: false,
    }),
    workspace.members.length,
  ]);

  successResponse({
    res,
    data: {
      totalProjects: projects.length,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      activeMembers,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    },
    message: 'Workspace stats fetched',
  });
};
