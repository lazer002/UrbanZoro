import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
}, { timestamps: true });

// Method to verify OTP
otpSchema.methods.verifyOtp = async function(otp) {
  return bcrypt.compare(otp, this.otpHash);
};

export const OTP = mongoose.model('OTP', otpSchema);
