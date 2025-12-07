import express from 'express';
import { protect } from '../middleware/auth.js';
import ActivityLog from '../models/ActivityLog.js';
import Group from '../models/Group.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/activity
// @desc    Get activity logs (optionally filtered by group)
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

    const activities = await ActivityLog.find(query)
      .populate('userId', 'name email avatar')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

export default router;

