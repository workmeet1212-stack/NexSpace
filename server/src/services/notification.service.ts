import { Notification, INotification, NotificationType } from '../models/Notification.model';
import mongoose from 'mongoose';

interface CreateNotificationParams {
  recipientId: string;
  senderId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: INotification['data'];
}

export const createNotification = async (
  params: CreateNotificationParams
): Promise<INotification> => {
  const notification = new Notification({
    recipient: params.recipientId,
    sender: params.senderId || null,
    type: params.type,
    title: params.title,
    message: params.message,
    data: params.data || {},
  });

  await notification.save();
  return notification;
};

export const notifyTaskAssigned = async (
  assigneeIds: string[],
  task: any,
  assignerId: string
): Promise<void> => {
  const notifications = assigneeIds.map((assigneeId) =>
    createNotification({
      recipientId: assigneeId,
      senderId: assignerId,
      type: 'task_assigned',
      title: 'Task Assigned',
      message: `You have been assigned to "${task.title}"`,
      data: {
        taskId: task._id.toString(),
        projectId: task.project._id?.toString() || task.project.toString(),
      },
    })
  );

  await Promise.all(notifications);
};

export const notifyTaskComment = async (
  recipientIds: string[],
  task: any,
  commenterName: string,
  commentId: string
): Promise<void> => {
  const notifications = recipientIds.map((recipientId) =>
    createNotification({
      recipientId,
      senderId: task.createdBy.toString(),
      type: 'task_comment',
      title: 'New Comment',
      message: `${commenterName} commented on "${task.title}"`,
      data: {
        taskId: task._id.toString(),
        projectId: task.project._id?.toString() || task.project.toString(),
        commentId,
      },
    })
  );

  await Promise.all(notifications);
};

export const notifyMention = async (
  mentionedUserIds: string[],
  task: any,
  commenterName: string,
  commentId: string
): Promise<void> => {
  const notifications = mentionedUserIds.map((userId) =>
    createNotification({
      recipientId: userId,
      senderId: task.createdBy.toString(),
      type: 'task_mentioned',
      title: 'You were mentioned',
      message: `${commenterName} mentioned you in "${task.title}"`,
      data: {
        taskId: task._id.toString(),
        projectId: task.project._id?.toString() || task.project.toString(),
        commentId,
      },
    })
  );

  await Promise.all(notifications);
};

export const notifySprintStarted = async (
  memberIds: string[],
  sprint: any,
  project: any
): Promise<void> => {
  const notifications = memberIds.map((memberId) =>
    createNotification({
      recipientId: memberId,
      type: 'sprint_started',
      title: 'Sprint Started',
      message: `Sprint "${sprint.name}" has started in ${project.name}`,
      data: {
        sprintId: sprint._id.toString(),
        projectId: project._id.toString(),
      },
    })
  );

  await Promise.all(notifications);
};

export const notifySprintCompleted = async (
  memberIds: string[],
  sprint: any,
  project: any
): Promise<void> => {
  const notifications = memberIds.map((memberId) =>
    createNotification({
      recipientId: memberId,
      type: 'sprint_completed',
      title: 'Sprint Completed',
      message: `Sprint "${sprint.name}" has been completed in ${project.name}`,
      data: {
        sprintId: sprint._id.toString(),
        projectId: project._id.toString(),
      },
    })
  );

  await Promise.all(notifications);
};

export const notifyWorkspaceInvite = async (
  inviteeId: string,
  inviterId: string,
  workspaceName: string,
  workspaceId: string
): Promise<void> => {
  await createNotification({
    recipientId: inviteeId,
    senderId: inviterId,
    type: 'workspace_invite',
    title: 'Workspace Invitation',
    message: `You've been invited to join "${workspaceName}"`,
    data: {
      workspaceId,
    },
  });
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  return Notification.countDocuments({
    recipient: new mongoose.Types.ObjectId(userId),
    read: false,
  });
};

export const markAsRead = async (notificationId: string): Promise<void> => {
  await Notification.findByIdAndUpdate(notificationId, {
    read: true,
    readAt: new Date(),
  });
};

export const markAllAsRead = async (userId: string): Promise<void> => {
  await Notification.updateMany(
    { recipient: new mongoose.Types.ObjectId(userId), read: false },
    { read: true, readAt: new Date() }
  );
};
