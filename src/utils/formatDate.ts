import { format, formatDistanceToNow, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy');
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy h:mm a');
};

export const formatDateShort = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d');
};

export const formatRelative = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
};

export const formatDueDate = (date: string | Date | null): { text: string; color: string } => {
  if (!date) return { text: 'No due date', color: 'text-gray-400' };

  const d = typeof date === 'string' ? parseISO(date) : date;

  if (isPast(d) && !isToday(d)) {
    return { text: formatDateShort(d), color: 'text-red-600 bg-red-50' };
  }

  if (isToday(d)) {
    return { text: 'Today', color: 'text-orange-600 bg-orange-50' };
  }

  if (isTomorrow(d)) {
    return { text: 'Tomorrow', color: 'text-yellow-600 bg-yellow-50' };
  }

  return { text: formatDateShort(d), color: 'text-gray-600 bg-gray-50' };
};

export const isOverdue = (date: string | Date | null): boolean => {
  if (!date) return false;
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isPast(d) && !isToday(d);
};
