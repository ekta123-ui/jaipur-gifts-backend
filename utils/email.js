const nodemailer = require('nodemailer');

const EMAIL_FROM = process.env.EMAIL_FROM || 'Jaipur Gifts <noreply@jaipurgifts.com>';
const EMAIL_SUPPORT = process.env.SUPPORT_EMAIL || 'support@jaipurgifts.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const transportOptions = process.env.SMTP_HOST ? {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
} : {
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
};

const transporter = nodemailer.createTransport(transportOptions);

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value);
};

const getOrderItemsHtml = (items) => {
    return items.map(item => `
        <tr>
            <td style="padding: 12px 10px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align:center;">${item.quantity}</td>
            <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align:right;">${formatCurrency(item.price)}</td>
            <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align:right;">${formatCurrency(item.price * item.quantity)}</td>
        </tr>
    `).join('');
};

const buildOrderSummaryHtml = (order) => {
    const itemsHtml = getOrderItemsHtml(order.items);
    return `
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-top: 16px;">
            <thead>
                <tr>
                    <th align="left" style="padding: 12px 10px; border-bottom: 2px solid #ddd;">Item</th>
                    <th align="center" style="padding: 12px 10px; border-bottom: 2px solid #ddd;">Qty</th>
                    <th align="right" style="padding: 12px 10px; border-bottom: 2px solid #ddd;">Price</th>
                    <th align="right" style="padding: 12px 10px; border-bottom: 2px solid #ddd;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" style="padding: 12px 10px; border-top: 2px solid #ddd; text-align: right; font-weight: 600;">Order Total</td>
                    <td style="padding: 12px 10px; border-top: 2px solid #ddd; text-align: right; font-weight: 600;">${formatCurrency(order.totalAmount)}</td>
                </tr>
            </tfoot>
        </table>
    `;
};

const sendMail = async ({ to, subject, html }) => {
    const mailOptions = {
        from: EMAIL_FROM,
        to,
        subject,
        html,
    };
    await transporter.sendMail(mailOptions);
};

const sendOrderConfirmationEmail = async (order, user) => {
    const shortOrderId = order._id.toString().slice(-8).toUpperCase();
    const trackingLink = `${FRONTEND_URL}/track-order?id=${order._id}`;
    const deliveryDate = order.estimatedDelivery
        ? new Date(order.estimatedDelivery).toDateString()
        : 'TBA';

    const html = `
        <div style="font-family: Inter, Arial, sans-serif; color: #1f2937; max-width: 680px; margin: auto; padding: 24px; background: #f8fafc;">
            <div style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);">
                <div style="background: linear-gradient(135deg, #F97316 0%, #FB923C 100%); padding: 32px 28px; color: white; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px; letter-spacing: -0.02em;">Order Confirmed</h1>
                    <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.92;">Your Jaipur Gifts order has been received and is being prepared with care.</p>
                </div>
                <div style="padding: 32px 28px;">
                    <p style="margin: 0 0 18px; font-size: 16px;">Hi ${user.name || order.deliveryAddress.fullName || 'there'},</p>
                    <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.7;">Thank you for choosing Jaipur Gifts. Your order <strong>#${shortOrderId}</strong> has been confirmed and is now in our system.</p>

                    <div style="display: grid; gap: 12px; margin-bottom: 28px;">
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px;">
                            <p style="margin: 0 0 4px; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: #475569;">Order details</p>
                            <p style="margin: 0; font-size: 15px;"><strong>Order ID:</strong> ${order._id}</p>
                            <p style="margin: 0; font-size: 15px;"><strong>Estimated delivery:</strong> ${deliveryDate}</p>
                            <p style="margin: 0; font-size: 15px;"><strong>Payment method:</strong> ${order.paymentMethod?.toUpperCase() || 'COD'}</p>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px;">
                            <p style="margin: 0 0 4px; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: #475569;">Delivery address</p>
                            <p style="margin: 0; font-size: 15px;">${order.deliveryAddress.fullName}</p>
                            <p style="margin: 0; font-size: 15px;">${order.deliveryAddress.addressLine1}${order.deliveryAddress.addressLine2 ? `, ${order.deliveryAddress.addressLine2}` : ''}</p>
                            <p style="margin: 0; font-size: 15px;">${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.pincode}</p>
                            <p style="margin: 0; font-size: 15px;">Phone: ${order.deliveryAddress.phone}</p>
                        </div>
                    </div>

                    <h2 style="margin: 0 0 16px; font-size: 18px;">Order summary</h2>
                    ${buildOrderSummaryHtml(order)}

                    ${order.orderMessage ? `<div style="margin-top: 24px; padding: 18px; background: #f1f5f9; border-radius: 14px;"><p style="margin: 0 0 8px; font-weight: 600;">Personal message</p><p style="margin: 0;">${order.orderMessage}</p></div>` : ''}

                    <div style="text-align: center; margin: 32px 0 16px;">
                        <a href="${trackingLink}" style="display: inline-flex; align-items: center; justify-content: center; padding: 14px 24px; background: #F97316; color: white; text-decoration: none; border-radius: 999px; font-weight: 600;">Track your order</a>
                    </div>

                    <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.7;">If you have any questions or want to update your delivery preferences, reply to this email or write to <a href="mailto:${EMAIL_SUPPORT}" style="color: #F97316; text-decoration: none;">${EMAIL_SUPPORT}</a>.</p>
                </div>
                <div style="background: #f8fafc; padding: 18px 28px 24px; font-size: 13px; color: #64748b; text-align: center;">
                    <p style="margin: 0 0 8px;">Jaipur Gifts • Royal gifting for every celebration.</p>
                    <p style="margin: 0;">Need help? <a href="mailto:${EMAIL_SUPPORT}" style="color: #475569;">${EMAIL_SUPPORT}</a></p>
                </div>
            </div>
        </div>
    `;

    return sendMail({
        to: user.email,
        subject: `Your Jaipur Gifts order #${shortOrderId} is confirmed`,
        html,
    });
};

