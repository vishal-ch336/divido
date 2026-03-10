import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { protect } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, error: 'Too many OTP requests from this IP, please try again after 15 minutes' }
});

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/google
// @desc    Sign in / sign up with Google (access token flow)
// @access  Public
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body; // credential = access_token from frontend
    if (!credential) {
      return res.status(400).json({ success: false, error: 'Google credential is required' });
    }

    // Verify by fetching user info from Google
    const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${credential}` },
    });

    if (!googleResponse.ok) {
      return res.status(401).json({ success: false, error: 'Invalid Google access token' });
    }

    const { sub: googleId, email, name, picture } = await googleResponse.json();

    if (!email) {
      return res.status(400).json({ success: false, error: 'Could not retrieve email from Google' });
    }

    // Find or create user
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Link Google account if user previously signed up via email
      if (!user.googleId) {
        user.googleId = googleId;
        user.isVerified = true;
        if (picture && !user.avatar) user.avatar = picture;
        await user.save();
      }
    } else {
      // Brand new user — create without a password
      user = await User.create({
        email,
        name,
        googleId,
        avatar: picture || null,
        isVerified: true, // Google already verified the email
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
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
          isVerified: user.isVerified,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ success: false, error: 'Google sign-in failed' });
  }
});

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
        isVerified: false,
      });

      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Save OTP to DB
      await Otp.create({
        email,
        otp
      });

      // Send OTP via email
      try {
        await sendEmail({
          email,
          subject: 'Verify your email - Divido',
          message: `Your verification code is ${otp}. It will expire in 5 minutes.`
        });
      } catch (err) {
        console.error('Email send error:', err);
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email for the OTP.',
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

// @route   POST /api/auth/verify-email
// @desc    Verify email with OTP
// @access  Public
router.post(
  '/verify-email',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const { email, otp } = req.body;

      // Find the user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ success: false, error: 'User not found' });
      }

      if (user.isVerified) {
        return res.status(400).json({ success: false, error: 'Email is already verified' });
      }

      // Check OTP
      const dbOtp = await Otp.findOne({ email, otp });
      if (!dbOtp) {
        return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
      }

      // Mark user as verified
      user.isVerified = true;
      await user.save();

      // Delete the OTP (it's single use)
      await Otp.deleteOne({ _id: dbOtp._id });

      // Generate token to log them in
      const token = generateToken(user._id);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            avatar: user.avatar,
            notifications: user.notifications,
            createdAt: user.createdAt,
            isVerified: user.isVerified,
          },
          token,
        },
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ success: false, error: 'Server error during verification' });
    }
  }
);

// @route   POST /api/auth/resend-otp
// @desc    Resend verification OTP
// @access  Public
router.post(
  '/resend-otp',
  otpLimiter,
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ success: false, error: 'User not found' });
      }

      if (user.isVerified) {
        return res.status(400).json({ success: false, error: 'Email is already verified' });
      }

      // Generate a new 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Upsert OTP (replaces any existing one for this email)
      await Otp.deleteMany({ email });
      await Otp.create({ email, otp });

      // Send email
      await sendEmail({
        email,
        subject: 'Verify your email - Divido',
        message: `Your new verification code is ${otp}. It will expire in 5 minutes.`
      });

      res.status(200).json({
        success: true,
        message: 'OTP sent to your email',
      });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ success: false, error: 'Server error while resending OTP' });
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

      // Check if user is verified (older users without isVerified are treated as true/verified)
      if (user.isVerified === false) {
        return res.status(403).json({
          success: false,
          error: 'Please verify your email before logging in',
          needsVerification: true
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

