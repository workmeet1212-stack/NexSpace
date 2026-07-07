export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface WorkspaceMember {
  user: {
    _id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  description: string;
  logo: string | null;
  color: string;
  owner: {
    _id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  members: WorkspaceMember[];
  settings: {
    allowMemberInvite: boolean;
    defaultRole: string;
  };
  plan: 'free' | 'pro';
  createdAt: string;
  updatedAt: string;
  projectCount?: number;
}

export interface CreateWorkspaceData {
  name: string;
  description?: string;
  color?: string;
}
