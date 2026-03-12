import mongoose from 'mongoose';

const groupInviteSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    maxUses: {
      type: Number,
      default: null,
    },
    usesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index to speed up invite look-ups by code
groupInviteSchema.index({ inviteCode: 1 });

// Helper: check if invite is still valid
groupInviteSchema.methods.isValid = function () {
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  if (this.maxUses !== null && this.usesCount >= this.maxUses) return false;
  return true;
};

const GroupInvite = mongoose.model('GroupInvite', groupInviteSchema);

export default GroupInvite;
