const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema(
    {
        giftId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        name: {
            type: String,
            required: [true, 'Gift name is required'],
            trim: true,
        },
        description: {
            type: String,
            default: '',
        },
        price: {
            amount: { type: Number, required: true },
            display: { type: String, required: true },
            currency: { type: String, default: 'INR' },
        },
        category: {
            type: String,
            required: true,
            enum: [
                'birthday',
                'anniversary',
                'baby-shower',
                'groom-to-be',
                'bride-to-be',
                'wedding',
                'friendship',
                'appreciation',
            ],
            index: true,
        },
        tag: {
            type: String,
            default: '',
        },
        rating: {
            average: { type: Number, default: 0, min: 0, max: 5 },
            count: { type: Number, default: 0 },
        },
        details: [{ type: String }],
        imgUrl: {
            type: String,
            default: '',
        },
        stock: {
            type: Number,
            default: 100,
        },
        isAvailable: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Gift', giftSchema);