import { Router } from 'express';
import {
  createSprint,
  getSprintsByProject,
  getSprintById,
  updateSprint,
  startSprint,
  completeSprint,
  deleteSprint,
  getActiveSprint,
} from '../controllers/sprint.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Sprint CRUD
router.post('/', createSprint);
router.get('/project/:projectId', getSprintsByProject);
router.get('/project/:projectId/active', getActiveSprint);
router.get('/:sprintId', getSprintById);
router.patch('/:sprintId', updateSprint);
router.delete('/:sprintId', deleteSprint);

// Sprint actions
router.post('/:sprintId/start', startSprint);
router.post('/:sprintId/complete', completeSprint);

export default router;
