import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, Smartphone, Banknote, Users, Percent, Hash, Loader2 } from 'lucide-react';
import { expenseCategories } from '@/data/mockData';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { groupsApi, expensesApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type SplitType = 'equal' | 'percentage' | 'share';
type PaymentMethod = 'cash' | 'upi' | 'card';

interface GroupMember {
  userId: {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    avatar?: string;
  } | string;
  role: string;
  balance: number;
  isGuest?: boolean;
  guestName?: string;
}

interface ExpenseData {
  _id?: string;
  id?: string;
  groupId: string | { _id?: string; id?: string; name?: string };
  description: string;
  amount: number;
  paidBy: { id?: string; _id?: string; name: string } | string;
  paidTo?: string;
  paymentMethod: PaymentMethod;
  splitType: SplitType;
  splits: Array<{
    userId: string | { id?: string; _id?: string; name?: string };
    amount: number;
    percentage?: number;
    shares?: number;
    isPaid?: boolean;
  }>;
  category: string;
  date: string | Date;
}

interface EditExpenseModalProps {
  expense: ExpenseData;
  groupId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'card', label: 'Card', icon: CreditCard },
];

const splitTypes = [
  { value: 'equal', label: 'Equal', icon: Users, description: 'Split equally among participants' },
  { value: 'percentage', label: 'Percentage', icon: Percent, description: 'Split by custom percentages' },
  { value: 'share', label: 'Shares', icon: Hash, description: 'Split by number of shares' },
];

// Helper to extract an ID string from various shapes
function extractId(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value?.id || value?._id || String(value);
}

