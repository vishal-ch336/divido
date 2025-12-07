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
          };
        }),
        recentExpenses: expenses.slice(0, 4),
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

