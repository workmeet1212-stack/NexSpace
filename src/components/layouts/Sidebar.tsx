import React from 'react';
import { cn } from '../../utils/cn';
import { NavLink, useLocation } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { UserAvatar } from '../common/UserAvatar';
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Moon,
  Sun,
  Monitor,
  Users,
  LogOut,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '../../types/project.types';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { workspaces, currentWorkspace } = useWorkspaceStore();
  const { projects, currentProject, setCurrentProject, fetchProjects } = useProjectStore();
  const { sidebarCollapsed, setSidebarCollapsed, theme, setTheme } = useUIStore();
  const { user, logout } = useAuthStore();
  const [projectsExpanded, setProjectsExpanded] = React.useState(true);

  React.useEffect(() => {
    if (currentWorkspace?._id) {
      fetchProjects(currentWorkspace._id);
    }
  }, [currentWorkspace?._id]);

  const projectId = location.pathname.split('/')[2];

  const navItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/dashboard',
      active: location.pathname === '/dashboard',
    },
    ...(currentProject
      ? [
          {
            icon: FolderKanban,
            label: 'Board',
            path: `/project/${currentProject._id}/board`,
          },
          {
            icon: ListTodo,
            label: 'List',
            path: `/project/${currentProject._id}/list`,
          },
          {
            icon: Zap,
            label: 'Sprint',
            path: `/project/${currentProject._id}/sprint`,
          },
          {
            icon: BarChart3,
            label: 'Analytics',
            path: `/project/${currentProject._id}/analytics`,
          },
        ]
      : []),
  ];

  const cycleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      className={cn(
        'h-screen bg-gray-900 text-white flex flex-col fixed left-0 top-0 z-40',
        'border-r border-gray-800'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="font-bold text-lg">NexSpace</span>
          </motion.div>
        )}
        {sidebarCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-lg">N</span>
          </div>
        )}
      </div>

      {/* Workspace Selector */}
      {!sidebarCollapsed && (
        <div className="px-3 py-3">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-sm font-medium"
              style={{ backgroundColor: currentWorkspace?.color || '#6366f1' }}
            >
              {currentWorkspace?.name?.charAt(0) || 'W'}
            </div>
            <span className="flex-1 text-left text-sm truncate">
              {currentWorkspace?.name || 'Select workspace'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>

        {/* Projects Section */}
        {!sidebarCollapsed && (
          <div className="mt-6">
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"
            >
              <span>Projects</span>
              {projectsExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            <AnimatePresence>
              {projectsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 mt-1"
                >
                  {projects.map((project) => (
                    <button
                      key={project._id}
                      onClick={() => setCurrentProject(project)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                        currentProject?._id === project._id
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      )}
                    >
                      <span className="text-lg">{project.icon || '📋'}</span>
                      <span className="truncate flex-1 text-left">
                        {project.name}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                    </button>
                  ))}

                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span>New Project</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-800 p-3 space-y-1">
        <NavLink
          to="/workspace/members"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )
          }
        >
          <Users className="w-5 h-5" />
          {!sidebarCollapsed && <span>Members</span>}
        </NavLink>

        <NavLink
          to="/workspace/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )
          }
        >
          <Settings className="w-5 h-5" />
          {!sidebarCollapsed && <span>Settings</span>}
        </NavLink>

        <button
          onClick={cycleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <ThemeIcon className="w-5 h-5" />
          {!sidebarCollapsed && <span className="capitalize">{theme}</span>}
        </button>

        {/* User */}
        {!sidebarCollapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 mt-2 border-t border-gray-800 pt-3">
            <UserAvatar name={user.name} src={user.avatar} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>
    </motion.aside>
  );
};

export default Sidebar;
