import React, { useMemo } from 'react';
import { Truck, CheckCircle, Clock } from 'lucide-react';

/**
 * Bản đồ ánh xạ trạng thái GHN sang nhãn tiếng Việt & cấu hình giao diện
 */
const STATUS_CONFIG = {
  ready_to_pick: {
    label: 'Chờ lấy hàng',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    nodeClass: 'bg-amber-500 text-white ring-amber-100',
    iconType: 'clock'
  },
  picking: {
    label: 'Đang lấy hàng',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    nodeClass: 'bg-blue-600 text-white ring-blue-100',
    iconType: 'truck'
  },
  picked: {
    label: 'Đã lấy hàng',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    nodeClass: 'bg-indigo-600 text-white ring-indigo-100',
    iconType: 'truck'
  },
  delivering: {
    label: 'Đang giao hàng',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    nodeClass: 'bg-orange-500 text-white ring-orange-100',
    iconType: 'truck'
  },
  delivered: {
    label: 'Giao hàng thành công',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    nodeClass: 'bg-emerald-600 text-white ring-emerald-100',
    iconType: 'check'
  },
  return: {
    label: 'Hoàn trả hàng',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    nodeClass: 'bg-rose-500 text-white ring-rose-100',
    iconType: 'clock'
  },
  returned: {
    label: 'Đã hoàn hàng',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    nodeClass: 'bg-rose-600 text-white ring-rose-100',
    iconType: 'clock'
  },
  lost: {
    label: 'Thất lạc kiện hàng',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    nodeClass: 'bg-red-600 text-white ring-red-100',
    iconType: 'clock'
  }
};

/**
 * Chọn Icon từ lucide-react theo trạng thái GHN
 */
const renderStatusIcon = (status) => {
  const key = String(status || '').toLowerCase();
  const config = STATUS_CONFIG[key];

  if (key === 'delivered' || config?.iconType === 'check') {
    return <CheckCircle className="w-4 h-4" />;
  }
  if (['picking', 'picked', 'delivering', 'transporting', 'sorting'].includes(key) || config?.iconType === 'truck') {
    return <Truck className="w-4 h-4" />;
  }
  return <Clock className="w-4 h-4" />;
};

/**
 * Shared Component: OrderTrackingTimeline
 * Hiển thị lịch sử hành trình đơn hàng GHN theo trục thời gian dọc (Vertical Timeline).
 * Hỗ trợ truyền trực tiếp prop `trackingLogs` hoặc truyền object `order`.
 */
const OrderTrackingTimeline = ({ order, trackingLogs: propLogs, shippingStatus: propStatus }) => {
  const rawLogs = propLogs || order?.trackingLogs || [];
  const currentShippingStatus = propStatus || order?.shippingStatus || '';

  // Sắp xếp các mốc thời gian theo thứ tự thời gian (Chronological order: Cũ -> Mới)
  const sortedLogs = useMemo(() => {
    if (!Array.isArray(rawLogs)) return [];
    return [...rawLogs].sort((a, b) => {
      const timeA = a?.updated_at ? new Date(a.updated_at).getTime() : 0;
      const timeB = b?.updated_at ? new Date(b.updated_at).getTime() : 0;
      if (isNaN(timeA) || isNaN(timeB) || timeA === timeB) return 0;
      return timeA - timeB;
    });
  }, [rawLogs]);

  const formatDateTime = (dateVal) => {
    if (!dateVal) return 'Vừa cập nhật';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (sortedLogs.length === 0) {
    return (
      <div
        data-testid="empty-tracking-timeline"
        className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center"
      >
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
          <Clock className="w-5 h-5" />
        </div>
        <p className="text-sm font-bold text-slate-700">Chưa có lịch sử hành trình vận đơn</p>
        <p className="text-xs text-slate-400 mt-1">
          Thông tin trạng thái từ Giao Hàng Nhanh (GHN) sẽ được cập nhật tự động tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </span>
          <div>
            <h5 className="text-sm font-extrabold text-slate-800 m-0">
              Hành trình vận đơn GHN
            </h5>
            <p className="text-[11px] text-slate-400 m-0">
              Cập nhật thời gian thực qua GHN Webhook
            </p>
          </div>
        </div>

        {currentShippingStatus && (
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              STATUS_CONFIG[String(currentShippingStatus).toLowerCase()]?.badgeClass ||
              'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {STATUS_CONFIG[String(currentShippingStatus).toLowerCase()]?.label || currentShippingStatus}
          </span>
        )}
      </div>

      {/* Vertical Timeline */}
      <div className="relative pl-3" role="list" aria-label="Lịch sử vận chuyển">
        {sortedLogs.map((log, index) => {
          const statusKey = String(log.status || '').toLowerCase();
          const config = STATUS_CONFIG[statusKey] || {
            label: log.status,
            badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
            nodeClass: 'bg-slate-500 text-white ring-slate-100'
          };
          const isLast = index === sortedLogs.length - 1;

          return (
            <div
              key={log._id || `${log.status}-${index}`}
              role="listitem"
              data-testid="tracking-log-item"
              className={`relative flex items-start gap-4 ${isLast ? 'pb-1' : 'pb-6'}`}
            >
              {/* Đường kẻ dọc nối các mốc timeline */}
              {!isLast && (
                <div
                  className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200"
                  aria-hidden="true"
                />
              )}

              {/* Icon Node */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-4 transition-transform ${
                  isLast ? config.nodeClass : 'bg-slate-100 text-slate-500 ring-white border border-slate-200'
                }`}
              >
                {renderStatusIcon(log.status)}
              </div>

              {/* Nội dung trạng thái */}
              <div className="flex-1 min-w-0 bg-slate-50/80 hover:bg-slate-50 border border-slate-100 rounded-xl p-3.5 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      data-testid="tracking-status-code"
                      className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${config.badgeClass}`}
                    >
                      {log.status}
                    </span>
                    {config.label && config.label !== log.status && (
                      <span className="text-xs font-bold text-slate-700">
                        {config.label}
                      </span>
                    )}
                  </div>

                  <time
                    data-testid="tracking-updated-at"
                    className="text-[11px] font-medium text-slate-400 font-mono"
                  >
                    {formatDateTime(log.updated_at)}
                  </time>
                </div>

                {log.description && (
                  <p
                    data-testid="tracking-description"
                    className="text-xs text-slate-600 m-0 mt-1 leading-relaxed"
                  >
                    {log.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTrackingTimeline;

