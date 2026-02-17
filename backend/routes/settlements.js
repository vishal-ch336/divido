import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import Settlement from '../models/Settlement.js';
import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import ActivityLog from '../models/ActivityLog.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/settlements
// @desc    Get all settlements for current user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { groupId, status } = req.query;

    let query = {
      $or: [
        { fromUser: req.user._id },
        { toUser: req.user._id },
      ],
    };

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

    if (status) {
      query.status = status;
    }

    const settlements = await Settlement.find(query)
      .populate('groupId', 'name')
      .populate('fromUser', 'name email avatar')
      .populate('toUser', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: settlements,
    });
  } catch (error) {
    console.error('Get settlements error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/settlements/calculate
// @desc    Calculate suggested settlements from group balances
// @access  Private
router.get('/calculate', async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'groupId is required',
      });
    }

    // Verify user is a member of the group
    const group = await Group.findById(groupId)
      .populate('members.userId', 'name email avatar')
      .populate('createdBy', 'name email avatar');

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

    // Calculate balances for all members
    const balances = [];
    const allMembers = [
      {
        userId: group.createdBy,
        balance: 0,
      },
      ...group.members,
    ];

    for (const member of allMembers) {
      const memberUserId = member.userId._id || member.userId;
      const memberData = group.members.find(
        (m) => m.userId.toString() === memberUserId.toString()
      );
      const balance = memberData?.balance || 0;

      // Get user info (already populated)
      const userInfo = typeof member.userId === 'object' && member.userId.name
        ? member.userId
        : { _id: memberUserId, name: 'Unknown', email: '', avatar: null };

      balances.push({
        userId: memberUserId,
        user: userInfo,
        balance,
      });
    }

    // Simple settlement calculation: find who owes and who is owed
    const suggestedSettlements = [];
    const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
    const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);

    // Match creditors with debtors
    let creditorIndex = 0;
    let debtorIndex = 0;

    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];

      const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

      if (amount > 0.01) {
        suggestedSettlements.push({
          fromUser: debtor.userId,
          fromUserName: debtor.user?.name || 'Unknown',
          toUser: creditor.userId,
          toUserName: creditor.user?.name || 'Unknown',
          amount: parseFloat(amount.toFixed(2)),
        });
      }

      creditor.balance -= amount;
      debtor.balance += amount;

      if (creditor.balance < 0.01) creditorIndex++;
      if (Math.abs(debtor.balance) < 0.01) debtorIndex++;
    }

    res.json({
      success: true,
      data: suggestedSettlements,
    });
  } catch (error) {
    console.error('Calculate settlements error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   POST /api/settlements
// @desc    Create a new settlement
// @access  Private
router.post(
  '/',
  [
    body('groupId').notEmpty(),
    body('fromUser').notEmpty(),
    body('toUser').notEmpty(),
    body('amount').isFloat({ min: 0.01 }),
    body('paymentMethod').optional().isIn(['cash', 'upi', 'card']),
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

      const { groupId, fromUser, toUser, amount, paymentMethod, note } = req.body;

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
          error: 'Not authorized to create settlements for this group',
        });
      }

      // Verify fromUser and toUser are members of the group
      const fromUserIsMember = group.members.some(
        (m) => m.userId.toString() === fromUser.toString()
      ) || group.createdBy.toString() === fromUser.toString();

      const toUserIsMember = group.members.some(
        (m) => m.userId.toString() === toUser.toString()
      ) || group.createdBy.toString() === toUser.toString();

      if (!fromUserIsMember || !toUserIsMember) {
        return res.status(400).json({
          success: false,
          error: 'Both users must be members of the group',
        });
      }

      const settlement = await Settlement.create({
        groupId,
        fromUser,
        toUser,
        amount,
        paymentMethod: paymentMethod || 'cash',
        note: note || undefined,
        status: 'pending',
      });

      await settlement.populate('groupId', 'name');
      await settlement.populate('fromUser', 'name email avatar');
      await settlement.populate('toUser', 'name email avatar');

      // Log activity
      await ActivityLog.create({
        groupId,
        userId: req.user._id,
        action: 'settlement_created',
        description: `${settlement.fromUser.name} paid ${amount} ${group.currency} to ${settlement.toUser.name}`,
        metadata: { settlementId: settlement._id },
      });

      res.status(201).json({
        success: true,
        data: settlement,
      });
    } catch (error) {
      console.error('Create settlement error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error',
      });
    }
  }
);

// @route   PATCH /api/settlements/:id/confirm
// @desc    Confirm a settlement
// @access  Private
router.patch('/:id/confirm', async (req, res) => {
  try {
    const settlement = await Settlement.findById(req.params.id)
      .populate('groupId');

    if (!settlement) {
      return res.status(404).json({
        success: false,
        error: 'Settlement not found',
      });
    }

    // Only the recipient can confirm
    if (settlement.toUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only the recipient can confirm this settlement',
      });
    }

    if (settlement.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Settlement is not pending',
      });
    }

    // Update settlement status
    settlement.status = 'confirmed';
    settlement.confirmedAt = new Date();
    await settlement.save();

    // Update group member balances
    const group = await Group.findById(settlement.groupId);
    if (group) {
      console.log('=== SETTLEMENT CONFIRMATION DEBUG ===');
      console.log('Settlement amount:', settlement.amount);
      console.log('From user:', settlement.fromUser.toString());
      console.log('To user:', settlement.toUser.toString());
      console.log('Group members BEFORE update:', group.members.map(m => ({
        userId: m.userId.toString(),
        balance: m.balance
      })));

      // When fromUser pays toUser:
      // - fromUser's debt decreases, so their balance increases
      // - toUser's credit decreases, so their balance decreases

      const fromMember = group.members.find(
        (m) => m.userId.toString() === settlement.fromUser.toString()
      );
      if (fromMember) {
        console.log(`Updating fromUser balance: ${fromMember.balance} + ${settlement.amount}`);
        fromMember.balance += settlement.amount;
      } else {
        console.log('WARNING: fromUser not found in group.members!');
      }

      const toMember = group.members.find(
        (m) => m.userId.toString() === settlement.toUser.toString()
      );
      if (toMember) {
        console.log(`Updating toUser balance: ${toMember.balance} - ${settlement.amount}`);
        toMember.balance -= settlement.amount;
      } else {
        console.log('WARNING: toUser not found in group.members!');
      }

      await group.save();

      console.log('Group members AFTER update:', group.members.map(m => ({
        userId: m.userId.toString(),
        balance: m.balance
      })));

      // Verify the save by fetching fresh from DB
      const freshGroup = await Group.findById(settlement.groupId);
      console.log('Fresh from DB (verification):', freshGroup.members.map(m => ({
        userId: m.userId.toString(),
        balance: m.balance
      })));
      console.log('=== END DEBUG ===');
    }

    await settlement.populate('fromUser', 'name email avatar');
    await settlement.populate('toUser', 'name email avatar');

    // Log activity
    await ActivityLog.create({
      groupId: settlement.groupId._id,
      userId: req.user._id,
      action: 'settlement_confirmed',
      description: `${req.user.name} confirmed payment of ${settlement.amount} ${group.currency} from ${settlement.fromUser.name}`,
      metadata: { settlementId: settlement._id },
    });

    res.json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    console.error('Confirm settlement error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router;

