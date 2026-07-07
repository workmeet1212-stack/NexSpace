import mongoose, { Document, Schema } from 'mongoose';

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'commented'
  | 'assigned'
  | 'unassigned'
  | 'moved'
  | 'priority_changed'
  | 'status_changed'
  | 'due_date_changed'
  | 'label_added'
  | 'label_removed'
  | 'sprint_assigned'
  | 'sprint_removed'
  | 'attachment_added'
  | 'attachment_removed';

export interface IActivityLog extends Document {
  _id: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  task: mongoose.Types.ObjectId | null;
  user: mongoose.Types.ObjectId;
  action: ActivityAction;
  description: string;
  changes: {
    field?: string;
    oldValue?: any;
    newValue?: any;
  };
  metadata: {
    taskId?: string;
    commentId?: string;
    sprintId?: string;
    [key: string]: any;
  };
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'created',
        'updated',
        'deleted',
        'commented',
        'assigned',
        'unassigned',
        'moved',
        'priority_changed',
        'status_changed',
        'due_date_changed',
        'label_added',
        'label_removed',
        'sprint_assigned',
        'sprint_removed',
        'attachment_added',
        'attachment_removed',
      ],
      required: true,
    },
    description: { type: String, required: true },
    changes: {
      field: { type: String },
      oldValue: { type: Schema.Types.Mixed },
      newValue: { type: Schema.Types.Mixed },
    },
    metadata: {
      taskId: { type: String },
      commentId: { type: String },
      sprintId: { type: String },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound indexes for activity queries
ActivityLogSchema.index({ project: 1, createdAt: -1 });
ActivityLogSchema.index({ task: 1, createdAt: -1 });
ActivityLogSchema.index({ user: 1, createdAt: -1 });

// TTL index for auto-deleting old logs after 90 days
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
