import { DebtRelation } from '@/types';
import { cn } from '@/lib/utils';
import { formatCurrency, getInitials } from '@/lib/format';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DebtSummaryProps {
  debts: DebtRelation[];
  currentUserId: string;
  className?: string;
}

export function DebtSummary({ debts, currentUserId, className }: DebtSummaryProps) {
  // Filter debts involving current user
  const youOwe = debts.filter(d => d.fromUser.id === currentUserId);
  const owedToYou = debts.filter(d => d.toUser.id === currentUserId);

  if (debts.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <CheckCircle className="h-12 w-12 text-credit mx-auto mb-3" />
        <p className="text-lg font-medium text-foreground">All Settled!</p>
        <p className="text-sm text-muted-foreground mt-1">No pending balances in this group</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {youOwe.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">You Owe</h4>
          {youOwe.map((debt, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 rounded-xl bg-debit-light/50 border border-debit/10"
            >
              <Avatar className="h-10 w-10 border-2 border-debit/20">
                <AvatarImage src={debt.toUser.avatar} />
                <AvatarFallback className="bg-debit/10 text-debit text-sm">
                  {getInitials(debt.toUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-foreground">{debt.toUser.name}</p>
                <p className="text-sm text-muted-foreground">Pay to settle</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-debit">{formatCurrency(debt.amount)}</p>
                <Button variant="ghost" size="sm" className="text-xs text-debit hover:text-debit hover:bg-debit/10 mt-1 h-7 px-2">
                  Settle Up
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {owedToYou.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Owed to You</h4>
          {owedToYou.map((debt, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 rounded-xl bg-credit-light/50 border border-credit/10"
            >
              <Avatar className="h-10 w-10 border-2 border-credit/20">
                <AvatarImage src={debt.fromUser.avatar} />
                <AvatarFallback className="bg-credit/10 text-credit text-sm">
                  {getInitials(debt.fromUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-foreground">{debt.fromUser.name}</p>
                <p className="text-sm text-muted-foreground">Owes you</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-credit">{formatCurrency(debt.amount)}</p>
                <Button variant="ghost" size="sm" className="text-xs text-credit hover:text-credit hover:bg-credit/10 mt-1 h-7 px-2">
                  Remind
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Other debts in the group */}
      {debts.filter(d => d.fromUser.id !== currentUserId && d.toUser.id !== currentUserId).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Other Balances</h4>
          {debts
            .filter(d => d.fromUser.id !== currentUserId && d.toUser.id !== currentUserId)
            .map((debt, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={debt.fromUser.avatar} />
                  <AvatarFallback className="bg-secondary text-xs">
                    {getInitials(debt.fromUser.name)}
                  </AvatarFallback>
                </Avatar>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Avatar className="h-8 w-8">
                  <AvatarImage src={debt.toUser.avatar} />
                  <AvatarFallback className="bg-secondary text-xs">
                    {getInitials(debt.toUser.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground ml-1">
                  {debt.fromUser.name.split(' ')[0]} → {debt.toUser.name.split(' ')[0]}
                </span>
                <span className="ml-auto text-sm font-medium text-foreground">
                  {formatCurrency(debt.amount)}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
