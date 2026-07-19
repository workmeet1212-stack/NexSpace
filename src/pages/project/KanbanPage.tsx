import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import socketService from '../../services/socket.service';
import { useProjectStore } from '../../store/projectStore';
import { useTaskStore } from '../../store/taskStore';
import { useUIStore } from '../../store/uiStore';
import { KanbanColumn, KanbanColumnSkeleton } from '../../components/kanban/KanbanColumn';
import { KanbanCard } from '../../components/kanban/KanbanCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { NoTasksEmptyState } from '../../components/common/EmptyState';
import { TaskCreateModal } from '../../components/modals/TaskCreateModal';
import TaskDrawer from '../../components/drawers/TaskDrawer';
import { Task } from '../../types/task.types';
import { Filter, Plus, Search, SortAsc } from 'lucide-react';
import { toast } from 'sonner';

const KanbanPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const { currentProject, setCurrentProject, fetchProjects } = useProjectStore();
  const { currentTask, setCurrentTask } = useTaskStore();
  const { taskDrawerOpen, setTaskDrawerOpen } = useUIStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalStatus, setCreateModalStatus] = useState('Todo');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate' | 'priority'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Set current project from URL
  useEffect(() => {
    if (projectId && currentProject?._id !== projectId) {
      const project = useProjectStore.getState().projects.find(p => p._id === projectId);
      if (project) {
        setCurrentProject(project);
      }
    }
  }, [projectId, currentProject?._id]);

  // Socket.io real-time updates
  useEffect(() => {
    if (projectId && socketService.connected) {
      socketService.joinProject(projectId);

      // Listen for task updates
      socketService.on('task:created', (data: Task) => {
        queryClient.setQueryData(['tasks', projectId], (old: Task[] | undefined) => {
          if (!old) return [data];
          return [data, ...old];
        });
        toast.success(`New task: ${data.title}`);
      });

      socketService.on('task:updated', (data: Task) => {
        queryClient.setQueryData(['tasks', projectId], (old: Task[] | undefined) => {
          if (!old) return old;
          return old.map((t) => (t._id === data._id ? data : t));
        });
        if (currentTask?._id === data._id) {
          setCurrentTask(data);
        }
      });

      socketService.on('task:deleted', (data: { taskId: string }) => {
        queryClient.setQueryData(['tasks', projectId], (old: Task[] | undefined) => {
          if (!old) return old;
          return old.filter((t) => t._id !== data.taskId);
        });
        if (currentTask?._id === data.taskId) {
          setTaskDrawerOpen(false);
        }
      });

      socketService.on('task:moved', (data: Task) => {
        queryClient.setQueryData(['tasks', projectId], (old: Task[] | undefined) => {
          if (!old) return old;
          return old.map((t) => (t._id === data._id ? data : t));
        });
      });
    }

    return () => {
      if (projectId) {
        socketService.leaveProject(projectId);
        socketService.off('task:created');
        socketService.off('task:updated');
        socketService.off('task:deleted');
        socketService.off('task:moved');
      }
    };
  }, [projectId, socketService.connected]);

  // Fetch tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const response = await api.get(`/tasks/project/${projectId}`);
      return response.data.data?.items || response.data.data || [];
    },
    enabled: !!projectId,
  });

  // Move task mutation
  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, newStatus, newOrder }: { taskId: string; newStatus: string; newOrder: number }) => {
      const response = await api.patch(`/tasks/${taskId}/move`, { newStatus, newOrder });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: () => {
      toast.error('Failed to move task');
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  // Get statuses from project
  const statuses = currentProject?.settings?.taskStatuses || [
    { name: 'Backlog', color: '#94a3b8', category: 'todo' },
    { name: 'Todo', color: '#64748b', category: 'todo' },
    { name: 'In Progress', color: '#3b82f6', category: 'in_progress' },
    { name: 'In Review', color: '#f59e0b', category: 'in_progress' },
    { name: 'Done', color: '#22c55e', category: 'done' },
  ];

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    if (!tasks) return {};
    let filtered = searchQuery
      ? tasks.filter((t: Task) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.taskId.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [...tasks];

    if (filterPriority !== 'all') {
      filtered = filtered.filter((t: Task) => t.priority === filterPriority);
    }

    if (filterAssignee !== 'all') {
      filtered = filtered.filter((t: Task) =>
        t.assignees?.some((a) => a._id === filterAssignee)
      );
    }

    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
    filtered.sort((a: Task, b: Task) => {
      let cmp = 0;
      if (sortBy === 'priority') {
        cmp = priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (sortBy === 'dueDate') {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        cmp = aDate - bDate;
      } else {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return statuses.reduce((acc: Record<string, Task[]>, status) => {
      acc[status.name] = filtered.filter((t: Task) => t.status === status.name);
      return acc;
    }, {});
  }, [tasks, statuses, searchQuery, filterPriority, filterAssignee, sortBy, sortOrder]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks?.find((t: Task) => t._id === active.id);
    if (!activeTask) return;

    // Find target status
    let targetStatus = activeTask.status;
    statuses.forEach((status) => {
      if (over.id === status.name) {
        targetStatus = status.name;
      }
    });

    if (targetStatus !== activeTask.status) {
      moveTaskMutation.mutate({
        taskId: activeTask._id,
        newStatus: targetStatus,
        newOrder: tasksByStatus[targetStatus]?.length || 0,
      });
    }
  };

  const handleAddTask = (status: string) => {
    setCreateModalStatus(status);
    setShowCreateModal(true);
  };

  const handleTaskClick = (task: Task) => {
    setCurrentTask(task);
    setTaskDrawerOpen(true);
  };

  const activeTask = tasks?.find((t: Task) => t._id === activeId);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
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

          <div className="relative">
            <Button
              variant={showFilterDropdown ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowFilterDropdown(!showFilterDropdown);
                setShowSortDropdown(false);
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            {showFilterDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-30 w-56">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="all">All priorities</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="none">No priority</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Assignee</label>
                    <select
                      value={filterAssignee}
                      onChange={(e) => setFilterAssignee(e.target.value)}
                      className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="all">All assignees</option>
                      {currentProject?.members?.map((m) => (
                        <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
                      ))}
                    </select>
                  </div>
                  {(filterPriority !== 'all' || filterAssignee !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setFilterPriority('all');
                        setFilterAssignee('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <Button
              variant={showSortDropdown ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowSortDropdown(!showSortDropdown);
                setShowFilterDropdown(false);
              }}
            >
              <SortAsc className="w-4 h-4 mr-2" />
              Sort
            </Button>
            {showSortDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-30 w-48">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sort by</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="createdAt">Date created</option>
                    <option value="dueDate">Due date</option>
                    <option value="priority">Priority</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <Button onClick={() => handleAddTask('Todo')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {statuses.map((status) => (
            <KanbanColumnSkeleton key={status.name} />
          ))}
        </div>
      ) : tasks?.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <NoTasksEmptyState onCreateTask={() => handleAddTask('Todo')} />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
            <SortableContext
              items={statuses.map((s) => s.name)}
              strategy={verticalListSortingStrategy}
            >
              {statuses.map((status) => (
                <KanbanColumn
                  key={status.name}
                  id={status.name}
                  title={status.name}
                  color={status.color}
                  tasks={tasksByStatus[status.name] || []}
                  onTaskClick={handleTaskClick}
                  onAddTask={() => handleAddTask(status.name)}
                />
              ))}
            </SortableContext>
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="rotate-3 opacity-90">
                <KanbanCard task={activeTask} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Task Create Modal */}
      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projectId={projectId!}
        defaultStatus={createModalStatus}
        projectMembers={currentProject?.members}
        statuses={statuses}
      />

      {/* Task Drawer */}
      <TaskDrawer
        isOpen={taskDrawerOpen}
        onClose={() => setTaskDrawerOpen(false)}
        task={currentTask}
        projectId={projectId!}
        projectMembers={currentProject?.members}
        statuses={statuses}
      />
    </div>
  );
};

export default KanbanPage;
