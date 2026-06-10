const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Protect: requires a valid JWT ────────────────────
const protect = async (req, res, next) => {
    try {
        let token;

        // Accept Bearer token from Authorization header
        if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ error: 'Not authorised. Please log in.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'User no longer exists or is inactive.' });
        }

        req.user = user; // attach user to request
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please log in again.' });
        }
        return res.status(401).json({ error: 'Invalid token.' });
    }
};

// ── Admin: requires role === 'admin' ─────────────────
const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
    next();
};

// ── Optional auth: attaches user if token present ────
const optionalAuth = async (req, res, next) => {
    try {
        if (req.headers.authorization?.startsWith('Bearer ')) {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id);
        }
    } catch (_) {
        // silently ignore invalid / expired token
    }
    next();
};

module.exports = { protect, adminOnly, optionalAuth };
