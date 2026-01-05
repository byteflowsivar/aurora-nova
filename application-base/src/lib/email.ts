import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import mustache from 'mustache';

interface OrderData {
    customerName: string;
    orderNumber: string;
    items: { quantity: number; name: string; price: number }[];
    total: number;
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: (process.env.SMTP_PORT === '465'), // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendOrderConfirmationEmail(to: string, data: OrderData) {
    try {
        const templatePath = path.join(process.cwd(), 'src', 'templates', 'email', 'order-confirmation.html');
        const template = await fs.readFile(templatePath, 'utf-8');
        
        const html = mustache.render(template, data);

        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: to,
            subject: `Confirmación de tu pedido #${data.orderNumber}`,
            html: html,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Order confirmation email sent to ${to}`);

    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        // In a real app, you might want to add this to a retry queue
        // For now, we just log the error
    }
}
