const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const CustomRequest = require('../models/CustomRequest');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

router.post(
    '/',
    optionalAuth,
    [
        body('message').trim().isLength({ min: 3 }).withMessage('Please write customization details.'),
        body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Valid email required'),
        body('phone').optional({ checkFalsy: true }).trim(),
        body('name').optional({ checkFalsy: true }).trim(),
        body('source').optional().isIn(['home', 'product', 'other']).withMessage('Invalid source'),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const request = await CustomRequest.create({
                user: req.user?._id || null,
                name: req.body.name || req.user?.name || '',
                email: req.body.email || req.user?.email || '',
                phone: req.body.phone || req.user?.phone || '',
                message: req.body.message,
                source: req.body.source || 'home',
            });

            if (req.io) {
                req.io.to('admins').emit('admin_custom_request', {
                    requestId: request._id,
                    name: request.name,
                    message: request.message,
                    createdAt: request.createdAt,
                });
            }

            res.status(201).json({ message: 'Customization request saved.', request });
        } catch (err) {
            next(err);
        }
    }
);

router.get('/', protect, adminOnly, async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const total = await CustomRequest.countDocuments(filter);
        const requests = await CustomRequest.find(filter)
            .populate('user', 'name email phone')
            .sort('-createdAt')
            .skip(skip)
            .limit(Number(limit));

        res.json({ total, page: Number(page), requests });
    } catch (err) {
        next(err);
    }
});

router.patch(
    '/:id/status',
    protect,
    adminOnly,
    [body('status').isIn(['new', 'contacted', 'converted', 'closed']).withMessage('Invalid status')],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const request = await CustomRequest.findByIdAndUpdate(
                req.params.id,
                { status: req.body.status },
                { new: true }
            );

            if (!request) return res.status(404).json({ error: 'Customization request not found.' });
            res.json({ message: 'Customization status updated.', request });
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
