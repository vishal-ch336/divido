import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, CreditCard, Smartphone, Banknote, Users, Percent, Hash, Loader2 } from 'lucide-react';
import { expenseCategories } from '@/data/mockData';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { groupsApi, expensesApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';

interface AddExpenseDialogProps {
  groupId?: string;
  trigger?: React.ReactNode;
  onExpenseAdded?: () => void;
}

type SplitType = 'equal' | 'percentage' | 'share';
type PaymentMethod = 'cash' | 'upi' | 'card';

interface Group {
  id: string;
  name: string;
  description?: string;
  members?: Array<{
    userId: {
      id?: string;
      _id?: string;
      name: string;
      email: string;
      avatar?: string;
    } | string;
    role: string;
    balance: number;
  }>;
}

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

export function AddExpenseDialog({ groupId: propGroupId, trigger, onExpenseAdded }: AddExpenseDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Form state
  const [selectedGroupId, setSelectedGroupId] = useState<string>(propGroupId || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [category, setCategory] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantPercentages, setParticipantPercentages] = useState<Record<string, number>>({});
  const [participantShares, setParticipantShares] = useState<Record<string, number>>({});
  
  // Data state
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  // Fetch groups on mount
  useEffect(() => {
    if (open) {
      fetchGroups().catch((error) => {
        console.error('Error fetching groups:', error);
      });
    }
  }, [open]);

  // Fetch group details when selected
  useEffect(() => {
    if (selectedGroupId && open) {
      fetchGroupDetails(selectedGroupId);
    } else {
      setSelectedGroup(null);
      setGroupMembers([]);
      setParticipants([]);
    }
  }, [selectedGroupId, open]);

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const data = await groupsApi.getAll();
      setGroups(data || []);
      
      // If propGroupId is provided, select it
      if (propGroupId && !selectedGroupId) {
        setSelectedGroupId(propGroupId);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to load groups. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchGroupDetails = async (groupId: string) => {
    if (!groupId) return;
    
    setLoadingMembers(true);
    try {
      const group = await groupsApi.getById(groupId);
      setSelectedGroup(group);
      
      // Extract members from group
      const members = group?.members || [];
      setGroupMembers(members);
      
      // Helper to get member ID (handles both _id and id formats)
      const getMemberId = (member: GroupMember): string => {
        if (typeof member.userId === 'string') return member.userId;
        const userId = member.userId as { id?: string; _id?: string; [key: string]: any };
        return userId?.id || userId?._id || String(userId);
      };
      
      // Set default participants to all members
      const memberIds = members.map((m: GroupMember) => getMemberId(m)).filter(Boolean);
      setParticipants(memberIds);
      
      // Set default paidBy to current user if they're a member
      if (user && memberIds.includes(user.id)) {
        setPaidBy(user.id);
      } else if (memberIds.length > 0) {
        setPaidBy(memberIds[0]);
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      setSelectedGroup(null);
      setGroupMembers([]);
      setParticipants([]);
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to load group details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    setParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Calculate split amounts
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
      participants.forEach(userId => {
        splits.push({
          userId,
          amount: splitAmount,
          isPaid: false,
        });
      });
    } else if (splitType === 'percentage') {
      const totalPercentage = participants.reduce((sum, userId) => {
        return sum + (participantPercentages[userId] || 0);
      }, 0);

      if (Math.abs(totalPercentage - 100) > 0.01) {
        return null; // Invalid percentages
      }

      participants.forEach(userId => {
        const percentage = participantPercentages[userId] || 0;
        splits.push({
          userId,
          amount: (totalAmount * percentage) / 100,
          percentage,
          isPaid: false,
        });
      });
    } else if (splitType === 'share') {
      const totalShares = participants.reduce((sum, userId) => {
        return sum + (participantShares[userId] || 0);
      }, 0);

      if (totalShares === 0) {
        return null; // Invalid shares
      }

      participants.forEach(userId => {
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
  const splitAmount = splits && splits.length > 0 ? splits[0].amount : 0;
  const totalSplitAmount = splits ? splits.reduce((sum, s) => sum + s.amount, 0) : 0;
  const hasSplitError = splits === null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!selectedGroupId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a group',
        variant: 'destructive',
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a description',
        variant: 'destructive',
      });
      return;
    }

    if (!category) {
      toast({
        title: 'Validation Error',
        description: 'Please select a category',
        variant: 'destructive',
      });
      return;
    }

    if (!paidBy) {
      toast({
        title: 'Validation Error',
        description: 'Please select who paid',
        variant: 'destructive',
      });
      return;
    }

    if (participants.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one participant',
        variant: 'destructive',
      });
      return;
    }

    if (hasSplitError) {
      if (splitType === 'percentage') {
        toast({
          title: 'Validation Error',
          description: 'Percentages must add up to 100%',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Validation Error',
          description: 'Please enter valid shares for all participants',
          variant: 'destructive',
        });
      }
      return;
    }

    if (!splits || splits.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Failed to calculate splits',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await expensesApi.create({
        groupId: selectedGroupId,
        description: description.trim(),
        amount: parseFloat(amount),
        paidBy,
        paidTo: paidTo.trim() || undefined,
        paymentMethod,
        splitType,
        splits,
        category,
        date: new Date().toISOString(),
      });

      toast({
        title: 'Success!',
        description: 'Expense added successfully',
      });

      // Reset form
      setAmount('');
      setDescription('');
      setPaidTo('');
      setCategory('');
      setPaidBy('');
      setPaymentMethod('upi');
      setSplitType('equal');
      const getMemberId = (m: GroupMember): string => {
        if (typeof m.userId === 'string') return m.userId;
        const userId = m.userId as { id?: string; _id?: string; [key: string]: any };
        return userId?.id || userId?._id || String(userId);
      };
      setParticipants(groupMembers.map(getMemberId));
      setParticipantPercentages({});
      setParticipantShares({});
      handleOpenChange(false);

      // Notify parent to refresh
      if (onExpenseAdded) {
        onExpenseAdded();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to create expense',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!loading) {
      setOpen(isOpen);
      // Reset form when closing
      if (!isOpen) {
        setAmount('');
        setDescription('');
        setPaidTo('');
        setCategory('');
        setPaidBy('');
        setPaymentMethod('upi');
        setSplitType('equal');
        setParticipants([]);
        setParticipantPercentages({});
        setParticipantShares({});
        setSelectedGroupId(propGroupId || '');
        setSelectedGroup(null);
        setGroupMembers([]);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="accent" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Expense</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Group Selection */}
          <div className="space-y-2">
            <Label htmlFor="group">Group *</Label>
            {loadingGroups ? (
              <div className="flex items-center gap-2 p-3 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading groups...</span>
              </div>
            ) : groups.length === 0 ? (
              <div className="p-3 border rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  No groups found. Please create a group first.
                </p>
              </div>
            ) : (
              <Select 
                value={selectedGroupId} 
                onValueChange={setSelectedGroupId} 
                required
                disabled={!!propGroupId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {propGroupId && (
              <p className="text-xs text-muted-foreground">Group is pre-selected</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
              <Input
                id="amount"
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
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="What was this expense for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Paid To (optional) */}
          <div className="space-y-2">
            <Label htmlFor="paidTo">Paid To (Vendor/Store)</Label>
            <Input
              id="paidTo"
              placeholder="Optional - e.g., Amazon, Swiggy"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
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
                  {expenseCategories.map(cat => (
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
                disabled={loading || loadingMembers || !selectedGroupId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingMembers ? "Loading..." : "Who paid?"} />
                </SelectTrigger>
                <SelectContent>
                  {groupMembers.map(member => {
                    const getMemberId = (): string => {
                      if (typeof member.userId === 'string') return member.userId;
                      const userId = member.userId as { id?: string; _id?: string; name?: string; [key: string]: any };
                      return userId?.id || userId?._id || String(userId);
                    };
                    const getMemberName = (): string => {
                      if (typeof member.userId === 'string') return 'Unknown';
                      const userId = member.userId as { id?: string; _id?: string; name?: string; [key: string]: any };
                      return userId?.name || 'Unknown';
                    };
                    const memberId = getMemberId();
                    const memberName = getMemberName();
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
              {paymentMethods.map(method => (
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
              {splitTypes.map(type => (
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
          {selectedGroupId && (
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
                    {groupMembers.map(member => {
                      const getMemberId = (): string => {
                        if (typeof member.userId === 'string') return member.userId;
                        const userId = member.userId as { id?: string; _id?: string; name?: string; [key: string]: any };
                        return userId?.id || userId?._id || String(userId);
                      };
                      const getMemberName = (): string => {
                        if (typeof member.userId === 'string') return 'Unknown';
                        const userId = member.userId as { id?: string; _id?: string; name?: string; [key: string]: any };
                        return userId?.name || 'Unknown';
                      };
                      const memberId = getMemberId();
                      const memberName = getMemberName();
                      const isParticipant = participants.includes(memberId);
                      const split = splits?.find(s => s.userId === memberId);
                      
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
                          
                          {/* Percentage input for percentage split */}
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
                                  setParticipantPercentages(prev => ({
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
                          
                          {/* Shares input for share split */}
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
                                  setParticipantShares(prev => ({
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
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="accent" 
              className="flex-1"
              disabled={loading || !selectedGroupId || hasSplitError}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Expense'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
