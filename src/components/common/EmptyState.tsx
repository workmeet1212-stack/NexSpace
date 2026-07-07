import React from 'react';
import { cn } from '../../utils/cn';
import { FileText, FolderOpen, Search, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
        {icon || <FileText className="w-8 h-8" />}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 text-center max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

export const NoTasksEmptyState: React.FC<{ onAdd?: () => void; onCreateTask?: () => void }> = ({ onAdd, onCreateTask }) => (
  <EmptyState
    icon={<FolderOpen className="w-8 h-8" />}
    title="No tasks yet"
    description="Create your first task to get started with this project."
    action={
      (onAdd || onCreateTask) && (
        <button
          onClick={onAdd || onCreateTask}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Add a task
        </button>
      )
    }
  />
);

export const NoResultsState: React.FC<{ query?: string }> = ({ query }) => (
  <EmptyState
    icon={<Search className="w-8 h-8" />}
    title="No results found"
    description={
      query
        ? `No tasks matching "${query}" were found.`
        : 'No tasks match your current filters.'
    }
  />
);

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <EmptyState
    icon={<AlertCircle className="w-8 h-8 text-red-400" />}
    title="Something went wrong"
    description={message || 'An error occurred while loading data.'}
    action={
      onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Try again
        </button>
      )
    }
  />
);

export default EmptyState;
