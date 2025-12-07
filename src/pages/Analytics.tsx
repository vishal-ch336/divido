import { MainLayout } from '@/components/layout/MainLayout';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart';
import { MemberContributionChart } from '@/components/charts/MemberContributionChart';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockExpenses, mockGroups, mockBalanceSummaries, expenseCategories, categoryColors } from '@/data/mockData';
import { formatCurrency, formatPercentage } from '@/lib/format';
import { Download, FileText, Table2, TrendingUp, PieChart, Users, Calendar } from 'lucide-react';
import { useState } from 'react';

const Analytics = () => {
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  const filteredExpenses = mockExpenses.filter(expense => {
    const matchesGroup = selectedGroup === 'all' || expense.groupId === selectedGroup;
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
              {mockGroups.map(group => (
                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
              ))}
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
            <MemberContributionChart balances={mockBalanceSummaries['1'] || []} />
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
