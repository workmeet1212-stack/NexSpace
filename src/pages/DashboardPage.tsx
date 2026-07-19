import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useProjectStore } from '../store/projectStore';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TaskCardSkeleton, CardSkeleton } from '../components/ui/Skeleton';
import { UserAvatar } from '../components/common/UserAvatar';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate, formatRelative } from '../utils/formatDate';
import { CreateProjectModal } from '../components/modals/CreateProjectModal';
import { TaskCreateModal } from '../components/modals/TaskCreateModal';
import api from '../services/api';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Plus,
  ChevronRight,
  Sparkles,
  Calendar,
  Zap,
  X,
} from 'lucide-react';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const { projects, currentProject, setCurrentProject, fetchProjects } = useProjectStore();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [standup, setStandup] = useState<{ yesterday: string[]; today: string[]; blockers: string[] } | null>(null);
  const [standupLoading, setStandupLoading] = useState(false);

  useEffect(() => {
    if (!currentWorkspace) {
      fetchWorkspaces();
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (currentWorkspace?._id && projects.length === 0) {
      fetchProjects(currentWorkspace._id);
    }
  }, [currentWorkspace?._id]);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', currentWorkspace?._id],
    queryFn: async () => {
      if (!currentWorkspace?._id) return null;
      const response = await api.get(`/analytics/workspace/${currentWorkspace._id}/stats`);
      return response.data.data;
    },
    enabled: !!currentWorkspace?._id,
  });

  // Fetch my tasks - use tasks from current project or all projects
  const { data: myTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['my-tasks', currentWorkspace?._id],
    queryFn: async () => {
      if (!currentWorkspace?._id) return [];
      const response = await api.get(`/tasks/workspace/${currentWorkspace._id}/assigned`);
      return response.data.data?.slice(0, 5) || [];
    },
    enabled: !!currentWorkspace?._id,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const quickStats = [
    {
      label: 'My Tasks',
      value: stats?.totalTasks || 0,
      icon: CheckCircle2,
      color: 'bg-indigo-500',
      change: '+2 this week',
    },
    {
      label: 'In Progress',
      value: stats?.inProgressTasks || 0,
      icon: Clock,
      color: 'bg-blue-500',
      change: 'Active',
    },
    {
      label: 'Overdue',
      value: stats?.overdueTasks || 0,
      icon: AlertCircle,
      color: 'bg-red-500',
      change: 'Needs attention',
    },
    {
      label: 'Completed',
      value: stats?.completedTasks || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
      change: 'This month',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900">
          {getGreeting()}, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-500 mt-1">
          Here's what's happening across your workspace
        </p>
      </motion.div>

      {/* AI Standup Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border-0 overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm font-medium text-white/80">AI Assistant</span>
                </div>
                <h3 className="text-xl font-bold mb-2">Daily Standup Generator</h3>
                <p className="text-white/80 text-sm max-w-md">
                  Let AI help you prepare your standup update. It will summarize your progress and blockers.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4 bg-white/20 hover:bg-white/30 text-white border-0"
                  onClick={async () => {
                    const projectId = currentProject?._id || (projects.length > 0 ? projects[0]._id : null);
                    if (!projectId) {
                      toast.info('Create a project first');
                      return;
                    }
                    setStandupLoading(true);
                    try {
                      const response = await api.post(`/ai/standup`, { projectId });
                      setStandup(response.data.data || null);
                    } catch {
                      toast.error('Failed to generate standup');
                    } finally {
                      setStandupLoading(false);
                    }
                  }}
                  loading={standupLoading}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Standup
                </Button>
                {standup && (
                  <div className="mt-4 p-4 bg-white/10 rounded-lg text-sm text-white/90">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium">Your Standup</span>
                      <button
                        onClick={() => setStandup(null)}
                        className="text-white/60 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {standup.yesterday?.length > 0 && (
                      <div className="mb-2">
                        <span className="text-white/60">Yesterday:</span>
                        <ul className="list-disc list-inside mt-1">
                          {standup.yesterday.map((item: string, i: number) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                    {standup.today?.length > 0 && (
                      <div className="mb-2">
                        <span className="text-white/60">Today:</span>
                        <ul className="list-disc list-inside mt-1">
                          {standup.today.map((item: string, i: number) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                    {standup.blockers?.length > 0 && (
                      <div>
                        <span className="text-white/60">Blockers:</span>
                        <ul className="list-disc list-inside mt-1">
                          {standup.blockers.map((item: string, i: number) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="w-24 h-24 opacity-20">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {statsLoading ? '-' : stat.value}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{stat.change}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">My Tasks</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => {
                    if (currentProject?._id) {
                      navigate(`/project/${currentProject._id}/list`);
                    } else if (projects.length > 0) {
                      navigate(`/project/${projects[0]._id}/list`);
                    }
                  }}>
                  View all
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <TaskCardSkeleton key={i} />
                    ))}
                  </div>
                ) : myTasks?.length > 0 ? (
                  <div className="space-y-3">
                    {myTasks.map((task: any) => (
                      <button
                        key={task._id}
                        onClick={() => navigate(`/task/${task._id}`)}
                        className="w-full p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-400">
                              {task.taskId}
                            </span>
                            <PriorityBadge priority={task.priority} />
                          </div>
                          <StatusBadge status={task.status} />
                        </div>
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        {task.dueDate && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.dueDate)}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No tasks assigned to you</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => {
                        if (currentProject?._id || projects.length > 0) {
                          setShowCreateTask(true);
                        } else {
                          toast.info('Create a project first');
                          setShowCreateProject(true);
                        }
                      }}
                    >
                      Create a task
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Projects */}
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Projects</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateProject(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {projects.length > 0 ? (
                  <div className="space-y-2">
                    {projects.slice(0, 5).map((project) => (
                      <button
                        key={project._id}
                        onClick={() => {
                          setCurrentProject(project);
                          navigate(`/project/${project._id}/board`);
                        }}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          currentProject?._id === project._id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{project.icon || '📋'}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {project.name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {project.taskCounts?.total || 0} tasks
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No projects yet</p>
                    <Button variant="link" size="sm" className="mt-2" onClick={() => setShowCreateProject(true)}>
                      Create your first project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => {
          setShowCreateProject(false);
          queryClient.invalidateQueries({ queryKey: ['projects', currentWorkspace?._id] });
        }}
      />
      {showCreateTask && (currentProject?._id || projects.length > 0) && (
        <TaskCreateModal
          isOpen={showCreateTask}
          onClose={() => setShowCreateTask(false)}
          projectId={(currentProject?._id || projects[0]._id)!}
          projectMembers={(currentProject?.members || projects[0]?.members || [])}
          statuses={(currentProject?.settings?.taskStatuses || projects[0]?.settings?.taskStatuses || [])}
        />
      )}
    </div>
  );
};

export default DashboardPage;
