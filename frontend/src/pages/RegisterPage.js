import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/Toast';


const RegisterPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  
  
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6) {
        return toast.error('Lỗi', "❌ Mật khẩu phải có ít nhất 6 ký tự!");
    }
    if (formData.password !== formData.confirmPassword) {
        return toast.error('Lỗi', "❌ Mật khẩu xác nhận không khớp!");
    }

    try {
      const { data } = await axios.post(`${API_URL}/api/users/register`, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
      });
      toast.success('Thành công', "🎉 Đăng ký thành công! Hãy đăng nhập nhé.");
      navigate('/login');
    } catch (error) {
      toast.error('Lỗi', "❌ " + (error.response?.data?.message || "Lỗi đăng ký tài khoản!"));
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 py-5" style={{ backgroundColor: '#F4F4F4' }}>
      <div className="card shadow-lg border-0 rounded-4 overflow-hidden" style={{ width: '450px' }}>
        
        <div className="bg-warning p-4 text-center">
            <div 
                onClick={() => navigate('/')} 
                style={{cursor: 'pointer', transition: '0.3s'}}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                className="d-flex justify-content-center hover-scale"
            >
                <img src="/logo.png" alt="HaiHand" style={{height: '32px', objectFit: 'contain'}} />
            </div>
            <p className="text-white-50 small m-0 mt-1">Tạo tài khoản mới</p>
        </div>

        <div className="card-body p-4 p-sm-5">
            <form onSubmit={handleRegister}>
                <div className="mb-3">
                    <label className="form-label fw-bold small text-muted">Họ và tên <span className="text-danger">*</span></label>
                    <input type="text" className="form-control bg-light py-2" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div className="mb-3">
                    <label className="form-label fw-bold small text-muted">Email <span className="text-danger">*</span></label>
                    <input type="email" className="form-control bg-light py-2" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>

                <div className="mb-3">
                    <label className="form-label fw-bold small text-muted">Số điện thoại <span className="text-danger">*</span></label>
                    <input type="text" className="form-control bg-light py-2" placeholder="Dùng để khôi phục mật khẩu" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>

                <div className="mb-3">
                    <label className="form-label fw-bold small text-muted">Mật khẩu <span className="text-danger">*</span></label>
                    <div className="input-group">
                        <input type={showPass ? "text" : "password"} className="form-control bg-light py-2 border-end-0" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                        <button type="button" className="input-group-text bg-light border-start-0 text-muted" onClick={() => setShowPass(!showPass)}>
                            {showPass ? '🙈' : '👁️'}
                        </button>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="form-label fw-bold small text-muted">Xác nhận mật khẩu <span className="text-danger">*</span></label>
                    <div className="input-group">
                        <input type={showConfirmPass ? "text" : "password"} className="form-control bg-light py-2 border-end-0" required value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                        <button type="button" className="input-group-text bg-light border-start-0 text-muted" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                            {showConfirmPass ? '🙈' : '👁️'}
                        </button>
                    </div>
                </div>

                <button type="submit" className="btn btn-warning w-100 fw-bold py-2 fs-5 text-white rounded-pill shadow-sm mt-2">Đăng ký</button>
                
                <div className="text-center mt-4 small">
                    Đã có tài khoản? <Link to="/login" className="text-decoration-none fw-bold text-warning">Đăng nhập</Link>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;