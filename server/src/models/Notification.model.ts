import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'task_assigned'
  | 'task_mentioned'
  | 'task_comment'
  | 'task_updated'
  | 'task_completed'
  | 'sprint_started'
  | 'sprint_completed'
  | 'workspace_invite'
  | 'project_invite';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  data: {
    taskId?: string;
    projectId?: string;
    workspaceId?: string;
    sprintId?: string;
    commentId?: string;
    [key: string]: any;
  };
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: [
        'task_assigned',
        'task_mentioned',
        'task_comment',
        'task_updated',
        'task_completed',
        'sprint_started',
        'sprint_completed',
        'workspace_invite',
        'project_invite',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: {
      taskId: { type: String },
      projectId: { type: String },
      workspaceId: { type: String },
      sprintId: { type: String },
      commentId: { type: String },
    },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index for fetching unread notifications
NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

// TTL index for auto-deleting old notifications after 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
