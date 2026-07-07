import React from 'react';
import { cn } from '../../utils/cn';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { UserAvatar } from '../common/UserAvatar';
import { Search, Bell, Command, MessageSquare, Menu } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { setCommandPaletteOpen } = useUIStore();
  const { user } = useAuthStore();
  const { currentProject } = useProjectStore();
  const [notificationCount] = React.useState(0);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        {currentProject && (
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentProject.icon || '📋'}</span>
            <h1 className="font-semibold text-gray-900">{currentProject.name}</h1>
            {currentProject.identifier && (
              <Badge variant="default" className="font-mono">
                {currentProject.identifier}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Center - Search */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 w-full max-w-md rounded-lg border border-gray-200',
          'text-gray-500 text-sm',
          'hover:bg-gray-50 hover:border-gray-300 transition-colors'
        )}
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Search tasks, projects...</span>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Command className="w-3 h-3" />
          <span>K</span>
        </div>
      </button>

      {/* Right */}
      <div className="flex items-center gap-2">
        {currentProject && (
          <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
            <MessageSquare className="w-5 h-5" />
          </button>
        )}

        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        <div className="ml-2">
          <UserAvatar name={user?.name || 'User'} src={user?.avatar} size="md" />
        </div>
      </div>
    </header>
  );
};

export default Header;
