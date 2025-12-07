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

    // Calculate total expenses for each group
    const groupsWithExpenses = await Promise.all(
      groups.map(async (group) => {
        const expenses = await Expense.find({ groupId: group._id });
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        const memberData = group.members.find(
          (m) => m.userId._id.toString() === req.user._id.toString()
        );

        return {
          id: group._id,
          name: group.name,
          description: group.description,
          createdBy: group.createdBy,
          createdAt: group.createdAt,
          memberCount: group.members.length,
          totalExpenses,
          currency: group.currency,
          userBalance: memberData?.balance || 0,
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

    res.json({
      success: true,
      data: group,
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
    body('memberNames').optional().isArray(),
    body('memberNames.*').optional().trim().isLength({ min: 2, max: 100 }),
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

      const { name, description, currency, memberNames } = req.body;

      // Start with creator as admin member
      const members = [{
        userId: req.user._id,
        role: 'admin',
        balance: 0,
      }];

      // Add additional members if provided
      if (memberNames && Array.isArray(memberNames) && memberNames.length > 0) {
        // Remove duplicates and normalize names (trim, but keep case for display)
        const uniqueNames = [...new Set(memberNames.map((name) => name.trim()).filter(name => name.length > 0))];
        
        // Remove creator's name if included (case-insensitive)
        const creatorName = req.user.name.trim();
        const filteredNames = uniqueNames.filter(name => name.toLowerCase() !== creatorName.toLowerCase());

        if (filteredNames.length === 0) {
          // All names were filtered out (only creator was added)
          // Continue with just creator as member
        } else {
          // Find users by name (case-insensitive exact match)
          const notFoundNames = [];
          const duplicateNames = [];

          for (const name of filteredNames) {
            const nameTrimmed = name.trim();
            // Find users with exact name match (case-insensitive)
            const foundUsers = await User.find({
              name: { $regex: new RegExp(`^${nameTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            });

            if (foundUsers.length === 0) {
              notFoundNames.push(nameTrimmed);
            } else if (foundUsers.length > 1) {
              duplicateNames.push(nameTrimmed);
            } else {
              // Single match found - add to members
              const user = foundUsers[0];
              // Don't add creator again
              if (user._id.toString() !== req.user._id.toString()) {
                // Check if already added (avoid duplicates)
                const alreadyAdded = members.some(m => m.userId.toString() === user._id.toString());
                if (!alreadyAdded) {
                  members.push({
                    userId: user._id,
                    role: 'member',
                    balance: 0,
                  });
                }
              }
            }
          }

          if (notFoundNames.length > 0) {
            return res.status(400).json({
              success: false,
              error: `The following names are not registered: ${notFoundNames.join(', ')}`,
            });
          }

          if (duplicateNames.length > 0) {
            return res.status(400).json({
              success: false,
              error: `Multiple users found with these names. Please be more specific: ${duplicateNames.join(', ')}`,
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

export default router;

