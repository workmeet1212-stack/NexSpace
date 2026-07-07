import { Router } from 'express';
import {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  addReaction,
} from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Comment CRUD
router.post('/', createComment);
router.get('/:taskId', getComments);
router.patch('/:commentId', updateComment);
router.delete('/:commentId', deleteComment);

// Reactions
router.post('/:commentId/reaction', addReaction);

export default router;
