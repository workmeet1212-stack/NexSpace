import { Request, Response } from 'express';
import { z } from 'zod';
import { Project, IProject, ITaskStatus } from '../models/Project.model';
import { Task } from '../models/Task.model';
import { Workspace } from '../models/Workspace.model';
import { successResponse, errorResponse } from '../utils/apiResponse';

const defaultStatuses: ITaskStatus[] = [
  { name: 'Backlog', color: '#94a3b8', order: 0, category: 'todo' },
  { name: 'Todo', color: '#64748b', order: 1, category: 'todo' },
  { name: 'In Progress', color: '#3b82f6', order: 2, category: 'in_progress' },
  { name: 'In Review', color: '#f59e0b', order: 3, category: 'in_progress' },
  { name: 'Done', color: '#22c55e', order: 4, category: 'done' },
];

// ✅ Validation schemas — NO `body:` wrapper
const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  identifier: z.string().max(5).optional(),
  description: z.string().max(1000).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  template: z.enum(['kanban', 'scrum', 'bug-tracking', 'custom']).optional(),
  workspaceId: z.string(),
});

const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  status: z.enum(['active', 'archived']).optional(),
});

// Create project
export const createProject = async (req: Request, res: Response): Promise<void> => {
  // ✅ Removed .body
  const {
    name,
    identifier,
    description,
    color,
    icon,
    template,
    workspaceId,
  } = createProjectSchema.parse(req.body);
  const userId = req.userId!;

  // Check workspace access
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    errorResponse({ res, message: 'Workspace not found', statusCode: 404 });
    return;
  }

  const member = workspace.members.find((m) => m.user.toString() === userId);
  if (!member) {
    errorResponse({ res, message: 'Access denied', statusCode: 403 });
    return;
  }

  // Generate unique identifier
  let projectIdentifier = identifier || name.slice(0, 3).toUpperCase();
  let count = 0;
  let uniqueIdentifier = projectIdentifier;

  while (await Project.exists({ workspace: workspaceId, identifier: uniqueIdentifier })) {
    count++;
    uniqueIdentifier = `${projectIdentifier.slice(0, 3)}${count}`;
  }

  const project = new Project({
    name,
    identifier: uniqueIdentifier,
    description: description || '',
    color: color || '#6366f1',
    icon: icon || '📋',
    template: template || 'kanban',
    workspace: workspaceId,
    members: [{ user: userId, role: 'lead' }],
    settings: {
      taskStatuses: defaultStatuses,
      defaultAssignee: null,
    },
  });

  await project.save();

  // Populate
  await project.populate('members.user', 'name email avatar');
  await project.populate('workspace', 'name slug');

  successResponse({
    res,
    data: project,
    message: 'Project created successfully',
    statusCode: 201,
  });
};

