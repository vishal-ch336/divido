import express from 'express';
import { protect } from '../middleware/auth.js';
import Group from '../models/Group.js';
import GroupInvite from '../models/GroupInvite.js';
import ActivityLog from '../models/ActivityLog.js';
import { generateInviteCode } from '../utils/inviteCode.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/groups/:groupId/invite
// Generate a new invite link for a group.
// Only group admins (role === 'admin' OR createdBy) can call this.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/groups/:groupId/invite', protect, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { expiresInDays, maxUses } = req.body; // optional

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    // Check caller is a member of the group (any member can generate an invite)
    const isMember = group.members.some(
      (m) => m.userId.toString() === req.user._id.toString()
    ) || group.createdBy.toString() === req.user._id.toString();

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'Only group members can generate invite links',
      });
    }

    // Generate a unique invite code (retry on collision – extremely rare)
    let inviteCode;
    let attempts = 0;
    while (attempts < 5) {
      inviteCode = generateInviteCode();
      const existing = await GroupInvite.findOne({ inviteCode });
      if (!existing) break;
      attempts++;
    }

    if (!inviteCode) {
      return res.status(500).json({ success: false, error: 'Failed to generate invite code' });
    }

    // Build optional fields
    const inviteData = {
      groupId,
      inviteCode,
      createdBy: req.user._id,
    };

    if (expiresInDays && Number(expiresInDays) > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(expiresInDays));
      inviteData.expiresAt = expiresAt;
    }

    if (maxUses && Number(maxUses) > 0) {
      inviteData.maxUses = Number(maxUses);
    }

    const invite = await GroupInvite.create(inviteData);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendUrl}/join/${inviteCode}`;

    res.status(201).json({
      success: true,
      data: {
        inviteCode: invite.inviteCode,
        inviteUrl,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
      },
    });
  } catch (error) {
    console.error('Generate invite error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invites/:inviteCode
// Fetch invite info and a group preview (no auth required so unauthenticated
// users can see the preview before being redirected to login).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/invites/:inviteCode', async (req, res) => {
  try {
    const invite = await GroupInvite.findOne({ inviteCode: req.params.inviteCode })
      .populate('groupId', 'name members currency')
      .populate('createdBy', 'name avatar');

    if (!invite) {
      return res.status(404).json({
        success: false,
        error: 'Invite link is invalid or has expired',
      });
    }

    // Validate expiry
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      return res.status(410).json({
        success: false,
        error: 'This invite link has expired',
      });
    }

    // Validate max uses
    if (invite.maxUses !== null && invite.usesCount >= invite.maxUses) {
      return res.status(410).json({
        success: false,
        error: 'This invite link has reached its maximum number of uses',
      });
    }

    const group = invite.groupId;

    res.json({
      success: true,
      data: {
        inviteCode: invite.inviteCode,
        groupId: group._id,
        groupName: group.name,
        memberCount: group.members.length,
        currency: group.currency,
        createdBy: {
          name: invite.createdBy?.name || 'Unknown',
          avatar: invite.createdBy?.avatar || null,
        },
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        usesCount: invite.usesCount,
      },
    });
  } catch (error) {
    console.error('Get invite info error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invites/:inviteCode/join
// Authenticated user joins the group associated with the invite.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/invites/:inviteCode/join', protect, async (req, res) => {
  try {
    const invite = await GroupInvite.findOne({ inviteCode: req.params.inviteCode });

    if (!invite) {
      return res.status(404).json({
        success: false,
        error: 'Invite link is invalid or has expired',
      });
    }

    // Validate expiry
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      return res.status(410).json({
        success: false,
        error: 'This invite link has expired',
      });
    }

    // Validate max uses
    if (invite.maxUses !== null && invite.usesCount >= invite.maxUses) {
      return res.status(410).json({
        success: false,
        error: 'This invite link has reached its maximum number of uses',
      });
    }

    const group = await Group.findById(invite.groupId)
      .populate('createdBy', 'name email avatar')
      .populate('members.userId', 'name email avatar');

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    // Prevent duplicate membership
    const isAlreadyMember = group.members.some(
      (m) => m.userId._id.toString() === req.user._id.toString()
    );

    if (isAlreadyMember) {
      return res.status(409).json({
        success: false,
        error: 'You are already a member of this group',
        data: { groupId: group._id },
      });
    }

    // Add user to group
    group.members.push({
      userId: req.user._id,
      role: 'member',
      balance: 0,
    });
    await group.save();

    // Increment usesCount on the invite
    invite.usesCount += 1;
    await invite.save();

    // Log activity
    await ActivityLog.create({
      groupId: group._id,
      userId: req.user._id,
      action: 'member_added',
      description: `${req.user.name} joined the group via invite link`,
    });

    res.json({
      success: true,
      message: `Successfully joined "${group.name}"`,
      data: {
        groupId: group._id,
        groupName: group.name,
      },
    });
  } catch (error) {
    console.error('Join via invite error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
