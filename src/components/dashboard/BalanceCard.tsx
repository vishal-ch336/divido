import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BalanceCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function BalanceCard({ title, amount, subtitle, trend, className }: BalanceCardProps) {
  const isPositive = amount > 0;
  const isNegative = amount < 0;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-6 shadow-card transition-all duration-300 hover:shadow-lg',
        isPositive && 'bg-gradient-to-br from-credit-light to-background border border-credit/20',
        isNegative && 'bg-gradient-to-br from-debit-light to-background border border-debit/20',
        !isPositive && !isNegative && 'bg-card border border-border',
        className
      )}
    >
      {/* Background decoration */}
      <div className={cn(
        'absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10',
        isPositive && 'bg-credit',
        isNegative && 'bg-debit',
        !isPositive && !isNegative && 'bg-muted-foreground'
      )} />
      
      <div className="relative">
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className={cn(
            'text-3xl font-bold tracking-tight',
            isPositive && 'text-credit',
            isNegative && 'text-debit',
            !isPositive && !isNegative && 'text-foreground'
          )}>
            {formatCurrency(Math.abs(amount))}
          </span>
          {trend && (
            <span className={cn(
              'flex items-center text-xs font-medium',
              trend === 'up' && 'text-credit',
              trend === 'down' && 'text-debit',
              trend === 'neutral' && 'text-muted-foreground'
            )}>
              {trend === 'up' && <TrendingUp className="h-3 w-3 mr-0.5" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 mr-0.5" />}
              {trend === 'neutral' && <Minus className="h-3 w-3 mr-0.5" />}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
        )}
        
        {/* Status indicator */}
        <div className="mt-4 flex items-center gap-2">
          <div className={cn(
            'h-2 w-2 rounded-full',
            isPositive && 'bg-credit animate-pulse',
            isNegative && 'bg-debit animate-pulse',
            !isPositive && !isNegative && 'bg-muted-foreground'
          )} />
          <span className="text-xs text-muted-foreground">
            {isPositive ? 'You are owed' : isNegative ? 'You owe' : 'All settled'}
          </span>
        </div>
      </div>
    </div>
  );
}
