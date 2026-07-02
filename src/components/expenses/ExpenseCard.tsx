import { useState } from 'react';
import { Expense } from '@/types';
import { cn } from '@/lib/utils';
import { formatCurrency, formatRelativeTime, getInitials } from '@/lib/format';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CreditCard, Smartphone, Banknote, AlertTriangle, RefreshCw, Pencil, Trash2, Loader2 } from 'lucide-react';
import { categoryColors } from '@/data/mockData';
import { expensesApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EditExpenseModal } from '@/components/expenses/EditExpenseModal';

interface ExpenseCardProps {
  expense: Expense & { _id?: string };
  groupId?: string;
  showGroup?: boolean;
  className?: string;
}

const paymentIcons = {
  card: CreditCard,
  upi: Smartphone,
  cash: Banknote,
};

export function ExpenseCard({ expense, groupId, showGroup, className }: ExpenseCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const PaymentIcon = paymentIcons[expense.paymentMethod];
  const categoryColor = categoryColors[expense.category] || categoryColors['Other'];

  // Determine if the current user is the payer
  const paidById = typeof expense.paidBy === 'object'
    ? (expense.paidBy as any).id || (expense.paidBy as any)._id
    : expense.paidBy;
  const isOwner = user?.id === paidById;

  // Resolve expense ID (handles both _id and id)
  const expenseId = (expense as any)._id || expense.id || '';

  // Resolve groupId from the expense if not provided via props
  const resolvedGroupId = groupId
    || (typeof expense.groupId === 'object'
      ? (expense.groupId as any)._id || (expense.groupId as any).id
      : expense.groupId)
    || '';

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => expensesApi.delete(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Deleted', description: 'Expense deleted' });
      setDeleteOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: "Couldn't delete expense", variant: 'destructive' });
    },
  });

  return (
    <>
      <div
        className={cn(
          'group/card relative flex items-center gap-4 p-4 rounded-xl bg-card border border-border transition-all duration-200 hover:shadow-md',
          expense.isFlagged && 'border-warning/50 bg-warning-light/30',
          className
        )}
      >
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

        {/* Edit / Delete buttons — visible on hover, only if user is the payer */}
        {isOwner && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity duration-150">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                setEditOpen(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit expense</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">Delete expense</span>
            </Button>
          </div>
        )}
      </div>

      {/* Edit Expense Modal */}
      {editOpen && (
        <EditExpenseModal
          expense={expense as any}
          groupId={resolvedGroupId}
          onClose={() => setEditOpen(false)}
          onSuccess={() => setEditOpen(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse all balance changes for this expense in the group. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault(); // Prevent auto-close so we control it via onSuccess
                deleteMutation.mutate();
              }}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
