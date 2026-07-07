import * as React from 'react';
import { cn } from '../../utils/cn';

interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const LoadingSkeleton = React.forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('animate-pulse rounded-lg bg-gray-200', className)}
      {...props}
    />
  )
);
LoadingSkeleton.displayName = 'LoadingSkeleton';

const CardSkeleton: React.FC = () => (
  <div className="rounded-xl border bg-white p-6">
    <LoadingSkeleton className="h-6 w-3/4 mb-4" />
    <LoadingSkeleton className="h-4 w-full mb-2" />
    <LoadingSkeleton className="h-4 w-2/3" />
  </div>
);

const TaskCardSkeleton: React.FC = () => (
  <div className="rounded-lg border bg-white p-4">
    <div className="flex items-start justify-between mb-3">
      <LoadingSkeleton className="h-4 w-16" />
      <LoadingSkeleton className="h-5 w-5 rounded-full" />
    </div>
    <LoadingSkeleton className="h-5 w-full mb-2" />
    <LoadingSkeleton className="h-4 w-2/3 mb-4" />
    <div className="flex items-center justify-between">
      <LoadingSkeleton className="h-6 w-20 rounded-full" />
      <LoadingSkeleton className="h-6 w-6 rounded-full" />
    </div>
  </div>
);

const TableRowSkeleton: React.FC = () => (
  <tr>
    <td className="p-4"><LoadingSkeleton className="h-4 w-4" /></td>
    <td className="p-4"><LoadingSkeleton className="h-4 w-32" /></td>
    <td className="p-4"><LoadingSkeleton className="h-4 w-24" /></td>
    <td className="p-4"><LoadingSkeleton className="h-4 w-20" /></td>
    <td className="p-4"><LoadingSkeleton className="h-6 w-20 rounded-full" /></td>
    <td className="p-4"><LoadingSkeleton className="h-8 w-8 rounded-full" /></td>
  </tr>
);

export { LoadingSkeleton, CardSkeleton, TaskCardSkeleton, TableRowSkeleton };
