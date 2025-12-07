import { Link } from 'react-router-dom';
import { Group } from '@/types';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Users, ChevronRight, Receipt } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface GroupCardProps {
  group: Group;
  userBalance?: number;
  className?: string;
}

export function GroupCard({ group, userBalance = 0, className }: GroupCardProps) {
  const isPositive = userBalance > 0;
  const isNegative = userBalance < 0;

  return (
    <Link
      to={`/groups/${group.id}`}
      className={cn(
        'group block rounded-xl bg-card border border-border p-5 shadow-card transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {group.name}
            </h3>
            {group.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {group.description}
              </p>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {group.memberCount}
          </span>
          <span className="flex items-center gap-1.5">
            <Receipt className="h-4 w-4" />
            {formatCurrency(group.totalExpenses)}
          </span>
        </div>
        
        <div className={cn(
          'text-sm font-semibold px-3 py-1 rounded-full',
          isPositive && 'bg-credit-light text-credit',
          isNegative && 'bg-debit-light text-debit',
          !isPositive && !isNegative && 'bg-muted text-muted-foreground'
        )}>
          {isPositive && '+'}
          {userBalance !== 0 ? formatCurrency(userBalance) : 'Settled'}
        </div>
      </div>
    </Link>
  );
}
