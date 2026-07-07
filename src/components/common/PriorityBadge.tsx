import React from 'react';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';
import { Priority } from '../../types/task.types';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

const priorityConfig: Record<Priority, { label: string; variant: 'danger' | 'warning' | 'info' | 'default'; color: string }> = {
  urgent: { label: 'Urgent', variant: 'danger', color: 'bg-red-500' },
  high: { label: 'High', variant: 'warning', color: 'bg-orange-500' },
  medium: { label: 'Medium', variant: 'info', color: 'bg-yellow-500' },
  low: { label: 'Low', variant: 'default', color: 'bg-blue-500' },
  none: { label: 'No priority', variant: 'default', color: 'bg-gray-400' },
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'sm' }) => {
  const config = priorityConfig[priority];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'gap-1',
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'text-sm px-2.5 py-1'
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.color)} />
      {config.label}
    </Badge>
  );
};

export default PriorityBadge;
