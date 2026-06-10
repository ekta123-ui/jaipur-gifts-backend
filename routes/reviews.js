const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Gift = require('../models/Gifts');
const { protect, adminOnly } = require('../middleware/auth');

const refreshGiftRating = async (giftId) => {
    const stats = await Review.aggregate([
        { $match: { giftId, isPublished: true } },
        { $group: { _id: '$giftId', average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    const rating = stats[0]
        ? { average: Number(stats[0].average.toFixed(1)), count: stats[0].count }
        : { average: 0, count: 0 };

    await Gift.findOneAndUpdate({ giftId }, { rating });
};

router.get('/gift/:giftId', async (req, res, next) => {
    try {
        const reviews = await Review.find({ giftId: req.params.giftId, isPublished: true })
            .populate('user', 'name')
            .sort('-createdAt')
            .limit(20);

        res.json({ reviews });
    } catch (err) {
        next(err);
    }
});

router.post(
    '/',
    protect,
    [
        body('giftId').trim().notEmpty().withMessage('Gift ID is required'),
        body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
        body('comment').trim().isLength({ min: 5, max: 500 }).withMessage('Review must be 5 to 500 characters'),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const gift = await Gift.findOne({ giftId: req.body.giftId, isAvailable: true });
            if (!gift) return res.status(404).json({ error: 'Gift not found.' });

            const review = await Review.findOneAndUpdate(
                { giftId: req.body.giftId, user: req.user._id },
                {
                    giftId: req.body.giftId,
                    user: req.user._id,
                    name: req.user.name,
                    rating: Number(req.body.rating),
                    comment: req.body.comment,
                    isPublished: false,
                },
                { new: true, upsert: true, runValidators: true }
            );

            res.status(201).json({ message: 'Review submitted for admin approval.', review });
        } catch (err) {
            next(err);
        }
    }
);

router.get('/', protect, adminOnly, async (req, res, next) => {
    try {
        const { published, page = 1, limit = 30 } = req.query;
        const filter = {};
        if (published !== undefined) filter.isPublished = published === 'true';

        const skip = (Number(page) - 1) * Number(limit);
        const total = await Review.countDocuments(filter);
        const reviews = await Review.find(filter)
            .populate('user', 'name email')
            .sort('-createdAt')
            .skip(skip)
            .limit(Number(limit));

        res.json({ total, page: Number(page), reviews });
    } catch (err) {
        next(err);
    }
});

router.patch('/:id/publish', protect, adminOnly, async (req, res, next) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { isPublished: true },
            { new: true }
        );

        if (!review) return res.status(404).json({ error: 'Review not found.' });
        await refreshGiftRating(review.giftId);

        res.json({ message: 'Review published.', review });
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', protect, adminOnly, async (req, res, next) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id);
        if (!review) return res.status(404).json({ error: 'Review not found.' });
        await refreshGiftRating(review.giftId);

        res.json({ message: 'Review removed.' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
