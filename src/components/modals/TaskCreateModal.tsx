import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Tag, Users, Flag, Hash, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Priority, PriorityBadge } from '../common/PriorityBadge';
import { UserAvatar } from '../common/UserAvatar';
import { toast } from 'sonner';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  defaultStatus?: string;
  projectMembers?: { user: { _id: string; name: string; email: string; avatar: string | null }; role: string }[];
  statuses?: { name: string; color: string }[];
}

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'none', label: 'No priority', color: 'bg-gray-100 text-gray-600' },
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-600' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
];

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  isOpen,
  onClose,
  projectId,
  defaultStatus = 'Todo',
  projectMembers = [],
  statuses = [],
}) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState<Priority>('none');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [storyPoints, setStoryPoints] = useState<number | ''>('');
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/tasks', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Task created successfully');
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create task');
    },
  });

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setStatus(defaultStatus);
    setPriority('none');
    setAssignees([]);
    setDueDate('');
    setStoryPoints('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }

    createTaskMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      projectId,
      assignees: assignees.length > 0 ? assignees : undefined,
      dueDate: dueDate || undefined,
      storyPoints: storyPoints || undefined,
    });
  };

  const toggleAssignee = (userId: string) => {
    setAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectedPriority = priorityOptions.find((p) => p.value === priority);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Create new task</h2>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form id="create-task-form" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Title */}
            <div>
              <Input
                placeholder="Task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base font-medium"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <textarea
                placeholder="Add description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Status */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <button
                type="button"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 w-full justify-between"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: statuses.find((s) => s.name === status)?.color || '#94a3b8' }}
                  />
                  {status}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showStatusDropdown && statuses.length > 0 && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-full">
                  {statuses.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => {
                        setStatus(s.name);
                        setShowStatusDropdown(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full"
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <button
                type="button"
                onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 w-full justify-between"
              >
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-gray-400" />
                  <PriorityBadge priority={priority} />
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showPriorityDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-full">
                  {priorityOptions.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setPriority(p.value);
                        setShowPriorityDropdown(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full ${p.color}`}
                    >
                      <Flag className="w-4 h-4" />
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assignees */}
            {projectMembers.length > 0 && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assignees</label>
                <button
                  type="button"
                  onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    {assignees.length > 0
                      ? `${assignees.length} selected`
                      : 'Unassigned'}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showAssigneeDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-full max-h-48 overflow-y-auto">
                    {projectMembers.map((member) => {
                      const isSelected = assignees.includes(member.user._id);
                      return (
                        <button
                          key={member.user._id}
                          type="button"
                          onClick={() => toggleAssignee(member.user._id)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full ${
                            isSelected ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-center w-4 h-4 border rounded">
                            {isSelected && (
                              <svg className="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 12 12">
                                <path d="M4 9.5L1 6.5L2.5 5L4 6.5L9.5 1L11 2.5L4 9.5Z" />
                              </svg>
                            )}
                          </div>
                          <UserAvatar name={member.user.name} src={member.user.avatar} size="sm" />
                          <span className="truncate">{member.user.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Due Date & Story Points */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Due date</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    icon={<Calendar className="w-4 h-4" />}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Story points</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={storyPoints}
                  onChange={(e) => setStoryPoints(e.target.value ? Number(e.target.value) : '')}
                  icon={<Hash className="w-4 h-4" />}
                />
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" form="create-task-form" onClick={handleSubmit} loading={createTaskMutation.isPending}>
              Create task
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TaskCreateModal;
