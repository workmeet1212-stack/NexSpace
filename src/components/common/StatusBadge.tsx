import React from 'react';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';

interface StatusBadgeProps {
  status: string;
  color?: string;
  size?: 'sm' | 'md';
}

const defaultStatusColors: Record<string, string> = {
  'Backlog': '#94a3b8',
  'Todo': '#64748b',
  'In Progress': '#3b82f6',
  'In Review': '#f59e0b',
  'Done': '#22c55e',
  'Blocked': '#ef4444',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  color,
  size = 'sm',
}) => {
  const displayColor = color || defaultStatusColors[status] || '#6b7280';

  return (
    <Badge
      className={cn(
        'gap-1.5 font-normal',
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'text-sm px-2.5 py-1'
      )}
      style={{
        backgroundColor: `${displayColor}15`,
        color: displayColor,
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: displayColor }}
      />
      {status}
    </Badge>
  );
};

export default StatusBadge;
