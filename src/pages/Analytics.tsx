import { MainLayout } from '@/components/layout/MainLayout';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart';
import { MemberContributionChart } from '@/components/charts/MemberContributionChart';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { expenseCategories, categoryColors } from '@/data/mockData';
import { expensesApi, groupsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatPercentage } from '@/lib/format';
import { Download, FileText, Table2, TrendingUp, PieChart, Users, Calendar, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Expense {
  id: string;
  groupId: string | { id: string; name: string };
  description: string;
  amount: number;
  category: string;
  date: Date;
  paidBy: { id: string; name: string; email: string; avatar?: string };
}

interface Group {
  id: string;
  name: string;
}

const Analytics = () => {
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    fetchExpenses();
    fetchGroups();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [selectedGroup, dateRange]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const groupId = selectedGroup === 'all' ? undefined : selectedGroup;
      const data = await expensesApi.getAll(groupId);
      
      // Transform and filter by date range
      let transformedExpenses = data.map((exp: any) => ({
        id: exp.id || exp._id,
        groupId: typeof exp.groupId === 'object' 
          ? { id: exp.groupId.id || exp.groupId._id, name: exp.groupId.name }
          : exp.groupId,
        description: exp.description,
        amount: exp.amount,
        category: exp.category,
        date: exp.date ? new Date(exp.date) : (exp.createdAt ? new Date(exp.createdAt) : new Date()),
        paidBy: typeof exp.paidBy === 'object'
          ? {
              id: exp.paidBy.id || exp.paidBy._id,
              name: exp.paidBy.name || 'Unknown',
              email: exp.paidBy.email || '',
              avatar: exp.paidBy.avatar
            }
          : { id: exp.paidBy, name: 'Unknown', email: '' },
      }));

      // Filter by date range
      if (dateRange !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (dateRange) {
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(0);
        }
        
        transformedExpenses = transformedExpenses.filter(e => e.date >= startDate);
      }

      setExpenses(transformedExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to load expenses',
        variant: 'destructive',
      });
      setExpenses([]);
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

  const filteredExpenses = expenses.filter(expense => {
    const expenseGroupId = typeof expense.groupId === 'string' 
      ? expense.groupId 
      : (expense.groupId.id || expense.groupId._id || '');
    const matchesGroup = selectedGroup === 'all' || expenseGroupId === selectedGroup;
    return matchesGroup;
  });

  const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const avgPerExpense = filteredExpenses.length > 0 ? totalSpent / filteredExpenses.length : 0;

  // Category breakdown
  const categoryBreakdown = expenseCategories.map(category => {
    const categoryExpenses = filteredExpenses.filter(e => e.category === category);
    const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
    const percentage = totalSpent > 0 ? (total / totalSpent) * 100 : 0;
    return { category, total, percentage, count: categoryExpenses.length };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">Insights into your spending patterns</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" className="gap-2">
              <Table2 className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
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
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalSpent)}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <PieChart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Expense</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(avgPerExpense)}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                <Calendar className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold text-foreground">{filteredExpenses.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-credit/10">
                <Users className="h-5 w-5 text-credit" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-xl font-bold text-foreground">{categoryBreakdown.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Pie Chart */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Spending by Category</h3>
            <div className="relative h-80">
              <CategoryPieChart expenses={filteredExpenses} />
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Spending Trend</h3>
            <MonthlyTrendChart expenses={filteredExpenses} />
          </div>
        </div>

        {/* Member Contribution & Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Member Contributions */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Member Contributions</h3>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <MemberContributionChart balances={[]} />
            )}
          </div>

          {/* Category Breakdown Table */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Category Breakdown</h3>
            <div className="space-y-3">
              {categoryBreakdown.map((item, index) => (
                <div key={item.category} className="flex items-center gap-4">
                  <div 
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: categoryColors[item.category] || categoryColors['Other'] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate">{item.category}</span>
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(item.total)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${item.percentage}%`,
                          backgroundColor: categoryColors[item.category] || categoryColors['Other']
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{item.count} transactions</span>
                      <span className="text-xs text-muted-foreground">{formatPercentage(item.percentage)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Analytics;
