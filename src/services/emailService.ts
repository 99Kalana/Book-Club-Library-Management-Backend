
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },

});


export const sendEmail = async (options: EmailOptions): Promise<void> => {
    const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME || 'Library Admin'} <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
        console.error(`Error sending email to ${options.to}:`, error);

        throw error;
    }
};
