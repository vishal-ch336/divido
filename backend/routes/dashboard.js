import express from 'express';
import { protect } from '../middleware/auth.js';
import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/dashboard/summary
// @desc    Get dashboard summary data
// @access  Private
router.get('/summary', async (req, res) => {
  try {
    // Get all groups user is a member of
    const groups = await Group.find({
      $or: [
        { createdBy: req.user._id },
        { 'members.userId': req.user._id },
      ],
    });

    const groupIds = groups.map(g => g._id);

    // Get all expenses
    const expenses = await Expense.find({ groupId: { $in: groupIds } })
      .populate('paidBy', 'name email avatar')
      .populate('splits.userId', 'name email avatar');

    // Calculate balances
    let totalOwed = 0;
    let totalOwe = 0;

    for (const group of groups) {
      const memberData = group.members.find(
        (m) => m.userId.toString() === req.user._id.toString()
      );
      if (memberData) {
        if (memberData.balance > 0) {
          totalOwed += memberData.balance;
        } else {
          totalOwe += Math.abs(memberData.balance);
        }
      }
    }

    // Get this month's expenses
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthExpenses = expenses.filter(
      (e) => new Date(e.date) >= startOfMonth
    );
    const thisMonthTotal = thisMonthExpenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );

    // Get pending settlements
    const pendingSettlements = await Settlement.countDocuments({
      $or: [
        { fromUser: req.user._id, status: 'pending' },
        { toUser: req.user._id, status: 'pending' },
      ],
    });

    // Calculate debt relations (who owes whom) across all groups
    const debtRelations = [];
    for (const group of groups) {
      await group.populate('members.userId', 'name email avatar');
      await group.populate('createdBy', 'name email avatar');
      
      const allMembers = [
        {
          userId: group.createdBy,
          balance: 0,
        },
        ...group.members,
      ];

      // Get balances for all members
      const balances = [];
      for (const member of allMembers) {
        const memberUserId = member.userId._id || member.userId;
        const memberData = group.members.find(
          (m) => m.userId.toString() === memberUserId.toString()
        );
        const balance = memberData?.balance || 0;
        
        const userInfo = typeof member.userId === 'object' && member.userId.name
          ? member.userId
          : { _id: memberUserId, name: 'Unknown', email: '', avatar: null };
        
        balances.push({
          userId: memberUserId,
          user: userInfo,
          balance,
        });
      }

      // Calculate debts: who owes whom
      const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
      const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

      // Match creditors with debtors
      let creditorIndex = 0;
      let debtorIndex = 0;

      while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
        const creditor = creditors[creditorIndex];
        const debtor = debtors[debtorIndex];

        const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
        
        if (amount > 0.01) {
          debtRelations.push({
            fromUser: {
              id: debtor.user._id || debtor.userId,
              name: debtor.user.name || 'Unknown',
              email: debtor.user.email || '',
              avatar: debtor.user.avatar,
            },
            toUser: {
              id: creditor.user._id || creditor.userId,
              name: creditor.user.name || 'Unknown',
              email: creditor.user.email || '',
              avatar: creditor.user.avatar,
            },
            amount: parseFloat(amount.toFixed(2)),
            groupId: group._id,
            groupName: group.name,
          });
        }

        creditor.balance -= amount;
        debtor.balance += amount;

        if (creditor.balance < 0.01) creditorIndex++;
        if (Math.abs(debtor.balance) < 0.01) debtorIndex++;
      }
    }

    // Get recent expenses with proper formatting
    const recentExpensesFormatted = expenses.slice(0, 4).map(exp => ({
      id: exp._id,
      groupId: exp.groupId._id || exp.groupId,
      description: exp.description,
      amount: exp.amount,
      paidBy: exp.paidBy,
      category: exp.category,
      date: exp.date,
      createdAt: exp.createdAt,
      paymentMethod: exp.paymentMethod,
      isFlagged: exp.isFlagged || false,
      isRecurring: exp.isRecurring || false,
    }));

    res.json({
      success: true,
      data: {
        totalOwed,
        totalOwe,
        netBalance: totalOwed - totalOwe,
        totalGroups: groups.length,
        thisMonthExpenses: thisMonthTotal,
        pendingSettlements,
        groups: groups.slice(0, 3).map((group) => {
          const memberData = group.members.find(
            (m) => m.userId.toString() === req.user._id.toString()
          );
          return {
            id: group._id,
            name: group.name,
            description: group.description,
            userBalance: memberData?.balance || 0,
            memberCount: group.members.length,
            totalExpenses: expenses.filter(e => e.groupId.toString() === group._id.toString())
              .reduce((sum, e) => sum + e.amount, 0),
            currency: group.currency,
          };
        }),
        recentExpenses: recentExpensesFormatted,
        debtRelations,
      },
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router;

