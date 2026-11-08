import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

const HaiPayDashboard = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('deposit');
  const [depositAmount, setDepositAmount] = useState('100000');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('Vietcombank');
  const [bankAccount, setBankAccount] = useState(user?.bankInfo?.accountNumber || '');
  const [bankAccountName, setBankAccountName] = useState(user?.bankInfo?.accountName || user?.name || '');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sync wallet & transaction data
  const fetchWalletData = useCallback(async () => {
    if (!user?._id) return;
    setRefreshing(true);
    try {
      const token = localStorage.getItem('haipay_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const userRes = await axios.get(`${API_URL}/api/users/${user._id}`, { headers });
      if (userRes.data) {
        setUser(userRes.data);
        localStorage.setItem('user', JSON.stringify(userRes.data));
      }

      const transRes = await axios.get(`${API_URL}/api/users/${user._id}/transactions`, { headers });
      setTransactions(transRes.data || []);
    } catch (err) {
      console.error('Lỗi đồng bộ dữ liệu ví:', err);
    } finally {
      setRefreshing(false);
    }
  }, [user?._id, API_URL]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Handle Deposit via VNPAY
  const handleDeposit = async () => {
    const amount = parseInt(depositAmount, 10);
    if (!amount || amount < 10000) {
      return toast.warning('Chú ý', 'Số tiền nạp tối thiểu là 10.000 đ!');
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/haipay/deposit`, {
        amount,
        userId: user._id
      });

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        toast.error('Lỗi', 'Không thể khởi tạo link thanh toán VNPAY!');
      }
    } catch (err) {
      toast.error('Lỗi', err.response?.data?.message || 'Lỗi kết nối cổng thanh toán VNPAY!');
    } finally {
      setLoading(false);
    }
  };

  // Handle Withdraw
  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!amount || !bankAccount.trim()) {
      return toast.warning('Chú ý', 'Vui lòng nhập đầy đủ số tiền và số tài khoản ngân hàng!');
    }
    if (amount < 50000) {
      return toast.warning('Chú ý', 'Số tiền rút tối thiểu là 50.000 đ!');
    }
    if (amount > (user.walletBalance || 0)) {
      return toast.error('Số dư không đủ', 'Số dư khả dụng trong ví không đủ để thực hiện rút tiền!');
    }

    const isConfirmed = await confirm(
      `Xác nhận rút ${amount.toLocaleString('vi-VN')} đ về tài khoản ${bankName} (${bankAccount})?`
    );
    if (!isConfirmed) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/users/${user._id}/withdraw`, {
        amount,
        bankName,
        bankAccount: bankAccount.trim()
      });

      toast.success('Thành công', '✅ ' + (res.data.message || 'Yêu cầu rút tiền đã được ghi nhận!'));
      if (res.data.user) {
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }

      setWithdrawAmount('');
      setActiveTab('history');
      fetchWalletData();
    } catch (err) {
      toast.error('Lỗi', err.response?.data?.message || 'Lỗi xử lý yêu cầu rút tiền!');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Thành công') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (status === 'Đang xử lý') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
  };

  if (!user) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ================= DIGITAL WALLET CARD ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Smart Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 p-8 border border-slate-700/60 shadow-2xl shadow-black/60 group">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/30">
                  🛡️
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base tracking-tight">HaiPay Secured Card</h3>
                  <p className="text-[11px] text-slate-400">Ví thanh toán & Ký quỹ an toàn</p>
                </div>
              </div>

              <button
                onClick={fetchWalletData}
                disabled={refreshing}
                title="Làm mới số dư"
                className={`p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-all ${refreshing ? 'animate-spin text-amber-400' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Balance Display */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                Số Dư Khả Dụng
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight font-mono">
                  {(user.walletBalance || 0).toLocaleString('vi-VN')}
                </span>
                <span className="text-2xl font-bold text-amber-300/80">VND</span>
              </div>
            </div>

            {/* Footer of Card */}
            <div className="flex flex-wrap items-end justify-between gap-4 pt-4 border-t border-slate-800 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Chủ tài khoản</p>
                <p className="font-bold text-white uppercase tracking-wider">{user.name || 'Người dùng HaiHand'}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">SĐT liên kết</p>
                <p className="font-mono text-slate-300">{user.walletPhone || user.phone || 'Chưa liên kết'}</p>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Đã bảo chứng
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Escrow & Security Status Box */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between space-y-6">
          <div>
            <h4 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Ký Quỹ Chờ Giải Ngân (Escrow)
            </h4>
            
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 mb-4">
              <p className="text-xs text-slate-400 mb-1">Số dư đang giữ an toàn</p>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {(user.pendingBalance || 0).toLocaleString('vi-VN')} <span className="text-sm font-semibold">VND</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Tiền từ đơn bán của bạn được giữ an toàn tại hệ thống cho tới khi người mua nhận hàng thành công.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Định danh KYC:</span>
                <span className={user.cccd ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                  {user.cccd ? '✓ Đã cập nhật CCCD' : '⚠ Chưa cập nhật'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Trạng thái ví:</span>
                <span className="text-white font-semibold">Hoạt động bình thường</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-800/80">
            Hỗ trợ giải ngân tự động trong vòng 24h sau khi hoàn tất đơn hàng.
          </div>
        </div>
      </div>

      {/* ================= ACTION TABS ================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-4 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'deposit' ? 'text-amber-400 bg-slate-900 border-b-2 border-amber-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nạp Tiền VNPAY
          </button>

          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-4 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'withdraw' ? 'text-amber-400 bg-slate-900 border-b-2 border-amber-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Rút Tiền Về Thẻ
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-4 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'text-amber-400 bg-slate-900 border-b-2 border-amber-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Lịch Sử Giao Dịch ({transactions.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 sm:p-8 min-h-[420px]">
          {/* ============ TAB 1: DEPOSIT ============ */}
          {activeTab === 'deposit' && (
            <div className="max-w-md mx-auto py-2 space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-white mb-1">Nạp tiền an toàn qua VNPAY</h3>
                <p className="text-xs text-slate-400">Hỗ trợ tất cả ngân hàng nội địa, thẻ quốc tế & mã QR</p>
              </div>

              {/* Quick Select Buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Chọn nhanh số tiền</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[50000, 100000, 200000, 500000, 1000000, 2000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(amt.toString())}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${depositAmount === amt.toString() ? 'bg-amber-400/20 text-amber-300 border-amber-400' : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-600'}`}
                    >
                      {amt.toLocaleString('vi-VN')} đ
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Hoặc nhập số tiền tùy chọn</label>
                <div className="relative">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-amber-400 focus:outline-none focus:border-amber-400 transition-colors pr-16 font-mono"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">VND</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleDeposit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black py-3.5 rounded-xl shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Tiến hành nạp qua VNPAY</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Cổng thanh toán chính thức đạt chuẩn an toàn quốc tế</span>
              </div>
            </div>
          )}

          {/* ============ TAB 2: WITHDRAW ============ */}
          {activeTab === 'withdraw' && (
            <form onSubmit={handleWithdraw} className="max-w-md mx-auto py-2 space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-white mb-1">Rút tiền về tài khoản ngân hàng</h3>
                <p className="text-xs text-slate-400">Thời gian xử lý chuyển khoản trong vòng 24h làm việc</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="font-semibold text-slate-400">Số tiền muốn rút</span>
                  <span className="text-emerald-400 font-bold">Khả dụng: {(user.walletBalance || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Tối thiểu 50.000 đ"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-amber-400 transition-colors pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">VND</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ngân hàng thụ hưởng</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-amber-400 transition-colors"
                >
                  <option value="Vietcombank">Vietcombank (Ngoại thương)</option>
                  <option value="Techcombank">Techcombank (Kỹ thương)</option>
                  <option value="MB Bank">MB Bank (Quân đội)</option>
                  <option value="VietinBank">VietinBank (Công thương)</option>
                  <option value="BIDV">BIDV (Đầu tư & Phát triển)</option>
                  <option value="ACB">ACB (Á Châu)</option>
                  <option value="TPBank">TPBank (Tiên Phong)</option>
                  <option value="VPBank">VPBank (Việt Nam Thịnh Vượng)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Số tài khoản thụ hưởng</label>
                <input
                  type="text"
                  required
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="Nhập số tài khoản ngân hàng..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-amber-400 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tên chủ tài khoản (Viết hoa không dấu)</label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                  placeholder="NGUYEN VAN A"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-amber-400 transition-colors uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Yêu cầu rút tiền</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ============ TAB 3: TRANSACTION HISTORY ============ */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <div className="w-16 h-16 rounded-full bg-slate-800/60 flex items-center justify-center mx-auto mb-3 text-2xl">
                    📜
                  </div>
                  <p className="font-semibold text-slate-400">Chưa có giao dịch phát sinh nào</p>
                  <p className="text-xs text-slate-500 mt-1">Các giao dịch nạp, rút hoặc thanh toán đơn hàng sẽ hiển thị tại đây</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {transactions.map((tx) => (
                    <div key={tx._id} className="py-3.5 flex items-center justify-between hover:bg-slate-800/30 px-3 rounded-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${tx.type === 'Nạp tiền' || tx.type === 'Giải ngân' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {tx.type === 'Nạp tiền' ? '↓' : tx.type === 'Rút tiền' ? '↑' : '↔'}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{tx.type}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getStatusBadge(tx.status)}`}>
                              {tx.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate max-w-xs">{tx.description || 'Giao dịch ví HaiPay'}</p>
                          <span className="text-[10px] text-slate-500">{new Date(tx.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`font-mono font-bold text-sm ${tx.type === 'Nạp tiền' || tx.type === 'Giải ngân' ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {tx.type === 'Nạp tiền' || tx.type === 'Giải ngân' ? '+' : '-'}
                          {Number(tx.amount || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HaiPayDashboard;
