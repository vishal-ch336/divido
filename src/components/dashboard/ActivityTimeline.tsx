import { ActivityLog } from '@/types';
import { cn } from '@/lib/utils';
import { formatRelativeTime, getInitials } from '@/lib/format';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Receipt,
  Edit,
  Trash2,
  ArrowLeftRight,
  CheckCircle,
  UserPlus,
  UserMinus,
  AlertTriangle,
} from 'lucide-react';

interface ActivityTimelineProps {
  activities: ActivityLog[];
  className?: string;
}

const actionIcons = {
  expense_created: { icon: Receipt, color: 'text-info bg-info-light' },
  expense_edited: { icon: Edit, color: 'text-warning bg-warning-light' },
  expense_deleted: { icon: Trash2, color: 'text-debit bg-debit-light' },
  settlement_created: { icon: ArrowLeftRight, color: 'text-primary bg-secondary' },
  settlement_confirmed: { icon: CheckCircle, color: 'text-credit bg-credit-light' },
  member_added: { icon: UserPlus, color: 'text-accent bg-accent/10' },
  member_removed: { icon: UserMinus, color: 'text-muted-foreground bg-muted' },
  expense_flagged: { icon: AlertTriangle, color: 'text-warning bg-warning-light' },
};

export function ActivityTimeline({ activities, className }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {activities.map((activity, index) => {
        const { icon: Icon, color } = actionIcons[activity.action];
        const isLast = index === activities.length - 1;

        return (
          <div key={activity.id} className="relative flex gap-4 pb-4">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-5 top-12 bottom-0 w-px bg-border" />
            )}

            {/* Icon */}
            <div className={cn(
              'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              color
            )}>
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={activity.user.avatar} />
                  <AvatarFallback className="text-[10px] bg-secondary">
                    {getInitials(activity.user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">
                  {activity.user.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(activity.createdAt)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{activity.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
