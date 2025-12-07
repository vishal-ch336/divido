export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  memberCount: number;
  totalExpenses: number;
  currency: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  user: User;
  role: 'admin' | 'member';
  balance: number;
  joinedAt: Date;
}

export type PaymentMethod = 'cash' | 'upi' | 'card';

export type SplitType = 'equal' | 'percentage' | 'share';

export interface ExpenseSplit {
  userId: string;
  user: User;
  amount: number;
  percentage?: number;
  shares?: number;
  isPaid: boolean;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: User;
  paidTo?: string; // vendor/store name
  paymentMethod: PaymentMethod;
  splitType: SplitType;
  splits: ExpenseSplit[];
  category: string;
  date: Date;
  createdAt: Date;
  isFlagged: boolean;
  flagReason?: string;
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'yearly';
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUser: User;
  toUser: User;
  amount: number;
  status: 'pending' | 'confirmed' | 'disputed';
  paymentMethod: PaymentMethod;
  note?: string;
  createdAt: Date;
  confirmedAt?: Date;
}

export interface ActivityLog {
  id: string;
  groupId: string;
  userId: string;
  user: User;
  action: 'expense_created' | 'expense_edited' | 'expense_deleted' | 'settlement_created' | 'settlement_confirmed' | 'member_added' | 'member_removed' | 'expense_flagged';
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface BalanceSummary {
  userId: string;
  user: User;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export interface DebtRelation {
  fromUser: User;
  toUser: User;
  amount: number;
}
