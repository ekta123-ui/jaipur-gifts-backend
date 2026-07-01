const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const webpush = require('web-push');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const Order   = require('../models/Order');
const Gift    = require('../models/Gifts');
const User    = require('../models/User');
const CustomRequest = require('../models/CustomRequest');
const Review = require('../models/Review');
const { protect, adminOnly } = require('../middleware/auth'); 
const { sendOrderConfirmationEmail, sendOrderStatusEmail } = require('../utils/email');

const uploadStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});
const upload = multer({ storage: uploadStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── POST /api/orders/upload-image ── Upload an image for a personalized order ────────────────────
router.post('/upload-image', protect, upload.single('image'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload an image file.' });
        }
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.status(201).json({ url: imageUrl });
    } catch (err) {
        next(err);
    }
});

// ── POST /api/orders ── Place a new order ────────────────────
router.post(
    '/',
    protect,
    [
        body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
        body('deliveryAddress.fullName').notEmpty().withMessage('Full name required'),
        body('deliveryAddress.phone').notEmpty().withMessage('Phone required'),
        body('deliveryAddress.addressLine1').notEmpty().withMessage('Address required'),
        body('deliveryAddress.city').notEmpty().withMessage('City required'),
        body('deliveryAddress.pincode').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit pincode required'),
        body('paymentMethod').optional().isIn(['cod', 'upi', 'card', 'netbanking'])
            .withMessage('Invalid payment method selected'),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const {
                items,
                deliveryAddress,
                paymentMethod,
                isSameDay,
                occasion,
                recipientName,
                giftNote,
                orderMessage,
                uploadedImage,
            } = req.body;

            // ── Idempotency Check ─────────────────────────────────────
            // Prevent duplicate orders from same user within 30 seconds
            const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
            const duplicateOrder = await Order.findOne({
                user: req.user._id,
                createdAt: { $gte: thirtySecondsAgo },
                totalAmount: req.body.totalAmount, // Assuming frontend sends expected total or compare items
            });

            if (duplicateOrder) {
                return res.status(409).json({ error: 'A similar order was recently placed. Please check your order history.' });
            }

            // Validate each gift and compute totalAmount from DB prices
            let totalAmount = 0;
            const enrichedItems = [];
            
            // Optimized: Fetch all required gifts in a single batch query
            const giftIds = items.map(item => item.giftId).filter(Boolean);
            const validObjectIds = giftIds.filter(id => mongoose.Types.ObjectId.isValid(id));

            // Resilient Lookup: Check both custom giftId AND MongoDB _id
            const availableGifts = await Gift.find({
                $or: [
                    { giftId: { $in: giftIds } },
                    { _id: { $in: validObjectIds } }
                ],
                isAvailable: true
            });

            // Create a lookup map for faster access (indexing by both ID types)
            const giftMap = availableGifts.reduce((acc, gift) => {
                acc[gift.giftId] = gift;
                acc[gift._id.toString()] = gift;
                return acc;
            }, {});

            for (const item of items) {

    const gift = giftMap[item.giftId];

    if (!gift) {
        return res.status(400).json({
            error: `Gift "${item.giftId}" not found or unavailable.`,
            receivedGiftId: item.giftId,
            availableGiftIds: availableGifts.map(g => g.giftId)
        });
    }

    const quantity = Number(item.quantity) || 1;
    const unitPrice = gift.price.amount || 0;

    totalAmount += unitPrice * quantity;

    enrichedItems.push({
        giftId: gift.giftId,
        name: gift.name,
        price: unitPrice,
        imgUrl: gift.imgUrl || item.imgUrl || '',
        quantity,
        customMessage: item.customMessage || '',
        customName: item.customName || '',
        specialInstructions: item.specialInstructions || '',
        uploadedImage: item.uploadedImage || '',
    });
}


            const order = await Order.create({
                user: req.user._id,
                items: enrichedItems,
                totalAmount,
                deliveryAddress,
                paymentMethod: paymentMethod || 'cod',
                occasion: occasion || '',
                recipientName: recipientName || '',
                giftNote: giftNote || '',
                orderMessage: orderMessage || '',
                uploadedImage: uploadedImage || '',
                isSameDay: isSameDay || false,
                status: 'confirmed',
                statusUpdatedAt: new Date()
            });

            // Real-time Notification for Admins
            if (req.io) {
                req.io.to('admins').emit('admin_order_notification', {
                    orderId: order._id,
                    customerName: deliveryAddress.fullName,
                    amount: totalAmount,
                    itemsCount: enrichedItems.length,
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'order'
                });
            }

            // Web Push Notification for Admins
            try {
                const admins = await User.find({ role: 'admin', pushSubscription: { $exists: true } });
                const pushPayload = JSON.stringify({
                    title: '👑 New Royal Order!',
                    body: `${deliveryAddress.fullName} just spent ${totalAmount} on a surprise.`,
                    url: '/admin'
                });

                admins.forEach(admin => {
                    webpush.sendNotification(admin.pushSubscription, pushPayload)
                        .catch(err => console.error("Push Error for Admin:", admin.email, err));
                });
            } catch (pushErr) {
                console.error("Push notification logic failed:", pushErr);
            }

            if (req.user) {
                sendOrderConfirmationEmail(order, req.user)
                    .catch(err => console.error('Order confirmation email failed:', err));
            }

            res.status(201).json({ 
                message: 'Thank you for your order! It has been placed successfully. You can view your order details and track status in your profile section.', 
                order 
            });
        } catch (err) {
            console.error("📦 Database Order Error:", err);
            next(err);
        }
    }
);

