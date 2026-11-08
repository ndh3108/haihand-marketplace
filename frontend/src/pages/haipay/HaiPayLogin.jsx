import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../../config/firebase';
import { useToast } from '../../components/Toast';

const HaiPayLogin = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  // Login Mode: 'SMS' (Firebase Phone OTP) or 'PASSWORD' (Password + 2FA)
  const [loginMode, setLoginMode] = useState('SMS');

  // SMS Login States
  const [phone, setPhone] = useState('');
  const [smsStep, setSmsStep] = useState(1); // 1: Enter Phone, 2: Enter SMS OTP
  const [smsOtp, setSmsOtp] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [formattedPhone, setFormattedPhone] = useState('');

  // Password Login States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pwdStep, setPwdStep] = useState(1); // 1: Password, 2: 2FA OTP
  const [pwdOtp, setPwdOtp] = useState(['', '', '', '', '', '']);
  const [userEmail, setUserEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Clean up reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifierLogin) {
        try {
          window.recaptchaVerifierLogin.clear();
        } catch (e) {
          console.warn('Error clearing recaptcha:', e);
        }
        window.recaptchaVerifierLogin = null;
      }
    };
  }, []);

  // Helper to format Vietnamese phone numbers to E.164 (+84...)
  const formatE164Phone = (rawPhone) => {
    let cleaned = (rawPhone || '').trim().replace(/[\s.-]/g, '');
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

    if (window.recaptchaVerifierLogin) {
      try {
        window.recaptchaVerifierLogin.clear();
      } catch (e) {
        console.warn('Recaptcha clear warning:', e);
      }
      window.recaptchaVerifierLogin = null;
    }

    const container = document.getElementById('recaptcha-container-login');
    if (container) {
      container.innerHTML = '';
    }

    window.recaptchaVerifierLogin = new RecaptchaVerifier(auth, 'recaptcha-container-login', {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        toast.warning('Chú ý', 'reCAPTCHA đã hết hạn. Vui lòng gửi lại mã SMS.');
      }
    });

    return window.recaptchaVerifierLogin;
  };

  // Handle OTP Inputs
  const handleOtpBoxChange = (list, setList, prefix, index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newList = [...list];
    newList[index] = value;
    setList(newList);

    if (value && index < 5) {
      const nextInput = document.getElementById(`${prefix}-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpBoxKeyDown = (list, prefix, index, e) => {
    if (e.key === 'Backspace' && !list[index] && index > 0) {
      const prevInput = document.getElementById(`${prefix}-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // ===================== FLOW 1: FIREBASE SMS LOGIN =====================
  const handleSendSmsOtp = async (e) => {
    if (e) e.preventDefault();

    if (!phone || phone.trim().length < 9) {
      return toast.warning('Chú ý', 'Vui lòng nhập số điện thoại hợp lệ!');
    }

    const e164 = formatE164Phone(phone);
    setFormattedPhone(e164);
    setLoading(true);

    try {
      if (!isFirebaseConfigured || !auth) {
        throw new Error('Chưa cấu hình Firebase API Key trong file frontend/.env!');
      }

      const appVerifier = getOrCreateRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, e164, appVerifier);
      setConfirmationResult(confirmation);

      toast.success(
        'Mã SMS đã gửi!',
        `Mã OTP xác thực đã được gửi tới ${e164}. Vui lòng kiểm tra tin nhắn!`
      );
      setSmsStep(2);
      setCountdown(60);
    } catch (err) {
      console.error('Firebase SMS Login Error:', err);
      toast.error(
        'Lỗi gửi SMS',
        err.message || 'Không thể gửi mã SMS qua Firebase. Vui lòng kiểm tra cấu hình Firebase!'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySmsOtp = async (e) => {
    e.preventDefault();
    const code = smsOtp.join('');
    if (code.length !== 6) {
      return toast.warning('Chú ý', 'Vui lòng nhập đủ 6 chữ số mã OTP!');
    }

    setLoading(true);
    try {
      // 1. Confirm OTP with Firebase
      const result = await confirmationResult.confirm(code);
      const firebaseUser = result.user;

      // 2. Synchronize with Node.js backend
      const { data } = await axios.post(`${API_URL}/api/haipay/verify-firebase`, {
        phoneNumber: firebaseUser.phoneNumber || formattedPhone,
        firebaseUid: firebaseUser.uid
      });

      if (data.token) {
        localStorage.setItem('haipay_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('userUpdated'));
      }

      toast.success('Thành công', '🎉 Đăng nhập Ví HaiPay thành công!');
      const fromPath = location.state?.from?.pathname || '/haipay/dashboard';
      navigate(fromPath);
    } catch (err) {
      console.error('Verify SMS OTP Error:', err);
      toast.error(
        'Xác thực thất bại',
        err.response?.data?.message || err.message || 'Mã OTP không chính xác hoặc đã hết hạn!'
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================== FLOW 2: PASSWORD + 2FA LOGIN =====================
  const handleSubmitCredentials = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      return toast.warning('Chú ý', 'Vui lòng nhập Email hoặc Số điện thoại');
    }
    if (!password) {
      return toast.warning('Chú ý', 'Vui lòng nhập Mật khẩu');
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/haipay/login`, {
        identifier: identifier.trim(),
        password
      });

      if (data.requireOtp) {
        setUserEmail(data.email || identifier);
        setPwdStep(2);
        setCountdown(60);
        toast.info('Bảo mật 2 lớp', data.message || 'Mã OTP đã được gửi đến email của bạn!');
      } else if (data.token) {
        localStorage.setItem('haipay_token', data.token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          window.dispatchEvent(new Event('userUpdated'));
        }
        toast.success('Thành công', 'Đăng nhập thành công!');
        const fromPath = location.state?.from?.pathname || '/haipay/dashboard';
        navigate(fromPath);
      }
    } catch (err) {
      toast.error('Lỗi đăng nhập', err.response?.data?.message || 'Thông tin đăng nhập không hợp lệ!');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPwdOtp = async (e) => {
    e.preventDefault();
    const code = pwdOtp.join('');
    if (code.length !== 6) {
      return toast.warning('Chú ý', 'Vui lòng nhập đủ 6 chữ số mã OTP');
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/haipay/login`, {
        identifier: userEmail || identifier,
        password,
        otp: code
      });

      if (data.token) {
        localStorage.setItem('haipay_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('userUpdated'));
      }

      toast.success('Thành công', '🎉 Đăng nhập Ví HaiPay thành công!');
      const fromPath = location.state?.from?.pathname || '/haipay/dashboard';
      navigate(fromPath);
    } catch (err) {
      toast.error('Lỗi', err.response?.data?.message || 'Mã OTP không hợp lệ!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-auto py-4">
      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container-login"></div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20 mb-4">
            🔑
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Đăng nhập Ví HaiPay</h1>
          <p className="text-xs text-slate-400 mt-1">
            Cổng thanh toán & Ký quỹ an toàn chuẩn ngân hàng
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
            onClick={() => { setLoginMode('SMS'); setSmsStep(1); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              loginMode === 'SMS'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📱</span>
            <span>SMS OTP (Firebase)</span>
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('PASSWORD'); setPwdStep(1); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              loginMode === 'PASSWORD'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🔐</span>
            <span>Mật khẩu & OTP</span>
          </button>
        </div>

        {/* ======================= MODE 1: FIREBASE SMS LOGIN ======================= */}
        {loginMode === 'SMS' && (
          smsStep === 1 ? (
            <form onSubmit={handleSendSmsOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Số điện thoại đăng nhập
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm text-slate-400 font-semibold flex items-center gap-1">
                    🇻🇳 +84
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-20 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Nhập số điện thoại đăng ký ví để nhận mã SMS OTP tức thì
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Gửi mã SMS OTP qua Firebase</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifySmsOtp} className="space-y-6">
              <div className="text-center">
                <span className="text-xs text-slate-400">
                  Mã SMS OTP 6 số đã được gửi tới số:
                </span>
                <div className="font-semibold text-amber-400 text-base mt-1">
                  {formattedPhone || phone}
                </div>
              </div>

              {/* 6-box OTP input */}
              <div className="flex justify-between gap-2 my-6">
                {smsOtp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`login-sms-otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpBoxChange(smsOtp, setSmsOtp, 'login-sms-otp', idx, e.target.value)}
                    onKeyDown={(e) => handleOtpBoxKeyDown(smsOtp, 'login-sms-otp', idx, e)}
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
                    <span>Xác nhận & Vào Ví</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSmsStep(1)}
                  className="hover:text-amber-400 flex items-center gap-1 transition-colors"
                >
                  ← Đổi số điện thoại
                </button>

                <button
                  type="button"
                  onClick={handleSendSmsOtp}
                  disabled={countdown > 0 || loading}
                  className="text-amber-400 hover:underline disabled:text-slate-600 font-semibold"
                >
                  {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã SMS'}
                </button>
              </div>
            </form>
          )
        )}

        {/* ======================= MODE 2: PASSWORD + 2FA LOGIN ======================= */}
        {loginMode === 'PASSWORD' && (
          pwdStep === 1 ? (
            <form onSubmit={handleSubmitCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email hoặc Số điện thoại
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@example.com hoặc 0912..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Tiếp tục (Bảo mật 2 lớp)</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPwdOtp} className="space-y-6">
              <div className="text-center">
                <span className="text-xs text-slate-400">
                  Mã bảo mật 2 lớp gồm 6 số đã được gửi đến:
                </span>
                <div className="font-semibold text-amber-400 text-sm mt-0.5">{userEmail}</div>
              </div>

              {/* 6-box OTP input */}
              <div className="flex justify-between gap-2 my-6">
                {pwdOtp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`login-pwd-otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpBoxChange(pwdOtp, setPwdOtp, 'login-pwd-otp', idx, e.target.value)}
                    onKeyDown={(e) => handleOtpBoxKeyDown(pwdOtp, 'login-pwd-otp', idx, e)}
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
                    <span>Xác nhận & Vào Ví</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPwdStep(1)}
                  className="hover:text-amber-400 flex items-center gap-1 transition-colors"
                >
                  ← Đổi thông tin
                </button>

                <button
                  type="button"
                  onClick={handleSubmitCredentials}
                  disabled={countdown > 0 || loading}
                  className="text-amber-400 hover:underline disabled:text-slate-600 font-semibold"
                >
                  {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã OTP'}
                </button>
              </div>
            </form>
          )
        )}

        {/* Footer Link */}
        <div className="text-center mt-6 text-xs text-slate-400">
          Chưa kích hoạt Ví HaiPay?{' '}
          <Link to="/haipay/register" className="text-amber-400 hover:underline font-semibold">
            Kích hoạt ngay
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HaiPayLogin;
