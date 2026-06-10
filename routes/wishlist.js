const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

// ── GET /api/wishlist ── Get my wishlist ─────────────────────
router.get('/', protect, async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('wishlist');
        res.json({ wishlist: user.wishlist });
    } catch (err) {
        next(err);
    }
});

// ── POST /api/wishlist/:giftId ── Add to wishlist ────────────
router.post('/:giftId', protect, async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (user.wishlist.includes(req.params.giftId)) {
            return res.status(400).json({ error: 'Already in wishlist.' });
        }
        user.wishlist.push(req.params.giftId);
        await user.save();
        res.json({ message: 'Added to wishlist.', wishlist: user.wishlist });
    } catch (err) {
        next(err);
    }
});

// ── DELETE /api/wishlist/:giftId ── Remove from wishlist ─────
router.delete('/:giftId', protect, async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        user.wishlist = user.wishlist.filter(id => id !== req.params.giftId);
        await user.save();
        res.json({ message: 'Removed from wishlist.', wishlist: user.wishlist });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
