import nodemailer from "nodemailer";
import { config } from "../constants.js";

const transporter = nodemailer.createTransport({
    host: config.mailHost,
    port: config.mailPort,
    auth: {
        user: config.adminMail,
        pass: config.adminMailPassword,
    }
});

export async function sendEmail(to, subject, text, html) {
    try {
        await transporter.sendMail({
            from: config.adminMail,
            to,
            subject,
            text,
            html
        });
        console.log("Email sent successfully");
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Error sending email")
    }
}

export function generatePasswordMessage(email, password, role) {
    const message = `Welcome to IEM_UEM_PROGRESS_REPORT - Your Account Information`;
    const messageHTML = `
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
        <h2>Welcome to IEM_UEM_PROGRESS_REPORT!</h2>
        <p>We are excited to have you on board. Your account has been created, and below are your login credentials:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Role:</strong> ${role}</p>
        <p><strong>Temporary Password:</strong> ${password}</p>
        <p>Please use this Temporary Password to signup for the first time. You will be required to change your password during signup.</p>
      
        <p>If you have any questions or need help, feel free to reach out to our support team.</p>
        <br>
        <p>Thank you,<br>The IEM_UEM_PROGRESS_REPORT Team</p>
      </div>
    `;

    return { message, messageHTML };
}

export function generateForgotPasswordOTPMessage(email, otp) {
    const message = `IEM_UEM_PROGRESS_REPORT - Password Reset OTP`;
    const messageHTML = `
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password for your account associated with this email: <strong>${email}</strong>.</p>
        <p><strong>Your OTP (One-Time Password):</strong> <span style="font-size: 18px; font-weight: bold; color: #d9534f;">${otp}</span></p>
        <p>This OTP is valid for the next 10 minutes. Please do not share it with anyone.</p>
        <p>If you did not request a password reset, please ignore this email. Your account security remains intact.</p>
        <br>
        <p>Thank you,<br>The IEM_UEM_PROGRESS_REPORT Team</p>
      </div>
    `;

    return { message, messageHTML };
}