const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const sendEmail = async (body, message) => {
    const transporter = nodemailer.createTransport({
    host: process.env.HOST,
    service: process.env.SERVICE,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
});
    try {
        await transporter.verify();
        console.log('SMTP server is ready');
        await transporter.sendMail(body);
        console.log(message);
    } catch (error) {
        console.error('Email sending error:', error.message);
        throw new Error('Failed to send email');
    }
};
module.exports = { sendEmail };
const emailVerificationLimit = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 3,
    handler: (req, res) => {
        res.status(429).send({
            success: false,
            message: 'Too many requests. Try again later.',
        });
    },
});
module.exports = { sendEmail, emailVerificationLimit };