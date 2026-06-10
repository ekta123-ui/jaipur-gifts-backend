const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

// ── Helper: sign JWT ─────────────────────────────────
const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

// ── POST /api/auth/register ──────────────────────────
router.post(
    '/register',
    [
        body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('phone').optional().isMobilePhone('en-IN').withMessage('Valid Indian mobile number required'),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const { name, email, password, phone } = req.body;

            const existing = await User.findOne({ email });
            if (existing) {
                return res.status(400).json({ error: 'Email already registered.' });
            }

            const user  = await User.create({ name, email, password, phone });
            const token = signToken(user._id);

            res.status(201).json({
                message: 'Account created successfully!',
                token,
                user,
            });
        } catch (err) {
            next(err);
        }
    }
);

// ── POST /api/auth/login ─────────────────────────────
router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const { email, password } = req.body;

            // Explicitly select password (it's hidden by default)
            const user = await User.findOne({ email }).select('+password');
            if (!user || !(await user.comparePassword(password))) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            if (!user.isActive) {
                return res.status(403).json({ error: 'Your account has been deactivated.' });
            }

            const token = signToken(user._id);

            // Strip password before sending
            user.loginCount = (user.loginCount || 0) + 1;
            user.lastLoginAt = new Date();
            await user.save();
            user.password = undefined;

            res.json({
                message: 'Logged in successfully!',
                token,
                user,
            });
        } catch (err) {
            next(err);
        }
    }
);

// ── GET /api/auth/me ─────────────────────────────────
router.get('/me', protect, async (req, res) => {
    res.json({ user: req.user });
});

// ── PUT /api/auth/me ── Update profile ───────────────
router.put(
    '/me',
    protect,
    [
        body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
        body('phone').optional().isMobilePhone('en-IN').withMessage('Valid Indian mobile number required'),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const { name, phone } = req.body;
            const updates = {};
            if (name)  updates.name  = name;
            if (phone) updates.phone = phone;

            const user = await User.findByIdAndUpdate(
                req.user._id,
                updates,
                { new: true, runValidators: true }
            );

            res.json({ message: 'Profile updated.', user });
        } catch (err) {
            next(err);
        }
    }
);

// ── PUT /api/auth/change-password ────────────────────
router.put(
    '/change-password',
    protect,
    [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const { currentPassword, newPassword } = req.body;
            const user = await User.findById(req.user._id).select('+password');

            if (!(await user.comparePassword(currentPassword))) {
                return res.status(400).json({ error: 'Current password is incorrect.' });
            }

            user.password = newPassword;
            await user.save();

            res.json({ message: 'Password changed successfully.' });
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
