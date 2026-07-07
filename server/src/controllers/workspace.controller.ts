import { Request, Response } from 'express';
import { z } from 'zod';
import { Workspace, IWorkspace } from '../models/Workspace.model';
import { Project } from '../models/Project.model';
import { User } from '../models/User.model';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { slugify } from '../utils/helpers';
import { invalidateUserCache } from '../services/auth.service';
import { sendInviteEmail } from '../services/email.service';
import { v4 as uuidv4 } from 'uuid';
import { redis, RedisKeys } from '../config/redis';

// Validation schemas
const createWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    color: z.string().optional(),
  }),
});

const updateWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    logo: z.string().optional(),
    color: z.string().optional(),
    settings: z.object({
      allowMemberInvite: z.boolean().optional(),
      defaultRole: z.string().optional(),
    }).optional(),
  }),
});

const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'member', 'viewer']).optional(),
  }),
});

// Create workspace
export const createWorkspace = async (req: Request, res: Response): Promise<void> => {
  const { name, description, color } = createWorkspaceSchema.parse(req.body).body;
  const userId = req.userId!;

  // Generate unique slug
  let slug = slugify(name);
  let slugCount = 0;
  let uniqueSlug = slug;

  while (await Workspace.exists({ slug: uniqueSlug })) {
    slugCount++;
    uniqueSlug = `${slug}-${slugCount}`;
  }

  const workspace = new Workspace({
    name,
    slug: uniqueSlug,
    description: description || '',
    color: color || '#6366f1',
    owner: userId,
    members: [],
    settings: {
      allowMemberInvite: true,
      defaultRole: 'member',
    },
  });

  await workspace.save();

  // Populate owner info
  await workspace.populate('owner', 'name email avatar');
  await workspace.populate('members.user', 'name email avatar');

  successResponse({
    res,
    data: workspace,
    message: 'Workspace created successfully',
    statusCode: 201,
  });
};

// Get my workspaces
export const getMyWorkspaces = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;

  const workspaces = await Workspace.find({
    'members.user': userId,
    isDeleted: false,
  })
    .populate('owner', 'name email avatar')
    .select('-members')
    .sort({ createdAt: -1 });

  // Get project count for each workspace
  const workspacesWithStats = await Promise.all(
    workspaces.map(async (ws) => {
      const projectCount = await Project.countDocuments({
        workspace: ws._id,
        isDeleted: false,
      });
      return {
        ...ws.toObject(),
        projectCount,
      };
    })
  );

  successResponse({
    res,
    data: workspacesWithStats,
    message: 'Workspaces fetched successfully',
  });
};

// Get workspace by slug
export const getWorkspaceBySlug = async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;
  const userId = req.userId;

  const workspace = await Workspace.findOne({ slug, isDeleted: false })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar');

  if (!workspace) {
    errorResponse({ res, message: 'Workspace not found', statusCode: 404 });
    return;
  }

  // Check if user is member
  const isMember = workspace.members.some(
    (m) => m.user._id.toString() === userId
  );

  if (!isMember) {
    errorResponse({ res, message: 'Access denied', statusCode: 403 });
    return;
  }

  // Get project count
  const projectCount = await Project.countDocuments({
    workspace: workspace._id,
    isDeleted: false,
  });

  successResponse({
    res,
    data: {
      ...workspace.toObject(),
      projectCount,
    },
    message: 'Workspace fetched successfully',
  });
};

// Update workspace
export const updateWorkspace = async (req: Request, res: Response): Promise<void> => {
  const { workspaceId } = req.params;
  const updates = updateWorkspaceSchema.parse(req.body).body;

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    errorResponse({ res, message: 'Workspace not found', statusCode: 404 });
    return;
  }

  // Check ownership
  if (workspace.owner.toString() !== req.userId) {
    const member = workspace.members.find(
      (m) => m.user.toString() === req.userId && m.role === 'admin'
    );
    if (!member) {
      errorResponse({ res, message: 'Insufficient permissions', statusCode: 403 });
      return;
    }
  }

  // Apply updates
  Object.assign(workspace, updates);
  await workspace.save();

  await workspace.populate('owner', 'name email avatar');
  await workspace.populate('members.user', 'name email avatar');

  successResponse({
    res,
    data: workspace,
    message: 'Workspace updated successfully',
  });
};

// Delete workspace
export const deleteWorkspace = async (req: Request, res: Response): Promise<void> => {
  const { workspaceId } = req.params;

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    errorResponse({ res, message: 'Workspace not found', statusCode: 404 });
    return;
  }

  if (workspace.owner.toString() !== req.userId) {
    errorResponse({ res, message: 'Only owner can delete workspace', statusCode: 403 });
    return;
  }

  // Soft delete
  workspace.isDeleted = true;
  await workspace.save();

  successResponse({
    res,
    data: null,
    message: 'Workspace deleted successfully',
  });
};

