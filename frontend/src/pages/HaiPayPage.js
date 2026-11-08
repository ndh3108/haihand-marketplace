import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';


const HaiPayPage = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = window.location;
  const queryParams = new URLSearchParams(location.search);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
  
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [activeTab, setActiveTab] = useState(queryParams.get('tab') || 'deposit'); 
  
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('Vietcombank');
  const [bankAccount, setBankAccount] = useState('');
  const [transactions, setTransactions] = useState([]);

  
  const fetchWalletData = async () => {
    if (!user?._id) return;
    try {
        
        const userRes = await axios.get(`${API_URL}/api/users/${user._id}`);
        if (userRes.data) {
            setUser(userRes.data);
            localStorage.setItem('user', JSON.stringify(userRes.data));
        }
        
        
        const transRes = await axios.get(`${API_URL}/api/users/${user._id}/transactions`);
        setTransactions(transRes.data);
    } catch (error) {
        console.error("Lỗi đồng bộ ví:", error);
    }
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchWalletData();
  }, [user?._id, navigate]);

  
  const handleDeposit = async () => {
    const amount = parseInt(depositAmount);
    if (!amount || amount < 10000) return toast.warning('Chú ý', "Nạp tối thiểu 10.000đ bác nhé!");

    try {
        
        const { data } = await axios.post(`${API_URL}/api/haipay/deposit`, {
            amount: amount,
            userId: user._id
        });

        if (data.paymentUrl) {
            window.location.href = data.paymentUrl; 
        }
    } catch (error) {
        toast.error('Lỗi', "Lỗi kết nối cổng thanh toán!");
    }
  };

  
  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!amount || !bankAccount) return toast.warning('Chú ý', "Vui lòng điền đủ thông tin!");
    if (amount < 50000) return toast.warning('Chú ý', "Rút tối thiểu 50.000đ bác nhé!");
    if (amount > user.walletBalance) return toast.info('Thông báo', "Số dư không đủ để rút!");

    const isConfirmed = await confirm(`Xác nhận rút ${amount.toLocaleString('vi-VN')}đ về ${bankName}?`);
    if (isConfirmed) {
        try {
            
            const res = await axios.post(`${API_URL}/api/users/${user._id}/withdraw`, {
                amount: amount,
                bankName,
                bankAccount
            });
            
            toast.success('Thành công', "✅ " + res.data.message);
            
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            
            setWithdrawAmount(''); 
            setBankAccount('');
            setActiveTab('history');
            fetchWalletData(); 
        } catch (error) {
            toast.error('Lỗi', "❌ " + (error.response?.data?.message || "Lỗi xử lý!"));
        }
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Thành công') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (status === 'Đang xử lý') return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFBEB] font-sans text-[#1C1917]">
      <AppHeader />
      <div className="flex-1 max-w-[900px] w-full mx-auto px-4 py-10">
        
        {/* Premium E-Wallet Card */}
        <div className="bg-gradient-to-br from-[#FACC15] via-[#F97316] to-[#EA580C] p-8 rounded-3xl shadow-xl relative overflow-hidden mb-8 transform hover:scale-[1.01] transition-transform duration-300">
            {/* Decorative background shapes */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black opacity-10 rounded-full blur-3xl"></div>
            
            <div className="flex justify-between items-start relative z-10 mb-8">
                <h5 className="font-black text-xl tracking-wider text-white flex items-center gap-2 drop-shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    Ví HÀI PAY
                </h5>
                <div className="flex gap-1">
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md"></div>
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md -ml-4"></div>
                </div>
            </div>

            <div className="relative z-10">
                <p className="text-white/90 text-sm font-bold tracking-widest mb-1 drop-shadow">SỐ DƯ KHẢ DỤNG</p>
                <div className="flex items-baseline gap-2 drop-shadow-md">
                    <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
                        {(user.walletBalance || 0).toLocaleString('vi-VN')}
                    </h1>
                    <span className="text-3xl font-bold text-white/90 underline">đ</span>
                </div>
            </div>
            
            <div className="flex justify-between items-end mt-10 relative z-10 text-white/90 text-sm font-medium">
                <div>
                    <p className="text-[10px] uppercase tracking-wider mb-1 opacity-80">Chủ tài khoản</p>
                    <p className="font-bold tracking-widest text-lg uppercase drop-shadow-sm">{user.name}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider mb-1 opacity-80">Trạng thái</p>
                    <p className="font-bold tracking-widest uppercase drop-shadow-sm flex items-center gap-1.5 justify-end">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse border border-white/50"></span> Hoạt động
                    </p>
                </div>
            </div>
        </div>

        {/* Action Tabs */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="flex border-b border-stone-100 bg-stone-50/50">
                <button onClick={() => setActiveTab('deposit')} className={`flex-1 py-5 font-black text-sm transition-all ${activeTab === 'deposit' ? 'text-[#EA580C] bg-white border-b-4 border-[#EA580C]' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'}`}>NẠP TIỀN</button>
                <button onClick={() => setActiveTab('withdraw')} className={`flex-1 py-5 font-black text-sm transition-all ${activeTab === 'withdraw' ? 'text-[#EA580C] bg-white border-b-4 border-[#EA580C]' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'}`}>RÚT TIỀN</button>
                <button onClick={() => setActiveTab('history')} className={`flex-1 py-5 font-black text-sm transition-all ${activeTab === 'history' ? 'text-[#EA580C] bg-white border-b-4 border-[#EA580C]' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'}`}>LỊCH SỬ GIAO DỊCH</button>
            </div>

        <div className="p-8 min-h-[400px]">
            {activeTab === 'deposit' && (
                <div className="animate-fade-in max-w-lg mx-auto py-4">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-[#1C1917] mb-2">Nạp tiền vào ví</h2>
                        <p className="text-stone-500 text-sm">Nạp tiền nhanh chóng và an toàn qua VNPay</p>
                    </div>
                    
                    <label className="block font-bold text-stone-700 mb-3">Chọn số tiền nạp nhanh</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                        {[50000, 100000, 200000, 500000, 1000000, 2000000].map(amount => (
                            <button 
                                key={amount}
                                onClick={() => setDepositAmount(amount.toString())}
                                className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${depositAmount === amount.toString() ? 'border-[#EA580C] bg-orange-50 text-[#EA580C]' : 'border-stone-200 text-stone-600 hover:border-[#FACC15]'}`}
                            >
                                {amount.toLocaleString('vi-VN')} đ
                            </button>
                        ))}
                    </div>

                    <label className="block font-bold text-stone-700 mb-3">Hoặc nhập số tiền khác</label>
                    <div className="relative mb-8">
                        <input type="number" className="w-full border-2 border-stone-200 rounded-xl text-2xl p-4 font-black focus:outline-none focus:border-[#EA580C] transition-colors pr-16" placeholder="0" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-xl">VND</span>
                    </div>

                    <button onClick={handleDeposit} className="w-full bg-gradient-to-r from-[#FACC15] to-[#EA580C] hover:from-[#EAB308] hover:to-[#C2410C] text-white font-black text-lg py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        NẠP TIỀN QUA VNPAY
                    </button>
                    <div className="flex items-center justify-center gap-2 mt-4 opacity-60">
                        <img src="https://vnpay.vn/s1/statics.vnpay.vn/2023/9/06ncktiwd6dc1694418196384.png" alt="VNPay" className="h-6" />
                        <span className="text-xs font-bold text-stone-500">Hỗ trợ thanh toán an toàn 24/7</span>
                    </div>
                </div>
            )}

            {activeTab === 'withdraw' && (
                <form onSubmit={handleWithdraw} className="animate-fade-in max-w-lg mx-auto py-4">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-[#1C1917] mb-2">Rút tiền về thẻ</h2>
                        <p className="text-stone-500 text-sm">Giao dịch được xử lý trong vòng 24h làm việc</p>
                    </div>

                    <div className="mb-5">
                        <div className="flex justify-between items-end mb-2">
                            <label className="font-bold text-stone-700 text-sm">Số tiền muốn rút</label>
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Khả dụng: {(user.walletBalance || 0).toLocaleString('vi-VN')} đ</span>
                        </div>
                        <div className="relative">
                            <input type="number" className="w-full border-2 border-stone-200 rounded-xl text-xl p-3.5 font-bold focus:outline-none focus:border-[#EA580C] transition-colors pr-16" placeholder="Tối thiểu 50.000đ" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} required />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-stone-400">VND</span>
                        </div>
                    </div>
                    <div className="mb-5">
                        <label className="block font-bold text-stone-700 text-sm mb-2">Ngân hàng thụ hưởng</label>
                        <select className="w-full border-2 border-stone-200 rounded-xl text-lg p-3.5 font-bold bg-white focus:outline-none focus:border-[#EA580C] transition-colors" value={bankName} onChange={e => setBankName(e.target.value)}>
                            <option value="Vietcombank">Ngân hàng Ngoại thương (Vietcombank)</option>
                            <option value="Techcombank">Ngân hàng Kỹ thương (Techcombank)</option>
                            <option value="MB Bank">Ngân hàng Quân đội (MB Bank)</option>
                            <option value="Agribank">Ngân hàng Nông nghiệp (Agribank)</option>
                            <option value="BIDV">Ngân hàng Đầu tư (BIDV)</option>
                            <option value="ACB">Ngân hàng Á Châu (ACB)</option>
                        </select>
                    </div>
                    <div className="mb-8">
                        <label className="block font-bold text-stone-700 text-sm mb-2">Số tài khoản thụ hưởng</label>
                        <input type="text" className="w-full border-2 border-stone-200 rounded-xl text-lg p-3.5 font-bold focus:outline-none focus:border-[#EA580C] transition-colors" placeholder="Nhập số tài khoản của bạn..." value={bankAccount} onChange={e => setBankAccount(e.target.value)} required />
                    </div>
                    <button type="submit" className="w-full bg-[#1C1917] hover:bg-stone-800 text-white font-black text-lg py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                        YÊU CẦU RÚT TIỀN
                    </button>
                </form>
            )}

            {activeTab === 'history' && (
                <div className="animate-fade-in flex flex-col gap-3">
                    {transactions.length === 0 ? (
                        <div className="text-center py-12 text-stone-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-3 text-stone-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p className="font-medium">Chưa có giao dịch phát sinh.</p>
                        </div>
                    ) : (
                        transactions.map(t => (
                            <div key={t._id} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100 hover:border-stone-200 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${t.type === 'Nạp tiền' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                        {t.type === 'Nạp tiền' ? '↓' : '↑'}
                                    </div>
                                    <div>
                                        <h6 className="font-bold text-[#1C1917] mb-0.5">{t.type}</h6>
                                        <p className="text-xs text-stone-400">{new Date(t.createdAt).toLocaleString('vi-VN')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h6 className={`font-black text-lg mb-1 ${t.type === 'Rút tiền' ? 'text-stone-700' : 'text-[#EA580C]'}`}>
                                        {t.type === 'Rút tiền' ? '-' : '+'}{t.amount.toLocaleString()} đ
                                    </h6>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(t.status)}`}>
                                        {t.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
      </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default HaiPayPage;