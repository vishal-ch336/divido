import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount must be greater than 0'],
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'disputed'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card'],
    default: 'cash',
  },
  note: {
    type: String,
    trim: true,
    maxlength: [500, 'Note cannot be more than 500 characters'],
  },
  confirmedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for faster queries
settlementSchema.index({ groupId: 1 });
settlementSchema.index({ fromUser: 1, toUser: 1 });
settlementSchema.index({ status: 1 });

const Settlement = mongoose.model('Settlement', settlementSchema);

export default Settlement;

