const express = require('express');
const mongoose = require('mongoose');
const router  = express.Router();
const Gift    = require('../models/Gifts');
const { protect, adminOnly } = require('../middleware/auth');

// ── GET /api/gifts ── All gifts (with optional filters) ──────
// Query params: category, minPrice, maxPrice, sort, page, limit
router.get('/', async (req, res, next) => {
    try {
        const {
            category,
            search,
            minPrice,
            maxPrice,
            sort = '-createdAt',
            page = 1,
            limit = 20,
        } = req.query;

        const filter = { isAvailable: true };

        if (category) {
            filter.category = category;
        }
        if (search) {
            const pattern = new RegExp(search.trim(), 'i');
            filter.$or = [
                { name: pattern },
                { description: pattern },
                { tag: pattern },
                { giftId: pattern },
            ];
        }
        if (minPrice || maxPrice) {
            filter['price.amount'] = {};
            if (minPrice) filter['price.amount'].$gte = Number(minPrice);
            if (maxPrice) filter['price.amount'].$lte = Number(maxPrice);
        }

        const skip  = (Number(page) - 1) * Number(limit);
        const total = await Gift.countDocuments(filter);
        const gifts = await Gift.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(Number(limit));

        res.json({
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            gifts,
        });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/gifts/debug/all ── Return ALL database records (admin only) ──
router.get('/debug/all', protect, adminOnly, async (req, res, next) => {
    try {
        const gifts = await Gift.find({});
        res.json({ count: gifts.length, gifts });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/gifts/categories ── List all distinct categories ──
router.get('/categories', async (_req, res, next) => {
    try {
        const categories = await Gift.distinct('category');
        res.json({ categories });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/gifts/category/:category ────────────────────────
router.get('/category/:category', async (req, res, next) => {
    try {
        const gifts = await Gift.find({
            category: req.params.category,
            isAvailable: true,
        }).sort('-rating.average');

        res.json({ gifts });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/gifts/:giftId ── Single gift by custom string ID ──
router.get('/:giftId', async (req, res, next) => {
    try {
        const { giftId } = req.params;

        // 1. Try finding by custom giftId (e.g., "b1")
        let gift = await Gift.findOne({ giftId });

        // 2. Fallback: If not found, check if giftId is a valid MongoDB ObjectId
        if (!gift && mongoose.Types.ObjectId.isValid(giftId)) {
            gift = await Gift.findById(giftId);
        }

        if (!gift) {
            return res.status(404).json({ error: 'Gift not found.' });
        }
        res.json({ gift });
    } catch (err) {
        next(err);
    }
});

// ── POST /api/gifts ── Create gift (admin only) ──────────────
router.post('/', protect, adminOnly, async (req, res, next) => {
    try {
        const gift = await Gift.create(req.body);
        res.status(201).json({ message: 'Gift created.', gift });
    } catch (err) {
        next(err);
    }
});

// ── PUT /api/gifts/:giftId ── Update gift (admin only) ───────
router.put('/:giftId', protect, adminOnly, async (req, res, next) => {
    try {
        const gift = await Gift.findOneAndUpdate(
            { giftId: req.params.giftId },
            req.body,
            { new: true, runValidators: true }
        );
        if (!gift) return res.status(404).json({ error: 'Gift not found.' });
        res.json({ message: 'Gift updated.', gift });
    } catch (err) {
        next(err);
    }
});

// ── DELETE /api/gifts/:giftId ── Soft-delete (admin only) ────
router.delete('/:giftId', protect, adminOnly, async (req, res, next) => {
    try {
        const gift = await Gift.findOneAndUpdate(
            { giftId: req.params.giftId },
            { isAvailable: false },
            { new: true }
        );
        if (!gift) return res.status(404).json({ error: 'Gift not found.' });
        res.json({ message: 'Gift removed from listing.' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
