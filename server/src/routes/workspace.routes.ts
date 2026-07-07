import { Router } from 'express';
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceBySlug,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  inviteMemberByEmail,
  changeMemberRole,
  removeMember,
  acceptInvite,
} from '../controllers/workspace.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission, isWorkspaceMember } from '../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Workspace CRUD
router.post('/', createWorkspace);
router.get('/', getMyWorkspaces);
router.get('/:slug', getWorkspaceBySlug);
router.patch('/:workspaceId', checkPermission('workspace', 'update'), updateWorkspace);
router.delete('/:workspaceId', checkPermission('workspace', 'delete'), deleteWorkspace);

// Members
router.get('/:workspaceId/members', getWorkspaceMembers);
router.post('/:workspaceId/members/invite', checkPermission('workspace', 'manage_members'), inviteMemberByEmail);
router.patch('/:workspaceId/members/:memberId', changeMemberRole);
router.delete('/:workspaceId/members/:memberId', checkPermission('workspace', 'manage_members'), removeMember);

// Invites
router.post('/invite/:token/accept', acceptInvite);

export default router;
