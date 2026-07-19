import { Router } from 'express';
import {
  createProject,
  getProjectsByWorkspace,
  getProjectById,
  updateProject,
  deleteProject,
  updateProjectStatuses,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission, isProjectMember } from '../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Project CRUD
router.post('/', createProject);
router.get('/workspace/:workspaceId', getProjectsByWorkspace);
router.get('/:projectId', isProjectMember, getProjectById);
router.patch('/:projectId', checkPermission('project', 'update'), updateProject);
router.delete('/:projectId', checkPermission('project', 'delete'), deleteProject);

// Project statuses
router.patch('/:projectId/statuses', checkPermission('project', 'update'), updateProjectStatuses);

// Project members
router.post('/:projectId/members', checkPermission('project', 'update'), addProjectMember);
router.patch('/:projectId/members/:memberId', checkPermission('project', 'update'), updateProjectMemberRole);
router.delete('/:projectId/members/:memberId', checkPermission('project', 'update'), removeProjectMember);

export default router;
