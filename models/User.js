const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [50, 'Name cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        },
        phone: {
            type: String,
            trim: true,
            match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'],
            default: null,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // Never returned in queries by default
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        wishlist: [
            {
                type: String, // gift IDs (string-based IDs as in frontend)
            }
        ],
        pushSubscription: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        loginCount: {
            type: Number,
            default: 0,
        },
        lastLoginAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true, // adds createdAt & updatedAt
    }
);

// ── Hash password before saving ──────────────────────
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// ── Instance method: compare password ────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// ── Remove password & __v from JSON responses ────────
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
