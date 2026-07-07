import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Flag, Users, Tag, MessageSquare,
  Activity, CheckCircle2, Clock, ChevronDown, Edit2, Trash2, MoreHorizontal
} from 'lucide-react';
import api from '../../services/api';
import { Task, Priority } from '../../types/task.types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { UserAvatar } from '../common/UserAvatar';
import { PriorityBadge } from '../common/PriorityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate, formatRelative } from '../../utils/formatDate';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  projectId: string;
  projectMembers?: { user: { _id: string; name: string; email: string; avatar: string | null }; role: string }[];
  statuses?: { name: string; color: string }[];
}

const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'none', label: 'No priority' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const TaskDrawer: React.FC<TaskDrawerProps> = ({
  isOpen,
  onClose,
  task,
  projectId,
  projectMembers = [],
  statuses = [],
}) => {
  const queryClient = useQueryClient();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('none');
  const [status, setStatus] = useState('');
  const [comment, setComment] = useState('');
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description?.toString() || '');
      setPriority(task.priority);
      setStatus(task.status);
    }
  }, [task]);

  const { data: activityLog } = useQuery({
    queryKey: ['task-activity', task?._id],
    queryFn: async () => {
      const response = await api.get(`/tasks/${task?._id}/activity`);
      return response.data.data;
    },
    enabled: !!task?._id,
  });

  const { data: comments } = useQuery({
    queryKey: ['task-comments', task?._id],
    queryFn: async () => {
      const response = await api.get(`/tasks/${task?._id}/comments`);
      return response.data.data;
    },
    enabled: !!task?._id,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      const response = await api.patch(`/tasks/${task?._id}`, updates);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['task', task?._id] });
      setEditingField(null);
      toast.success('Task updated');
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/tasks/${task?._id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      onClose();
      toast.success('Task deleted');
    },
    onError: () => {
      toast.error('Failed to delete task');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await api.post(`/tasks/${task?._id}/comments`, { content });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', task?._id] });
      setComment('');
      toast.success('Comment added');
    },
  });

  const handleUpdateTitle = () => {
    if (title.trim() && title !== task?.title) {
      updateTaskMutation.mutate({ title: title.trim() });
    } else {
      setEditingField(null);
    }
  };

  const handleUpdateDescription = () => {
    updateTaskMutation.mutate({ description });
    setEditingField(null);
  };

  const handleUpdatePriority = (newPriority: Priority) => {
    setPriority(newPriority);
    updateTaskMutation.mutate({ priority: newPriority });
    setShowPriorityDropdown(false);
  };

  const handleUpdateStatus = (newStatus: string) => {
    setStatus(newStatus);
    updateTaskMutation.mutate({ status: newStatus });
    setShowStatusDropdown(false);
  };

  if (!isOpen || !task) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/30"
          onClick={onClose}
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-white w-full max-w-xl h-full shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {task.taskId}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => deleteTaskMutation.mutate()}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                {editingField === 'title' ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleUpdateTitle}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle()}
                    className="w-full text-xl font-semibold bg-transparent border-b-2 border-indigo-500 focus:outline-none pb-1"
                    autoFocus
                  />
                ) : (
                  <h2
                    onClick={() => setEditingField('title')}
                    className="text-xl font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 py-0.5"
                  >
                    {task.title}
                  </h2>
                )}
              </div>

              {/* Properties Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 w-full justify-between"
                  >
                    <StatusBadge status={status} />
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 w-full">
                      {statuses.map((s) => (
                        <button
                          key={s.name}
                          onClick={() => handleUpdateStatus(s.name)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full',
                            status === s.name && 'bg-indigo-50'
                          )}
                        >
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                  <button
                    onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 w-full justify-between"
                  >
                    <PriorityBadge priority={priority} />
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {showPriorityDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 w-full">
                      {priorityOptions.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => handleUpdatePriority(p.value)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full',
                            priority === p.value && 'bg-indigo-50'
                          )}
                        >
                          <Flag className="w-4 h-4" />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assignees */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Assignees</label>
                  <div className="flex items-center gap-1 flex-wrap">
                    {task.assignees.length > 0 ? (
                      task.assignees.map((assignee) => (
                        <div key={assignee._id} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2 py-1">
                          <UserAvatar name={assignee.name} src={assignee.avatar} size="sm" />
                          <span className="text-xs font-medium">{assignee.name}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Due date</label>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                  </div>
                </div>

                {/* Story Points */}
                {task.storyPoints !== null && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Story points</label>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded">
                        {task.storyPoints}
                      </span>
                    </div>
                  </div>
                )}

                {/* Created */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Created</label>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {formatRelative(task.createdAt)}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Description</label>
                {editingField === 'description' ? (
                  <div className="space-y-2">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateDescription}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingField('description')}
                    className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 min-h-[80px]"
                  >
                    {description || (
                      <span className="text-gray-400 italic">Add a description...</span>
                    )}
                  </div>
                )}
              </div>

              {/* Activity */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Activity</span>
                </div>
                <div className="space-y-2 pl-6 border-l-2 border-gray-100">
                  {(activityLog || []).slice(0, 10).map((activity: any, index: number) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium text-gray-700">{activity.user?.name || 'System'}</span>
                      <span className="text-gray-500"> {activity.action} </span>
                      <span className="text-xs text-gray-400 ml-2">{formatRelative(activity.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Comments</span>
                </div>

                <div className="space-y-4 mb-4">
                  {(comments || []).map((comment: any) => (
                    <div key={comment._id} className="flex gap-3">
                      <UserAvatar name={comment.user?.name} src={comment.user?.avatar} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">{comment.user?.name}</span>
                          <span className="text-xs text-gray-400">{formatRelative(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <UserAvatar name="You" size="sm" />
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && comment.trim()) {
                          addCommentMutation.mutate(comment.trim());
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => comment.trim() && addCommentMutation.mutate(comment.trim())}
                      disabled={!comment.trim()}
                      loading={addCommentMutation.isPending}
                    >
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TaskDrawer;
