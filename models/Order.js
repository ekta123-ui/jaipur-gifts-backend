const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    giftId: { type: String, required: true },
    name:   { type: String, required: true },
    price:  { type: Number, required: true },
    imgUrl: { type: String, default: '' },
    quantity: { type: Number, default: 1, min: 1 },
    customMessage: { type: String, default: '' },
    customName: { type: String, default: '' },
    specialInstructions: { type: String, default: '' },
    uploadedImage: { type: String, default: '' },
});

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        items: {
            type: [orderItemSchema],
            validate: [arr => arr.length > 0, 'Order must have at least one item'],
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'processing', 'completed', 'delivered', 'cancelled'],
            default: 'pending',
            index: true,
        },
        deliveryAddress: {
            fullName:    { type: String, required: true },
            phone:       { type: String, required: true },
            addressLine1:{ type: String, required: true },
            addressLine2:{ type: String, default: '' },
            city:        { type: String, required: true },
            state:       { type: String, default: 'Rajasthan' },
            pincode:     { type: String, required: true },
        },
        paymentStatus: {
            type: String,
            enum: ['unpaid', 'paid', 'refunded'],
            default: 'unpaid',
        },
        paymentMethod: {
            type: String,
            enum: ['cod', 'upi', 'card', 'netbanking'],
            default: 'cod',
        },
        occasion: {
            type: String,
            default: '',
        },
        recipientName: {
            type: String,
            default: '',
        },
        giftNote: {
            type: String,
            default: '',
        },
        orderMessage: {
            type: String,
            default: '',
        },
        specialInstructions: {
            type: String,
            default: '',
        },
        uploadedImage: {
            type: String,
            default: '',
        },
        trackingId: {
            type: String,
            default: null,
        },
        isSameDay: {
            type: Boolean,
            default: false,
        },
        estimatedDelivery: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Auto-set estimatedDelivery before saving
orderSchema.pre('save', function (next) {
    if (!this.estimatedDelivery) {
        const days = this.isSameDay ? 0 : 2;
        const d = new Date();
        d.setDate(d.getDate() + days);
        this.estimatedDelivery = d;
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);
