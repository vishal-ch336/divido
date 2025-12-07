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
import { 
  mockGroups, 
  mockExpenses, 
  mockDebts, 
  mockActivityLogs, 
  currentUser,
  mockGroupMembers 
} from '@/data/mockData';
import { formatCurrency } from '@/lib/format';
import { Receipt, Users, ArrowLeftRight, Plus, ChevronRight, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  // Calculate total balance across all groups
  const totalOwed = 2400; // You are owed
  const totalOwe = -5000; // You owe
  const netBalance = totalOwed + totalOwe;

  const recentExpenses = mockExpenses.slice(0, 4);

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {currentUser.name.split(' ')[0]}</p>
          </div>
          <AddExpenseDialog />
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BalanceCard
            title="You are owed"
            amount={totalOwed}
            subtitle="Across 2 groups"
            trend="up"
            className="animate-slide-up"
          />
          <BalanceCard
            title="You owe"
            amount={totalOwe}
            subtitle="Across 1 group"
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
            value={mockGroups.length}
            subtitle="Active groups"
            icon={Users}
            iconColor="bg-primary/10 text-primary"
            className="animate-slide-up stagger-1"
          />
          <StatsCard
            title="This Month"
            value={formatCurrency(28500)}
            subtitle="Total expenses"
            icon={Receipt}
            iconColor="bg-accent/10 text-accent"
            className="animate-slide-up stagger-2"
          />
          <StatsCard
            title="Pending"
            value={3}
            subtitle="Settlements"
            icon={ArrowLeftRight}
            iconColor="bg-warning/10 text-warning"
            className="animate-slide-up stagger-3"
          />
          <StatsCard
            title="Saved"
            value={formatCurrency(4200)}
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
                {mockGroups.slice(0, 3).map((group, index) => {
                  const memberData = mockGroupMembers[group.id]?.find(m => m.userId === currentUser.id);
                  return (
                    <GroupCard 
                      key={group.id} 
                      group={group} 
                      userBalance={memberData?.balance || 0}
                      className={`animate-slide-up stagger-${index + 1}`}
                    />
                  );
                })}
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
                {recentExpenses.map((expense, index) => (
                  <ExpenseItem 
                    key={expense.id} 
                    expense={expense}
                    className={`animate-slide-up stagger-${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
                <h3 className="text-lg font-semibold text-foreground mb-4">Spending by Category</h3>
                <div className="relative">
                  <CategoryPieChart expenses={mockExpenses} />
                </div>
              </div>
              <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
                <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Trend</h3>
                <MonthlyTrendChart expenses={mockExpenses} />
              </div>
            </div>
          </div>

          {/* Right Column - Debts & Activity */}
          <div className="space-y-6">
            {/* Who Owes Whom */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">Settlement Summary</h2>
              <DebtSummary 
                debts={mockDebts} 
                currentUserId={currentUser.id}
              />
            </div>

            {/* Activity Timeline */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
              <ActivityTimeline activities={mockActivityLogs.slice(0, 5)} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
