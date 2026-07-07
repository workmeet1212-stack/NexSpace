import mongoose, { Document, Schema } from 'mongoose';

export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  taskId: string;
  title: string;
  description: any;
  status: string;
  priority: Priority;
  project: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  assignees: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  labels: string[];
  dueDate: Date | null;
  startDate: Date | null;
  completedAt: Date | null;
  storyPoints: number | null;
  parentTask: mongoose.Types.ObjectId | null;
  subTasks: mongoose.Types.ObjectId[];
  blockedBy: mongoose.Types.ObjectId[];
  blocks: mongoose.Types.ObjectId[];
  attachments: Array<{
    _id: mongoose.Types.ObjectId;
    filename: string;
    url: string;
    fileType: string;
    fileSize: number;
    uploadedBy: mongoose.Types.ObjectId;
    uploadedAt: Date;
  }>;
  sprint: mongoose.Types.ObjectId | null;
  order: number;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    taskId: { type: String, unique: true, index: true },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    description: { type: Schema.Types.Mixed },
    status: { type: String, required: true, default: 'Todo' },
    priority: {
      type: String,
      enum: ['urgent', 'high', 'medium', 'low', 'none'],
      default: 'none',
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    labels: [{ type: String }],
    dueDate: { type: Date, default: null, index: true },
    startDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    storyPoints: { type: Number, min: 0, max: 100, default: null },
    parentTask: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    subTasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    blockedBy: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    blocks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    attachments: [
      {
        filename: String,
        url: String,
        fileType: String,
        fileSize: Number,
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    sprint: {
      type: Schema.Types.ObjectId,
      ref: 'Sprint',
      default: null,
    },
    order: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound indexes for performance
TaskSchema.index({ project: 1, status: 1 });
TaskSchema.index({ project: 1, assignees: 1 });
TaskSchema.index({ workspace: 1, dueDate: 1 });
TaskSchema.index({ project: 1, isDeleted: 1, order: 1 });

// Auto-generate taskId before save
TaskSchema.pre('save', async function (next) {
  if (this.taskId) return next();
  try {
    const project = await mongoose.model('Project').findById(this.project);
    if (!project) return next(new Error('Project not found'));
    const count = await mongoose.model('Task').countDocuments({
      project: this.project,
    });
    this.taskId = `${project.identifier}-${count + 1}`;
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Task = mongoose.model<ITask>('Task', TaskSchema);
