import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    enum: [
      'expense_created',
      'expense_edited',
      'expense_deleted',
      'settlement_created',
      'settlement_confirmed',
      'member_added',
      'member_removed',
      'expense_flagged',
    ],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes for faster queries
activityLogSchema.index({ groupId: 1, createdAt: -1 });
activityLogSchema.index({ userId: 1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;

