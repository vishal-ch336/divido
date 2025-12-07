import { User, Group, GroupMember, Expense, Settlement, ActivityLog, BalanceSummary, DebtRelation } from '@/types';

export const currentUser: User = {
  id: '1',
  name: 'Rahul Sharma',
  email: 'rahul@example.com',
  avatar: undefined,
  createdAt: new Date('2024-01-15'),
};

export const mockUsers: User[] = [
  currentUser,
  {
    id: '2',
    name: 'Priya Patel',
    email: 'priya@example.com',
    createdAt: new Date('2024-02-01'),
  },
  {
    id: '3',
    name: 'Amit Kumar',
    email: 'amit@example.com',
    createdAt: new Date('2024-02-15'),
  },
  {
    id: '4',
    name: 'Sneha Reddy',
    email: 'sneha@example.com',
    createdAt: new Date('2024-03-01'),
  },
];

export const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Goa Trip 2024',
    description: 'Beach vacation with college friends',
    createdBy: '1',
    createdAt: new Date('2024-10-01'),
    memberCount: 4,
    totalExpenses: 45600,
    currency: 'INR',
  },
  {
    id: '2',
    name: 'Flat Expenses',
    description: 'Monthly rent, bills and groceries',
    createdBy: '1',
    createdAt: new Date('2024-01-01'),
    memberCount: 3,
    totalExpenses: 125000,
    currency: 'INR',
  },
  {
    id: '3',
    name: 'Office Lunch Group',
    description: 'Daily lunch splits with colleagues',
    createdBy: '2',
    createdAt: new Date('2024-06-01'),
    memberCount: 5,
    totalExpenses: 18500,
    currency: 'INR',
  },
];

export const mockGroupMembers: Record<string, GroupMember[]> = {
  '1': [
    { id: 'm1', groupId: '1', userId: '1', user: mockUsers[0], role: 'admin', balance: 2400, joinedAt: new Date('2024-10-01') },
    { id: 'm2', groupId: '1', userId: '2', user: mockUsers[1], role: 'member', balance: -1200, joinedAt: new Date('2024-10-01') },
    { id: 'm3', groupId: '1', userId: '3', user: mockUsers[2], role: 'member', balance: -800, joinedAt: new Date('2024-10-01') },
    { id: 'm4', groupId: '1', userId: '4', user: mockUsers[3], role: 'member', balance: -400, joinedAt: new Date('2024-10-02') },
  ],
  '2': [
    { id: 'm5', groupId: '2', userId: '1', user: mockUsers[0], role: 'admin', balance: -5000, joinedAt: new Date('2024-01-01') },
    { id: 'm6', groupId: '2', userId: '2', user: mockUsers[1], role: 'member', balance: 8000, joinedAt: new Date('2024-01-01') },
    { id: 'm7', groupId: '2', userId: '3', user: mockUsers[2], role: 'member', balance: -3000, joinedAt: new Date('2024-01-01') },
  ],
};

export const mockExpenses: Expense[] = [
  {
    id: 'e1',
    groupId: '1',
    description: 'Hotel Booking - Taj Resort',
    amount: 24000,
    paidBy: mockUsers[0],
    paidTo: 'Taj Hotels',
    paymentMethod: 'card',
    splitType: 'equal',
    splits: [
      { userId: '1', user: mockUsers[0], amount: 6000, isPaid: true },
      { userId: '2', user: mockUsers[1], amount: 6000, isPaid: false },
      { userId: '3', user: mockUsers[2], amount: 6000, isPaid: false },
      { userId: '4', user: mockUsers[3], amount: 6000, isPaid: false },
    ],
    category: 'Accommodation',
    date: new Date('2024-10-15'),
    createdAt: new Date('2024-10-10'),
    isFlagged: false,
    isRecurring: false,
  },
  {
    id: 'e2',
    groupId: '1',
    description: 'Dinner at Fishermans Wharf',
    amount: 8500,
    paidBy: mockUsers[1],
    paidTo: 'Fishermans Wharf',
    paymentMethod: 'upi',
    splitType: 'equal',
    splits: [
      { userId: '1', user: mockUsers[0], amount: 2125, isPaid: false },
      { userId: '2', user: mockUsers[1], amount: 2125, isPaid: true },
      { userId: '3', user: mockUsers[2], amount: 2125, isPaid: false },
      { userId: '4', user: mockUsers[3], amount: 2125, isPaid: false },
    ],
    category: 'Food & Drinks',
    date: new Date('2024-10-16'),
    createdAt: new Date('2024-10-16'),
    isFlagged: false,
    isRecurring: false,
  },
  {
    id: 'e3',
    groupId: '1',
    description: 'Water Sports Activities',
    amount: 6000,
    paidBy: mockUsers[2],
    paidTo: 'Goa Adventures',
    paymentMethod: 'cash',
    splitType: 'share',
    splits: [
      { userId: '1', user: mockUsers[0], amount: 2000, shares: 2, isPaid: false },
      { userId: '2', user: mockUsers[1], amount: 1000, shares: 1, isPaid: false },
      { userId: '3', user: mockUsers[2], amount: 2000, shares: 2, isPaid: true },
      { userId: '4', user: mockUsers[3], amount: 1000, shares: 1, isPaid: false },
    ],
    category: 'Activities',
    date: new Date('2024-10-17'),
    createdAt: new Date('2024-10-17'),
    isFlagged: true,
    flagReason: 'Amount seems high for the activities mentioned',
    isRecurring: false,
  },
  {
    id: 'e4',
    groupId: '2',
    description: 'November Rent',
    amount: 45000,
    paidBy: mockUsers[1],
    paidTo: 'Landlord - Mr. Verma',
    paymentMethod: 'upi',
    splitType: 'equal',
    splits: [
      { userId: '1', user: mockUsers[0], amount: 15000, isPaid: false },
      { userId: '2', user: mockUsers[1], amount: 15000, isPaid: true },
      { userId: '3', user: mockUsers[2], amount: 15000, isPaid: false },
    ],
    category: 'Rent',
    date: new Date('2024-11-01'),
    createdAt: new Date('2024-11-01'),
    isFlagged: false,
    isRecurring: true,
    recurringFrequency: 'monthly',
  },
  {
    id: 'e5',
    groupId: '2',
    description: 'Electricity Bill - October',
    amount: 3200,
    paidBy: mockUsers[0],
    paidTo: 'MSEDCL',
    paymentMethod: 'upi',
    splitType: 'percentage',
    splits: [
      { userId: '1', user: mockUsers[0], amount: 1280, percentage: 40, isPaid: true },
      { userId: '2', user: mockUsers[1], amount: 960, percentage: 30, isPaid: false },
      { userId: '3', user: mockUsers[2], amount: 960, percentage: 30, isPaid: false },
    ],
    category: 'Utilities',
    date: new Date('2024-10-25'),
    createdAt: new Date('2024-10-25'),
    isFlagged: false,
    isRecurring: true,
    recurringFrequency: 'monthly',
  },
];

