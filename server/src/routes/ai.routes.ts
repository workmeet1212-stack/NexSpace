import { Router } from 'express';
import {
  chat,
  generateDescription,
  getLabelSuggestions,
  getCommentsSummary,
  planSprintAI,
  getRiskAnalysis,
  getStandup,
} from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// AI routes with rate limiting
router.post('/chat', aiLimiter, chat);
router.post('/generate-description', aiLimiter, generateDescription);
router.post('/suggest-labels', aiLimiter, getLabelSuggestions);
router.post('/summarize-comments', aiLimiter, getCommentsSummary);
router.post('/plan-sprint', aiLimiter, planSprintAI);
router.post('/risk-analysis', aiLimiter, getRiskAnalysis);
router.post('/standup', aiLimiter, getStandup);

export default router;
