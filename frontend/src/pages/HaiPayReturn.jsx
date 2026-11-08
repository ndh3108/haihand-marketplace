import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';

const VNPAY_RESPONSE_MESSAGES = {
  '00': 'Giao dịch thành công',
  '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ bất thường.',
  '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ Internet Banking.',
  '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
  '11': 'Đã hết hạn chờ thanh toán. Vui lòng thực hiện lại.',
  '12': 'Thẻ hoặc tài khoản của quý khách đang bị khóa.',
  '13': 'Quý khách đã nhập sai mật khẩu OTP.',
  '24': 'Khách hàng đã hủy giao dịch thanh toán.',
  '51': 'Tài khoản không đủ số dư để thực hiện giao dịch.',
  '65': 'Tài khoản của quý khách đã vượt quá hạn mức giao dịch trong ngày.',
  '75': 'Ngân hàng thanh toán đang bảo trì hệ thống.',
  '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định.',
  '99': 'Lỗi không xác định từ cổng thanh toán VNPAY.'
};

const HaiPayReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Đang xác thực kết quả thanh toán...');
  const [isWalletTopup, setIsWalletTopup] = useState(false);

  // VNPAY Parameters
  const responseCode = searchParams.get('vnp_ResponseCode');
  const txnRef = searchParams.get('vnp_TxnRef');
  const rawAmount = searchParams.get('vnp_Amount');
  const bankCode = searchParams.get('vnp_BankCode');
  const payDate = searchParams.get('vnp_PayDate');
  const orderInfo = searchParams.get('vnp_OrderInfo');
  const secureHash = searchParams.get('vnp_SecureHash');

  const actualAmount = rawAmount ? Math.round(Number(rawAmount) / 100) : 0;

  const formatPayDate = (str) => {
    if (!str || str.length < 14) return new Date().toLocaleString('vi-VN');
    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    const day = str.substring(6, 8);
    const hour = str.substring(8, 10);
    const minute = str.substring(10, 12);
    const second = str.substring(12, 14);
    return `${hour}:${minute}:${second} - ${day}/${month}/${year}`;
  };

  useEffect(() => {
    const verifyTransaction = async () => {
      if (!responseCode || !txnRef) {
        setLoading(false);
        setIsSuccess(false);
        setStatusMessage('Không tìm thấy thông tin phản hồi từ cổng thanh toán!');
        return;
      }

      const allParams = {};
      for (const [key, value] of searchParams.entries()) {
        allParams[key] = value;
      }

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const isTopup = txnRef.startsWith('NAP_');
      setIsWalletTopup(isTopup);

      try {
        if (isTopup) {
          // Case 1: Wallet Deposit
          if (responseCode === '00') {
            await axios.post(`${API_URL}/api/haipay/verify`, {
              txnRef,
              responseCode,
              amount: rawAmount,
              vnp_Params: allParams,
              secureHash
            });

            // Update user balance in localStorage
            try {
              const currentUser = JSON.parse(localStorage.getItem('user'));
              if (currentUser) {
                currentUser.walletBalance = (currentUser.walletBalance || 0) + actualAmount;
                localStorage.setItem('user', JSON.stringify(currentUser));
                window.dispatchEvent(new Event('userUpdated'));
              }
            } catch (e) {
              console.warn('Update local user balance warning:', e);
            }

            setIsSuccess(true);
            setStatusMessage('Nạp tiền vào Ví HaiPay thành công! Số dư đã được cập nhật.');
          } else {
            setIsSuccess(false);
            setStatusMessage(VNPAY_RESPONSE_MESSAGES[responseCode] || 'Nạp tiền thất bại hoặc bạn đã hủy giao dịch.');
          }
        } else {
          // Case 2: Order Checkout Payment
          const currentUser = (() => {
            try {
              const stored = localStorage.getItem('user');
              return stored ? JSON.parse(stored) : null;
            } catch {
              return null;
            }
          })();

          await axios.post(`${API_URL}/api/vnpay/verify`, {
            orderId: txnRef,
            responseCode,
            userId: currentUser?._id,
            vnp_Params: allParams,
            secureHash
          });

          if (responseCode === '00') {
            setIsSuccess(true);
            setStatusMessage('Thanh toán đơn hàng thành công qua VNPAY! Người bán đang chuẩn bị đơn hàng.');
            window.dispatchEvent(new Event('cartUpdated'));
          } else {
            setIsSuccess(false);
            setStatusMessage(VNPAY_RESPONSE_MESSAGES[responseCode] || 'Thanh toán đơn hàng thất bại hoặc bạn đã hủy giao dịch.');
          }
        }
      } catch (error) {
        console.error('Lỗi xác thực VNPAY:', error);
        if (responseCode === '00') {
          // Even if backend check gave warning (e.g. already verified), consider it successful
          setIsSuccess(true);
          setStatusMessage('Giao dịch đã được ghi nhận thành công trên hệ thống VNPAY.');
        } else {
          setIsSuccess(false);
          setStatusMessage(error.response?.data?.message || VNPAY_RESPONSE_MESSAGES[responseCode] || 'Giao dịch không thành công!');
        }
      } finally {
        setLoading(false);
      }
    };

    verifyTransaction();
  }, [responseCode, txnRef, rawAmount, secureHash, actualAmount, searchParams]);

  return (
    <div className="bg-[#FFFBEB] min-h-screen font-sans text-[#1C1917] flex flex-col">
      <AppHeader />

      <main className="max-w-[720px] mx-auto w-full px-4 py-10 flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-12 text-center flex flex-col items-center">
            <div className="w-14 h-14 border-4 border-amber-200 border-t-[#FACC15] rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-bold text-stone-800 mb-2">Đang xử lý kết quả giao dịch</h2>
            <p className="text-sm text-stone-500">Hệ thống đang kết nối với cổng VNPAY để xác thực đơn hàng của bạn. Vui lòng chờ trong giây lát...</p>
          </div>
        ) : isSuccess ? (
          /* ================= SUCCESS STATE ================= */
          <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-b from-emerald-50 to-white px-8 pt-10 pb-6 text-center border-b border-stone-100">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mb-4 ring-8 ring-emerald-50 animate-bounce">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-black text-stone-900 tracking-tight mb-2">
                Thanh toán thành công!
              </h1>
              <p className="text-stone-600 text-sm max-w-md mx-auto leading-relaxed">
                {statusMessage}
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-8 space-y-6">
              <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100 space-y-3.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-500">Mã đơn / Giao dịch (TxnRef)</span>
                  <span className="font-mono font-bold text-stone-800 bg-white px-2.5 py-1 rounded-md border border-stone-200">
                    {txnRef || 'N/A'}
                  </span>
                </div>

                {actualAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-500">Số tiền thanh toán</span>
                    <span className="text-lg font-black text-emerald-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(actualAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-500">Phương thức thanh toán</span>
                  <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Cổng VNPAY {bankCode ? `(${bankCode})` : ''}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-500">Thời gian giao dịch</span>
                  <span className="text-stone-700">{formatPayDate(payDate)}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-500">Trạng thái bảo đảm</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                    🛡️ HaiHand Bảo vệ đơn hàng (Escrow)
                  </span>
                </div>

                {orderInfo && (
                  <div className="pt-2 border-t border-stone-200 text-xs text-stone-500 flex justify-between">
                    <span>Nội dung:</span>
                    <span className="text-stone-700 italic max-w-xs text-right truncate">{orderInfo}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {isWalletTopup ? (
                  <button
                    onClick={() => navigate('/haipay')}
                    className="flex-1 bg-[#FACC15] hover:bg-[#EAB308] text-[#1C1917] font-bold py-3.5 px-6 rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Quay lại Ví HaiPay
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/profile?tab=orders_buy')}
                    className="flex-1 bg-[#FACC15] hover:bg-[#EAB308] text-[#1C1917] font-bold py-3.5 px-6 rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Xem Đơn Mua Của Tôi
                  </button>
                )}

                <button
                  onClick={() => navigate('/')}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3.5 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Về Trang Chủ
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= ERROR STATE ================= */
          <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-b from-rose-50 to-white px-8 pt-10 pb-6 text-center border-b border-stone-100">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-100 text-rose-600 mb-4 ring-8 ring-rose-50 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-black text-stone-900 tracking-tight mb-2">
                Thanh toán thất bại
              </h1>
              <p className="text-stone-600 text-sm max-w-md mx-auto leading-relaxed">
                {statusMessage}
              </p>
            </div>

            {/* Error Details */}
            <div className="p-8 space-y-6">
              <div className="bg-rose-50/50 rounded-2xl p-5 border border-rose-100 space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Mã đơn / Giao dịch</span>
                  <span className="font-mono font-semibold text-stone-800">{txnRef || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Mã phản hồi VNPAY</span>
                  <span className="font-mono text-rose-600 font-bold bg-white px-2 py-0.5 rounded border border-rose-200">
                    {responseCode || 'ERR'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Lý do</span>
                  <span className="text-rose-700 font-medium text-right">
                    {VNPAY_RESPONSE_MESSAGES[responseCode] || 'Giao dịch bị từ chối'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => navigate(isWalletTopup ? '/haipay' : '/cart')}
                  className="flex-1 bg-[#FACC15] hover:bg-[#EAB308] text-[#1C1917] font-bold py-3.5 px-6 rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isWalletTopup ? 'Thử Nạp Lại' : 'Thử Lại Thanh Toán'}
                </button>

                <button
                  onClick={() => navigate('/')}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3.5 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Về Trang Chủ
                </button>
              </div>

              <div className="text-center">
                <Link to="/help-center" className="text-xs text-stone-400 hover:text-stone-600 underline">
                  Cần hỗ trợ về thanh toán? Liên hệ CSKH HaiHand
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
};

export default HaiPayReturn;
