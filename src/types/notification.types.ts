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

export interface Notification {
  _id: string;
  recipient: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  type: NotificationType;
  title: string;
  message: string;
  data: {
    taskId?: string;
    projectId?: string;
    workspaceId?: string;
    sprintId?: string;
    commentId?: string;
  };
  read: boolean;
  readAt: string | null;
  createdAt: string;
}
