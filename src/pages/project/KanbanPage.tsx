import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { useProjectStore } from '../../store/projectStore';
import { useTaskStore } from '../../store/taskStore';
import { KanbanColumn, KanbanColumnSkeleton } from '../../components/kanban/KanbanColumn';
import { KanbanCard } from '../../components/kanban/KanbanCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { NoTasksEmptyState } from '../../components/common/EmptyState';
import { Task } from '../../types/task.types';
import { Filter, Plus, Search, SortAsc } from 'lucide-react';
import { toast } from 'sonner';

const KanbanPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const { currentProject, setCurrentProject, fetchProjects } = useProjectStore();
  const { setCurrentTask } = useTaskStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

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
    const filtered = searchQuery
      ? tasks.filter((t: Task) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.taskId.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : tasks;

    return statuses.reduce((acc: Record<string, Task[]>, status) => {
      acc[status.name] = filtered.filter((t: Task) => t.status === status.name);
      return acc;
    }, {});
  }, [tasks, statuses, searchQuery]);

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

          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>

          <Button variant="outline" size="sm">
            <SortAsc className="w-4 h-4 mr-2" />
            Sort
          </Button>
        </div>

        <Button>
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
          <NoTasksEmptyState />
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
                  onTaskClick={(task) => setCurrentTask(task)}
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
    </div>
  );
};

export default KanbanPage;
