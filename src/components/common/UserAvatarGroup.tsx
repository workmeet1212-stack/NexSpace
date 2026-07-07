import React from 'react';
import { UserAvatar } from './UserAvatar';
import { cn } from '../../utils/cn';

interface User {
  _id: string;
  name: string;
  avatar: string | null;
}

interface UserAvatarGroupProps {
  users: User[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserAvatarGroup: React.FC<UserAvatarGroupProps> = ({
  users,
  max = 3,
  size = 'sm',
  className,
}) => {
  const displayedUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {displayedUsers.map((user, index) => (
        <div
          key={user._id}
          className="ring-2 ring-white rounded-full"
          style={{ zIndex: displayedUsers.length - index }}
        >
          <UserAvatar
            src={user.avatar}
            name={user.name}
            size={size}
          />
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-medium ring-2 ring-white',
            size === 'sm' && 'h-6 w-6 text-xs',
            size === 'md' && 'h-8 w-8 text-sm',
            size === 'lg' && 'h-10 w-10 text-base'
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export default UserAvatarGroup;
