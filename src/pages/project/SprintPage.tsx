import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useProjectStore } from '../../store/projectStore';
import { useTaskStore } from '../../store/taskStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { KanbanCard } from '../../components/kanban/KanbanCard';
import TaskDrawer from '../../components/drawers/TaskDrawer';
import { Task } from '../../types/task.types';
import {
  Plus, Calendar, Play, Pause, ChevronDown, CheckCircle,
  Clock, ListTodo, BarChart2, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';

const SprintPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const { currentProject } = useProjectStore();
  const { setCurrentTask, currentTask } = useTaskStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newSprintName, setNewSprintName] = useState('');
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Fetch sprints
  const { data: sprints, isLoading: sprintsLoading } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: async () => {
      const response = await api.get(`/sprints/project/${projectId}`);
      return response.data.data || [];
    },
    enabled: !!projectId,
  });

  // Fetch backlog tasks
  const { data: backlogTasks, isLoading: backlogLoading } = useQuery({
    queryKey: ['backlog-tasks', projectId],
    queryFn: async () => {
      const response = await api.get(`/tasks/project/${projectId}`, {
        params: { sprint: 'none' }
      });
      return response.data.data?.items || response.data.data || [];
    },
    enabled: !!projectId,
  });

  // Create sprint mutation
  const createSprintMutation = useMutation({
    mutationFn: async (data: { name: string; startDate: string; endDate: string }) => {
      const response = await api.post('/sprints', {
        ...data,
        projectId
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
      setNewSprintName('');
      setShowNewSprint(false);
      toast.success('Sprint created');
    },
    onError: () => toast.error('Failed to create sprint'),
  });

  // Start sprint mutation
  const startSprintMutation = useMutation({
    mutationFn: async ({ sprintId, startDate, endDate }: { sprintId: string; startDate: string; endDate: string }) => {
      const response = await api.patch(`/sprints/${sprintId}/start`, { startDate, endDate });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
      toast.success('Sprint started');
    },
    onError: () => toast.error('Failed to start sprint'),
  });

  // Complete sprint mutation
  const completeSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      const response = await api.patch(`/sprints/${sprintId}/complete`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Sprint completed');
    },
    onError: () => toast.error('Failed to complete sprint'),
  });

  // Move task mutation
  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, sprintId }: { taskId: string; sprintId: string | null }) => {
      const response = await api.patch(`/tasks/${taskId}`, { sprint: sprintId });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Determine target sprint
    let targetSprintId: string | null = null;
    if (overId === 'backlog') {
      targetSprintId = null;
    } else if (overId.startsWith('sprint-')) {
      targetSprintId = overId.replace('sprint-', '');
    }

    moveTaskMutation.mutate({ taskId, sprintId: targetSprintId });
  };

  const activeTask = [...(backlogTasks || []), ...(sprints?.flatMap((s: any) => s.tasks || []) || [])]
    .find((t: Task) => t._id === activeId);

  const isLoading = sprintsLoading || backlogLoading;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sprints</h1>
        <Button onClick={() => setShowNewSprint(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Sprint
        </Button>
      </div>

      {/* New Sprint Form */}
      {showNewSprint && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50"
        >
          <h3 className="font-medium mb-3">Create new sprint</h3>
          <div className="flex gap-3">
            <Input
              placeholder="Sprint name"
              value={newSprintName}
              onChange={(e) => setNewSprintName(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => {
                if (newSprintName.trim()) {
                  const startDate = new Date().toISOString();
                  const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
                  createSprintMutation.mutate({ name: newSprintName.trim(), startDate, endDate });
                }
              }}
              loading={createSprintMutation.isPending}
            >
              Create
            </Button>
            <Button variant="outline" onClick={() => setShowNewSprint(false)}>
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Active Sprint */}
            {sprints?.filter((s: any) => s.status === 'active').map((sprint: any) => (
              <Card key={sprint._id} className="border-l-4 border-l-indigo-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Play className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle>{sprint.name}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {sprint.tasks?.filter((t: Task) => t.status === 'Done').length || 0} / {sprint.tasks?.length || 0} completed
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => completeSprintMutation.mutate(sprint._id)}
                        loading={completeSprintMutation.isPending}
                      >
                        Complete Sprint
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className="min-h-[100px] p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
                    id={`sprint-${sprint._id}`}
                  >
                    {sprint.tasks?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sprint.tasks.map((task: Task) => (
                          <KanbanCard
                            key={task._id}
                            task={task}
                            onClick={() => {
                              setCurrentTask(task);
                              setDrawerOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
                        Drag tasks here or add from backlog
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Future Sprints */}
            {sprints?.filter((s: any) => s.status === 'planned').map((sprint: any) => (
              <Card key={sprint._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Pause className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <CardTitle>{sprint.name}</CardTitle>
                        <span className="text-sm text-gray-500">Planned</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const startDate = new Date().toISOString();
                        const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
                        startSprintMutation.mutate({ sprintId: sprint._id, startDate, endDate });
                      }}
                    >
                      Start Sprint
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className="min-h-[100px] p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
                    id={`sprint-${sprint._id}`}
                  >
                    {sprint.tasks?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sprint.tasks.map((task: Task) => (
                          <KanbanCard
                            key={task._id}
                            task={task}
                            onClick={() => {
                              setCurrentTask(task);
                              setDrawerOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
                        Drag tasks here
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Backlog */}
            <Card className="border-t-4 border-t-gray-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <ListTodo className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle>Backlog</CardTitle>
                    <span className="text-sm text-gray-500">
                      {backlogTasks?.length || 0} tasks
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="min-h-[100px] p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
                  id="backlog"
                >
                  {backlogTasks?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {backlogTasks.map((task: Task) => (
                        <KanbanCard
                          key={task._id}
                          task={task}
                          onClick={() => {
                            setCurrentTask(task);
                            setDrawerOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
                      No tasks in backlog
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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

      <TaskDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        task={currentTask}
        projectId={projectId!}
        projectMembers={currentProject?.members}
        statuses={currentProject?.settings?.taskStatuses}
      />
    </div>
  );
};

export default SprintPage;
