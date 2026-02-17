import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { settlementsApi, groupsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatRelativeTime, getInitials } from '@/lib/format';
import {
  Search,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Smartphone,
  Banknote,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-warning-light text-warning', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-credit-light text-credit', icon: CheckCircle },
  disputed: { label: 'Disputed', color: 'bg-debit-light text-debit', icon: AlertCircle },
};

const paymentIcons = {
  cash: Banknote,
  upi: Smartphone,
  card: CreditCard,
};

interface Settlement {
  id: string;
  groupId: string | { id?: string; _id?: string; name: string };
  fromUser: { id: string; name: string; email: string; avatar?: string };
  toUser: { id: string; name: string; email: string; avatar?: string };
  amount: number;
  status: 'pending' | 'confirmed' | 'disputed';
  paymentMethod: 'cash' | 'upi' | 'card';
  note?: string;
  createdAt: Date;
  confirmedAt?: Date;
}

interface Group {
  id: string;
  name: string;
}

interface GroupMember {
  userId: string | { id: string; name: string; email: string; avatar?: string };
  name?: string;
}

const Settlements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  // Form state
  const [formGroupId, setFormGroupId] = useState('');
  const [formFromUser, setFormFromUser] = useState('');
  const [formToUser, setFormToUser] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'cash' | 'upi' | 'card'>('upi');
  const [formNote, setFormNote] = useState('');

  useEffect(() => {
    fetchSettlements();
    fetchGroups();
  }, [selectedGroup, selectedStatus]);

  useEffect(() => {
    if (formGroupId) {
      fetchGroupMembers(formGroupId);
    } else {
      setGroupMembers([]);
    }
  }, [formGroupId]);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const groupId = selectedGroup === 'all' ? undefined : selectedGroup;
      const status = selectedStatus === 'all' ? undefined : selectedStatus;
      const data = await settlementsApi.getAll(groupId, status);

      const transformedSettlements = data.map((settlement: any) => ({
        id: settlement.id || settlement._id,
        groupId: typeof settlement.groupId === 'object'
          ? { id: settlement.groupId.id || settlement.groupId._id, name: settlement.groupId.name }
          : settlement.groupId,
        fromUser: typeof settlement.fromUser === 'object'
          ? {
            id: settlement.fromUser.id || settlement.fromUser._id,
            name: settlement.fromUser.name || 'Unknown',
            email: settlement.fromUser.email || '',
            avatar: settlement.fromUser.avatar
          }
          : { id: settlement.fromUser, name: 'Unknown', email: '' },
        toUser: typeof settlement.toUser === 'object'
          ? {
            id: settlement.toUser.id || settlement.toUser._id,
            name: settlement.toUser.name || 'Unknown',
            email: settlement.toUser.email || '',
            avatar: settlement.toUser.avatar
          }
          : { id: settlement.toUser, name: 'Unknown', email: '' },
        amount: settlement.amount,
        status: settlement.status || 'pending',
        paymentMethod: settlement.paymentMethod || 'cash',
        note: settlement.note,
        createdAt: settlement.createdAt ? new Date(settlement.createdAt) : new Date(),
        confirmedAt: settlement.confirmedAt ? new Date(settlement.confirmedAt) : undefined,
      }));
      setSettlements(transformedSettlements);
    } catch (error) {
      console.error('Error fetching settlements:', error);
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to load settlements',
        variant: 'destructive',
      });
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const data = await groupsApi.getAll();
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const group = await groupsApi.getById(groupId);
      const members: GroupMember[] = [];

      // Add creator
      if (group.createdBy) {
        const creator = typeof group.createdBy === 'object'
          ? group.createdBy
          : { id: group.createdBy, name: 'Unknown' };
        members.push({
          userId: creator.id || creator._id,
          name: creator.name,
        });
      }

      // Add members
      if (group.members && Array.isArray(group.members)) {
        group.members.forEach((member: any) => {
          const memberUser = typeof member.userId === 'object'
            ? member.userId
            : { id: member.userId, name: 'Unknown' };
          members.push({
            userId: memberUser.id || memberUser._id,
            name: memberUser.name,
          });
        });
      }

      setGroupMembers(members);
    } catch (error) {
      console.error('Error fetching group members:', error);
      setGroupMembers([]);
    }
  };

  const handleCreateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formGroupId || !formFromUser || !formToUser || !formAmount) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (parseFloat(formAmount) <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Amount must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    if (formFromUser === formToUser) {
      toast({
        title: 'Validation Error',
        description: 'From and To users must be different',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await settlementsApi.create({
        groupId: formGroupId,
        fromUser: formFromUser,
        toUser: formToUser,
        amount: parseFloat(formAmount),
        paymentMethod: formPaymentMethod,
        note: formNote.trim() || undefined,
      });

      toast({
        title: 'Success!',
        description: 'Settlement recorded successfully',
      });

      // Reset form
      setFormGroupId('');
      setFormFromUser('');
      setFormToUser('');
      setFormAmount('');
      setFormPaymentMethod('upi');
      setFormNote('');
      setIsSettleOpen(false);

      // Refresh settlements
      await fetchSettlements();
    } catch (error) {
      console.error('Error creating settlement:', error);
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to create settlement',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSettlement = async (settlementId: string) => {
    setConfirming(settlementId);
    try {
      await settlementsApi.confirm(settlementId);
      toast({
        title: 'Success!',
        description: 'Settlement confirmed successfully',
      });
      await fetchSettlements();
    } catch (error) {
      console.error('Error confirming settlement:', error);
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to confirm settlement',
        variant: 'destructive',
      });
    } finally {
      setConfirming(null);
    }
  };

  const filteredSettlements = settlements.filter(settlement => {
    const matchesSearch =
      settlement.fromUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      settlement.toUser.name.toLowerCase().includes(searchQuery.toLowerCase());
    const settlementGroupId = typeof settlement.groupId === 'string'
      ? settlement.groupId
      : (settlement.groupId.id || settlement.groupId._id || '');
    const matchesGroup = selectedGroup === 'all' || settlementGroupId === selectedGroup;
    const matchesStatus = selectedStatus === 'all' || settlement.status === selectedStatus;
    return matchesSearch && matchesGroup && matchesStatus;
  });

  const pendingCount = settlements.filter(s => s.status === 'pending').length;
  const totalPending = settlements
    .filter(s => s.status === 'pending')
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settlements</h1>
            <p className="text-muted-foreground mt-1">Track payments between members</p>
          </div>
          <Dialog open={isSettleOpen} onOpenChange={setIsSettleOpen}>
            <DialogTrigger asChild>
              <Button variant="accent" className="gap-2">
                <Plus className="h-4 w-4" />
                Record Settlement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Settlement</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSettlement} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Group *</Label>
                  {loadingGroups ? (
                    <div className="flex items-center gap-2 p-3 border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Loading groups...</span>
                    </div>
                  ) : (
                    <Select value={formGroupId} onValueChange={setFormGroupId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map(group => (
                          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>From *</Label>
                  <Select
                    value={formFromUser}
                    onValueChange={setFormFromUser}
                    required
                    disabled={!formGroupId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Who is paying?" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupMembers.map((member, index) => {
                        const memberId = typeof member.userId === 'string' ? member.userId : member.userId.id;
                        const memberName = member.name || 'Unknown';
                        return (
                          <SelectItem key={`from-${memberId}-${index}`} value={memberId}>{memberName}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To *</Label>
                  <Select
                    value={formToUser}
                    onValueChange={setFormToUser}
                    required
                    disabled={!formGroupId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Who is receiving?" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupMembers.map((member, index) => {
                        const memberId = typeof member.userId === 'string' ? member.userId : member.userId.id;
                        const memberName = member.name || 'Unknown';
                        return (
                          <SelectItem key={`to-${memberId}-${index}`} value={memberId}>{memberName}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={formPaymentMethod} onValueChange={(v: 'cash' | 'upi' | 'card') => setFormPaymentMethod(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Note (Optional)</Label>
                  <Input
                    placeholder="Add a note..."
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    maxLength={500}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsSettleOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="accent"
                    className="flex-1"
                    disabled={submitting || !formGroupId || !formFromUser || !formToUser || !formAmount}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      'Record Payment'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-warning-light/50 border border-warning/20 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-warning">Pending Settlements</p>
                <p className="text-2xl font-bold text-foreground mt-1">{pendingCount}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/20">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pending Amount</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalPending)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search settlements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {loadingGroups ? (
                <SelectItem value="loading" disabled>Loading groups...</SelectItem>
              ) : (
                groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Settlements List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 bg-card rounded-2xl border border-border">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading settlements...</p>
              </div>
            </div>
          ) : filteredSettlements.length > 0 ? (
            filteredSettlements.map((settlement, index) => {
              const status = statusConfig[settlement.status];
              const StatusIcon = status.icon;
              const PaymentIcon = paymentIcons[settlement.paymentMethod];
              const isFromCurrentUser = settlement.fromUser.id === user?.id;
              const isToCurrentUser = settlement.toUser.id === user?.id;

              return (
                <div
                  key={settlement.id}
                  className={cn(
                    'bg-card rounded-xl border border-border p-5 shadow-card transition-all hover:shadow-md animate-slide-up',
                    `stagger-${(index % 5) + 1}`
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Users */}
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className={cn(
                        'h-11 w-11 border-2',
                        isFromCurrentUser ? 'border-primary' : 'border-border'
                      )}>
                        <AvatarImage src={settlement.fromUser.avatar} />
                        <AvatarFallback className="bg-secondary text-sm">
                          {getInitials(settlement.fromUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      <Avatar className={cn(
                        'h-11 w-11 border-2',
                        isToCurrentUser ? 'border-primary' : 'border-border'
                      )}>
                        <AvatarImage src={settlement.toUser.avatar} />
                        <AvatarFallback className="bg-secondary text-sm">
                          {getInitials(settlement.toUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {isFromCurrentUser ? 'You' : settlement.fromUser.name}
                          <span className="text-muted-foreground font-normal"> paid </span>
                          {isToCurrentUser ? 'you' : settlement.toUser.name}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <PaymentIcon className="h-3.5 w-3.5" />
                          <span className="capitalize">{settlement.paymentMethod}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(settlement.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Amount & Status */}
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-bold text-foreground">
                        {formatCurrency(settlement.amount)}
                      </p>
                      <Badge className={cn('gap-1', status.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                      {settlement.status === 'pending' && isToCurrentUser && (
                        <Button
                          size="sm"
                          variant="accent"
                          onClick={() => handleConfirmSettlement(settlement.id)}
                          disabled={confirming === settlement.id}
                        >
                          {confirming === settlement.id ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Confirming...
                            </>
                          ) : (
                            'Confirm'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  {settlement.note && (
                    <p className="mt-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      {settlement.note}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No settlements found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedGroup !== 'all' || selectedStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Record your first settlement to get started'}
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Settlements;
