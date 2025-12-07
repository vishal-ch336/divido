import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ExpenseItem } from '@/components/dashboard/ExpenseItem';
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { expenseCategories } from '@/data/mockData';
import { formatCurrency } from '@/lib/format';
import { expensesApi, groupsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { Search, Filter, Receipt, TrendingUp, Calendar, Loader2 } from 'lucide-react';

interface Expense {
  id: string;
  groupId: string | { id: string; name: string; _id?: string };
  description: string;
  amount: number;
  paidBy: { id: string; name: string; email: string; avatar?: string };
  category: string;
  date: Date;
  createdAt: Date;
  paymentMethod: string;
  isFlagged?: boolean;
  isRecurring?: boolean;
  paidTo?: string;
  splitType?: string;
  splits?: any[];
}

interface Group {
  id: string;
  name: string;
}

const Expenses = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    fetchExpenses();
    fetchGroups();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const data = await expensesApi.getAll();
      // Transform the data to match the expected format
      const transformedExpenses = data.map((exp: any) => ({
        id: exp.id || exp._id,
        groupId: typeof exp.groupId === 'object' ? exp.groupId.id || exp.groupId._id : exp.groupId,
        description: exp.description,
        amount: exp.amount,
        paidBy: typeof exp.paidBy === 'object' 
          ? { 
              id: exp.paidBy.id || exp.paidBy._id, 
              name: exp.paidBy.name || 'Unknown',
              email: exp.paidBy.email || '',
              avatar: exp.paidBy.avatar 
            }
          : { id: exp.paidBy, name: 'Unknown', email: '' },
        category: exp.category,
        date: exp.date ? new Date(exp.date) : (exp.createdAt ? new Date(exp.createdAt) : new Date()),
        createdAt: exp.createdAt ? new Date(exp.createdAt) : new Date(),
        paymentMethod: exp.paymentMethod || 'cash',
        isFlagged: exp.isFlagged || false,
        isRecurring: exp.isRecurring || false,
        paidTo: exp.paidTo,
        splitType: exp.splitType,
        splits: exp.splits || [],
      }));
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

  const handleExpenseAdded = () => {
    fetchExpenses();
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.paidBy.name.toLowerCase().includes(searchQuery.toLowerCase());
    const expenseGroupId = typeof expense.groupId === 'string' 
      ? expense.groupId 
      : (expense.groupId.id || expense.groupId._id || '');
    const matchesGroup = selectedGroup === 'all' || expenseGroupId === selectedGroup;
    const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
    return matchesSearch && matchesGroup && matchesCategory;
  });

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const thisMonthExpenses = filteredExpenses.filter(e => {
    const expenseDate = new Date(e.date);
    const now = new Date();
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
            <p className="text-muted-foreground mt-1">Track and manage all expenses</p>
          </div>
          <AddExpenseDialog onExpenseAdded={handleExpenseAdded} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(thisMonthTotal)}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-credit/10">
                <TrendingUp className="h-5 w-5 text-credit" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold text-foreground">{filteredExpenses.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
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
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {expenseCategories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Expense List */}
        <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading expenses...</p>
              </div>
            </div>
          ) : filteredExpenses.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredExpenses.map((expense, index) => {
                // Transform expense to match ExpenseItem's expected type
                const expenseForItem = {
                  ...expense,
                  groupId: typeof expense.groupId === 'string' 
                    ? expense.groupId 
                    : (expense.groupId.id || expense.groupId._id || ''),
                };
                return (
                  <div key={expense.id} className="p-2">
                    <ExpenseItem
                      expense={expenseForItem as any}
                      showGroup
                      className={`animate-slide-up border-0 shadow-none hover:shadow-none`}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No expenses found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedGroup !== 'all' || selectedCategory !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first expense to get started'}
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Expenses;