export const mockSettlements: Settlement[] = [
  {
    id: 's1',
    groupId: '1',
    fromUser: mockUsers[1],
    toUser: mockUsers[0],
    amount: 5000,
    status: 'confirmed',
    paymentMethod: 'upi',
    note: 'Partial payment for hotel',
    createdAt: new Date('2024-10-20'),
    confirmedAt: new Date('2024-10-20'),
  },
  {
    id: 's2',
    groupId: '2',
    fromUser: mockUsers[0],
    toUser: mockUsers[1],
    amount: 10000,
    status: 'pending',
    paymentMethod: 'upi',
    note: 'Rent payment',
    createdAt: new Date('2024-11-02'),
  },
];

export const mockActivityLogs: ActivityLog[] = [
  {
    id: 'a1',
    groupId: '1',
    userId: '1',
    user: mockUsers[0],
    action: 'expense_created',
    description: 'Added expense "Hotel Booking - Taj Resort" for ₹24,000',
    createdAt: new Date('2024-10-10'),
  },
  {
    id: 'a2',
    groupId: '1',
    userId: '2',
    user: mockUsers[1],
    action: 'expense_created',
    description: 'Added expense "Dinner at Fishermans Wharf" for ₹8,500',
    createdAt: new Date('2024-10-16'),
  },
  {
    id: 'a3',
    groupId: '1',
    userId: '3',
    user: mockUsers[2],
    action: 'expense_flagged',
    description: 'Flagged expense "Water Sports Activities"',
    createdAt: new Date('2024-10-18'),
  },
  {
    id: 'a4',
    groupId: '1',
    userId: '1',
    user: mockUsers[0],
    action: 'settlement_confirmed',
    description: 'Confirmed settlement of ₹5,000 from Priya Patel',
    createdAt: new Date('2024-10-20'),
  },
];

export const mockBalanceSummaries: Record<string, BalanceSummary[]> = {
  '1': [
    { userId: '1', user: mockUsers[0], totalPaid: 24000, totalOwed: 12325, netBalance: 11675 },
    { userId: '2', user: mockUsers[1], totalPaid: 8500, totalOwed: 10125, netBalance: -1625 },
    { userId: '3', user: mockUsers[2], totalPaid: 6000, totalOwed: 10125, netBalance: -4125 },
    { userId: '4', user: mockUsers[3], totalPaid: 0, totalOwed: 9125, netBalance: -9125 },
  ],
};

export const mockDebts: DebtRelation[] = [
  { fromUser: mockUsers[1], toUser: mockUsers[0], amount: 1625 },
  { fromUser: mockUsers[2], toUser: mockUsers[0], amount: 4125 },
  { fromUser: mockUsers[3], toUser: mockUsers[0], amount: 5925 },
];

export const expenseCategories = [
  'Food & Drinks',
  'Accommodation',
  'Transport',
  'Activities',
  'Shopping',
  'Rent',
  'Utilities',
  'Groceries',
  'Entertainment',
  'Healthcare',
  'Other',
];

export const categoryColors: Record<string, string> = {
  'Food & Drinks': 'hsl(25, 95%, 53%)',
  'Accommodation': 'hsl(221, 83%, 53%)',
  'Transport': 'hsl(262, 83%, 58%)',
  'Activities': 'hsl(173, 58%, 39%)',
  'Shopping': 'hsl(330, 81%, 60%)',
  'Rent': 'hsl(142, 71%, 45%)',
  'Utilities': 'hsl(38, 92%, 50%)',
  'Groceries': 'hsl(142, 76%, 36%)',
  'Entertainment': 'hsl(291, 64%, 42%)',
  'Healthcare': 'hsl(0, 72%, 51%)',
  'Other': 'hsl(215, 16%, 47%)',
};
