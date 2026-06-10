const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        },
        rating: {
            type: Number,
            required: [true, 'Rating is required'],
            min: [1, 'Rating must be at least 1'],
            max: [5, 'Rating cannot exceed 5'],
        },
        categories: {
            // which aspects they rated (Product Quality, Delivery Speed, etc.)
            type: [String],
            default: [],
        },
        message: {
            type: String,
            required: [true, 'Message is required'],
            trim: true,
            minlength: [10, 'Message must be at least 10 characters'],
        },
        // Link to a user if they were logged in
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        isPublished: {
            type: Boolean,
            default: false, // Admin must approve before showing as testimonial
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