// Get workspace members
export const getWorkspaceMembers = async (req: Request, res: Response): Promise<void> => {
  const { workspaceId } = req.params;

  const workspace = await Workspace.findById(workspaceId)
    .populate('members.user', 'name email avatar status');

  if (!workspace) {
    errorResponse({ res, message: 'Workspace not found', statusCode: 404 });
    return;
  }

  // Check if user is member
  const isMember = workspace.members.some(
    (m) => m.user._id.toString() === req.userId
  );

  if (!isMember) {
    errorResponse({ res, message: 'Access denied', statusCode: 403 });
    return;
  }

  successResponse({
    res,
    data: workspace.members,
    message: 'Members fetched successfully',
  });
};

// Invite member by email
export const inviteMemberByEmail = async (req: Request, res: Response): Promise<void> => {
  const { workspaceId } = req.params;
  const { email, role } = inviteMemberSchema.parse(req.body).body;

  const workspace = await Workspace.findById(workspaceId)
    .populate('owner', 'name email');

  if (!workspace) {
    errorResponse({ res, message: 'Workspace not found', statusCode: 404 });
    return;
  }

  // Check if user exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    // Check if already a member
    const isAlreadyMember = workspace.members.some(
      (m) => m.user.toString() === existingUser._id.toString()
    );

    if (isAlreadyMember) {
      errorResponse({ res, message: 'User is already a member', statusCode: 409 });
      return;
    }

    // Add directly
    workspace.members.push({
      user: existingUser._id,
      role: role || 'member',
      joinedAt: new Date(),
    });

    await workspace.save();

    successResponse({
      res,
      data: { added: true, email },
      message: 'Member added successfully',
    });
    return;
  }

  // Send invite email
  const inviteToken = uuidv4();

  // Store invite in Redis
  await redis.setex(
    `invite:${inviteToken}`,
    60 * 60 * 24 * 7, // 7 days
    JSON.stringify({
      email: email.toLowerCase(),
      workspaceId,
      role: role || 'member',
      invitedBy: req.userId,
    })
  );

  const inviteUrl = `${process.env.CLIENT_URL}/invite/${inviteToken}`;

  await sendInviteEmail({
    email,
    inviterName: (workspace.owner as any).name,
    workspaceName: workspace.name,
    inviteUrl,
  });

  successResponse({
    res,
    data: { invited: true, email },
    message: 'Invitation sent successfully',
  });
};

// Change member role
export const changeMemberRole = async (req: Request, res: Response): Promise<void> => {
  const { workspaceId, memberId } = req.params;
  const { role } = req.body;

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    errorResponse({ res, message: 'Workspace not found', statusCode: 404 });
    return;
  }

  // Cannot change owner's role
  if (workspace.owner.toString() === memberId) {
    errorResponse({ res, message: 'Cannot change owner role', statusCode: 400 });
    return;
  }

  // Find member
  const memberIdx = workspace.members.findIndex(
    (m) => m.user.toString() === memberId
  );

  if (memberIdx === -1) {
    errorResponse({ res, message: 'Member not found', statusCode: 404 });
    return;
  }

  workspace.members[memberIdx].role = role;
  await workspace.save();

  successResponse({
    res,
    data: { memberId, role },
    message: 'Role updated successfully',
  });
};

// Remove member
export const removeMember = async (req: Request, res: Response): Promise<void> => {
  const { workspaceId, memberId } = req.params;

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    errorResponse({ res, message: 'Workspace not found', statusCode: 404 });
    return;
  }

  // Cannot remove owner
  if (workspace.owner.toString() === memberId) {
    errorResponse({ res, message: 'Cannot remove owner', statusCode: 400 });
    return;
  }

  // Remove from workspace members
  workspace.members = workspace.members.filter(
    (m) => m.user.toString() !== memberId
  );

  await workspace.save();

  // Remove from all projects in workspace
  await Project.updateMany(
    { workspace: workspaceId },
    { $pull: { members: { user: memberId } } }
  );

  successResponse({
    res,
    data: null,
    message: 'Member removed successfully',
  });
};

// Accept invite
export const acceptInvite = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  const userId = req.userId;

  const inviteData = await redis.get(`invite:${token}`);

  if (!inviteData) {
    errorResponse({ res, message: 'Invalid or expired invite', statusCode: 400 });
    return;
  }

  const { email, workspaceId, role } = JSON.parse(inviteData as string);

  // Check if user email matches
  const user = await User.findById(userId);
  if (!user || user.email !== email) {
    errorResponse({ res, message: 'This invite is for a different email', statusCode: 403 });
    return;
  }

  // Add to workspace
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    errorResponse({ res, message: 'Workspace not found', statusCode: 404 });
    return;
  }

  // Check if already member
  const isAlreadyMember = workspace.members.some(
    (m) => m.user.toString() === userId
  );

  if (!isAlreadyMember) {
    workspace.members.push({
      user: userId!,
      role,
      joinedAt: new Date(),
    });
    await workspace.save();
  }

  // Delete invite token
  await redis.del(`invite:${token}`);

  successResponse({
    res,
    data: { workspaceId },
    message: 'Invite accepted successfully',
  });
};