// Get projects by workspace
export const getProjectsByWorkspace = async (req: Request, res: Response): Promise<void> => {
  const { workspaceId } = req.params;
  const userId = req.userId;

  // Check workspace access
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    errorResponse({ res, message: 'Workspace not found', statusCode: 404 });
    return;
  }

  const isMember = workspace.members.some((m) => m.user.toString() === userId);
  if (!isMember) {
    errorResponse({ res, message: 'Access denied', statusCode: 403 });
    return;
  }

  const projects = await Project.find({
    workspace: workspaceId,
    isDeleted: false,
  })
    .populate('members.user', 'name email avatar')
    .sort({ createdAt: -1 });

  // Add task counts
  const projectsWithStats = await Promise.all(
    projects.map(async (project) => {
      const taskCounts = await Task.aggregate([
        { $match: { project: project._id, isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const counts: Record<string, number> = {};
      taskCounts.forEach((tc) => {
        counts[tc._id] = tc.count;
      });

      return {
        ...project.toObject(),
        taskCounts: counts,
      };
    })
  );

  successResponse({
    res,
    data: projectsWithStats,
    message: 'Projects fetched successfully',
  });
};

// Get project by ID
export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;
  const userId = req.userId;

  const project = await Project.findById(projectId)
    .populate('members.user', 'name email avatar')
    .populate('workspace', 'name slug');

  if (!project || project.isDeleted) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  // Check access
  const workspace = await Workspace.findById(project.workspace);
  const isWorkspaceMember = workspace?.members.some(
    (m) => m.user.toString() === userId
  );
  const isProjectMember = project.members.some(
    (m: any) => m.user._id.toString() === userId
  );

  if (!isWorkspaceMember && !isProjectMember) {
    errorResponse({ res, message: 'Access denied', statusCode: 403 });
    return;
  }

  // Get task counts
  const taskCounts = await Task.aggregate([
    { $match: { project: project._id, isDeleted: false } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const counts: Record<string, number> = {};
  taskCounts.forEach((tc) => {
    counts[tc._id] = tc.count;
  });

  successResponse({
    res,
    data: {
      ...project.toObject(),
      taskCounts: counts,
    },
    message: 'Project fetched successfully',
  });
};

// Update project
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;
  // ✅ Removed .body
  const updates = updateProjectSchema.parse(req.body);

  const project = await Project.findById(projectId);

  if (!project || project.isDeleted) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  // Check permissions
  const member = project.members.find((m) => m.user.toString() === req.userId);
  if (!member || (member.role !== 'lead' && member.role !== 'member')) {
    // Check workspace role
    const workspace = await Workspace.findById(project.workspace);
    const wsMember = workspace?.members.find(
      (m) => m.user.toString() === req.userId
    );
    if (!wsMember || (wsMember.role !== 'owner' && wsMember.role !== 'admin')) {
      errorResponse({ res, message: 'Insufficient permissions', statusCode: 403 });
      return;
    }
  }

  Object.assign(project, updates);
  await project.save();

  await project.populate('members.user', 'name email avatar');

  successResponse({
    res,
    data: project,
    message: 'Project updated successfully',
  });
};

// Delete project
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

  if (!project) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  // Check permissions
  const workspace = await Workspace.findById(project.workspace);
  const wsMember = workspace?.members.find(
    (m) => m.user.toString() === req.userId
  );

  if (!wsMember || (wsMember.role !== 'owner' && wsMember.role !== 'admin')) {
    errorResponse({ res, message: 'Insufficient permissions', statusCode: 403 });
    return;
  }

  // Soft delete
  project.isDeleted = true;
  await project.save();

  successResponse({
    res,
    data: null,
    message: 'Project deleted successfully',
  });
};

// Update project statuses
export const updateProjectStatuses = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;
  const { statuses } = req.body;

  const project = await Project.findById(projectId);

  if (!project || project.isDeleted) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  // Validate statuses
  const hasTodo = statuses.some((s: ITaskStatus) => s.category === 'todo');
  const hasDone = statuses.some((s: ITaskStatus) => s.category === 'done');

  if (!hasTodo || !hasDone) {
    errorResponse({
      res,
      message: 'Project must have at least one todo and one done status',
      statusCode: 400,
    });
    return;
  }

  // Get old statuses for renaming tasks
  const oldStatuses = project.settings.taskStatuses;

  // Update tasks with renamed statuses
  for (const oldStatus of oldStatuses) {
    const newStatus = statuses.find((s: ITaskStatus) => s.order === oldStatus.order);
    if (newStatus && newStatus.name !== oldStatus.name) {
      await Task.updateMany(
        { project: projectId, status: oldStatus.name },
        { $set: { status: newStatus.name } }
      );
    }
  }

  project.settings.taskStatuses = statuses;
  await project.save();

  successResponse({
    res,
    data: project.settings.taskStatuses,
    message: 'Statuses updated successfully',
  });
};

// Add project member
export const addProjectMember = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;
  const { userId: newMemberId, role } = req.body;

  const project = await Project.findById(projectId);

  if (!project || project.isDeleted) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  // Check if already a member
  const isAlreadyMember = project.members.some(
    (m) => m.user.toString() === newMemberId
  );

  if (isAlreadyMember) {
    errorResponse({ res, message: 'User is already a project member', statusCode: 409 });
    return;
  }

  project.members.push({
    user: newMemberId,
    role: role || 'member',
  });

  await project.save();
  await project.populate('members.user', 'name email avatar');

  successResponse({
    res,
    data: project.members,
    message: 'Member added successfully',
  });
};

// Update project member role
export const updateProjectMemberRole = async (req: Request, res: Response): Promise<void> => {
  const { projectId, memberId } = req.params;
  const { role } = req.body;

  if (!['lead', 'member', 'viewer'].includes(role)) {
    errorResponse({ res, message: 'Invalid role', statusCode: 400 });
    return;
  }

  const project = await Project.findById(projectId);

  if (!project || project.isDeleted) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  const memberIdx = project.members.findIndex(
    (m) => m.user.toString() === memberId
  );

  if (memberIdx === -1) {
    errorResponse({ res, message: 'Member not found', statusCode: 404 });
    return;
  }

  project.members[memberIdx].role = role;
  await project.save();
  await project.populate('members.user', 'name email avatar');

  successResponse({
    res,
    data: project.members,
    message: 'Member role updated successfully',
  });
};

// Remove project member
export const removeProjectMember = async (req: Request, res: Response): Promise<void> => {
  const { projectId, memberId } = req.params;

  const project = await Project.findById(projectId);

  if (!project || project.isDeleted) {
    errorResponse({ res, message: 'Project not found', statusCode: 404 });
    return;
  }

  project.members = project.members.filter(
    (m) => m.user.toString() !== memberId
  );

  await project.save();

  successResponse({
    res,
    data: null,
    message: 'Member removed successfully',
  });
};