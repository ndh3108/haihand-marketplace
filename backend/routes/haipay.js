const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { createAndSaveOtp, verifyOtp } = require('../utils/otpService');
const { JWT_SECRET, sanitizeUser } = require('../utils/b2c');

const router = express.Router();

/**
 * Middleware to authenticate HaiPay wallet session
 */
const requireWalletAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập vào Ví HaiPay' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    req.walletUser = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Phiên làm việc của Ví đã hết hạn hoặc không hợp lệ' });
  }
};

/**
 * POST /api/haipay/send-otp
 * Generates and dispatches OTP
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { identifier, purpose = 'LOGIN' } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ message: 'Vui lòng cung cấp Email hoặc Số điện thoại' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    if (purpose === 'LOGIN') {
      const existingUser = await User.findOne({
        $or: [{ email: cleanIdentifier }, { phone: cleanIdentifier }]
      });

      if (!existingUser) {
        return res.status(404).json({ message: 'Tài khoản chưa được đăng ký trong hệ thống HaiHand' });
      }
    }

    // Generate & send OTP
    await createAndSaveOtp(cleanIdentifier, purpose);

    return res.status(200).json({
      success: true,
      message: `Mã OTP đã được gửi đến ${cleanIdentifier}. Vui lòng kiểm tra hộp thư (hoặc console server).`,
      expiresIn: 300
    });
  } catch (error) {
    if (error.statusCode === 429) {
      return res.status(429).json({ message: error.message });
    }
    console.error('Send OTP Error:', error);
    return res.status(500).json({ message: 'Lỗi khi gửi mã OTP: ' + error.message });
  }
});

/**
 * POST /api/haipay/register
 * Verifies OTP and activates the standalone wallet
 */
