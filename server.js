const express      = require('express');
const http         = require('http');
const chalk        = require('chalk'); // Added for better console logging
const { Server }   = require('socket.io');
const cors         = require('cors');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const jwt          = require('jsonwebtoken');
require('dotenv').config();

const connectDB      = require('./config/db');
const errorHandler   = require('./middleware/errorHandler');
const User           = require('./models/User');

const authRoutes     = require('./routes/auth');
const giftRoutes     = require('./routes/gifts');
const feedbackRoutes = require('./routes/feedback');
const orderRoutes    = require('./routes/orders');
const wishlistRoutes = require('./routes/wishlist');
const customRequestRoutes = require('./routes/customRequests');
const reviewRoutes   = require('./routes/reviews');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    "https://jaipur-gifts.netlify.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175"
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true
    }
});

// Inject IO into requests at the very beginning of the stack
app.use((req, _res, next) => {
    req.io = io;
    next();
});

// ── Global Middleware ────────────────────────────────────────

// CORS — allow the allowed origins list
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

// Parse JSON bodies
app.use(express.json({ limit: '10kb' }));

// HTTP request logger (dev only)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Global rate limiter — relaxed in dev, strict in production
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 1000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again in 15 minutes.' },
});
app.use('/api', limiter);

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Relaxed for development
    message: { error: 'Too many login attempts. Please try again later.' },
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/gifts',    giftRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/custom-requests', customRequestRoutes);
app.use('/api/reviews',  reviewRoutes);

// ─── SOCKET.IO REAL-TIME LOGIC ───
io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    console.log(`⚡ User connected: ${socket.id} (User: ${userId})`);

    socket.on('join_admin', async (data = {}) => {
        try {
            const token = data.token || socket.handshake.auth?.token;
            if (!token) {
                socket.emit('admin_join_denied', { error: 'Admin token required.' });
                return;
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user || !user.isActive || user.role !== 'admin') {
                socket.emit('admin_join_denied', { error: 'Admins only.' });
                return;
            }

            socket.join('admins');
            socket.emit('admin_joined');
            console.log(`Admin joined notification room: ${user.email}`);
        } catch (err) {
            socket.emit('admin_join_denied', { error: 'Invalid or expired admin token.' });
        }
    });

    // Real-time Order Notification for +91 9910863480
    socket.on('new_order', (orderData) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] 📦 New Order:`, orderData);
        io.to('admins').emit('admin_order_notification', { ...orderData, timestamp });
    });

    socket.on('send_message', (messageData) => {
        // Broadcast message to admins or specific users
        console.log("💬 New Chat Message:", messageData);
        io.to('admins').emit('receive_message', messageData);
    });

    socket.on('disconnect', () => {
        console.log('🔥 User disconnected');
    });
});

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.originalUrl} not found.` });
});

// ── Central Error Handler (must be last) ─────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────
const startServer = async () => {
    // 1. Connect to Database FIRST
    await connectDB();

    const PORT = process.env.PORT || 5000;

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`❌ Error: Port ${PORT} is already in use.`);
            process.exit(1);
        }
    });

    server.listen(PORT, () => {
        console.log(`🚀 Jaipur Gifts server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
};

startServer();
