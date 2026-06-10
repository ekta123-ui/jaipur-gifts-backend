const mongoose = require('mongoose');

const customRequestSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        name: {
            type: String,
            trim: true,
            default: '',
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: '',
        },
        phone: {
            type: String,
            trim: true,
            default: '',
        },
        message: {
            type: String,
            required: [true, 'Customization details are required'],
            trim: true,
            minlength: [3, 'Customization details must be at least 3 characters'],
        },
        source: {
            type: String,
            enum: ['home', 'product', 'other'],
            default: 'home',
        },
        status: {
            type: String,
            enum: ['new', 'contacted', 'converted', 'closed'],
            default: 'new',
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('CustomRequest', customRequestSchema);