router.post('/register', async (req, res) => {
  try {
    const { email, phone, fullName, password, cccd, otp, pin } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ Email và Mã OTP' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Verify OTP
    const otpResult = await verifyOtp(cleanEmail, otp, 'REGISTER');
    if (!otpResult.valid) {
      return res.status(400).json({ message: otpResult.message });
    }

    // 2. Check if user already exists
    let user = await User.findOne({ email: cleanEmail });

    if (user) {
      // Enforce password verification for existing account to prevent unauthorized wallet hijacking
      if (!password) {
        return res.status(400).json({ message: 'Tài khoản đã tồn tại. Vui lòng nhập mật khẩu tài khoản để kích hoạt ví!' });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Mật khẩu tài khoản không chính xác!' });
      }

      // Activate wallet for existing user
      user.isWalletActive = true;
      if (phone) user.walletPhone = phone.trim();
      if (fullName && (!user.name || user.name === 'User')) user.name = fullName.trim();
      if (cccd) user.cccd = cccd.trim();
      if (pin) user.walletPin = await bcrypt.hash(pin.trim(), 8);
      user.walletRegisteredAt = new Date();
      await user.save();
    } else {
      // Create new user with active wallet
      if (!password) {
        return res.status(400).json({ message: 'Vui lòng đặt mật khẩu cho tài khoản mới' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      let hashedPin = '';
      if (pin) hashedPin = await bcrypt.hash(pin.trim(), 8);

      user = new User({
        name: fullName ? fullName.trim() : cleanEmail.split('@')[0],
        email: cleanEmail,
        password: hashedPassword,
        phone: phone ? phone.trim() : '',
        walletPhone: phone ? phone.trim() : '',
        cccd: cccd ? cccd.trim() : '',
        walletPin: hashedPin,
        isWalletActive: true,
        walletRegisteredAt: new Date(),
        walletBalance: 0,
        pendingBalance: 0
      });
      await user.save();
    }

    // 3. Issue dedicated wallet JWT session
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        isWalletActive: true,
        sessionType: 'HAIPAY_WALLET'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: '🎉 Kích hoạt Ví HaiPay thành công!',
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('HaiPay Register Error:', error);
    return res.status(500).json({ message: 'Lỗi kích hoạt ví: ' + error.message });
  }
});

/**
 * POST /api/haipay/login
 * Authenticates user credentials + verifies OTP to return specialized wallet session
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, otp } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập Email hoặc Số điện thoại' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { phone: cleanIdentifier }, { walletPhone: cleanIdentifier }]
    });

    if (!user) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại trong hệ thống' });
    }

    // Unconditionally verify password to prevent passwordless login bypass (VULN-06)
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu tài khoản' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Mật khẩu không chính xác' });
    }

    // Step A: If password is valid but no OTP provided yet, auto-generate & send OTP
    if (!otp) {
      try {
        await createAndSaveOtp(user.email, 'LOGIN');
      } catch (otpErr) {
        if (otpErr.statusCode === 429) {
          return res.status(429).json({ message: otpErr.message });
        }
        throw otpErr;
      }
      return res.status(200).json({
        requireOtp: true,
        email: user.email,
        message: `Mã OTP đã được gửi đến email ${user.email}. Vui lòng nhập mã để hoàn tất đăng nhập!`
      });
    }

    // Step B: Verify OTP
    const otpResult = await verifyOtp(user.email, otp, 'LOGIN');
    if (!otpResult.valid) {
      return res.status(400).json({ message: otpResult.message });
    }

    // Ensure wallet is marked active
    if (!user.isWalletActive) {
      user.isWalletActive = true;
      user.walletRegisteredAt = user.walletRegisteredAt || new Date();
      await user.save();
    }

    // Issue specialized wallet token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        isWalletActive: true,
        sessionType: 'HAIPAY_WALLET'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: '🎉 Đăng nhập Ví HaiPay thành công!',
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('HaiPay Login Error:', error);
    return res.status(500).json({ message: 'Lỗi đăng nhập Ví HaiPay: ' + error.message });
  }
});

/**
 * POST /api/haipay/verify-firebase
 * Handles phone number verification from Firebase Phone Auth
 */
router.post('/verify-firebase', async (req, res) => {
  try {
    const { phoneNumber, firebaseUid, fullName, email } = req.body;

    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({ message: 'Thiếu số điện thoại được xác thực từ Firebase' });
    }

    const cleanRawPhone = phoneNumber.trim();
    // Normalize phone numbers for search
    // Firebase returns E.164: +84912345678
    const localPhone = cleanRawPhone.startsWith('+84')
      ? '0' + cleanRawPhone.slice(3)
      : (cleanRawPhone.startsWith('84') ? '0' + cleanRawPhone.slice(2) : cleanRawPhone);
    const intlPhone = cleanRawPhone.startsWith('+')
      ? cleanRawPhone
      : (cleanRawPhone.startsWith('0') ? '+84' + cleanRawPhone.slice(1) : '+84' + cleanRawPhone);

    // Find user by either local or intl phone, or walletPhone, or firebaseUid
    let user = await User.findOne({
      $or: [
        { phone: localPhone },
        { phone: intlPhone },
        { walletPhone: localPhone },
        { walletPhone: intlPhone },
        ...(firebaseUid ? [{ firebaseUid }] : [])
      ]
    });

    if (user) {
      // Activate wallet if not already active
      user.isWalletActive = true;
      if (!user.walletPhone) user.walletPhone = localPhone;
      if (firebaseUid && !user.firebaseUid) user.firebaseUid = firebaseUid;
      if (!user.walletRegisteredAt) user.walletRegisteredAt = new Date();
      if (fullName && (!user.name || user.name.startsWith('Người dùng'))) {
        user.name = fullName.trim();
      }
      user.lastActive = new Date();
      await user.save();
    } else {
      // Create new user with active wallet
      const cleanEmail = email && email.trim() 
        ? email.trim().toLowerCase() 
        : `haipay_${localPhone.replace(/\D/g, '') || Date.now()}@haipay.vn`;

      // Check if email happens to exist
      const existingEmailUser = await User.findOne({ email: cleanEmail });
      const finalEmail = existingEmailUser 
        ? `haipay_${Date.now()}_${Math.floor(Math.random() * 1000)}@haipay.vn` 
        : cleanEmail;

      const randomPassword = await bcrypt.hash(`fb_auth_${firebaseUid || Date.now()}`, 10);

      user = new User({
        name: fullName && fullName.trim() ? fullName.trim() : `Người dùng HaiPay ${localPhone.slice(-4) || 'Mới'}`,
        email: finalEmail,
        phone: localPhone,
        walletPhone: localPhone,
        firebaseUid: firebaseUid || '',
        password: randomPassword,
        isWalletActive: true,
        walletRegisteredAt: new Date(),
        walletBalance: 0,
        pendingBalance: 0,
        lastActive: new Date()
      });

      await user.save();
    }

    // Issue standard HaiPay wallet JWT
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        phone: user.phone || user.walletPhone,
        isWalletActive: true,
        sessionType: 'HAIPAY_WALLET'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: '🎉 Xác thực Firebase SMS OTP thành công!',
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Firebase Auth Verification Error:', error);
    return res.status(500).json({ message: 'Lỗi đồng bộ Firebase với máy chủ: ' + error.message });
  }
});

/**
 * GET /api/haipay/me
 * Retrieves current wallet profile, balances, and transaction history
 */
router.get('/me', requireWalletAuth, async (req, res) => {
  try {
    const user = req.walletUser;
    const transactions = await Transaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
      wallet: {
        walletBalance: user.walletBalance || 0,
        pendingBalance: user.pendingBalance || 0,
        isWalletActive: !!user.isWalletActive,
        walletPhone: user.walletPhone || user.phone || '',
        cccd: user.cccd || '',
        bankInfo: user.bankInfo || { name: '', accountNumber: '', accountName: '' },
        registeredAt: user.walletRegisteredAt
      },
      transactions
    });
  } catch (error) {
    console.error('HaiPay Me Error:', error);
    return res.status(500).json({ message: 'Lỗi lấy thông tin ví: ' + error.message });
  }
});

module.exports = router;
