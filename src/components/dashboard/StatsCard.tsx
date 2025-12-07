import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function StatsCard({ title, value, subtitle, icon: Icon, iconColor, className }: StatsCardProps) {
  return (
    <div className={cn(
      'bg-card rounded-xl p-5 border border-border shadow-card transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          'flex h-11 w-11 items-center justify-center rounded-xl',
          iconColor || 'bg-primary/10 text-primary'
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
