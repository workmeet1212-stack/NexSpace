import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types/task.types';
import { PriorityBadge } from '../common/PriorityBadge';
import { UserAvatarGroup } from '../common/UserAvatarGroup';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';
import { formatDueDate } from '../../utils/formatDate';
import { GripVertical, MessageSquare, Paperclip } from 'lucide-react';

interface KanbanCardProps {
  task: Task;
  onClick?: () => void;
}

const priorityBorders: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-blue-500',
  none: 'border-l-gray-200',
};

export const KanbanCard: React.FC<KanbanCardProps> = ({ task, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dueInfo = formatDueDate(task.dueDate);

  const subtaskProgress = task.subTasks?.length > 0
    ? `${task.subTasks.filter(st => st).length}/${task.subTasks.length}`
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg border-l-4 shadow-sm cursor-pointer transition-all',
        'hover:shadow-md hover:border-l-indigo-300',
        isDragging && 'opacity-50 shadow-xl',
        priorityBorders[task.priority]
      )}
      {...attributes}
    >
      <div className="p-3">
        {/* Drag handle */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-gray-400">{task.taskId}</span>
          <button
            className="cursor-grab p-1 -mr-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
            {...listeners}
          >
            <GripVertical className="w-3 h-3 text-gray-400" />
          </button>
        </div>

        {/* Labels */}
        {task.labels?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.labels.slice(0, 3).map((label, i) => (
              <Badge key={i} variant="info" className="text-xs">
                {label}
              </Badge>
            ))}
            {task.labels.length > 3 && (
              <span className="text-xs text-gray-400">+{task.labels.length - 3}</span>
            )}
          </div>
        )}

        {/* Title */}
        <h4 className="font-medium text-gray-900 text-sm leading-snug line-clamp-2 mb-2">
          {task.title}
        </h4>

        {/* Subtask progress */}
        {subtaskProgress && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{
                  width: `${(task.subTasks?.filter(st => st).length / task.subTasks.length) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs text-gray-400">{subtaskProgress}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Due date */}
            {task.dueDate && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                dueInfo.color
              )}>
                {dueInfo.text}
              </span>
            )}

            {/* Story points */}
            {task.storyPoints && (
              <Badge variant="default" className="text-xs">
                {task.storyPoints} pts
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Comment count */}
            {task.attachments?.length > 0 && (
              <div className="flex items-center gap-0.5 text-gray-400">
                <Paperclip className="w-3 h-3" />
                <span className="text-xs">{task.attachments.length}</span>
              </div>
            )}

            {/* Assignees */}
            {task.assignees?.length > 0 && (
              <UserAvatarGroup
                users={task.assignees}
                max={2}
                size="sm"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanCard;