const sendOrderStatusEmail = async (order, user) => {
    const trackingLink = `${FRONTEND_URL}/track-order?id=${order._id}`;
    const deliveryDate = order.estimatedDelivery
        ? new Date(order.estimatedDelivery).toDateString()
        : 'TBA';

    const html = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; background: #f8fafc;">
            <div style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);">
                <div style="background: linear-gradient(135deg, #F97316 0%, #FB923C 100%); padding: 28px; color: white; text-align: center;">
                    <h1 style="margin: 0; font-size: 26px;">Order Status Update</h1>
                </div>
                <div style="padding: 28px; color: #1f2937; line-height: 1.7;">
                    <p style="margin: 0 0 16px;">Hello ${user.name || order.deliveryAddress.fullName || 'there'},</p>
                    <p style="margin: 0 0 16px;">Your order <strong>#${order._id}</strong> status has changed to <strong>${order.status.toUpperCase()}</strong>.</p>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 22px;">
                        <p style="margin: 0 0 6px; font-weight: 600;">Expected delivery:</p>
                        <p style="margin: 0;">${deliveryDate}</p>
                        <p style="margin: 16px 0 0; font-weight: 600;">Admin note:</p>
                        <p style="margin: 6px 0 0;">${order.adminNote || 'No new update at this time.'}</p>
                    </div>
                    <div style="text-align: center; margin-bottom: 24px;">
                        <a href="${trackingLink}" style="display: inline-block; color: white; background: #F97316; padding: 12px 22px; border-radius: 999px; text-decoration: none; font-weight: 600;">View order status</a>
                    </div>
                    <p style="margin: 0; font-size: 14px; color: #64748b;">Questions? Reach our support team at <a href="mailto:${EMAIL_SUPPORT}" style="color: #F97316;">${EMAIL_SUPPORT}</a>.</p>
                </div>
            </div>
        </div>
    `;

    return sendMail({
        to: user.email,
        subject: `Jaipur Gifts order update: ${order.status.toUpperCase()}`,
        html,
    });
};

module.exports = { sendOrderConfirmationEmail, sendOrderStatusEmail };