const express  = require('express');
const router   = express.Router();
const { body, validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

// ── POST /api/feedback ── Submit feedback ────────────────────
router.post(
    '/',
    optionalAuth,   // attach user if logged in, but not required
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
        body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const { name, email, rating, categories, message } = req.body;

            const feedback = await Feedback.create({
                name,
                email,
                rating,
                categories: categories || [],
                message,
                user: req.user?._id || null,
            });

            res.status(201).json({
                message: 'Thank you for your feedback!',
                feedback,
            });
        } catch (err) {
            next(err);
        }
    }
);

// ── GET /api/feedback ── All feedback (admin only) ───────────
router.get('/', protect, adminOnly, async (req, res, next) => {
    try {
        const { page = 1, limit = 20, published } = req.query;
        const filter = {};
        if (published !== undefined) filter.isPublished = published === 'true';

        const skip  = (Number(page) - 1) * Number(limit);
        const total = await Feedback.countDocuments(filter);
        const items = await Feedback.find(filter)
            .populate('user', 'name email')
            .sort('-createdAt')
            .skip(skip)
            .limit(Number(limit));

        res.json({ total, page: Number(page), items });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/feedback/public ── Approved testimonials (public) ─
router.get('/public', async (_req, res, next) => {
    try {
        const items = await Feedback.find({ isPublished: true })
            .select('name rating message categories createdAt')
            .sort('-createdAt')
            .limit(20);
        res.json({ items });
    } catch (err) {
        next(err);
    }
});

// ── PATCH /api/feedback/:id/publish ── Admin: approve review ──
router.patch('/:id/publish', protect, adminOnly, async (req, res, next) => {
    try {
        const feedback = await Feedback.findByIdAndUpdate(
            req.params.id,
            { isPublished: true },
            { new: true }
        );
        if (!feedback) return res.status(404).json({ error: 'Feedback not found.' });
        res.json({ message: 'Feedback published.', feedback });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
