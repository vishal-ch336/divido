import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import connectDB from '../config/database.js';

dotenv.config();

async function createTestNotifications() {
    try {
        await connectDB();

        // Get the first user
        const user = await User.findOne();
        if (!user) {
            console.log('No users found. Please create a user first.');
            process.exit(1);
        }

        console.log(`Creating notifications for user: ${user.email}`);

        // Clear existing notifications for this user
        await Notification.deleteMany({ user: user._id });
        console.log('Cleared existing notifications');

        // Create test notifications
        const testNotifications = [
            {
                user: user._id,
                type: 'expense',
                title: 'New expense added',
                message: 'John Doe added an expense of ₹500 in Office Lunch group',
                read: false,
            },
            {
                user: user._id,
                type: 'settlement',
                title: 'Payment received',
                message: 'Alice paid you ₹1,200 for Weekend Trip',
                read: false,
            },
            {
                user: user._id,
                type: 'group',
                title: 'Added to new group',
                message: 'Bob added you to the group "Roommate Expenses"',
                read: false,
            },
            {
                user: user._id,
                type: 'reminder',
                title: 'Payment reminder',
                message: 'You owe ₹300 to John Doe in Office Lunch',
                read: true,
            },
            {
                user: user._id,
                type: 'expense',
                title: 'Expense updated',
                message: 'Sarah updated the expense "Dinner" in Weekend Trip',
                read: true,
            },
        ];

        await Notification.insertMany(testNotifications);
        console.log(`✅ Created ${testNotifications.length} test notifications`);

        const unreadCount = testNotifications.filter(n => !n.read).length;
        console.log(`📬 ${unreadCount} unread notifications`);

        process.exit(0);
    } catch (error) {
        console.error('Error creating test notifications:', error);
        process.exit(1);
    }
}

createTestNotifications();
