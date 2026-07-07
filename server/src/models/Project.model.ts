import mongoose, { Document, Schema } from 'mongoose';

export interface ITaskStatus {
  name: string;
  color: string;
  order: number;
  category: 'todo' | 'in_progress' | 'done';
}

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  identifier: string;
  icon: string;
  color: string;
  workspace: mongoose.Types.ObjectId;
  members: Array<{
    user: mongoose.Types.ObjectId;
    role: 'lead' | 'member' | 'viewer';
  }>;
  status: 'active' | 'archived';
  template: 'kanban' | 'scrum' | 'bug-tracking' | 'custom';
  settings: {
    taskStatuses: ITaskStatus[];
    defaultAssignee: mongoose.Types.ObjectId | null;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const defaultStatuses: ITaskStatus[] = [
  { name: 'Backlog', color: '#94a3b8', order: 0, category: 'todo' },
  { name: 'Todo', color: '#64748b', order: 1, category: 'todo' },
  { name: 'In Progress', color: '#3b82f6', order: 2, category: 'in_progress' },
  { name: 'In Review', color: '#f59e0b', order: 3, category: 'in_progress' },
  { name: 'Done', color: '#22c55e', order: 4, category: 'done' },
];

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '' },
    identifier: {
      type: String,
      required: true,
      uppercase: true,
      maxlength: 5,
      trim: true,
    },
    icon: { type: String, default: '📋' },
    color: { type: String, default: '#6366f1' },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    members: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        role: {
          type: String,
          enum: ['lead', 'member', 'viewer'],
          default: 'member',
        },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    template: {
      type: String,
      enum: ['kanban', 'scrum', 'bug-tracking', 'custom'],
      default: 'kanban',
    },
    settings: {
      taskStatuses: { type: [Object], default: defaultStatuses },
      defaultAssignee: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for unique identifier within workspace
ProjectSchema.index({ workspace: 1, identifier: 1 }, { unique: true });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
