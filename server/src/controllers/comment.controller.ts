import { Request, Response } from 'express';
import { z } from 'zod';
import { Comment, IComment } from '../models/Comment.model';
import { Task } from '../models/Task.model';
import { ActivityLog } from '../models/ActivityLog.model';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { notifyMention, notifyTaskComment } from '../services/notification.service';
import mongoose from 'mongoose';

// Validation schemas
const createCommentSchema = z.object({
  body: z.object({
    content: z.any(),
    taskId: z.string(),
    parentComment: z.string().optional(),
  }),
});

const updateCommentSchema = z.object({
  body: z.object({
    content: z.any(),
  }),
});

// Create comment
export const createComment = async (req: Request, res: Response): Promise<void> => {
  const { content, taskId, parentComment } = createCommentSchema.parse(req.body).body;
  const userId = req.userId!;
  const io = req.app.get('io');

  // Verify task exists
  const task = await Task.findById(taskId);
  if (!task || task.isDeleted) {
    errorResponse({ res, message: 'Task not found', statusCode: 404 });
    return;
  }

  // Extract mentions from content
  const mentions: string[] = [];
  if (content && Array.isArray(content.content)) {
    const extractMentions = (nodes: any[]) => {
      nodes.forEach((node) => {
        if (node.type === 'mention' && node.attrs?.id) {
          mentions.push(node.attrs.id);
        } else if (node.content) {
          extractMentions(node.content);
        }
      });
    };
    extractMentions(content.content);
  }

  const comment = new Comment({
    content,
    author: userId,
    task: taskId,
    mentions: [...new Set(mentions)],
    parentComment: parentComment || null,
  });

  await comment.save();

  // Update parent comment's replies array
  if (parentComment) {
    await Comment.findByIdAndUpdate(parentComment, {
      $push: { replies: comment._id },
    });
  }

  // Populate
  await comment.populate('author', 'name email avatar');
  await comment.populate('mentions', 'name email avatar');

  // Create activity log
  await ActivityLog.create({
    project: task.project,
    task: taskId,
    user: userId,
    action: 'commented',
    description: `Added a comment`,
    metadata: { taskId: task.taskId, commentId: comment._id.toString() },
  });

  // Send notifications
  const commenter = await mongoose.model('User').findById(userId);

  // Notify mentioned users
  if (mentions.length > 0) {
    await notifyMention(mentions, task, commenter?.name || 'Someone', comment._id.toString());
  }

  // Notify task assignees and creator (excluding author)
  const notifyUsers = [
    ...task.assignees.map((a) => a.toString()),
    task.createdBy.toString(),
  ].filter((id) => id !== userId && !mentions.includes(id));

  if (notifyUsers.length > 0) {
    await notifyTaskComment(
      [...new Set(notifyUsers)],
      task,
      commenter?.name || 'Someone',
      comment._id.toString()
    );
  }

  // Emit socket event
  if (io) {
    io.to(`project:${task.project}`).emit('comment:new', comment);
  }

  successResponse({
    res,
    data: comment,
    message: 'Comment added successfully',
    statusCode: 201,
  });
};

// Get comments for task
export const getComments = async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params;

  const comments = await Comment.find({
    task: taskId,
    isDeleted: false,
  })
    .populate('author', 'name email avatar')
    .populate('mentions', 'name email avatar')
    .sort({ createdAt: 1 });

  // Build threaded structure
  const commentMap = new Map();
  const rootComments: IComment[] = [];

  comments.forEach((comment) => {
    commentMap.set(comment._id.toString(), {
      ...comment.toObject(),
      replies: [],
    });
  });

  comments.forEach((comment) => {
    const commentObj = commentMap.get(comment._id.toString());
    if (comment.parentComment) {
      const parent = commentMap.get(comment.parentComment.toString());
      if (parent) {
        parent.replies.push(commentObj);
      }
    } else {
      rootComments.push(commentObj as IComment);
    }
  });

  successResponse({
    res,
    data: rootComments,
    message: 'Comments fetched successfully',
  });
};

// Update comment
export const updateComment = async (req: Request, res: Response): Promise<void> => {
  const { commentId } = req.params;
  const { content } = updateCommentSchema.parse(req.body).body;
  const userId = req.userId!;
  const io = req.app.get('io');

  const comment = await Comment.findById(commentId);

  if (!comment || comment.isDeleted) {
    errorResponse({ res, message: 'Comment not found', statusCode: 404 });
    return;
  }

  // Check author
  if (comment.author.toString() !== userId) {
    errorResponse({ res, message: 'Not authorized to edit this comment', statusCode: 403 });
    return;
  }

  comment.content = content;
  comment.isEdited = true;
  comment.editedAt = new Date();
  await comment.save();

  await comment.populate('author', 'name email avatar');

  // Emit socket event
  if (io) {
    io.to(`project:${(comment as any).project}`).emit('comment:updated', comment);
  }

  successResponse({
    res,
    data: comment,
    message: 'Comment updated successfully',
  });
};

// Delete comment (soft delete)
export const deleteComment = async (req: Request, res: Response): Promise<void> => {
  const { commentId } = req.params;
  const userId = req.userId!;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    errorResponse({ res, message: 'Comment not found', statusCode: 404 });
    return;
  }

  // Check author
  if (comment.author.toString() !== userId) {
    errorResponse({ res, message: 'Not authorized to delete this comment', statusCode: 403 });
    return;
  }

  comment.isDeleted = true;
  comment.deletedAt = new Date();
  await comment.save();

  successResponse({
    res,
    data: null,
    message: 'Comment deleted successfully',
  });
};

// Add reaction
export const addReaction = async (req: Request, res: Response): Promise<void> => {
  const { commentId } = req.params;
  const { emoji } = req.body;
  const userId = req.userId!;

  const comment = await Comment.findById(commentId);

  if (!comment || comment.isDeleted) {
    errorResponse({ res, message: 'Comment not found', statusCode: 404 });
    return;
  }

  // Find existing reaction
  const existingReaction = comment.reactions.find(
    (r) => r.emoji === emoji && r.users.some((u) => u.toString() === userId)
  );

  if (existingReaction) {
    // Remove reaction
    existingReaction.users = existingReaction.users.filter(
      (u) => u.toString() !== userId
    );
    if (existingReaction.users.length === 0) {
      comment.reactions = comment.reactions.filter((r) => r.emoji !== emoji);
    }
  } else {
    // Add reaction
    const reaction = comment.reactions.find((r) => r.emoji === emoji);
    if (reaction) {
      reaction.users.push(userId as any);
    } else {
      comment.reactions.push({
        emoji,
        users: [userId as any],
      });
    }
  }

  await comment.save();

  successResponse({
    res,
    data: comment.reactions,
    message: 'Reaction updated',
  });
};
