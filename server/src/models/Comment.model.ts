import mongoose, { Document, Schema } from 'mongoose';

export interface IReaction {
  emoji: string;
  users: mongoose.Types.ObjectId[];
}

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  content: any; // TipTap JSON content
  author: mongoose.Types.ObjectId;
  task: mongoose.Types.ObjectId;
  mentions: mongoose.Types.ObjectId[];
  reactions: IReaction[];
  parentComment: mongoose.Types.ObjectId | null;
  replies: mongoose.Types.ObjectId[];
  isEdited: boolean;
  editedAt: Date | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    content: { type: Schema.Types.Mixed, required: true },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      },
    ],
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    replies: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index for retrieving comments for a task
CommentSchema.index({ task: 1, createdAt: 1 });

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
