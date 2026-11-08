import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// --- Toast Context ---
const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

// --- Toast Item Component ---
const ToastItem = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10);
    
    // Auto dismiss
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, toast.duration || 3500);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, []);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 400);
  };

  const iconMap = {
    success: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#10B981" opacity="0.15"/>
        <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    error: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#EF4444" opacity="0.15"/>
        <path d="M15 9L9 15M9 9L15 15" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    warning: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#F59E0B" opacity="0.15"/>
        <path d="M12 8V12M12 16H12.01" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    info: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#3B82F6" opacity="0.15"/>
        <path d="M12 16V12M12 8H12.01" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  };

  const accentColorMap = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  };

  const type = toast.type || 'info';
  const accentColor = accentColorMap[type];

  return (
    <div
      style={{
        transform: isVisible && !isLeaving ? 'translateY(0) scale(1)' : 'translateY(-24px) scale(0.95)',
        opacity: isVisible && !isLeaving ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        borderRadius: '16px',
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(255,255,255,0.5)`,
        borderLeft: `4px solid ${accentColor}`,
        minWidth: '320px',
        maxWidth: '480px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={handleDismiss}
    >
      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
          borderRadius: '0 0 0 16px',
          animation: `toastProgress ${toast.duration || 3500}ms linear forwards`,
        }}
      />

      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {iconMap[type]}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{
            fontWeight: 700,
            fontSize: '14px',
            color: '#1C1917',
            marginBottom: toast.message ? '2px' : 0,
            lineHeight: 1.3,
          }}>
            {toast.title}
          </div>
        )}
        {toast.message && (
          <div style={{
            fontSize: '13px',
            color: '#78716C',
            lineHeight: 1.4,
          }}>
            {toast.message}
          </div>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '8px',
          color: '#A8A29E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = '#F5F5F4'; e.currentTarget.style.color = '#1C1917'; }}
        onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#A8A29E'; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
};

// --- Toast Provider ---
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 3500 }) => {
    const id = Date.now() + Math.random();
    const safeTitle =
      typeof title === 'object' && title !== null
        ? String(title.title || title.message || JSON.stringify(title))
        : title != null
          ? String(title)
          : '';
    const safeMessage =
      typeof message === 'object' && message !== null
        ? String(message.message || JSON.stringify(message))
        : message != null
          ? String(message)
          : '';
    setToasts(prev => [...prev, { id, type, title: safeTitle, message: safeMessage, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback({
    success: (title, message, duration) => addToast({ type: 'success', title, message, duration }),
    error: (title, message, duration) => addToast({ type: 'error', title, message, duration }),
    warning: (title, message, duration) => addToast({ type: 'warning', title, message, duration }),
    info: (title, message, duration) => addToast({ type: 'info', title, message, duration }),
  }, [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>

      {/* Keyframe animation for progress bar */}
      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