// ── GET /api/orders/stats/summary ── Admin dashboard numbers ──
router.get('/stats/summary', protect, adminOnly, async (_req, res, next) => {
    try {
        const [
            totalUsers,
            activeUsers,
            loginAgg,
            totalOrders,
            totalRevenueAgg,
            customRequests,
            newCustomRequests,
            statusCounts,
            topCategories,
            totalProducts,
            pendingReviews,
        ] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            User.countDocuments({ role: 'user', loginCount: { $gt: 0 } }),
            User.aggregate([{ $group: { _id: null, total: { $sum: '$loginCount' } } }]),
            Order.countDocuments({}),
            Order.aggregate([
                { $match: { status: { $ne: 'cancelled' } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]),
            CustomRequest.countDocuments({}),
            CustomRequest.countDocuments({ status: 'new' }),
            Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Order.aggregate([
                { $unwind: '$items' },
                {
                    $lookup: {
                        from: 'gifts',
                        localField: 'items.giftId',
                        foreignField: 'giftId',
                        as: 'gift',
                    },
                },
                { $unwind: { path: '$gift', preserveNullAndEmptyArrays: true } },
                { $group: { _id: { $ifNull: ['$gift.category', 'unknown'] }, count: { $sum: '$items.quantity' } } },
                { $sort: { count: -1 } },
            ]),
            Gift.countDocuments({ isAvailable: true }),
            Review.countDocuments({ isPublished: false }),
        ]);

        res.json({
            stats: {
                totalUsers,
                activeUsers,
                totalLogins: loginAgg[0]?.total || 0,
                totalOrders,
                totalRevenue: totalRevenueAgg[0]?.total || 0,
                varietyOrders: totalOrders,
                customRequests,
                newCustomRequests,
                totalProducts,
                pendingReviews,
                statusCounts: statusCounts.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
                topCategories,
            },
        });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/orders/most-bought ── Public: Get top N most bought gifts ──
router.get('/most-bought', async (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 10; // Default to top 10

        const mostBoughtGifts = await Order.aggregate([
            { $unwind: '$items' }, // Deconstruct the items array
            {
                $group: {
                    _id: '$items.giftId', // Group by original giftId
                    totalQuantity: { $sum: '$items.quantity' }
                }
            },
            { $sort: { totalQuantity: -1 } }, // Sort by most bought first
            { $limit: limit }, // Get the top N
            {
                $lookup: {
                    from: 'gifts', // The collection to join with
                    localField: '_id', // Field from the input documents (the giftId from _id)
                    foreignField: 'giftId', // Field from the "gifts" collection
                    as: 'giftDetails' // Output array field
                }
            },
            { $unwind: '$giftDetails' }, // Deconstruct the giftDetails array
            { $match: { 'giftDetails.isAvailable': true } }, // Only show available gifts
            { $project: { _id: 0, totalQuantity: 1, gift: '$giftDetails' } } // Reshape output
        ]);

        res.json({ gifts: mostBoughtGifts });
    } catch (err) {
        next(err);
    }
});
// ── GET /api/orders/track/:id ── Public tracking (limited info) ─────
router.get('/track/:id', async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .select('status items totalAmount estimatedDeliveryDate adminNote trackingNumber courierPartner createdAt');
        if (!order) return res.status(404).json({ error: 'Order not found.' });
        res.json({ order });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ error: 'Invalid Order ID format.' });
        }
        next(err);
    }
});

