const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Or your preferred provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendOrderStatusEmail = async (order, user) => {
    const trackingLink = `${process.env.FRONTEND_URL}/track-order`;
    
    const mailOptions = {
        from: '"Jaipur Gifts" <noreply@jaipurgifts.com>',
        to: user.email,
        subject: 'Jaipur Gifts Order Update',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
                <h2 style="color: #E8480A;">Hello ${user.name}</h2>
                <p>Your order <b>${order._id}</b> has been updated.</p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
                    <p><b>Current Status:</b> ${order.status.toUpperCase()}</p>
                    <p><b>Expected Delivery:</b> ${order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toDateString() : 'TBA'}</p>
                    <p><b>Admin Note:</b> ${order.adminNote || 'No new updates.'}</p>
                </div>
                <p style="margin-top: 20px;">
                    <a href="${trackingLink}" style="background: #E8480A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Track Order</a>
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #888;">Thank you, <br/> Jaipur Gifts Team</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.error('Email Error:', err);
    }
};

module.exports = { sendOrderStatusEmail };