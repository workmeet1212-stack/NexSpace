export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface TaskAssignee {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface TaskAttachment {
  _id: string;
  filename: string;
  url: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Task {
  _id: string;
  taskId: string;
  title: string;
  description: any;
  status: string;
  priority: Priority;
  project: string;
  workspace: string;
  assignees: TaskAssignee[];
  createdBy: TaskAssignee;
  labels: string[];
  dueDate: string | null;
  startDate: string | null;
  completedAt: string | null;
  storyPoints: number | null;
  parentTask: string | null;
  subTasks: string[];
  blockedBy: string[];
  blocks: string[];
  attachments: TaskAttachment[];
  sprint: string | null;
  order: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  title: string;
  description?: any;
  status?: string;
  priority?: Priority;
  projectId: string;
  assignees?: string[];
  labels?: string[];
  dueDate?: string | null;
  startDate?: string | null;
  storyPoints?: number | null;
  parentTask?: string | null;
  sprint?: string | null;
}

export interface UpdateTaskData {
  title?: string;
  description?: any;
  status?: string;
  priority?: Priority;
  assignees?: string[];
  labels?: string[];
  dueDate?: string | null;
  startDate?: string | null;
  storyPoints?: number | null;
  sprint?: string | null;
}

export interface MoveTaskData {
  newStatus: string;
  newOrder: number;
}

export interface BulkUpdateData {
  taskIds: string[];
  updates: Partial<UpdateTaskData>;
}
