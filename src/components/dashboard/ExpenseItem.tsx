import { Expense } from '@/types';
import { cn } from '@/lib/utils';
import { formatCurrency, formatRelativeTime, getInitials } from '@/lib/format';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Smartphone, Banknote, AlertTriangle, RefreshCw } from 'lucide-react';
import { categoryColors } from '@/data/mockData';

interface ExpenseItemProps {
  expense: Expense;
  showGroup?: boolean;
  className?: string;
}

const paymentIcons = {
  card: CreditCard,
  upi: Smartphone,
  cash: Banknote,
};

export function ExpenseItem({ expense, showGroup, className }: ExpenseItemProps) {
  const PaymentIcon = paymentIcons[expense.paymentMethod];
  const categoryColor = categoryColors[expense.category] || categoryColors['Other'];

  return (
    <div className={cn(
      'group flex items-center gap-4 p-4 rounded-xl bg-card border border-border transition-all duration-200 hover:shadow-md',
      expense.isFlagged && 'border-warning/50 bg-warning-light/30',
      className
    )}>
      {/* Category indicator */}
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${categoryColor}20` }}
      >
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: categoryColor }}
        />
      </div>

      {/* Expense details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-foreground truncate">{expense.description}</h4>
          {expense.isFlagged && (
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          )}
          {expense.isRecurring && (
            <RefreshCw className="h-4 w-4 text-info shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <Avatar className="h-5 w-5">
            <AvatarImage src={expense.paidBy.avatar} />
            <AvatarFallback className="text-[10px] bg-secondary">
              {getInitials(expense.paidBy.name)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{expense.paidBy.name}</span>
          <span className="text-border">•</span>
          <span>{formatRelativeTime(expense.date)}</span>
        </div>
      </div>

      {/* Payment method & amount */}
      <div className="text-right shrink-0">
        <p className="font-semibold text-foreground">{formatCurrency(expense.amount)}</p>
        <div className="flex items-center justify-end gap-1.5 mt-1">
          <PaymentIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground capitalize">{expense.paymentMethod}</span>
        </div>
      </div>
    </div>
  );
}
