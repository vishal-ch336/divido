import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import Expense from '../models/Expense.js';
import Group from '../models/Group.js';
import ActivityLog from '../models/ActivityLog.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/expenses
// @desc    Get all expenses (optionally filtered by group)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { groupId } = req.query;
    
    let query = {};
    if (groupId) {
      // Verify user is a member of the group
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found',
        });
      }
      
      const isMember = group.members.some(
        (m) => m.userId.toString() === req.user._id.toString()
      ) || group.createdBy.toString() === req.user._id.toString();

      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this group',
        });
      }
      
      query.groupId = groupId;
    } else {
      // Get all groups user is a member of
      const groups = await Group.find({
        $or: [
          { createdBy: req.user._id },
          { 'members.userId': req.user._id },
        ],
      });
      const groupIds = groups.map(g => g._id);
      query.groupId = { $in: groupIds };
    }

    const expenses = await Expense.find(query)
      .populate('paidBy', 'name email avatar')
      .populate('splits.userId', 'name email avatar')
      .populate('groupId', 'name')
      .sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   POST /api/expenses
// @desc    Create a new expense
// @access  Private
router.post(
  '/',
  [
    body('groupId').notEmpty(),
    body('description').trim().isLength({ min: 1, max: 200 }),
    body('amount').isFloat({ min: 0.01 }),
    body('category').trim().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg,
        });
      }

      const {
        groupId,
        description,
        amount,
        paidBy,
        paidTo,
        paymentMethod,
        splitType,
        splits,
        category,
        date,
        isRecurring,
        recurringFrequency,
      } = req.body;

      // Verify user is a member of the group
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found',
        });
      }

      const isMember = group.members.some(
        (m) => m.userId.toString() === req.user._id.toString()
      ) || group.createdBy.toString() === req.user._id.toString();

      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to add expenses to this group',
        });
      }

      const expense = await Expense.create({
        groupId,
        description,
        amount,
        paidBy: paidBy || req.user._id,
        paidTo,
        paymentMethod: paymentMethod || 'cash',
        splitType: splitType || 'equal',
        splits: splits || [],
        category,
        date: date || new Date(),
        isRecurring: isRecurring || false,
        recurringFrequency,
      });

      await expense.populate('paidBy', 'name email avatar');
      await expense.populate('splits.userId', 'name email avatar');
      await expense.populate('groupId', 'name');

      // Update group member balances
      // This is a simplified version - you might want to recalculate all balances
      if (splits && splits.length > 0) {
        for (const split of splits) {
          const member = group.members.find(
            (m) => m.userId.toString() === split.userId.toString()
          );
          if (member) {
            member.balance -= split.amount;
          }
        }
        
        const paidByMember = group.members.find(
          (m) => m.userId.toString() === (paidBy || req.user._id).toString()
        );
        if (paidByMember) {
          paidByMember.balance += amount;
        }
        
        await group.save();
      }

      // Log activity
      await ActivityLog.create({
        groupId,
        userId: req.user._id,
        action: 'expense_created',
        description: `${req.user.name} added expense: ${description} (${amount} ${group.currency})`,
        metadata: { expenseId: expense._id },
      });

      res.status(201).json({
        success: true,
        data: expense,
      });
    } catch (error) {
      console.error('Create expense error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error',
      });
    }
  }
);

export default router;

