import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Support" <${process.env.SMTP_USER}>`,
            to,
            subject,
            text,
        });

        console.log("Email sent successfully!");
    } catch (error) {
        console.error("Error sending email:", error.message);
    }
};
