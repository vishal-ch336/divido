import { useState, useEffect } from 'react';
import { DebtRelation } from '@/types';
import { cn } from '@/lib/utils';
import { formatCurrency, getInitials } from '@/lib/format';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, CheckCircle, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { settlementsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';

interface DebtSummaryProps {
  debts: DebtRelation[];
  currentUserId: string;
  groupId: string;
  className?: string;
  onSettlementCreated?: () => void;
}

interface PendingSettlement {
  id: string;
  fromUser: { id: string; name: string; avatar?: string };
  toUser: { id: string; name: string; avatar?: string };
  amount: number;
  createdAt: Date;
}

export function DebtSummary({ debts, currentUserId, groupId, className, onSettlementCreated }: DebtSummaryProps) {
  const { toast } = useToast();
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtRelation | null>(null);
  const [settling, setSettling] = useState(false);
  const [pendingSettlements, setPendingSettlements] = useState<PendingSettlement[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [loadingSettlements, setLoadingSettlements] = useState(false);

  // Fetch pending settlements involving current user
  useEffect(() => {
    fetchPendingSettlements();
  }, [currentUserId, groupId]);

  const fetchPendingSettlements = async () => {
    setLoadingSettlements(true);
    try {
      const allSettlements = await settlementsApi.getAll(groupId || undefined, 'pending');

      // Transform and filter settlements where current user is the recipient
      const pendingToConfirm = allSettlements
        .filter((s: any) => {
          const toUserId = typeof s.toUser === 'object' ? (s.toUser.id || s.toUser._id) : s.toUser;
          return toUserId === currentUserId;
        })
        .map((s: any) => ({
          id: s.id || s._id,
          fromUser: {
            id: typeof s.fromUser === 'object' ? (s.fromUser.id || s.fromUser._id) : s.fromUser,
            name: typeof s.fromUser === 'object' ? s.fromUser.name : 'Unknown',
            avatar: typeof s.fromUser === 'object' ? s.fromUser.avatar : undefined,
          },
          toUser: {
            id: typeof s.toUser === 'object' ? (s.toUser.id || s.toUser._id) : s.toUser,
            name: typeof s.toUser === 'object' ? s.toUser.name : 'Unknown',
            avatar: typeof s.toUser === 'object' ? s.toUser.avatar : undefined,
          },
          amount: s.amount,
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
        }));

      setPendingSettlements(pendingToConfirm);
    } catch (error) {
      console.error('Error fetching pending settlements:', error);
      setPendingSettlements([]);
    } finally {
      setLoadingSettlements(false);
    }
  };

  const handleConfirmPayment = async (settlementId: string) => {
    setConfirmingId(settlementId);
    try {
      await settlementsApi.confirm(settlementId);
      toast({
        title: 'Success!',
        description: 'Payment confirmed successfully',
      });

      // Refresh pending settlements
      await fetchPendingSettlements();

      // Notify parent to refresh all dashboard data including debt calculations
      if (onSettlementCreated) {
        onSettlementCreated();
      }
    } catch (error) {
      console.error('Confirm settlement error:', error);
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to confirm payment',
        variant: 'destructive',
      });
    } finally {
      setConfirmingId(null);
    }
  };

  // Filter debts involving current user
  console.log('🔍 DebtSummary props.debts:', debts.map(d => ({ from: d.fromUser.name, to: d.toUser.name, amount: d.amount })));

  const youOwe = debts.filter(d => d.fromUser.id === currentUserId);
  const owedToYou = debts.filter(d => d.toUser.id === currentUserId);

  console.log('🔍 youOwe:', youOwe.map(d => ({ to: d.toUser.name, amount: d.amount })));
  console.log('🔍 owedToYou:', owedToYou.map(d => ({ from: d.fromUser.name, amount: d.amount })));

  const handleSettleClick = (debt: DebtRelation) => {
    setSelectedDebt(debt);
    setSettleDialogOpen(true);
  };

  const handleConfirmSettle = async () => {
    if (!selectedDebt) return;

    setSettling(true);
    try {
      await settlementsApi.create({
        groupId,
        fromUser: selectedDebt.fromUser.id,
        toUser: selectedDebt.toUser.id,
        amount: selectedDebt.amount,
        paymentMethod: 'upi',
        note: 'Settled from Who Owes Whom',
      });

      toast({
        title: 'Success!',
        description: 'Settlement created successfully',
      });

      setSettleDialogOpen(false);
      setSelectedDebt(null);

      // Notify parent to refresh data
      if (onSettlementCreated) {
        onSettlementCreated();
      }
    } catch (error) {
      console.error('Settlement creation error:', error);
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to create settlement',
        variant: 'destructive',
      });
    } finally {
      setSettling(false);
    }
  };


  if (debts.length === 0 && pendingSettlements.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <CheckCircle className="h-12 w-12 text-credit mx-auto mb-3" />
        <p className="text-lg font-medium text-foreground">All Settled!</p>
        <p className="text-sm text-muted-foreground mt-1">No pending balances in this group</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* Pending Settlements Awaiting Confirmation */}
        {pendingSettlements.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Pending Payments to Confirm</h4>
            {pendingSettlements.map((settlement, index) => (
              <div
                key={settlement.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-warning-light/30 border border-warning/20"
              >
                <Avatar className="h-10 w-10 border-2 border-warning/30">
                  <AvatarImage src={settlement.fromUser.avatar} />
                  <AvatarFallback className="bg-warning/10 text-warning text-sm">
                    {getInitials(settlement.fromUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{settlement.fromUser.name}</p>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Waiting for confirmation</span>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className="font-bold text-foreground">{formatCurrency(settlement.amount)}</p>
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs bg-credit hover:bg-credit/90 h-8 px-3"
                    onClick={() => handleConfirmPayment(settlement.id)}
                    disabled={confirmingId === settlement.id}
                  >
                    {confirmingId === settlement.id ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      'Confirm'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-debit hover:text-debit hover:bg-debit/10 mt-1 h-7 px-2"
                    onClick={() => handleSettleClick(debt)}
                  >
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

      {/* Settlement Confirmation Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Settlement</DialogTitle>
            <DialogDescription>
              {selectedDebt && (
                <>
                  You are about to create a settlement for{' '}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(selectedDebt.amount)}
                  </span>{' '}
                  from{' '}
                  <span className="font-semibold text-foreground">
                    {selectedDebt.fromUser.name}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-foreground">
                    {selectedDebt.toUser.name}
                  </span>.
                  <br />
                  <br />
                  This will be recorded as pending until confirmed by the recipient.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSettleDialogOpen(false)}
              disabled={settling}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmSettle}
              disabled={settling}
            >
              {settling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Settlement'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
