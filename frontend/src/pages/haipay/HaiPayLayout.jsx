import React from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';

export const HaiPayLayout = () => {
  const navigate = useNavigate();
  const haipayUser = (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const handleLogoutWallet = () => {
    localStorage.removeItem('haipay_token');
    navigate('/haipay/login');
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* HaiPay Banking Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to="/haipay/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <span className="text-slate-950 font-black text-xl tracking-tighter">H</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg text-white tracking-tight">HaiPay</span>
                  <span className="text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    Wallet
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Hệ thống ví ký quỹ an toàn</p>
              </div>
            </Link>
          </div>

          {/* Security & User Badges */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* SSL Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>256-Bit SSL Escrow</span>
            </div>

            {/* Back to Marketplace */}
            <Link
              to="/"
              className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Về Sàn Chợ</span>
            </Link>

            {/* User Session Info or Logout */}
            {haipayUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-white truncate max-w-[120px]">{haipayUser.name || haipayUser.email}</div>
                  <div className="text-[10px] text-emerald-400 font-medium">Ví đã kích hoạt</div>
                </div>
                <button
                  onClick={handleLogoutWallet}
                  title="Đăng xuất phiên làm việc Ví"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Fintech Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Hệ thống ký quỹ bảo vệ người mua & người bán HaiHand</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link to="/terms" className="hover:text-amber-400 transition-colors">Điều khoản ví</Link>
            <span>•</span>
            <Link to="/safe-buying-guide" className="hover:text-amber-400 transition-colors">Quy định bảo vệ</Link>
            <span>•</span>
            <Link to="/help-center" className="hover:text-amber-400 transition-colors">Hỗ trợ 24/7</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HaiPayLayout;
