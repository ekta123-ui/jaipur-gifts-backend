const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        giftId: {
            type: String,
            required: true,
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        name: {
            type: String,
            trim: true,
            default: '',
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            trim: true,
            minlength: 5,
            maxlength: 500,
            default: '',
        },
        isPublished: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

reviewSchema.index({ giftId: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
