import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkspaceMember {
  user: mongoose.Types.ObjectId;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
}

export interface IWorkspace extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  logo: string | null;
  color: string;
  owner: mongoose.Types.ObjectId;
  members: IWorkspaceMember[];
  settings: {
    allowMemberInvite: boolean;
    defaultRole: string;
  };
  plan: 'free' | 'pro';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, default: '' },
    logo: { type: String, default: null },
    color: { type: String, default: '#6366f1' },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    members: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          index: true,
        },
        role: {
          type: String,
          enum: ['owner', 'admin', 'member', 'viewer'],
          default: 'member',
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    settings: {
      allowMemberInvite: { type: Boolean, default: true },
      defaultRole: { type: String, default: 'member' },
    },
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Ensure owner is always in members array
WorkspaceSchema.pre('save', function (next) {
  const ownerExists = this.members.some(
    (m) => m.user.toString() === this.owner.toString() && m.role === 'owner'
  );
  if (!ownerExists) {
    this.members.push({
      user: this.owner,
      role: 'owner',
      joinedAt: new Date(),
    } as IWorkspaceMember);
  }
  next();
});

export const Workspace = mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
