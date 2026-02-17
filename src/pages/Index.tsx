import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { GroupCard } from '@/components/dashboard/GroupCard';
import { ExpenseItem } from '@/components/dashboard/ExpenseItem';
import { DebtSummary } from '@/components/dashboard/DebtSummary';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart';
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog';
import { Button } from '@/components/ui/button';
import { dashboardApi, activityApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Receipt, Users, ArrowLeftRight, Plus, ChevronRight, TrendingUp, Loader2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { DebtRelation, ActivityLog, Expense, Group } from '@/types';

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<{
    totalOwed: number;
    totalOwe: number;
    netBalance: number;
    totalGroups: number;
    thisMonthExpenses: number;
    pendingSettlements: number;
    groups: Group[];
    recentExpenses: Expense[];
    debtRelations: DebtRelation[];
  } | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchActivities();
  }, [location.pathname]); // Refetch when navigating to dashboard

  // Refetch data when window/tab becomes visible (e.g., returning from Settlements page)
  useEffect(() => {
    const handleFocus = () => {
      fetchDashboardData();
      fetchActivities();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching dashboard data...');
      const data = await dashboardApi.getSummary();
      console.log('📊 Dashboard data received:', {
        totalOwed: data.totalOwed,
        totalOwe: data.totalOwe,
        debtRelationsCount: data.debtRelations?.length || 0,
        debtRelations: data.debtRelations
      });

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

      // Transform groups
      const groups: Group[] = (data.groups || []).map((g: any) => ({
        id: g.id || g._id,
        name: g.name,
        description: g.description,
        createdBy: typeof g.createdBy === 'object' ? g.createdBy.id || g.createdBy._id : g.createdBy,
        createdAt: g.createdAt ? new Date(g.createdAt) : new Date(),
        memberCount: g.memberCount || 0,
        totalExpenses: g.totalExpenses || 0,
        currency: g.currency || 'INR',
        userBalance: g.userBalance || 0,
      }));

      // Transform expenses
      const recentExpenses: Expense[] = (data.recentExpenses || []).map((exp: any) => ({
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

      console.log('✅ Transformed debtRelations:', debtRelations);

      setDashboardData({
        totalOwed: data.totalOwed || 0,
        totalOwe: data.totalOwe || 0,
        netBalance: data.netBalance || 0,
        totalGroups: data.totalGroups || 0,
        thisMonthExpenses: data.thisMonthExpenses || 0,
        pendingSettlements: data.pendingSettlements || 0,
        groups,
        recentExpenses,
        debtRelations,
      });

      console.log('💾 Dashboard state updated with', debtRelations.length, 'debt relations');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      const data = await activityApi.getAll();
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

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!dashboardData) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Failed to load dashboard data</p>
        </div>
      </MainLayout>
    );
  }

  const { totalOwed, totalOwe, netBalance, totalGroups, thisMonthExpenses, pendingSettlements, groups, recentExpenses, debtRelations } = dashboardData;
  const userName = user?.name?.split(' ')[0] || 'User';

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
          </div>
          <AddExpenseDialog />
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BalanceCard
            title="You are owed"
            amount={totalOwed}
            subtitle={`Across ${totalGroups} group${totalGroups !== 1 ? 's' : ''}`}
            trend="up"
            className="animate-slide-up"
          />
          <BalanceCard
            title="You owe"
            amount={totalOwe}
            subtitle={`Across ${totalGroups} group${totalGroups !== 1 ? 's' : ''}`}
            trend="down"
            className="animate-slide-up stagger-1"
          />
          <BalanceCard
            title="Net Balance"
            amount={netBalance}
            subtitle="Overall position"
            className="animate-slide-up stagger-2"
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total Groups"
            value={totalGroups}
            subtitle="Active groups"
            icon={Users}
            iconColor="bg-primary/10 text-primary"
            className="animate-slide-up stagger-1"
          />
          <StatsCard
            title="This Month"
            value={formatCurrency(thisMonthExpenses)}
            subtitle="Total expenses"
            icon={Receipt}
            iconColor="bg-accent/10 text-accent"
            className="animate-slide-up stagger-2"
          />
          <StatsCard
            title="Pending"
            value={pendingSettlements}
            subtitle="Settlements"
            icon={ArrowLeftRight}
            iconColor="bg-warning/10 text-warning"
            className="animate-slide-up stagger-3"
          />
          <StatsCard
            title="Saved"
            value={formatCurrency(0)}
            subtitle="This month"
            icon={TrendingUp}
            iconColor="bg-credit/10 text-credit"
            className="animate-slide-up stagger-4"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Groups & Expenses */}
          <div className="lg:col-span-2 space-y-6">
            {/* Groups */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Your Groups</h2>
                <Link to="/groups">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {groups.length > 0 ? (
                  groups.map((group, index) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      userBalance={group.userBalance || 0}
                      className={`animate-slide-up stagger-${index + 1}`}
                    />
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No groups yet. Create your first group!</p>
                )}
              </div>
            </div>

            {/* Recent Expenses */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Recent Expenses</h2>
                <Link to="/expenses">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {recentExpenses.length > 0 ? (
                  recentExpenses.map((expense, index) => (
                    <ExpenseItem
                      key={expense.id}
                      expense={expense as any}
                      className={`animate-slide-up stagger-${index + 1}`}
                    />
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No recent expenses</p>
                )}
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
                <h3 className="text-lg font-semibold text-foreground mb-4">Spending by Category</h3>
                <div className="relative">
                  <CategoryPieChart expenses={recentExpenses} />
                </div>
              </div>
              <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
                <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Trend</h3>
                <MonthlyTrendChart expenses={recentExpenses} />
              </div>
            </div>
          </div>

          {/* Right Column - Debts & Activity */}
          <div className="space-y-6">
            {/* Who Owes Whom */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">Settlement Summary</h2>
              {user ? (
                <DebtSummary
                  key={JSON.stringify(debtRelations.map(d => d.amount))}
                  debts={debtRelations}
                  currentUserId={user.id}
                  groupId=""
                  onSettlementCreated={fetchDashboardData}
                />
              ) : (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              )}
            </div>

            {/* Activity Timeline */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
              {loadingActivities ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <ActivityTimeline activities={activities.slice(0, 5)} />
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
