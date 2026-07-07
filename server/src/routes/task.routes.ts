import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  bulkUpdateTasks,
  moveTask,
  deleteTask,
  restoreTask,
  getTaskActivity,
} from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isProjectMember } from '../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Task CRUD
router.post('/', createTask);
router.get('/project/:projectId', getTasks);
router.get('/:taskId', getTaskById);
router.patch('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);

// Bulk operations
router.patch('/bulk', bulkUpdateTasks);

// Move task (drag and drop)
router.patch('/:taskId/move', moveTask);

// Restore deleted task
router.post('/:taskId/restore', restoreTask);

// Activity
router.get('/:taskId/activity', getTaskActivity);

export default router;