export function EditExpenseModal({ expense, groupId, onClose, onSuccess }: EditExpenseModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loadingMembers, setLoadingMembers] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  // Form state — prefilled from the expense
  const [amount, setAmount] = useState(String(expense.amount));
  const [description, setDescription] = useState(expense.description);
  const [category, setCategory] = useState(expense.category);
  const [paidBy, setPaidBy] = useState(extractId(expense.paidBy));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(expense.paymentMethod || 'upi');
  const [splitType, setSplitType] = useState<SplitType>(expense.splitType || 'equal');
  const [participants, setParticipants] = useState<string[]>(
    expense.splits.map((s) => extractId(s.userId)).filter(Boolean)
  );
  const [participantPercentages, setParticipantPercentages] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (expense.splitType === 'percentage') {
      expense.splits.forEach((s) => {
        const id = extractId(s.userId);
        if (id && s.percentage !== undefined) map[id] = s.percentage;
      });
    }
    return map;
  });
  const [participantShares, setParticipantShares] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (expense.splitType === 'share') {
      expense.splits.forEach((s) => {
        const id = extractId(s.userId);
        if (id && s.shares !== undefined) map[id] = s.shares;
      });
    }
    return map;
  });

  // Fetch group members on mount
  useEffect(() => {
    fetchGroupMembers();
  }, []);

  const fetchGroupMembers = async () => {
    setLoadingMembers(true);
    try {
      const group = await groupsApi.getById(groupId);
      const members = group?.members || [];
      setGroupMembers(members);
    } catch (error) {
      console.error('Error fetching group members:', error);
      setGroupMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const getMemberId = (member: GroupMember): string => {
    if (member.isGuest) return '';
    return extractId(member.userId);
  };

  const getMemberName = (member: GroupMember): string => {
    if (member.isGuest) return member.guestName || 'Guest';
    if (typeof member.userId === 'string') return 'Unknown';
    return member.userId?.name || 'Unknown';
  };

  const toggleParticipant = (userId: string) => {
    setParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Calculate split amounts — mirrors AddExpenseDialog logic
  const calculateSplits = () => {
    if (!amount || participants.length === 0) return [];

    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) return [];

    const splits: Array<{
      userId: string;
      amount: number;
      percentage?: number;
      shares?: number;
      isPaid: boolean;
    }> = [];

    if (splitType === 'equal') {
      const splitAmount = totalAmount / participants.length;
      participants.forEach((userId) => {
        splits.push({ userId, amount: splitAmount, isPaid: false });
      });
    } else if (splitType === 'percentage') {
      const totalPercentage = participants.reduce(
        (sum, userId) => sum + (participantPercentages[userId] || 0),
        0
      );
      if (Math.abs(totalPercentage - 100) > 0.01) return null; // Invalid

      participants.forEach((userId) => {
        const percentage = participantPercentages[userId] || 0;
        splits.push({
          userId,
          amount: (totalAmount * percentage) / 100,
          percentage,
          isPaid: false,
        });
      });
    } else if (splitType === 'share') {
      const totalShares = participants.reduce(
        (sum, userId) => sum + (participantShares[userId] || 0),
        0
      );
      if (totalShares === 0) return null;

      participants.forEach((userId) => {
        const shares = participantShares[userId] || 0;
        splits.push({
          userId,
          amount: (totalAmount * shares) / totalShares,
          shares,
          isPaid: false,
        });
      });
    }

    return splits;
  };

  const splits = calculateSplits();
  const totalSplitAmount = splits ? splits.reduce((sum, s) => sum + s.amount, 0) : 0;
  const hasSplitError = splits === null;

  // Mutation
  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof expensesApi.update>[1]) => {
      const expenseId = expense._id || expense.id || '';
      return expensesApi.update(expenseId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({
        title: 'Success',
        description: 'Expense updated',
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update expense',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }
    if (!description.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter a description', variant: 'destructive' });
      return;
    }
    if (!category) {
      toast({ title: 'Validation Error', description: 'Please select a category', variant: 'destructive' });
      return;
    }
    if (!paidBy) {
      toast({ title: 'Validation Error', description: 'Please select who paid', variant: 'destructive' });
      return;
    }
    if (participants.length === 0) {
      toast({ title: 'Validation Error', description: 'Please select at least one participant', variant: 'destructive' });
      return;
    }
    if (hasSplitError) {
      const msg = splitType === 'percentage'
        ? 'Percentages must add up to 100%'
        : 'Please enter valid shares for all participants';
      toast({ title: 'Validation Error', description: msg, variant: 'destructive' });
      return;
    }
    if (!splits || splits.length === 0) {
      toast({ title: 'Validation Error', description: 'Failed to calculate splits', variant: 'destructive' });
      return;
    }

    updateMutation.mutate({
      description: description.trim(),
      amount: parseFloat(amount),
      category,
      splitType,
      splits,
      date: new Date().toISOString(),
      paymentMethod,
    });
  };

  const loading = updateMutation.isPending;

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !loading) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="edit-amount">Amount (₹) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-lg font-semibold h-12"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description *</Label>
            <Input
              id="edit-description"
              placeholder="What was this expense for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Category & Paid By */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory} required disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paid By *</Label>
              <Select
                value={paidBy}
                onValueChange={setPaidBy}
                required
                disabled={loading || loadingMembers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingMembers ? 'Loading...' : 'Who paid?'} />
                </SelectTrigger>
                <SelectContent>
                  {groupMembers
                    .filter((m) => !m.isGuest)
                    .map((member) => {
                      const memberId = getMemberId(member);
                      const memberName = getMemberName(member);
                      return (
                        <SelectItem key={memberId} value={memberId}>
                          {memberName}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <div className="flex gap-2">
              {paymentMethods.map((method) => (
                <Button
                  key={method.value}
                  type="button"
                  variant={paymentMethod === method.value ? 'default' : 'outline'}
                  className="flex-1 gap-2"
                  onClick={() => setPaymentMethod(method.value as PaymentMethod)}
                  disabled={loading}
                >
                  <method.icon className="h-4 w-4" />
                  {method.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Split Type */}
          <div className="space-y-3">
            <Label>Split Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {splitTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSplitType(type.value as SplitType)}
                  disabled={loading}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all',
                    splitType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50',
                    loading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <type.icon className={cn(
                    'h-5 w-5',
                    splitType === type.value ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <span className={cn(
                    'text-sm font-medium',
                    splitType === type.value ? 'text-primary' : 'text-foreground'
                  )}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-3">
            <Label>Split Between *</Label>
            {loadingMembers ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading members...</span>
              </div>
            ) : groupMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center p-4">
                No members found in this group
              </p>
            ) : (
              <>
                <div className="space-y-2 rounded-lg border border-border p-3">
                  {groupMembers
                    .filter((m) => !m.isGuest)
                    .map((member) => {
                      const memberId = getMemberId(member);
                      const memberName = getMemberName(member);
                      const isParticipant = participants.includes(memberId);
                      const split = splits?.find((s) => s.userId === memberId);

                      return (
                        <div key={memberId} className="space-y-2">
                          <label className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                            <div className="flex items-center gap-3 flex-1">
                              <Checkbox
                                checked={isParticipant}
                                onCheckedChange={() => toggleParticipant(memberId)}
                                disabled={loading}
                              />
                              <span className="font-medium">{memberName}</span>
                            </div>
                            {isParticipant && split && (
                              <span className="text-sm font-semibold text-foreground">
                                {formatCurrency(split.amount)}
                              </span>
                            )}
                          </label>

                          {/* Percentage input */}
                          {isParticipant && splitType === 'percentage' && (
                            <div className="ml-8">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="Percentage"
                                value={participantPercentages[memberId] || ''}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  setParticipantPercentages((prev) => ({
                                    ...prev,
                                    [memberId]: value,
                                  }));
                                }}
                                className="h-8 text-sm"
                                disabled={loading}
                              />
                              <span className="text-xs text-muted-foreground ml-2">%</span>
                            </div>
                          )}

                          {/* Shares input */}
                          {isParticipant && splitType === 'share' && (
                            <div className="ml-8">
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                placeholder="Shares"
                                value={participantShares[memberId] || ''}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  setParticipantShares((prev) => ({
                                    ...prev,
                                    [memberId]: value,
                                  }));
                                }}
                                className="h-8 text-sm"
                                disabled={loading}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {hasSplitError && (
                  <p className="text-sm text-destructive text-center">
                    {splitType === 'percentage'
                      ? 'Percentages must add up to 100%'
                      : 'Please enter valid shares for all participants'}
                  </p>
                )}

                {splits && splits.length > 0 && !hasSplitError && (
                  <div className="text-sm text-muted-foreground text-center space-y-1">
                    <p>
                      Total split: <span className="font-semibold text-foreground">{formatCurrency(totalSplitAmount)}</span>
                    </p>
                    {Math.abs(totalSplitAmount - parseFloat(amount || '0')) > 0.01 && (
                      <p className="text-destructive text-xs">
                        Warning: Split amount ({formatCurrency(totalSplitAmount)}) doesn't match total ({formatCurrency(parseFloat(amount || '0'))})
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              className="flex-1"
              disabled={loading || hasSplitError}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
