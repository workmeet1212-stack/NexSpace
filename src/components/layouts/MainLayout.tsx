import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '../../store/uiStore';
import { cn } from '../../utils/cn';

const MainLayout: React.FC = () => {
  const { sidebarCollapsed, taskDrawerOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        )}
      >
        <Header />
        <main
          className={cn(
            'min-h-[calc(100vh-4rem)] p-6',
            taskDrawerOpen && 'mr-[480px]'
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
