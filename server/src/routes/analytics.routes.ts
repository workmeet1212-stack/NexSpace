import { Router } from 'express';
import {
  getProjectOverview,
  getBurndownData,
  getVelocityData,
  getTeamWorkload,
  getActivityData,
  getWorkspaceStats,
} from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isProjectMember } from '../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Analytics routes
router.get('/project/:projectId/overview', getProjectOverview);
router.get('/sprint/:sprintId/burndown', getBurndownData);
router.get('/project/:projectId/velocity', getVelocityData);
router.get('/project/:projectId/workload', getTeamWorkload);
router.get('/project/:projectId/activity', getActivityData);
router.get('/workspace/:workspaceId/stats', getWorkspaceStats);

export default router;
