import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Truck, CheckCircle, Clock, RotateCcw, RefreshCw } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import OrderDetailModal from './OrderDetailModal';

/**
 * Admin Dashboard UI: ShippingDashboard.jsx
 * Mô phỏng bảng điều khiển đối soát vận đơn Giao Hàng Nhanh (GHN) dành cho Admin.
 * Tự động tải toàn bộ đơn hàng và thống kê 4 thẻ trạng thái (Stat Cards):
 * - 'picking' (Đang lấy hàng)
 * - 'delivering' (Đang giao hàng)
 * - 'delivered' (Đã giao thành công)
 * - 'returned' (Hoàn hàng / Trả hàng - bao gồm cả 'return' và 'returned')
 */
const ShippingDashboard = ({ initialOrders = null }) => {
  const [orders, setOrders] = useState(Array.isArray(initialOrders) ? initialOrders : []);
  const [loading, setLoading] = useState(!Array.isArray(initialOrders));
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchAllOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosClient.get('/api/admin/orders?limit=1000');
      const data = response?.data;
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.orders)
          ? data.orders
          : [];
      setOrders(list);
    } catch (err) {
      console.error('Lỗi tải dữ liệu vận đơn GHN cho Admin:', err);
      setError(err.response?.data?.message || err.message || 'Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!Array.isArray(initialOrders)) {
      fetchAllOrders();
    }
  }, [initialOrders, fetchAllOrders]);

  // Tính toán tổng số lượng đơn hàng theo 4 trạng thái GHN: picking, delivering, delivered, returned
  const shippingStats = useMemo(() => {
    const counts = {
      picking: 0,
      delivering: 0,
      delivered: 0,
      returned: 0
    };

    orders.forEach((order) => {
      const status = String(order?.shippingStatus || '').toLowerCase().trim();
      if (status === 'picking') {
        counts.picking += 1;
      } else if (status === 'delivering') {
        counts.delivering += 1;
      } else if (status === 'delivered') {
        counts.delivered += 1;
      } else if (status === 'returned' || status === 'return') {
        counts.returned += 1;
      }
    });

    return counts;
  }, [orders]);

  // Cấu hình 4 Stat Cards chuẩn giao diện GHN Express
  const statCards = [
    {
      key: 'picking',
      statusLabel: 'picking',
      title: 'Đang lấy hàng (Picking)',
      count: shippingStats.picking,
      description: 'Bưu tá GHN đang đến lấy hàng tại kho người bán',
      icon: Clock,
      cardBg: 'bg-blue-50/70 border-blue-200',
      iconBg: 'bg-blue-600 text-white',
      textColor: 'text-blue-700',
      badgeBg: 'bg-blue-100 text-blue-800'
    },
    {
      key: 'delivering',
      statusLabel: 'delivering',
      title: 'Đang giao hàng (Delivering)',
      count: shippingStats.delivering,
      description: 'Kiện hàng đang trên tuyến giao tới người mua',
      icon: Truck,
      cardBg: 'bg-orange-50/70 border-orange-200',
      iconBg: 'bg-orange-500 text-white',
      textColor: 'text-orange-700',
      badgeBg: 'bg-orange-100 text-orange-800'
    },
    {
      key: 'delivered',
      statusLabel: 'delivered',
      title: 'Đã giao thành công (Delivered)',
      count: shippingStats.delivered,
      description: 'Người nhận đã ký nhận kiện hàng thành công',
      icon: CheckCircle,
      cardBg: 'bg-emerald-50/70 border-emerald-200',
      iconBg: 'bg-emerald-600 text-white',
      textColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-100 text-emerald-800'
    },
    {
      key: 'returned',
      statusLabel: 'returned',
      title: 'Đơn hoàn trả (Returned)',
      count: shippingStats.returned,
      description: 'Kiện hàng giao thất bại / đang hoàn về người bán',
      icon: RotateCcw,
      cardBg: 'bg-rose-50/70 border-rose-200',
      iconBg: 'bg-rose-600 text-white',
      textColor: 'text-rose-700',
      badgeBg: 'bg-rose-100 text-rose-800'
    }
  ];

  return (
    <div className="space-y-6 p-6 bg-white rounded-3xl border border-slate-200 shadow-xs">
      {/* Header mimicked after GHN Portal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/20">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-800 m-0">
                Trung tâm Điều vận GHN Express
              </h2>
              <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                Real-time Webhook
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Giám sát toàn bộ trạng thái vận đơn trên sàn HaiHand theo thời gian thực
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAllOrders}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới dữ liệu
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
          ⚠️ {error}
        </div>
      )}

      {/* 4 Distinct GHN Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.key}
              data-testid={`ghn-stat-card-${card.key}`}
              className={`rounded-2xl border p-5 transition-all hover:shadow-md ${card.cardBg}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${card.iconBg}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full ${card.badgeBg}`}>
                  {card.statusLabel}
                </span>
              </div>

              <p className="text-xs font-bold text-slate-600 mb-1">{card.title}</p>
              <p
                data-testid={`ghn-stat-count-${card.key}`}
                className={`text-3xl font-black tracking-tight m-0 ${card.textColor}`}
              >
                {loading ? '...' : card.count}
              </p>
              <p className="text-[11px] text-slate-500 mt-2 mb-0 leading-snug">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Bảng danh sách vận đơn gần đây để Admin tra cứu nhanh */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold text-slate-800 m-0">
            Danh sách vận đơn cập nhật gần đây ({orders.length})
          </h3>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                <th className="py-3 px-4 font-bold">Mã đơn (ClientOrderCode)</th>
                <th className="py-3 px-4 font-bold">Mã GHN</th>
                <th className="py-3 px-4 font-bold">Trạng thái GHN</th>
                <th className="py-3 px-4 font-bold">Cập nhật cuối</th>
                <th className="py-3 px-4 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    {loading ? 'Đang tải dữ liệu vận đơn...' : 'Chưa có đơn hàng nào.'}
                  </td>
                </tr>
              ) : (
                orders.slice(0, 10).map((order) => {
                  const logs = Array.isArray(order.trackingLogs) ? order.trackingLogs : [];
                  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;
                  return (
                    <tr key={order._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        #{String(order._id).slice(-8).toUpperCase()}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {order.trackingCode || order.shippingCode || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {order.shippingStatus || 'ready_to_pick'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {latestLog?.description || 'Chưa có log webhook'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold rounded-lg transition-colors"
                        >
                          Xem Timeline
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal chi tiết kèm OrderTrackingTimeline */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

export default ShippingDashboard;