// ── GET /api/orders/my ── Current user's orders ──────────────
router.get('/my', protect, async (req, res, next) => {
    try {
        const { page = 1, limit = 5 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const total = await Order.countDocuments({ user: req.user._id });
        const orders = await Order.find({ user: req.user._id })
            .sort('-createdAt')
            .skip(skip)
            .limit(Number(limit));

        res.json({ 
            orders, 
            total, 
            page: Number(page), 
            pages: Math.ceil(total / Number(limit)) 
        });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/orders ── All orders (admin only) ───────────────
router.get('/', protect, adminOnly, async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const skip  = (Number(page) - 1) * Number(limit);
        const total = await Order.countDocuments(filter);
        const orders = await Order.find(filter)
            .populate('user', 'name email phone')
            .sort('-createdAt')
            .skip(skip)
            .limit(Number(limit));

        res.json({ total, page: Number(page), orders });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/orders/:id ── Single order (owner or admin) ─────
router.get('/:id', protect, async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email phone');
        if (!order) return res.status(404).json({ error: 'Order not found.' });

        // Only the owner or an admin can view
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorised.' });
        }

        res.json({ order });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ error: 'Order not found.' });
        }
        next(err);
    }
});

// ── PUT /api/admin/orders/:id ── Full Update (admin) ────
router.put(
    '/:id',
    protect,
    adminOnly,
    async (req, res, next) => {
        try {
            const order = await Order.findById(req.params.id).populate('user');
            if (!order) return res.status(404).json({ error: 'Order not found.' });

            const { status, estimatedDeliveryDate, adminNote, trackingNumber, courierPartner } = req.body;
            const statusChanged = status && order.status !== status;

            order.status = status || order.status;
            order.estimatedDeliveryDate = estimatedDeliveryDate || order.estimatedDeliveryDate;
            order.adminNote = adminNote || order.adminNote;
            order.trackingNumber = trackingNumber || order.trackingNumber;
            order.courierPartner = courierPartner || order.courierPartner;
            
            if (statusChanged) {
                order.statusUpdatedAt = new Date();
            }

            await order.save();

            if (statusChanged && order.user) {
                sendOrderStatusEmail(order, order.user);
            }

            res.json({ message: 'Order updated successfully.', order });
        } catch (err) {
            next(err);
        }
    }
);

// ── PATCH /api/orders/:id/status ── Update order status (admin only) ─
router.patch(
    '/:id/status',
    protect,
    adminOnly,
    [body('status').trim().notEmpty().withMessage('Status is required')],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const order = await Order.findById(req.params.id).populate('user');
            if (!order) return res.status(404).json({ error: 'Order not found.' });

            const newStatus = req.body.status;
            const statusChanged = order.status !== newStatus;
            order.status = newStatus;
            if (statusChanged) {
                order.statusUpdatedAt = new Date();
            }

            await order.save();

            if (statusChanged && order.user) {
                sendOrderStatusEmail(order, order.user);
            }

            res.json({ message: 'Order status updated successfully.', order });
        } catch (err) {
            next(err);
        }
    }
);

// ── DELETE /api/orders/:id ── Cancel order (owner, if pending) ─
router.delete('/:id', protect, async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found.' });

        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorised.' });
        }
        if (!['pending', 'confirmed'].includes(order.status)) {
            return res.status(400).json({ error: 'Order cannot be cancelled at this stage.' });
        }

        order.status = 'cancelled';
        await order.save();
        res.json({ message: 'Order cancelled.' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
