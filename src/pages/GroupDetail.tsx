import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { DebtSummary } from '@/components/dashboard/DebtSummary';
import { ExpenseItem } from '@/components/dashboard/ExpenseItem';
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog';
import { AddMembersDialog } from '@/components/groups/AddMembersDialog';
import { groupsApi, expensesApi, activityApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { ArrowLeft, Users, Receipt, Loader2, Trash2, MoreVertical, UserPlus } from 'lucide-react';
import { DebtRelation, Expense, ActivityLog } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface GroupDetail {
  id: string;
  name: string;
  description?: string;
  createdBy: any;
  createdAt: Date;
  memberCount: number;
  totalExpenses: number;
  currency: string;
  userBalance: number;
  debtRelations: DebtRelation[];
  members: any[];
}

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchGroup();
      fetchExpenses();
      fetchActivities();
    }
  }, [id]);

  const fetchGroup = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await groupsApi.getById(id);

      // Transform debt relations
      const debtRelations: DebtRelation[] = (data.debtRelations || []).map((dr: any) => ({
        fromUser: {
          id: dr.fromUser.id || dr.fromUser._id,
          name: dr.fromUser.name || 'Unknown',
          email: dr.fromUser.email || '',
          avatar: dr.fromUser.avatar,
          createdAt: new Date(),
        },
        toUser: {
          id: dr.toUser.id || dr.toUser._id,
          name: dr.toUser.name || 'Unknown',
          email: dr.toUser.email || '',
          avatar: dr.toUser.avatar,
          createdAt: new Date(),
        },
        amount: dr.amount,
      }));

      const memberData = data.members?.find(
        (m: any) => (m.userId?._id || m.userId?.id || m.userId) === user?.id
      );

      setGroup({
        id: data.id || data._id,
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        memberCount: data.members?.length || 0,
        totalExpenses: data.totalExpenses || 0,
        currency: data.currency || 'INR',
        userBalance: memberData?.balance || 0,
        debtRelations,
        members: data.members || [],
      });
    } catch (error) {
      console.error('Error fetching group:', error);
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to load group',
        variant: 'destructive',
      });
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    if (!id) return;
    setLoadingExpenses(true);
    try {
      const data = await expensesApi.getAll(id);
      const transformedExpenses: Expense[] = (data || []).map((exp: any) => ({
        id: exp.id || exp._id,
        groupId: typeof exp.groupId === 'object' ? exp.groupId.id || exp.groupId._id : exp.groupId,
        description: exp.description,
        amount: exp.amount,
        paidBy: typeof exp.paidBy === 'object'
          ? {
            id: exp.paidBy.id || exp.paidBy._id,
            name: exp.paidBy.name || 'Unknown',
            email: exp.paidBy.email || '',
            avatar: exp.paidBy.avatar,
            createdAt: new Date(),
          }
          : {
            id: exp.paidBy,
            name: 'Unknown',
            email: '',
            createdAt: new Date(),
          },
        category: exp.category,
        date: exp.date ? new Date(exp.date) : new Date(),
        createdAt: exp.createdAt ? new Date(exp.createdAt) : new Date(),
        paymentMethod: exp.paymentMethod || 'cash',
        splitType: exp.splitType || 'equal',
        splits: exp.splits || [],
        isFlagged: exp.isFlagged || false,
        isRecurring: exp.isRecurring || false,
      }));
      setExpenses(transformedExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const fetchActivities = async () => {
    if (!id) return;
    setLoadingActivities(true);
    try {
      const data = await activityApi.getAll(id);
      const transformedActivities: ActivityLog[] = (data || []).map((act: any) => ({
        id: act.id || act._id,
        groupId: typeof act.groupId === 'object' ? act.groupId.id || act.groupId._id : act.groupId,
        userId: typeof act.userId === 'object' ? act.userId.id || act.userId._id : act.userId,
        user: typeof act.user === 'object'
          ? {
            id: act.user.id || act.user._id,
            name: act.user.name || 'Unknown',
            email: act.user.email || '',
            avatar: act.user.avatar,
            createdAt: new Date(),
          }
          : {
            id: act.userId,
            name: 'Unknown',
            email: '',
            createdAt: new Date(),
          },
        action: act.action,
        description: act.description,
        metadata: act.metadata,
        createdAt: act.createdAt ? new Date(act.createdAt) : new Date(),
      }));
      setActivities(transformedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleExpenseAdded = () => {
    fetchExpenses();
    fetchGroup();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!group) return;
    setDeleting(true);
    try {
      await groupsApi.delete(group.id);
      toast({
        title: 'Success!',
        description: `Group "${group.name}" deleted successfully`,
      });
      navigate('/groups');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to delete group',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const isCreator = group && typeof group.createdBy === 'object'
    ? (group.createdBy.id || group.createdBy._id) === user?.id
    : group?.createdBy === user?.id;

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading group...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!group) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Group not found</p>
          <Link to="/groups">
            <Button variant="outline" className="mt-4">
              Back to Groups
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const isPositive = group.userBalance > 0;
  const isNegative = group.userBalance < 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/groups">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{group.name}</h1>
            {group.description && (
              <p className="text-muted-foreground mt-1">{group.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <AddExpenseDialog groupId={group.id} onExpenseAdded={handleExpenseAdded} />
            {isCreator && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <AddMembersDialog
                    groupId={group.id}
                    groupName={group.name}
                    onMembersAdded={fetchGroup}
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Members
                      </DropdownMenuItem>
                    }
                  />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleDeleteClick}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Members</p>
                <p className="text-xl font-bold text-foreground">{group.memberCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Receipt className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(group.totalExpenses)}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isPositive ? 'bg-credit/10' : isNegative ? 'bg-debit/10' : 'bg-muted'
                }`}>
                <Receipt className={`h-5 w-5 ${isPositive ? 'text-credit' : isNegative ? 'text-debit' : 'text-muted-foreground'
                  }`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Balance</p>
                <p className={`text-xl font-bold ${isPositive ? 'text-credit' : isNegative ? 'text-debit' : 'text-foreground'
                  }`}>
                  {isPositive && '+'}
                  {group.userBalance !== 0 ? formatCurrency(group.userBalance) : 'Settled'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                <Receipt className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="text-xl font-bold text-foreground">{expenses.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Expenses */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">Expenses</h2>
              {loadingExpenses ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : expenses.length > 0 ? (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <ExpenseItem
                      key={expense.id}
                      expense={expense}
                      className="border-0 shadow-none"
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No expenses yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Debts & Activity */}
          <div className="space-y-6">
            {/* Who Owes Whom */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">Who Owes Whom</h2>
              {user ? (
                <DebtSummary
                  debts={group.debtRelations}
                  currentUserId={user.id}
                  groupId={group.id}
                  onSettlementCreated={fetchGroup}
                />
              ) : (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{group.name}"? This action cannot be undone and will delete all expenses and activity logs associated with this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
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
    </MainLayout>
  );
};

export default GroupDetail;

