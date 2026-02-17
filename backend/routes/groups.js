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

        // Calculate detailed debts from expenses (transaction-based, not minimized)
        // This shows who actually owes whom based on expense transactions
        const detailedDebts = new Map(); // key: "fromUserId-toUserId"

        for (const expense of expenses) {
          const paidById = (expense.paidBy._id || expense.paidBy).toString();

          for (const split of expense.splits || []) {
            const userId = (split.userId._id || split.userId).toString();

            // If this person didn't pay, they owe the payer
            if (userId !== paidById) {
              const key = `${userId}-${paidById}`;

              if (!detailedDebts.has(key)) {
                detailedDebts.set(key, {
                  fromUserId: userId,
                  toUserId: paidById,
                  amount: 0,
                });
              }

              const debt = detailedDebts.get(key);
              debt.amount += split.amount;
            }
          }
        }

        // Consolidate reverse debts (if A owes B ₹500 and B owes A ₹100, result is A owes B ₹400)
        const consolidatedDebts = new Map();

        for (const [key, debt] of detailedDebts.entries()) {
          const reverseKey = `${debt.toUserId}-${debt.fromUserId}`;

          if (consolidatedDebts.has(reverseKey)) {
            // There's a reverse debt - consolidate
            const reverseDebt = consolidatedDebts.get(reverseKey);
            const netAmount = reverseDebt.amount - debt.amount;

            if (netAmount > 0.01) {
              // Keep reverse debt with reduced amount
              reverseDebt.amount = netAmount;
            } else if (netAmount < -0.01) {
              // Flip to this direction
              consolidatedDebts.delete(reverseKey);
              consolidatedDebts.set(key, {
                ...debt,
                amount: Math.abs(netAmount),
              });
            } else {
              // Exactly cancel - remove both
              consolidatedDebts.delete(reverseKey);
            }
          } else {
            // No reverse debt exists, add this one
            consolidatedDebts.set(key, debt);
          }
        }

        // Convert to debtRelations with user info
        const debtRelations = [];
        for (const debt of consolidatedDebts.values()) {
          if (debt.amount > 0.01) {
            // Find user info from group members
            const fromMember = group.members.find(
              (m) => (m.userId._id || m.userId).toString() === debt.fromUserId
            );
            const toMember = group.members.find(
              (m) => (m.userId._id || m.userId).toString() === debt.toUserId
            );

            if (fromMember && toMember) {
              const fromUser = typeof fromMember.userId === 'object' && fromMember.userId.name
                ? fromMember.userId
                : { _id: debt.fromUserId, name: 'Unknown', email: '', avatar: null };
              const toUser = typeof toMember.userId === 'object' && toMember.userId.name
                ? toMember.userId
                : { _id: debt.toUserId, name: 'Unknown', email: '', avatar: null };

              debtRelations.push({
                fromUser: {
                  id: fromUser._id || debt.fromUserId,
                  name: fromUser.name || 'Unknown',
                  email: fromUser.email || '',
                  avatar: fromUser.avatar,
                },
                toUser: {
                  id: toUser._id || debt.toUserId,
                  name: toUser.name || 'Unknown',
                  email: toUser.email || '',
                  avatar: toUser.avatar,
                },
                amount: parseFloat(debt.amount.toFixed(2)),
              });
            }
          }
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

    // Get all expenses for the group to calculate detailed debts
    const expenses = await Expense.find({ groupId: group._id });
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate detailed debts from expenses (transaction-based, not minimized)
    // This shows who actually owes whom based on expense transactions
    const detailedDebts = new Map(); // key: "fromUserId-toUserId"

    for (const expense of expenses) {
      const paidById = (expense.paidBy._id || expense.paidBy).toString();

      for (const split of expense.splits || []) {
        const userId = (split.userId._id || split.userId).toString();

        // If this person didn't pay, they owe the payer
        if (userId !== paidById) {
          const key = `${userId}-${paidById}`;

          if (!detailedDebts.has(key)) {
            detailedDebts.set(key, {
              fromUserId: userId,
              toUserId: paidById,
              amount: 0,
            });
          }

          const debt = detailedDebts.get(key);
          debt.amount += split.amount;
        }
      }
    }

    // Consolidate reverse debts (if A owes B ₹500 and B owes A ₹100, result is A owes B ₹400)
    const consolidatedDebts = new Map();

    for (const [key, debt] of detailedDebts.entries()) {
      const reverseKey = `${debt.toUserId}-${debt.fromUserId}`;

      if (consolidatedDebts.has(reverseKey)) {
        // There's a reverse debt - consolidate
        const reverseDebt = consolidatedDebts.get(reverseKey);
        const netAmount = reverseDebt.amount - debt.amount;

        if (netAmount > 0.01) {
          // Keep reverse debt with reduced amount
          reverseDebt.amount = netAmount;
        } else if (netAmount < -0.01) {
          // Flip to this direction
          consolidatedDebts.delete(reverseKey);
          consolidatedDebts.set(key, {
            ...debt,
            amount: Math.abs(netAmount),
          });
        } else {
          // Exactly cancel - remove both
          consolidatedDebts.delete(reverseKey);
        }
      } else {
        // No reverse debt exists, add this one
        consolidatedDebts.set(key, debt);
      }
    }

    // Convert to debtRelations with user info
    const debtRelations = [];
    for (const debt of consolidatedDebts.values()) {
      if (debt.amount > 0.01) {
        // Find user info from group members
        const fromMember = group.members.find(
          (m) => (m.userId._id || m.userId).toString() === debt.fromUserId
        );
        const toMember = group.members.find(
          (m) => (m.userId._id || m.userId).toString() === debt.toUserId
        );

        if (fromMember && toMember) {
          const fromUser = typeof fromMember.userId === 'object' && fromMember.userId.name
            ? fromMember.userId
            : { _id: debt.fromUserId, name: 'Unknown', email: '', avatar: null };
          const toUser = typeof toMember.userId === 'object' && toMember.userId.name
            ? toMember.userId
            : { _id: debt.toUserId, name: 'Unknown', email: '', avatar: null };

          debtRelations.push({
            fromUser: {
              id: fromUser._id || debt.fromUserId,
              name: fromUser.name || 'Unknown',
              email: fromUser.email || '',
              avatar: fromUser.avatar,
            },
            toUser: {
              id: toUser._id || debt.toUserId,
              name: toUser.name || 'Unknown',
              email: toUser.email || '',
              avatar: toUser.avatar,
            },
            amount: parseFloat(debt.amount.toFixed(2)),
          });
        }
      }
    }

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

// @route   POST /api/groups/:id/members
// @desc    Add members to an existing group
// @access  Private (only members can add other members)
router.post(
  '/:id/members',
  [
    body('memberEmails').isArray({ min: 1 }).withMessage('At least one email is required'),
    body('memberEmails.*').trim().isEmail().normalizeEmail().withMessage('Invalid email format'),
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

      const { memberEmails } = req.body;
      const group = await Group.findById(req.params.id);

      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found',
        });
      }

      // Check if user is a member of the group
      const isMember = group.members.some(
        (m) => m.userId.toString() === req.user._id.toString()
      ) || group.createdBy.toString() === req.user._id.toString();

      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to add members to this group',
        });
      }

      // Remove duplicates and normalize emails (lowercase, trim)
      const uniqueEmails = [...new Set(memberEmails.map((email) => email.trim().toLowerCase()).filter(email => email.length > 0))];

      // Remove creator's email if included
      const creatorEmail = req.user.email.toLowerCase();
      const filteredEmails = uniqueEmails.filter(email => email !== creatorEmail);

      if (filteredEmails.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid emails to add',
        });
      }

      // Find users by email and check for duplicates
      const notFoundEmails = [];
      const alreadyMemberEmails = [];
      const newMembers = [];

      for (const email of filteredEmails) {
        const emailTrimmed = email.trim().toLowerCase();
        const foundUser = await User.findOne({ email: emailTrimmed });

        if (!foundUser) {
          notFoundEmails.push(emailTrimmed);
        } else {
          // Check if user is already a member
          const isAlreadyMember = group.members.some(
            (m) => m.userId.toString() === foundUser._id.toString()
          );

          if (isAlreadyMember) {
            alreadyMemberEmails.push(emailTrimmed);
          } else {
            newMembers.push({
              userId: foundUser._id,
              role: 'member',
              balance: 0,
            });
          }
        }
      }

      // Report errors if any
      if (notFoundEmails.length > 0) {
        return res.status(400).json({
          success: false,
          error: `The following emails are not registered: ${notFoundEmails.join(', ')}`,
        });
      }

      if (alreadyMemberEmails.length > 0 && newMembers.length === 0) {
        return res.status(400).json({
          success: false,
          error: `All provided emails are already members of this group`,
        });
      }

      if (newMembers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No new members to add',
        });
      }

      // Add new members to the group
      group.members.push(...newMembers);
      await group.save();

      // Populate the group data
      await group.populate('createdBy', 'name email avatar');
      await group.populate('members.userId', 'name email avatar');

      // Log activity for each member added
      for (const member of newMembers) {
        const memberUser = await User.findById(member.userId);
        if (memberUser) {
          await ActivityLog.create({
            groupId: group._id,
            userId: req.user._id,
            action: 'member_added',
            description: `${memberUser.name} was added to the group by ${req.user.name}`,
          });
        }
      }

      res.json({
        success: true,
        data: group,
        message: `Successfully added ${newMembers.length} member${newMembers.length > 1 ? 's' : ''} to the group`,
      });
    } catch (error) {
      console.error('Add members error:', error);
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

