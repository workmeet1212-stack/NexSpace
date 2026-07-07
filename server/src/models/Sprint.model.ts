import mongoose, { Document, Schema } from 'mongoose';

export type SprintStatus = 'planned' | 'active' | 'completed';

export interface ISprint extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  goal: string;
  project: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: SprintStatus;
  completedAt: Date | null;
  createdBy: mongoose.Types.ObjectId;
  capacity: number; // Total story points capacity
  velocity: number; // Actual completed story points
  createdAt: Date;
  updatedAt: Date;
}

const SprintSchema = new Schema<ISprint>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    goal: { type: String, default: '' },
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
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['planned', 'active', 'completed'],
      default: 'planned',
      index: true,
    },
    completedAt: { type: Date, default: null },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    capacity: { type: Number, default: 0 },
    velocity: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Ensure only one active sprint per project
SprintSchema.index({ project: 1, status: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'active' }
});

export const Sprint = mongoose.model<ISprint>('Sprint', SprintSchema);
