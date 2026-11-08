const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const OtpToken = require('../models/OtpToken');

// Configure nodemailer transporter
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass }
    });
  }

  // Fallback transporter (e.g. Gmail or simulated)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  return null;
};

const transporter = createTransporter();

/**
 * Generate 6-digit numeric OTP
 */
function generateNumericOtp(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * Send OTP via Email / SMS simulation
 */
async function sendOtpEmail({ email, otp, purpose = 'LOGIN' }) {
  const purposeText = purpose === 'REGISTER' 
    ? 'Kích hoạt tài khoản Ví HaiPay' 
    : purpose === 'RESET_PASSWORD'
      ? 'Đặt lại mật khẩu tài khoản'
      : 'Đăng nhập vào Ví HaiPay';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="display: inline-block; background-color: #0f172a; color: #facc15; font-weight: bold; font-size: 20px; padding: 10px 20px; border-radius: 9999px;">
          🛡️ HaiPay Wallet
        </div>
      </div>
      <h2 style="color: #0f172a; text-align: center; margin-bottom: 8px;">Mã xác thực OTP</h2>
      <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 0;">
        Yêu cầu: <strong>${purposeText}</strong>
      </p>
      
      <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #0284c7; font-family: monospace;">
          ${otp}
        </span>
      </div>

      <p style="color: #475569; font-size: 13px; line-height: 1.6;">
        ⏱️ Mã này có hiệu lực trong <strong>5 phút</strong>.<br>
        🔒 <strong>Bảo mật:</strong> Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên HaiHand/HaiPay.
      </p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;">
      <p style="color: #94a3b8; font-size: 11px; text-align: center;">
        Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ tổng đài 1900-6868.
      </p>
    </div>
  `;

  // Always log to console for instant developer feedback
  console.log('\n==============================================');
  console.log(`🔑 [HaiPay OTP Service] Code for ${email}: ${otp}`);
  console.log(`📌 Purpose: ${purpose} | Expires in: 5 minutes`);
  console.log('==============================================\n');

  if (transporter && email.includes('@')) {
    try {
      await transporter.sendMail({
        from: `"HaiPay Security" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'no-reply@haihand.vn'}>`,
        to: email,
        subject: `[HaiPay] ${otp} là mã xác thực OTP của bạn`,
        html: htmlContent
      });
      return { sent: true };
    } catch (err) {
      console.warn('⚠️ SMTP sendMail warning (logged to console instead):', err.message);
      return { sent: false, error: err.message };
    }
  }

  return { sent: false, note: 'Logged to console' };
}

/**
 * Generate, hash, and persist OTP in database with 60s cooldown rate-limiting
 */
async function createAndSaveOtp(identifier, purpose = 'LOGIN') {
  const cleanIdentifier = identifier.trim().toLowerCase();
  
  // Rate Limiting Cooldown: Enforce minimum 60 seconds between OTP generation requests per identifier
  const existingRecent = await OtpToken.findOne({
    identifier: cleanIdentifier,
    purpose,
    createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
  });

  if (existingRecent) {
    const remainingSec = Math.max(1, Math.ceil((existingRecent.createdAt.getTime() + 60000 - Date.now()) / 1000));
    const err = new Error(`Vui lòng đợi ${remainingSec} giây trước khi yêu cầu mã OTP mới`);
    err.statusCode = 429;
    throw err;
  }

  // Clear any existing expired OTP for this identifier and purpose
  await OtpToken.deleteMany({ identifier: cleanIdentifier, purpose });

  const rawOtp = generateNumericOtp(6);
  const otpHash = await bcrypt.hash(rawOtp, 10);

  await OtpToken.create({
    identifier: cleanIdentifier,
    otpHash,
    purpose,
    attempts: 0,
    createdAt: new Date()
  });

  // Dispatch email/message
  await sendOtpEmail({ email: cleanIdentifier, otp: rawOtp, purpose });

  return rawOtp;
}

/**
 * Verify OTP against stored hash with atomic attempt tracking
 */
async function verifyOtp(identifier, rawOtp, purpose = 'LOGIN') {
  const cleanIdentifier = identifier.trim().toLowerCase();
  
  // 1. Atomic attempt increment with boundary condition { attempts: { $lt: 5 } }
  // Prevents concurrency race conditions from brute-forcing OTPs
  const tokenRecord = await OtpToken.findOneAndUpdate(
    { identifier: cleanIdentifier, purpose, attempts: { $lt: 5 } },
    { $inc: { attempts: 1 } },
    { new: true }
  );

  if (!tokenRecord) {
    const existing = await OtpToken.findOne({ identifier: cleanIdentifier, purpose });
    if (existing && existing.attempts >= 5) {
      await OtpToken.deleteOne({ _id: existing._id });
      return { valid: false, message: 'Bạn đã nhập sai quá 5 lần quy định. Mã OTP đã bị hủy. Vui lòng lấy mã mới!' };
    }
    return { valid: false, message: 'Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng lấy mã mới!' };
  }

  const isMatch = await bcrypt.compare(String(rawOtp).trim(), tokenRecord.otpHash);
  if (!isMatch) {
    const remaining = 5 - tokenRecord.attempts;
    if (remaining <= 0) {
      await OtpToken.deleteOne({ _id: tokenRecord._id });
      return { valid: false, message: 'Bạn đã nhập sai quá 5 lần. Mã OTP đã bị hủy!' };
    }
    return { valid: false, message: `Mã OTP không chính xác. Bạn còn ${remaining} lần thử!` };
  }

  // Consume OTP upon successful verification
  await OtpToken.deleteOne({ _id: tokenRecord._id });
  return { valid: true };
}

module.exports = {
  generateNumericOtp,
  sendOtpEmail,
  createAndSaveOtp,
  verifyOtp
};
