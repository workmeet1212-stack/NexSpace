import { Request, Response, NextFunction } from 'express';
import { Workspace } from '../models/Workspace.model';
import { Project } from '../models/Project.model';
import { forbiddenResponse } from '../utils/apiResponse';
import mongoose from 'mongoose';

type Role = 'owner' | 'admin' | 'member' | 'viewer' | 'lead';

const PERMISSIONS: Record<string, Role[]> = {
  'workspace:delete': ['owner'],
  'workspace:update': ['owner', 'admin'],
  'workspace:manage_members': ['owner', 'admin'],
  'project:create': ['owner', 'admin', 'member'],
  'project:delete': ['owner', 'admin'],
  'project:update': ['owner', 'admin'],
  'project:view': ['owner', 'admin', 'member', 'viewer'],
  'task:create': ['owner', 'admin', 'member'],
  'task:delete': ['owner', 'admin', 'member'],
  'task:update': ['owner', 'admin', 'member'],
  'task:view': ['owner', 'admin', 'member', 'viewer'],
  'sprint:manage': ['owner', 'admin'],
  'analytics:view': ['owner', 'admin', 'member'],
};

const getWorkspaceId = (req: Request): string | null => {
  return (
    req.params.workspaceId ||
    req.body.workspaceId ||
    req.query.workspaceId as string ||
    null
  );
};

const getProjectId = (req: Request): string | null => {
  return (
    req.params.projectId ||
    req.body.projectId ||
    req.query.projectId as string ||
    null
  );
};

export const checkPermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const permissionKey = `${resource}:${action}`;
    const allowedRoles = PERMISSIONS[permissionKey];

    if (!allowedRoles) {
      next();
      return;
    }

    const userId = req.userId;
    if (!userId) {
      forbiddenResponse(res, 'Authentication required');
      return;
    }

    let userRole: Role | null = null;

    // Check workspace role
    const workspaceId = getWorkspaceId(req);
    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId).select('members owner');
      if (!workspace) {
        res.status(404).json({ success: false, message: 'Workspace not found' });
        return;
      }

      // Check if user is owner
      if (workspace.owner.toString() === userId) {
        userRole = 'owner';
      } else {
        // Find user in members
        const member = workspace.members.find(
          (m) => m.user.toString() === userId
        );
        if (member) {
          userRole = member.role as Role;
        }
      }
    }

    // Check project role if workspace role not found
    if (!userRole) {
      const projectId = getProjectId(req);
      if (projectId) {
        const project = await Project.findById(projectId).select('members');
        if (!project) {
          res.status(404).json({ success: false, message: 'Project not found' });
          return;
        }

        const member = project.members.find(
          (m) => m.user.toString() === userId
        );
        if (member) {
          // Map project role to workspace role for permission check
          const roleMap: Record<string, Role> = {
            lead: 'admin',
            member: 'member',
            viewer: 'viewer',
          };
          userRole = roleMap[member.role] || 'viewer';
        }
      }
    }

    if (!userRole || !allowedRoles.includes(userRole)) {
      forbiddenResponse(res, 'Insufficient permissions');
      return;
    }

    req.userRole = userRole;
    next();
  };
};

export const isWorkspaceMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const workspaceId = getWorkspaceId(req);
  const userId = req.userId;

  if (!workspaceId || !userId) {
    forbiddenResponse(res, 'Access denied');
    return;
  }

  const workspace = await Workspace.findById(workspaceId).select('members owner');
  if (!workspace) {
    res.status(404).json({ success: false, message: 'Workspace not found' });
    return;
  }

  const isMember =
    workspace.owner.toString() === userId ||
    workspace.members.some((m) => m.user.toString() === userId);

  if (!isMember) {
    forbiddenResponse(res, 'Not a member of this workspace');
    return;
  }

  next();
};

export const isProjectMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const projectId = getProjectId(req);
  const userId = req.userId;

  if (!projectId || !userId) {
    forbiddenResponse(res, 'Access denied');
    return;
  }

  const project = await Project.findById(projectId)
    .populate('workspace', 'members owner')
    .select('members workspace');

  if (!project) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return;
  }

  const workspace = project.workspace as any;
  const isWorkspaceMember =
    workspace.owner.toString() === userId ||
    workspace.members.some((m: any) => m.user.toString() === userId);

  const isProjectMember = project.members.some(
    (m) => m.user.toString() === userId
  );

  if (!isWorkspaceMember && !isProjectMember) {
    forbiddenResponse(res, 'Not a member of this project');
    return;
  }

  next();
};
