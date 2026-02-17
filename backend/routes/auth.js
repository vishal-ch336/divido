import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('fullName').trim().isLength({ min: 2, max: 100 }),
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

      const { email, password, fullName } = req.body;

      // Check if user already exists
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({
          success: false,
          error: 'User already exists with this email',
        });
      }

      // Create user
      const user = await User.create({
        email,
        password,
        name: fullName,
      });

      // Generate token
      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            avatar: user.avatar,
            notifications: user.notifications,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error during signup',
      });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists(),
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

      const { email, password } = req.body;

      // Check for user
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid login credentials',
        });
      }

      // Check if password matches
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid login credentials',
        });
      }

      // Generate token
      const token = generateToken(user._id);

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            avatar: user.avatar,
            notifications: user.notifications,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error during login',
      });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          email: req.user.email,
          name: req.user.name,
          phone: req.user.phone,
          avatar: req.user.avatar,
          notifications: req.user.notifications,
          createdAt: req.user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  [
    protect,
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('phone').optional().trim(),
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

      const { name, phone } = req.body;

      // At least one field must be provided
      if (!name && !phone) {
        return res.status(400).json({
          success: false,
          error: 'Please provide at least one field to update',
        });
      }

      const updateFields = {};
      if (name) updateFields.name = name;
      if (phone !== undefined) updateFields.phone = phone;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        updateFields,
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            avatar: user.avatar,
            notifications: user.notifications,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error',
      });
    }
  }
);

// @route   PUT /api/auth/password
// @desc    Change user password
// @access  Private
router.put(
  '/password',
  [
    protect,
    body('currentPassword').exists().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
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

      const { currentPassword, newPassword } = req.body;

      // Get user with password field
      const user = await User.findById(req.user._id).select('+password');

      // Check if current password is correct
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        data: {
          message: 'Password updated successfully',
        },
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error',
      });
    }
  }
);

// @route   PUT /api/auth/notifications
// @desc    Update notification preferences
// @access  Private
router.put(
  '/notifications',
  [
    protect,
    body('email').optional().isBoolean(),
    body('push').optional().isBoolean(),
    body('reminders').optional().isBoolean(),
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

      const { email, push, reminders } = req.body;

      // At least one field must be provided
      if (email === undefined && push === undefined && reminders === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Please provide at least one notification preference to update',
        });
      }

      const updateFields = {};
      if (email !== undefined) updateFields['notifications.email'] = email;
      if (push !== undefined) updateFields['notifications.push'] = push;
      if (reminders !== undefined) updateFields['notifications.reminders'] = reminders;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        updateFields,
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        data: {
          notifications: user.notifications,
        },
      });
    } catch (error) {
      console.error('Update notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error',
      });
    }
  }
);

export default router;

