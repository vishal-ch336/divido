import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { mockSettlements, mockGroups, mockUsers, currentUser } from '@/data/mockData';
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
  Banknote
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

const Settlements = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isSettleOpen, setIsSettleOpen] = useState(false);

  const filteredSettlements = mockSettlements.filter(settlement => {
    const matchesSearch = 
      settlement.fromUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      settlement.toUser.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || settlement.groupId === selectedGroup;
    const matchesStatus = selectedStatus === 'all' || settlement.status === selectedStatus;
    return matchesSearch && matchesGroup && matchesStatus;
  });

  const pendingCount = mockSettlements.filter(s => s.status === 'pending').length;
  const totalPending = mockSettlements
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
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Who is paying?" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Who is receiving?" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select defaultValue="upi">
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
                  <Input placeholder="Add a note..." />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setIsSettleOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="accent" className="flex-1">
                    Record Payment
                  </Button>
                </div>
              </div>
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
              {mockGroups.map(group => (
                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
              ))}
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
          {filteredSettlements.length > 0 ? (
            filteredSettlements.map((settlement, index) => {
              const status = statusConfig[settlement.status];
              const StatusIcon = status.icon;
              const PaymentIcon = paymentIcons[settlement.paymentMethod];
              const isFromCurrentUser = settlement.fromUser.id === currentUser.id;
              const isToCurrentUser = settlement.toUser.id === currentUser.id;

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
                        <Button size="sm" variant="accent">
                          Confirm
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
