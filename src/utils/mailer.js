import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()
export const transporter = nodemailer.createTransport({
  service: 'gmail', // You can switch to SendGrid, AWS SES, etc. later
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App password
  },
})

export const sendOtpMail = async (to, otp) => {
  const mailOptions = {
    from: `"Clothify" <${process.env.EMAIL_USER}>`,
    to,
    subject: '🔐 Your OTP Code for Clothify',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background-color: #FF6347; color: #fff; text-align: center; padding: 20px;">
          <h1 style="margin: 0; font-size: 24px;">Clothify</h1>
          <p style="margin: 5px 0 0; font-size: 14px;">Your Fashion, Your Style</p>
        </div>
        
        <!-- Body -->
        <div style="padding: 20px; color: #333;">
          <h2 style="margin-top: 0;">Verify Your Email</h2>
          <p style="font-size: 16px;">Use the OTP below to complete your login/signup process:</p>

          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; background: #FF6347; color: #fff; font-size: 28px; letter-spacing: 6px; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
              ${otp}
            </span>
          </div>

          <p style="font-size: 14px; color: #666;">⚠️ This code will expire in <b>5 minutes</b>. Please do not share it with anyone.</p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9f9f9; text-align: center; padding: 15px; font-size: 12px; color: #888;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Clothify. All rights reserved.</p>
          <p style="margin: 5px 0 0;">Need help? <a href="mailto:${process.env.EMAIL_USER}" style="color: #FF6347; text-decoration: none;">Contact Support</a></p>
        </div>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}
