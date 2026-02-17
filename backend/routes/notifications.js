import express from 'express';
import { body, validationResult } from 'express-validator';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get all notifications for the authenticated user
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .populate('relatedGroup', 'name')
            .populate('relatedExpense', 'description amount');

        const unreadCount = await Notification.countDocuments({
            user: req.user._id,
            read: false,
        });

        res.json({
            success: true,
            data: {
                notifications,
                unreadCount,
            },
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read for the authenticated user
// @access  Private
router.put('/mark-all-read', protect, async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { user: req.user._id, read: false },
            { read: true }
        );

        res.json({
            success: true,
            data: {
                message: 'All notifications marked as read',
                modifiedCount: result.modifiedCount,
            },
        });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a single notification as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            user: req.user._id,
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found',
            });
        }

        notification.read = true;
        await notification.save();

        res.json({
            success: true,
            data: {
                notification,
            },
        });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
});

export default router;
