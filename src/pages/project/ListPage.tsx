import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useProjectStore } from '../../store/projectStore';
import { useTaskStore } from '../../store/taskStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { UserAvatar } from '../../components/common/UserAvatar';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Spinner } from '../../components/ui/Spinner';
import { Task } from '../../types/task.types';
import {
  Search, Plus, Filter, SortAsc, ChevronDown, CheckSquare,
  MoreHorizontal, Edit, Trash2, Checkbox
} from 'lucide-react';
import { formatDate } from '../../utils/formatDate';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';

const ListPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentProject } = useProjectStore();
  const { setCurrentTask } = useTaskStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate' | 'priority'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const response = await api.get(`/tasks/project/${projectId}`);
      return response.data.data?.items || response.data.data || [];
    },
    enabled: !!projectId,
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ taskIds, updates }: { taskIds: string[]; updates: any }) => {
      const response = await api.patch('/tasks/bulk', { taskIds, updates });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setSelectedTasks([]);
      toast.success('Tasks updated');
    },
    onError: () => toast.error('Failed to update tasks'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  // Statuses from project
  const statuses = currentProject?.settings?.taskStatuses || [
    { name: 'Backlog', color: '#94a3b8' },
    { name: 'Todo', color: '#64748b' },
    { name: 'In Progress', color: '#3b82f6' },
    { name: 'In Review', color: '#f59e0b' },
    { name: 'Done', color: '#22c55e' },
  ];

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    let result = tasks.filter((task: Task) => !task.isDeleted);

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t: Task) =>
          t.title.toLowerCase().includes(query) ||
          t.taskId.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (filterStatus !== 'all') {
      result = result.filter((t: Task) => t.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      result = result.filter((t: Task) => t.priority === filterPriority);
    }

    // Sort
    result.sort((a: Task, b: Task) => {
      let comparison = 0;
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (sortBy === 'dueDate') {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        comparison = aDate - bDate;
      } else {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [tasks, searchQuery, filterStatus, filterPriority, sortBy, sortOrder]);

  const toggleSelectTask = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map((t: Task) => t._id));
    }
  };

  const handleBulkStatusUpdate = (newStatus: string) => {
    if (selectedTasks.length > 0) {
      bulkUpdateMutation.mutate({ taskIds: selectedTasks, updates: { status: newStatus } });
    }
  };

  const isAllSelected = selectedTasks.length === filteredTasks.length && filteredTasks.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 w-64"
            />
          </div>

          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>

          <Button variant="outline" size="sm">
            <SortAsc className="w-4 h-4 mr-2" />
            Sort
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex gap-3"
        >
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="none">No priority</option>
          </select>
        </motion.div>
      )}

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <div className="mb-4 flex items-center gap-3 p-2 bg-indigo-50 rounded-lg">
          <span className="text-sm text-indigo-700">{selectedTasks.length} selected</span>
          <div className="h-4 w-px bg-indigo-200" />
          <select
            onChange={(e) => {
              if (e.target.value) handleBulkStatusUpdate(e.target.value);
            }}
            className="text-sm px-2 py-1 border border-indigo-300 rounded bg-white"
          >
            <option value="">Change status...</option>
            {statuses.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTasks([])}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <CheckSquare className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-lg">No tasks found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchQuery ? 'Try a different search' : 'Create a task to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="w-12 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignees
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTasks.map((task: Task) => (
                  <tr
                    key={task._id}
                    onClick={() => setCurrentTask(task)}
                    className={cn(
                      'hover:bg-gray-50 cursor-pointer transition-colors',
                      selectedTasks.includes(task._id) && 'bg-indigo-50'
                    )}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedTasks.includes(task._id)}
                        onChange={() => toggleSelectTask(task._id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-gray-500">{task.taskId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900 truncate block max-w-xs">
                        {task.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex -space-x-1">
                        {task.assignees.slice(0, 3).map((a) => (
                          <UserAvatar key={a._id} name={a.name} src={a.avatar} size="sm" />
                        ))}
                        {task.assignees.length > 3 && (
                          <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 border-2 border-white">
                            +{task.assignees.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {task.dueDate ? formatDate(task.dueDate) : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ListPage;
