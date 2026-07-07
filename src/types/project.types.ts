export type ProjectRole = 'lead' | 'member' | 'viewer';
export type ProjectStatus = 'active' | 'archived';
export type ProjectTemplate = 'kanban' | 'scrum' | 'bug-tracking' | 'custom';

export interface TaskStatus {
  name: string;
  color: string;
  order: number;
  category: 'todo' | 'in_progress' | 'done';
}

export interface ProjectMember {
  user: {
    _id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  role: ProjectRole;
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  identifier: string;
  icon: string;
  color: string;
  workspace: string | {
    _id: string;
    name: string;
    slug: string;
  };
  members: ProjectMember[];
  status: ProjectStatus;
  template: ProjectTemplate;
  settings: {
    taskStatuses: TaskStatus[];
    defaultAssignee: string | null;
  };
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  taskCounts?: Record<string, number>;
}

export interface CreateProjectData {
  name: string;
  identifier?: string;
  description?: string;
  color?: string;
  icon?: string;
  template?: ProjectTemplate;
  workspaceId: string;
}
