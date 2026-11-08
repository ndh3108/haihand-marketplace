import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/Toast';


const LoginPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  const [isForgotMode, setIsForgotMode] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  
  
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpForm, setOtpForm] = useState({ otp: '', newPassword: '' });
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showForgotPass, setShowForgotPass] = useState(false);

  
  
  
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/api/users/login`, loginForm);
      localStorage.setItem('user', JSON.stringify(data));
      window.dispatchEvent(new Event('userUpdated'));
      navigate('/');
    } catch (error) {
      toast.error('Lỗi', "❌ " + (error.response?.data?.message || "Đăng nhập thất bại!"));
    }
  };

  
  
  
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return toast.warning('Chú ý', 'Vui lòng nhập Email!');
    setIsLoading(true);
    
    try {
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        
        
        await axios.post(`${API_URL}/api/users/send-otp`, { 
            email: forgotEmail, 
            generatedOtp: generatedOtp 
        });

        
        const emailParams = {
           service_id: 'service_4q86uoa',
           template_id: 'template_v64f5jg',
           user_id: 'FxVTIoEF4YTi7S87P', 
           template_params: {
                   email: forgotEmail,
                   otp: generatedOtp
           }
        };

        await axios.post('https://api.emailjs.com/api/v1.0/email/send', emailParams);
        
        toast.info('Thông báo', "📩 Hệ thống HaiHand đã gửi mã xác nhận. Bác check hòm thư nhé!");
        setIsOtpSent(true); 
    } catch (error) {
        console.error("LỖI GỬI OTP:", error);
        const detail = error.response?.data || error.message;
        toast.error('Lỗi', "❌ Lỗi hệ thống: " + (typeof detail === 'string' ? detail : "Vui lòng thử lại sau!"));
    }
    setIsLoading(false);
  };

  
  
  
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (otpForm.newPassword.length < 6) return toast.error('Lỗi', '❌ Mật khẩu mới phải có ít nhất 6 ký tự!');
    try {
      const { data } = await axios.post(`${API_URL}/api/users/reset-password-otp`, {
        email: forgotEmail,
        otp: otpForm.otp,
        newPassword: otpForm.newPassword
      });
      toast.success('Thành công', "✅ " + data.message);
      
      setIsForgotMode(false);
      setIsOtpSent(false);
      setForgotEmail('');
      setOtpForm({ otp: '', newPassword: '' });
    } catch (error) { 
        toast.error('Lỗi', "❌ " + (error.response?.data?.message || "Mã xác thực không chính xác!")); 
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="card shadow-lg border-0 rounded-4 overflow-hidden" style={{ width: '420px' }}>
        
        <div className="bg-warning p-4 text-center">
            <div 
                onClick={() => navigate('/')} 
                style={{cursor: 'pointer', transition: '0.3s'}}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                className="d-flex justify-content-center"
            >
                <img src="/logo.png" alt="HaiHand" style={{height: '32px', objectFit: 'contain'}} />
            </div>
            <p className="text-white-50 small m-0 mt-1 fw-bold" style={{letterSpacing: '1px'}}>
                {isForgotMode ? 'XÁC THỰC BẢO MẬT' : 'TRUY CẬP HỆ THỐNG'}
            </p>
        </div>

        <div className="card-body p-4 p-sm-5">
            {!isForgotMode ? (
                
                <form onSubmit={handleLogin}>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Địa chỉ Email</label>
                        <input type="email" className="form-control bg-light py-2 border-0" placeholder="user@gmail.com" required value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
                    </div>
                    <div className="mb-4">
                        <div className="d-flex justify-content-between">
                            <label className="form-label fw-bold small text-muted">Mật khẩu</label>
                            <span className="small text-primary fw-bold" style={{cursor: 'pointer'}} onClick={() => setIsForgotMode(true)}>Quên?</span>
                        </div>
                        <div className="input-group">
                            <input type={showLoginPass ? "text" : "password"} className="form-control bg-light py-2 border-0" required value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
                            <button type="button" className="input-group-text bg-light border-0 text-muted" onClick={() => setShowLoginPass(!showLoginPass)}>
                                {showLoginPass ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn btn-warning w-100 fw-bold py-2 fs-5 text-white rounded-pill shadow-sm">Đăng nhập</button>
                    <div className="text-center mt-4 small text-muted">
                        Chưa có tài khoản? <Link to="/register" className="text-decoration-none fw-bold text-warning">Tham gia HaiHand</Link>
                    </div>
                </form>
            ) : (
                
                <div>
                    {!isOtpSent ? (
                        <form onSubmit={handleSendOtp}>
                            <div className="alert alert-info py-2 small border-0 bg-light text-muted text-center mb-4" style={{fontSize: '13px'}}>
                                Nhập Email để nhận mã xác thực (OTP) gồm 6 chữ số.
                            </div>
                            <div className="mb-4">
                                <label className="form-label fw-bold small text-muted">Email tài khoản</label>
                                <input type="email" className="form-control bg-light py-2 border-0" placeholder="ví dụ: trietle@gmail.com" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
                            </div>
                            <button type="submit" className="btn btn-dark w-100 fw-bold py-2 fs-6 rounded-pill shadow-sm mb-3" disabled={isLoading}>
                                {isLoading ? '⏳ Đang xử lý...' : '📩 Gửi mã OTP'}
                            </button>
                            <button type="button" onClick={() => setIsForgotMode(false)} className="btn btn-link w-100 text-decoration-none text-muted small fw-bold">Quay lại Đăng nhập</button>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword}>
                            <div className="alert alert-success py-2 small border-0 bg-light text-success text-center mb-4">
                                Đã gửi mã tới <b>{forgotEmail}</b>. Bạn check hòm thư nhé!
                            </div>
                            <div className="mb-3 text-center">
                                <label className="form-label fw-bold small text-muted d-block mb-3">Mã xác thực OTP</label>
                                <input type="text" className="form-control bg-light text-center fw-bold fs-3 border-0" style={{letterSpacing: '8px', color: '#333'}} maxLength="6" required value={otpForm.otp} onChange={e => setOtpForm({...otpForm, otp: e.target.value})} />
                            </div>
                            <div className="mb-4">
                                <label className="form-label fw-bold small text-muted">Mật khẩu mới</label>
                                <div className="input-group">
                                    <input type={showForgotPass ? "text" : "password"} className="form-control bg-light border-0 py-2" required value={otpForm.newPassword} onChange={e => setOtpForm({...otpForm, newPassword: e.target.value})} />
                                    <button type="button" className="input-group-text bg-light border-0 text-muted" onClick={() => setShowForgotPass(!showForgotPass)}>
                                        {showForgotPass ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-success w-100 fw-bold py-2 fs-6 rounded-pill shadow-sm mb-3">Cập nhật mật khẩu</button>
                            <button type="button" onClick={() => setIsOtpSent(false)} className="btn btn-link w-100 text-decoration-none text-muted small fw-bold">Thử Email khác</button>
                        </form>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;