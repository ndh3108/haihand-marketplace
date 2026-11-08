import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const PaymentResultPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('⏳ Đang xử lý giao dịch...');

    useEffect(() => {
        const verifyPayment = async () => {
            const responseCode = searchParams.get('vnp_ResponseCode');
            const orderId = searchParams.get('vnp_TxnRef');
            const user = JSON.parse(localStorage.getItem('user'));

            if (!responseCode || !orderId || !user) {
                setStatus('❌ Dữ liệu không hợp lệ!'); return;
            }

            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
            try {
                await axios.post(`${API_URL}/api/vnpay/verify`, {
                    orderId, responseCode, userId: user._id
                });
                
                if (responseCode === '00') {
                    setStatus('🎉 Thanh toán thành công! Admin đang giữ tiền của bạn.');
                    window.dispatchEvent(new Event('cartUpdated')); 
                } else {
                    setStatus('❌ Giao dịch thất bại hoặc bạn đã hủy thanh toán!');
                }
            } catch (error) { setStatus('❌ Lỗi hệ thống khi xác nhận giao dịch!'); }
        };
        verifyPayment();
    }, [searchParams]);

    return (
        <div className="d-flex flex-column align-items-center justify-content-center vh-100 bg-light">
            <div className="card p-5 shadow-lg rounded-4 text-center border-0" style={{maxWidth: '500px'}}>
                <h3 className="fw-bold mb-4 text-dark" style={{lineHeight: '1.5'}}>{status}</h3>
                <button onClick={() => navigate('/profile')} className="btn btn-warning fw-bold px-5 py-3 rounded-pill shadow-sm">
                    🛍️ Vào xem Đơn mua của tôi
                </button>
            </div>
        </div>
    );
};

export default PaymentResultPage;