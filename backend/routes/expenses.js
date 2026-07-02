import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import Expense from '../models/Expense.js';
import Group from '../models/Group.js';
import ActivityLog from '../models/ActivityLog.js';
import { applyExpense, reverseExpense } from '../utils/balanceCalculator.js';

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
      // Balance change for each person = (amount they paid - amount they owe)
      if (splits && splits.length > 0) {
        const paidById = (paidBy || req.user._id).toString();

        for (const split of splits) {
          const member = group.members.find(
            (m) => m.userId.toString() === split.userId.toString()
          );

          if (member) {
            const memberId = member.userId.toString();
            const amountPaid = (memberId === paidById) ? amount : 0;
            const amountOwed = split.amount;

            // Balance change = what they paid - what they owe
            // Positive balance = they are owed money (creditor)
            // Negative balance = they owe money (debtor)
            member.balance += (amountPaid - amountOwed);
          }
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

// @route   PUT /api/expenses/:id
// @desc    Update an expense and recalculate balances
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    // Verify user is a member of the expense's group
    const group = await Group.findById(expense.groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
      });
    }

    const isMember = group.members.some(
      (m) => !m.isGuest && m.userId && m.userId.toString() === req.user._id.toString()
    ) || group.createdBy.toString() === req.user._id.toString();

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to edit expenses in this group',
      });
    }

    // Capture old values for the activity log
    const oldDescription = expense.description;
    const oldAmount = expense.amount;

    // Reverse the old expense balances
    reverseExpense(group, expense);

    // Update expense fields
    const { description, amount, category, splitType, splits, date, paymentMethod } = req.body;
    if (description !== undefined) expense.description = description;
    if (amount !== undefined) expense.amount = amount;
    if (category !== undefined) expense.category = category;
    if (splitType !== undefined) expense.splitType = splitType;
    if (splits !== undefined) expense.splits = splits;
    if (date !== undefined) expense.date = date;
    if (paymentMethod !== undefined) expense.paymentMethod = paymentMethod;

    // Apply the updated expense balances
    applyExpense(group, expense);

    // Save both documents
    await expense.save();
    await group.save();

    // Re-populate for the response
    await expense.populate('paidBy', 'name email avatar');
    await expense.populate('splits.userId', 'name email avatar');
    await expense.populate('groupId', 'name');

    // Log activity
    await ActivityLog.create({
      groupId: expense.groupId._id || expense.groupId,
      userId: req.user._id,
      action: 'expense_edited',
      description: `${req.user.name} edited expense: ${oldDescription} ₹${oldAmount} → ₹${expense.amount}`,
      metadata: { expenseId: expense._id },
    });

    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense and reverse its balances
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    const group = await Group.findById(expense.groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
      });
    }

    // Only the payer or the group creator can delete
    const isPayer = expense.paidBy.toString() === req.user._id.toString();
    const isCreator = group.createdBy.toString() === req.user._id.toString();

    if (!isPayer && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this expense',
      });
    }

    // Reverse the expense balances
    reverseExpense(group, expense);
    await group.save();

    // Log activity before deleting
    await ActivityLog.create({
      groupId: expense.groupId,
      userId: req.user._id,
      action: 'expense_deleted',
      description: `${req.user.name} deleted expense: ${expense.description} ₹${expense.amount}`,
      metadata: { expenseId: expense._id },
    });

    await expense.deleteOne();

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router;
