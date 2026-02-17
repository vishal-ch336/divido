import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required'],
        index: true,
    },
    type: {
        type: String,
        enum: ['expense', 'settlement', 'group', 'reminder'],
        required: [true, 'Notification type is required'],
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
    },
    relatedGroup: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        default: null,
    },
    relatedExpense: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expense',
        default: null,
    },
    read: {
        type: Boolean,
        default: false,
        index: true,
    },
}, {
    timestamps: true,
});

// Index for efficient querying of user notifications
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
