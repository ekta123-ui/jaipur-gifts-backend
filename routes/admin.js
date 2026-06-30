const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Gift = require('../models/Gifts');
const Review = require('../models/Review');
const CustomRequest = require('../models/CustomRequest');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/admin/dashboard - Enterprise Statistics
router.get('/dashboard', protect, adminOnly, async (req, res, next) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));

        const [stats, statusGroups, revenueChart, categoryChart, newCustomRequests] = await Promise.all([
            Promise.all([
                User.countDocuments({ role: 'user' }),
                User.aggregate([{ $group: { _id: null, total: { $sum: '$loginCount' } } }]),
                User.countDocuments({ role: 'user', lastLoginAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
                Order.countDocuments({}),
                Gift.countDocuments({ isAvailable: true }),
                Review.countDocuments({ isPublished: false }),
                Order.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
                Order.aggregate([{ $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
                Order.aggregate([{ $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: startOfToday } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
            ]),
            Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            // Monthly Revenue for Chart
            Order.aggregate([
                { $match: { status: { $ne: 'cancelled' } } },
                { $group: { _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, total: { $sum: "$totalAmount" } } },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
                { $limit: 12 }
            ]),
            // Top Categories
            Order.aggregate([
                { $unwind: '$items' },
                { $group: { _id: '$items.category', count: { $sum: '$items.quantity' } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]),
            CustomRequest.countDocuments({ status: 'new' })
        ]);

        res.json({
            totalUsers: stats[0],
            totalLogins: stats[1][0]?.total || 0,
            activeUsers: stats[2],
            totalOrders: stats[3],
            totalProducts: stats[4],
            pendingReviews: stats[5],
            totalRevenue: stats[6][0]?.total || 0,
            monthlyRevenue: stats[7][0]?.total || 0,
            todayRevenue: stats[8][0]?.total || 0,
            newCustomRequests,
            statusDistribution: statusGroups.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
            charts: {
                revenue: revenueChart.map(i => ({ name: `${i._id.month}/${i._id.year}`, value: i.total })),
                categories: categoryChart
            }
        });
    } catch (err) { next(err); }
});

// GET /api/admin/users - User Management
router.get('/users', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password').sort('-createdAt');
        res.json({ users });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/users/:id', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ user });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/users/:id', protect, adminOnly, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/push-subscribe', protect, adminOnly, [
    body('subscription').optional().custom((value, { req }) => {
        if (!value && (!req.body || Object.keys(req.body).length === 0)) {
            throw new Error('Push subscription payload is required.');
        }
        return true;
    })
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const subscription = req.body.subscription || req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { pushSubscription: subscription },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'Admin user not found.' });
        }

        res.json({ message: 'Push subscription saved successfully.', user });
    } catch (err) {
        next(err);
    }
});

module.exports = router;