import React from 'react';
import OrderTrackingTimeline from './OrderTrackingTimeline';

/**
 * Shared OrderDetailModal cho cả Buyer và Seller
 * Nhúng trực tiếp OrderTrackingTimeline để hiển thị tiến trình giao vận GHN thời gian thực
 */
const OrderDetailModal = ({ order, onClose }) => {
    if (!order) return null;

    const items =
        order.orderItems && order.orderItems.length > 0
            ? order.orderItems
            : order.items || [];

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Modal Header */}
                <div className="bg-slate-50 p-6 border-b flex justify-between items-center">
                    <div>
                        <h4 className="font-black text-slate-800 mb-0">Chi tiết đơn hàng</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-slate-500 mb-0 font-mono">
                                Mã ĐH: #{order._id?.toString().slice(-6).toUpperCase()}
                            </p>
                            {(order.trackingCode || order.shippingCode) && (
                                <span className="text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    GHN: {order.trackingCode || order.shippingCode}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-2xl text-slate-400 hover:text-slate-600 transition"
                        aria-label="Đóng"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                    {/* Danh sách sản phẩm */}
                    <div className="space-y-4">
                        <p className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-2">
                            Sản phẩm
                        </p>
                        {items.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100"
                            >
                                <div className="w-20 h-20 rounded-xl overflow-hidden bg-white shadow-sm flex-shrink-0">
                                    <img
                                        src={
                                            item.image ||
                                            (item.images && item.images[0]) ||
                                            'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
                                        }
                                        alt={item.title || item.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1">
                                    <h6 className="font-bold text-slate-800 mb-1 leading-snug">
                                        {item.title || item.name || 'Sản phẩm HaiHand'}
                                    </h6>
                                    <p className="text-xs text-slate-400 mb-1">
                                        Số lượng: x{item.quantity || 1}
                                    </p>
                                    <p className="text-orange-600 font-black mb-0">
                                        {(item.price || 0).toLocaleString('vi-VN')} đ
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Timeline Theo dõi vận đơn GHN Thời gian thực (Buyer & Seller) */}
                    <div>
                        <p className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-3">
                            Trạng thái vận chuyển (GHN)
                        </p>
                        <OrderTrackingTimeline
                            order={order}
                            trackingLogs={order.trackingLogs}
                            shippingStatus={order.shippingStatus}
                        />
                    </div>

                    {/* Thông tin Người nhận & Địa chỉ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                        <div>
                            <p className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-3">
                                Người nhận
                            </p>
                            <p className="font-bold text-slate-800 mb-1">
                                {order.shippingAddress?.fullName || order.buyer?.name || 'Người dùng HaiHand'}
                            </p>
                            <p className="text-sm text-slate-500">
                                📞 {order.shippingAddress?.phone || order.phone}
                            </p>
                        </div>
                        <div>
                            <p className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-3">
                                Địa chỉ nhận hàng
                            </p>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {order.shippingAddress?.address || order.address}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 p-6 border-t flex justify-between items-center">
                    <span className="font-bold text-slate-500 uppercase text-xs">Tổng thanh toán</span>
                    <span className="text-2xl font-black text-red-500">
                        {(order.totalPrice || 0).toLocaleString('vi-VN')} đ
                    </span>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailModal;

