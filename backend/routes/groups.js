import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/groups
// @desc    Get all groups for current user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find({
      $or: [
        { createdBy: req.user._id },
        { 'members.userId': req.user._id },
      ],
    })
      .populate('createdBy', 'name email avatar')
      .populate('members.userId', 'name email avatar')
      .sort({ createdAt: -1 });

    // Calculate total expenses and debt relations for each group
    const groupsWithExpenses = await Promise.all(
      groups.map(async (group) => {
        await group.populate('members.userId', 'name email avatar');
        await group.populate('createdBy', 'name email avatar');
        
        const expenses = await Expense.find({ groupId: group._id });
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        const currentUserMemberData = group.members.find(
          (m) => m.userId._id.toString() === req.user._id.toString()
        );

        // Calculate debt relations for this group
        const allMembers = [
          {
            userId: group.createdBy,
            balance: 0,
          },
          ...group.members,
        ];

        const balances = [];
        for (const member of allMembers) {
          const memberUserId = member.userId._id || member.userId;
          const memberBalanceData = group.members.find(
            (m) => m.userId.toString() === memberUserId.toString()
          );
          const balance = memberBalanceData?.balance || 0;
          
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
        const debtRelations = [];
        const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
        const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

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
            });
          }

          creditor.balance -= amount;
          debtor.balance += amount;

          if (creditor.balance < 0.01) creditorIndex++;
          if (Math.abs(debtor.balance) < 0.01) debtorIndex++;
        }

        return {
          id: group._id,
          name: group.name,
          description: group.description,
          createdBy: group.createdBy,
          createdAt: group.createdAt,
          memberCount: group.members.length,
          totalExpenses,
          currency: group.currency,
          userBalance: currentUserMemberData?.balance || 0,
          debtRelations,
        };
      })
    );

    res.json({
      success: true,
      data: groupsWithExpenses,
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   GET /api/groups/:id
// @desc    Get single group
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('createdBy', 'name email avatar')
      .populate('members.userId', 'name email avatar');

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
      });
    }

    // Check if user is a member
    const isMember = group.members.some(
      (m) => m.userId._id.toString() === req.user._id.toString()
    ) || group.createdBy._id.toString() === req.user._id.toString();

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this group',
      });
    }

    // Calculate debt relations for this group
    const allMembers = [
      {
        userId: group.createdBy,
        balance: 0,
      },
      ...group.members,
    ];

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
    const debtRelations = [];
    const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

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
        });
      }

      creditor.balance -= amount;
      debtor.balance += amount;

      if (creditor.balance < 0.01) creditorIndex++;
      if (Math.abs(debtor.balance) < 0.01) debtorIndex++;
    }

    // Get total expenses for the group
    const expenses = await Expense.find({ groupId: group._id });
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    res.json({
      success: true,
      data: {
        ...group.toObject(),
        debtRelations,
        totalExpenses,
      },
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   POST /api/groups
// @desc    Create a new group
// @access  Private
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('memberEmails').optional().isArray(),
    body('memberEmails.*').optional().trim().isEmail().normalizeEmail(),
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

      const { name, description, currency, memberEmails } = req.body;

      // Start with creator as admin member
      const members = [{
        userId: req.user._id,
        role: 'admin',
        balance: 0,
      }];

      // Add additional members if provided
      if (memberEmails && Array.isArray(memberEmails) && memberEmails.length > 0) {
        // Remove duplicates and normalize emails (lowercase, trim)
        const uniqueEmails = [...new Set(memberEmails.map((email) => email.trim().toLowerCase()).filter(email => email.length > 0))];
        
        // Remove creator's email if included
        const creatorEmail = req.user.email.toLowerCase();
        const filteredEmails = uniqueEmails.filter(email => email !== creatorEmail);

        if (filteredEmails.length === 0) {
          // All emails were filtered out (only creator was added)
          // Continue with just creator as member
        } else {
          // Find users by email
          const notFoundEmails = [];

          for (const email of filteredEmails) {
            const emailTrimmed = email.trim().toLowerCase();
            // Find user by email (emails are already normalized by express-validator)
            const foundUser = await User.findOne({
              email: emailTrimmed
            });

            if (!foundUser) {
              notFoundEmails.push(emailTrimmed);
            } else {
              // User found - add to members
              // Don't add creator again
              if (foundUser._id.toString() !== req.user._id.toString()) {
                // Check if already added (avoid duplicates)
                const alreadyAdded = members.some(m => m.userId.toString() === foundUser._id.toString());
                if (!alreadyAdded) {
                  members.push({
                    userId: foundUser._id,
                    role: 'member',
                    balance: 0,
                  });
                }
              }
            }
          }

          if (notFoundEmails.length > 0) {
            return res.status(400).json({
              success: false,
              error: `The following emails are not registered: ${notFoundEmails.join(', ')}`,
            });
          }
        }
      }

      const group = await Group.create({
        name,
        description,
        createdBy: req.user._id,
        currency: currency || 'INR',
        members,
      });

      await group.populate('createdBy', 'name email avatar');
      await group.populate('members.userId', 'name email avatar');

      // Log activity for group creation
      await ActivityLog.create({
        groupId: group._id,
        userId: req.user._id,
        action: 'member_added',
        description: `${req.user.name} created the group "${name}"`,
      });

      // Log activity for each member added
      for (const member of members) {
        if (member.userId.toString() !== req.user._id.toString()) {
          const memberUser = await User.findById(member.userId);
          if (memberUser) {
            await ActivityLog.create({
              groupId: group._id,
              userId: req.user._id,
              action: 'member_added',
              description: `${memberUser.name} was added to the group "${name}"`,
            });
          }
        }
      }

      res.status(201).json({
        success: true,
        data: group,
      });
    } catch (error) {
      console.error('Create group error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error',
      });
    }
  }
);

// @route   DELETE /api/groups/:id
// @desc    Delete a group
// @access  Private (only creator/admin can delete)
router.delete('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
      });
    }

    // Check if user is the creator
    const isCreator = group.createdBy.toString() === req.user._id.toString();
    
    // Check if user is an admin member
    const isAdmin = group.members.some(
      (m) => m.userId.toString() === req.user._id.toString() && m.role === 'admin'
    );

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this group. Only the creator or admin members can delete groups.',
      });
    }

    // Delete all related expenses
    await Expense.deleteMany({ groupId: group._id });

    // Delete all related activity logs
    await ActivityLog.deleteMany({ groupId: group._id });

    // Delete the group
    await Group.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router;

