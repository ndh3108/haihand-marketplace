import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../../config/firebase';
import { useToast } from '../../components/Toast';

const HaiPayRegister = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  // Pre-fill from existing logged-in marketplace user if available
  const existingUser = (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const [formData, setFormData] = useState({
    fullName: existingUser?.name || '',
    email: existingUser?.email || '',
    phone: existingUser?.phone || '',
    cccd: existingUser?.cccd || '',
    password: '',
    pin: ''
  });

  // Auth Mode: 'SMS' (Firebase) or 'EMAIL' (Local/SMTP)
  const [authMode, setAuthMode] = useState(isFirebaseConfigured ? 'SMS' : 'SMS');
  const [step, setStep] = useState(1); // 1: Info Form, 2: OTP Verification
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [formattedPhone, setFormattedPhone] = useState('');

  // Countdown timer for resending OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Clean up reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifierRegister) {
        try {
          window.recaptchaVerifierRegister.clear();
        } catch (e) {
          console.warn('Error clearing recaptcha:', e);
        }
        window.recaptchaVerifierRegister = null;
      }
    };
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance focus to next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Helper to format Vietnamese phone numbers to E.164 (+84...)
  const formatE164Phone = (phone) => {
    let cleaned = (phone || '').trim().replace(/[\s.-]/g, '');
    if (cleaned.startsWith('0')) {
      return '+84' + cleaned.slice(1);
    }
    if (cleaned.startsWith('84') && !cleaned.startsWith('+84')) {
      return '+' + cleaned;
    }
    if (!cleaned.startsWith('+')) {
      return '+84' + cleaned;
    }
    return cleaned;
  };

  // Initialize invisible reCAPTCHA safely
  const getOrCreateRecaptcha = () => {
    if (!auth) {
      throw new Error(
        'Firebase Auth chưa được khởi tạo. Vui lòng thêm các biến REACT_APP_FIREBASE_* vào file frontend/.env'
      );
    }

    if (window.recaptchaVerifierRegister) {
      try {
        window.recaptchaVerifierRegister.clear();
      } catch (e) {
        console.warn('Recaptcha clear warning:', e);
      }
      window.recaptchaVerifierRegister = null;
    }

    const container = document.getElementById('recaptcha-container-register');
    if (container) {
      container.innerHTML = '';
    }

    window.recaptchaVerifierRegister = new RecaptchaVerifier(auth, 'recaptcha-container-register', {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        toast.warning('Chú ý', 'reCAPTCHA đã hết hạn. Vui lòng bấm gửi lại mã SMS.');
      }
    });

    return window.recaptchaVerifierRegister;
  };

  // Step 1: Send OTP (Firebase SMS or Backend Email)
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();

    if (!formData.fullName.trim()) {
      return toast.warning('Chú ý', 'Vui lòng nhập Họ và tên chủ ví!');
    }

    if (authMode === 'SMS') {
      if (!formData.phone || formData.phone.length < 9) {
        return toast.warning('Chú ý', 'Vui lòng nhập Số điện thoại hợp lệ!');
      }

      const e164 = formatE164Phone(formData.phone);
      setFormattedPhone(e164);
      setLoading(true);

      try {
        if (!isFirebaseConfigured || !auth) {
          throw new Error('Chưa cấu hình Firebase API Key trong frontend/.env!');
        }

        const appVerifier = getOrCreateRecaptcha();
        const confirmation = await signInWithPhoneNumber(auth, e164, appVerifier);
        setConfirmationResult(confirmation);

        toast.success(
          'SMS Đã gửi!',
          `Mã xác thực SMS đã được gửi tới số ${e164}. Vui lòng kiểm tra tin nhắn điện thoại!`
        );
        setStep(2);
        setCountdown(60);
      } catch (err) {
        console.error('Firebase SMS Send Error:', err);
        toast.error(
          'Lỗi gửi SMS OTP',
          err.message || 'Không thể gửi mã SMS qua Firebase. Vui lòng kiểm tra cấu hình Firebase!'
        );
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback Email OTP mode
      if (!formData.email || !formData.email.includes('@')) {
        return toast.warning('Chú ý', 'Vui lòng nhập địa chỉ Email hợp lệ!');
      }

      setLoading(true);
      try {
        const { data } = await axios.post(`${API_URL}/api/haipay/send-otp`, {
          identifier: formData.email,
          purpose: 'REGISTER'
        });
        toast.success('Thành công', data.message || 'Mã OTP 6 số đã được gửi đến email!');
        setStep(2);
        setCountdown(60);
      } catch (err) {
        toast.error('Lỗi', err.response?.data?.message || 'Không thể gửi mã OTP qua Email!');
      } finally {
        setLoading(false);
      }
    }
  };

  // Step 2: Verify OTP & Synchronize with Backend
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      return toast.warning('Chú ý', 'Vui lòng nhập đủ 6 chữ số mã OTP!');
    }

    setLoading(true);
    try {
      if (authMode === 'SMS' && confirmationResult) {
        // 1. Confirm OTP with Firebase
        const result = await confirmationResult.confirm(otpCode);
        const firebaseUser = result.user;

        // 2. Synchronize with Node.js backend
        const { data } = await axios.post(`${API_URL}/api/haipay/verify-firebase`, {
          phoneNumber: firebaseUser.phoneNumber || formattedPhone,
          firebaseUid: firebaseUser.uid,
          fullName: formData.fullName,
          email: formData.email
        });

        if (data.token) {
          localStorage.setItem('haipay_token', data.token);
        }
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          window.dispatchEvent(new Event('userUpdated'));
        }

        toast.success('Thành công', '🎉 Xác thực SMS OTP thành công! Ví đã được kích hoạt.');
        navigate('/haipay/dashboard');
      } else {
        // Verify standard Email OTP
        const { data } = await axios.post(`${API_URL}/api/haipay/register`, {
          ...formData,
          otp: otpCode
        });

        if (data.token) {
          localStorage.setItem('haipay_token', data.token);
        }
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          window.dispatchEvent(new Event('userUpdated'));
        }

        toast.success('Thành công', '🎉 ' + (data.message || 'Kích hoạt Ví HaiPay thành công!'));
        navigate('/haipay/dashboard');
      }
    } catch (err) {
      console.error('Verify error:', err);
      toast.error(
        'Xác thực thất bại',
        err.response?.data?.message || err.message || 'Mã OTP không chính xác hoặc đã hết hạn!'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-auto py-4">
      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container-register"></div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20 mb-4">
            🛡️
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Kích hoạt Ví HaiPay</h1>
          <p className="text-xs text-slate-400 mt-1">
            Xác thực định danh bằng mã OTP SMS qua Firebase Telephony
          </p>
        </div>

        {/* Configuration Notice if Firebase env keys are missing */}
        {!isFirebaseConfigured && (
          <div className="mb-6 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-start gap-2.5">
            <span className="text-base flex-shrink-0">⚠️</span>
            <div>
              <div className="font-bold">Chưa cấu hình Firebase Credentials</div>
              <div className="text-[11px] text-amber-200/80 mt-0.5">
                Vui lòng dán các biến <code className="bg-amber-950/50 px-1 py-0.5 rounded text-amber-300">REACT_APP_FIREBASE_*</code> vào file <code className="bg-amber-950/50 px-1 py-0.5 rounded text-amber-300">frontend/.env</code> để nhận tin nhắn SMS thật.
              </div>
            </div>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl mb-6 border border-slate-700/50">
          <button
            type="button"
            onClick={() => { setAuthMode('SMS'); setStep(1); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'SMS'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📱</span>
            <span>SMS OTP (Firebase)</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('EMAIL'); setStep(1); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'EMAIL'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>✉️</span>
            <span>Email OTP (Dự phòng)</span>
          </button>
        </div>

        {step === 1 ? (
          /* ================= STEP 1: FORM ================= */
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Họ và tên chủ ví</label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Số điện thoại {authMode === 'SMS' && <span className="text-amber-400 font-bold">(Nhận SMS OTP)</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm text-slate-400 font-semibold flex items-center gap-1">
                  🇻🇳 +84
                </span>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0912345678"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-20 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Hỗ trợ cả định dạng 09x... hoặc +849x...
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email {authMode === 'EMAIL' ? '(Nhận OTP)' : '(Thông báo biến động)'}
              </label>
              <input
                type="email"
                name="email"
                required={authMode === 'EMAIL'}
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Số CCCD / Định danh (Tùy chọn)</label>
              <input
                type="text"
                name="cccd"
                value={formData.cccd}
                onChange={handleChange}
                placeholder="001202012345"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {!existingUser && authMode === 'EMAIL' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mật khẩu tài khoản</label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>
                    {authMode === 'SMS' ? 'Gửi mã SMS OTP qua Firebase' : 'Gửi mã OTP qua Email'}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        ) : (
          /* ================= STEP 2: OTP VERIFICATION ================= */
          <form onSubmit={handleVerifyAndRegister} className="space-y-6">
            <div className="text-center">
              <span className="text-xs text-slate-400">
                {authMode === 'SMS' ? 'Mã SMS OTP 6 số đã được gửi tới số:' : 'Mã xác thực gồm 6 số đã được gửi đến email:'}
              </span>
              <div className="font-semibold text-amber-400 text-base mt-1">
                {authMode === 'SMS' ? formattedPhone || formData.phone : formData.email}
              </div>
            </div>

            {/* 6-box OTP input */}
            <div className="flex justify-between gap-2 my-6">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-12 h-14 bg-slate-800 border-2 border-slate-700 focus:border-amber-400 rounded-xl text-center text-2xl font-black text-amber-400 focus:outline-none transition-all shadow-inner"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Xác nhận & Kích hoạt Ví</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </button>

            {/* Resend & Back controls */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="hover:text-amber-400 flex items-center gap-1 transition-colors"
              >
                ← Quay lại sửa thông tin
              </button>

              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={countdown > 0 || loading}
                className="text-amber-400 hover:underline disabled:text-slate-600 font-semibold"
              >
                {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã OTP'}
              </button>
            </div>
          </form>
        )}

        {/* Footer Link */}
        <div className="text-center mt-6 text-xs text-slate-400">
          Đã có Ví HaiPay?{' '}
          <Link to="/haipay/login" className="text-amber-400 hover:underline font-semibold">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HaiPayRegister;
