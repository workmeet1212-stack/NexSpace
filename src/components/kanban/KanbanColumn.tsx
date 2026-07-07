import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { Task } from '../../types/task.types';
import { Badge } from '../ui/Badge';
import { Plus, MoreHorizontal } from 'lucide-react';
import { LoadingSkeleton } from '../ui/Skeleton';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  color,
  tasks,
  onTaskClick,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 bg-gray-50 rounded-lg border-2 transition-colors ${
        isOver ? 'border-indigo-400 bg-indigo-50' : 'border-transparent'
      }`}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <h3 className="font-medium text-gray-900">{title}</h3>
            <Badge variant="default" className="text-xs">
              {tasks.length}
            </Badge>
          </div>
          <button className="p-1 rounded hover:bg-gray-200 transition-colors">
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Tasks */}
      <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
        <div className="p-2 space-y-2 min-h-[200px]">
          {tasks.map((task) => (
            <KanbanCard
              key={task._id}
              task={task}
              onClick={() => onTaskClick?.(task)}
            />
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No tasks
            </div>
          )}
        </div>
      </SortableContext>

      {/* Add task button */}
      <button className="w-full p-2 flex items-center justify-center gap-1 text-gray-500 hover:bg-gray-100 rounded-b-lg text-sm transition-colors">
        <Plus className="w-4 h-4" />
        Add task
      </button>
    </div>
  );
};

export const KanbanColumnSkeleton: React.FC = () => (
  <div className="w-72 shrink-0 bg-gray-50 rounded-lg p-3 space-y-3">
    <div className="flex items-center justify-between">
      <LoadingSkeleton className="h-5 w-24" />
      <LoadingSkeleton className="h-5 w-8 rounded-full" />
    </div>
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <LoadingSkeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  </div>
);

export default KanbanColumn;
