import React, { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext();

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: 'Xác nhận',
    message: '',
    confirmText: 'Đồng ý',
    cancelText: 'Hủy',
    resolve: null
  });

  /**
   * Hỗ trợ truyền vào 1 chuỗi String HOẶC 1 object cấu hình { title, message, confirmText, cancelText }
   * Đảm bảo các trường lưu trong state luôn là kiểu String nguyên thủy để không gây crash React.
   */
  const confirm = useCallback((optionsOrMessage) => {
    return new Promise((resolve) => {
      if (typeof optionsOrMessage === 'object' && optionsOrMessage !== null) {
        setConfirmState({
          isOpen: true,
          title: String(optionsOrMessage.title || 'Xác nhận'),
          message: String(optionsOrMessage.message || ''),
          confirmText: String(optionsOrMessage.confirmText || 'Đồng ý'),
          cancelText: String(optionsOrMessage.cancelText || 'Hủy'),
          resolve
        });
      } else {
        setConfirmState({
          isOpen: true,
          title: 'Xác nhận',
          message: String(optionsOrMessage || ''),
          confirmText: 'Đồng ý',
          cancelText: 'Hủy',
          resolve
        });
      }
    });
  }, []);

  const handleConfirm = () => {
    if (confirmState.resolve) confirmState.resolve(true);
    setConfirmState({
      isOpen: false,
      title: 'Xác nhận',
      message: '',
      confirmText: 'Đồng ý',
      cancelText: 'Hủy',
      resolve: null
    });
  };

  const handleCancel = () => {
    if (confirmState.resolve) confirmState.resolve(false);
    setConfirmState({
      isOpen: false,
      title: 'Xác nhận',
      message: '',
      confirmText: 'Đồng ý',
      cancelText: 'Hủy',
      resolve: null
    });
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={handleCancel}
          ></div>
          <div
            className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-sm p-6 relative z-10 animate-in fade-in zoom-in duration-200"
            style={{ animation: 'toast-slide-down 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#EA580C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-stone-800">{confirmState.title}</h3>
            </div>

            <p className="text-stone-600 mb-6 leading-relaxed">
              {confirmState.message}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 rounded-xl text-stone-600 font-bold hover:bg-stone-100 transition-colors"
              >
                {confirmState.cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className="px-5 py-2.5 rounded-xl bg-[#FACC15] text-[#1C1917] font-bold hover:bg-[#EAB308] shadow-sm transition-colors"
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
