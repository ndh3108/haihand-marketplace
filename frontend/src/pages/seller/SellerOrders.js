import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import OrderDetailModal from '../../components/OrderDetailModal';

const ORDER_TABS = [
    { id: 'all', label: 'Tất cả' },
    { id: 'Pending', label: 'Chờ xác nhận' },
    { id: 'Processing', label: 'Đang chuẩn bị' },
    { id: 'Shipped', label: 'Đang giao' },
    { id: 'Delivered', label: 'Đã giao' },
    { id: 'Completed', label: 'Hoàn thành' },
    { id: 'Cancelled', label: 'Đã hủy' }
];

const CARRIERS = [
    'Giao Hàng Tiết Kiệm (GHTK)',
    'Giao Hàng Nhanh (GHN)',
    'Viettel Post',
    'VNPost (Bưu điện)',
    'J&T Express',
    'Hỏa tốc nội thành (Ahamove / Grab)'
];

const SellerOrders = () => {
    const toast = useToast();
    const confirm = useConfirm();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState('');

    // Shipping modal state
    const [shippingModal, setShippingModal] = useState({
        isOpen: false,
        orderId: null,
        shippingCarrier: CARRIERS[0],
        shippingCode: ''
    });

    // Loading state khi gọi API tạo đơn GHN (theo orderId để disable nút tương ứng)
    const [shippingLoadingId, setShippingLoadingId] = useState(null);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axiosClient.get('/api/seller/orders');
            setOrders(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Lỗi tải đơn hàng Shop', error);
            toast.error('Lỗi khi tải danh sách đơn hàng!');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleUpdateStatus = async (orderId, newStatus, extraData = {}) => {
        try {
            const res = await axiosClient.put(`/api/seller/orders/${orderId}/status`, {
                status: newStatus,
                ...extraData
            });
            toast.success(res.data.message || 'Cập nhật trạng thái đơn hàng thành công!');
            fetchOrders();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi cập nhật trạng thái đơn');
        }
    };

    /**
     * Hàm gọi API Tạo đơn giao hàng GHN
     */
    const handleShipGHN = async (orderId) => {
        if (shippingLoadingId) return;
        setShippingLoadingId(orderId);

        try {
            const res = await axiosClient.post(`/api/seller/orders/${orderId}/ship`);
            const { trackingCode, order_code } = res.data || {};
            const code = trackingCode || order_code;

            toast.success(`🎉 Tạo đơn GHN thành công! Mã vận đơn: ${code}`);

            // Cập nhật ngay state danh sách đơn hàng để UI hiển thị mã trackingCode vừa nhận được và ẩn nút "Tạo đơn GHN"
            setOrders((prevOrders) =>
                prevOrders.map((ord) => {
                    if (ord._id === orderId) {
                        return {
                            ...ord,
                            trackingCode: code,
                            shippingCode: code,
                            shippingCarrier: 'Giao Hàng Nhanh (GHN)',
                            status: 'Processing',
                            canonicalStatus: 'Processing',
                            shipment: {
                                ...(ord.shipment || {}),
                                trackingCode: code,
                                provider: 'ghn'
                            }
                        };
                    }
                    return ord;
                })
            );
        } catch (error) {
            console.error('Lỗi khi gọi API tạo đơn GHN:', error);
            // Đảm bảo chỉ truyền chuỗi String nguyên thủy vào toast.error để tránh lỗi "Objects are not valid as a React child"
            const rawErrorMsg =
                error.response?.data?.message ||
                error.response?.data?.error?.message ||
                (typeof error.response?.data?.error === 'string' ? error.response.data.error : null) ||
                error.message ||
                'Lỗi khi tạo đơn giao hàng GHN!';
            const safeErrMsg =
                typeof rawErrorMsg === 'string'
                    ? rawErrorMsg
                    : JSON.stringify(rawErrorMsg);
            toast.error(safeErrMsg);
        } finally {
            setShippingLoadingId(null);
        }
    };

    const handlePrepareOrder = async (order) => {
        // Truyền chuỗi thông báo (hoặc object đã được chuẩn hóa) thay vì render trực tiếp object trong JSX
        const confirmPromptMessage = `Hệ thống sẽ kết nối với ${order.shippingCarrier || 'Đơn vị vận chuyển (GHN)'} để tạo mã vận đơn và gửi yêu cầu lấy hàng. Bạn có chắc chắn muốn chuẩn bị đơn hàng #${order._id.slice(-6).toUpperCase()}?`;
        const isConfirmed = await confirm(confirmPromptMessage);
        if (isConfirmed) {
            try {
                const res = await axiosClient.post(`/api/seller/orders/${order._id}/prepare`);
                const successMsg =
                    typeof res.data?.message === 'string'
                        ? res.data.message
                        : 'Chuẩn bị hàng thành công! Đã cấp mã vận đơn.';
                toast.success(successMsg);
                fetchOrders();
            } catch (error) {
                const rawErr =
                    error.response?.data?.message ||
                    error.message ||
                    'Lỗi khi chuẩn bị hàng hoặc tạo mã vận đơn!';
                toast.error(typeof rawErr === 'string' ? rawErr : JSON.stringify(rawErr));
            }
        }
    };

    const handleOpenShippingModal = (order) => {
        setShippingModal({
            isOpen: true,
            orderId: order._id,
            shippingCarrier: order.shippingCarrier || CARRIERS[0],
            shippingCode: order.shippingCode || ('HH' + Math.floor(10000000 + Math.random() * 90000000))
        });
    };

    const handleConfirmShip = async (e) => {
        e.preventDefault();
        if (!shippingModal.shippingCode.trim()) {
            return toast.warning('Vui lòng nhập mã vận đơn.');
        }

        await handleUpdateStatus(shippingModal.orderId, 'Shipped', {
            shippingCarrier: shippingModal.shippingCarrier,
            shippingCode: shippingModal.shippingCode.trim()
        });

        setShippingModal({ isOpen: false, orderId: null, shippingCarrier: CARRIERS[0], shippingCode: '' });
    };

    const handleCancelOrder = async (order) => {
        const reason = window.prompt('Nhập lý do hủy đơn (ví dụ: Hết hàng, Sai thông tin...):');
        if (reason === null) return;
        if (!reason.trim()) return toast.warning('Vui lòng cung cấp lý do hủy.');

        handleUpdateStatus(order._id, 'Cancelled', { cancelReason: reason.trim() });
    };

    const getImageUrl = (img) => {
        if (!img) return 'https://via.placeholder.com/80';
        if (img.startsWith('http')) return img;
        return `${API_URL}/${img.replace(/\\/g, '/')}`;
    };

    const filteredOrders = orders.filter((o) => {
        const st = o.canonicalStatus || o.status;
        const matchesTab = activeTab === 'all' || st === activeTab;
        const buyerName = (o.buyer?.name || o.shippingAddress?.fullName || '').toLowerCase();
        const orderCode = o._id.toLowerCase();
        const matchesSearch = buyerName.includes(search.toLowerCase()) || orderCode.includes(search.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="space-y-6 animate-fade-in pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Quản lý Đơn hàng B2C</h1>
                    <p className="text-sm text-slate-500 mt-1">Xử lý chu trình fulfillment: Xác nhận → Giao vận → Hoàn tất</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-xs">
                <div className="flex gap-1 overflow-x-auto custom-scrollbar p-1">
                    {ORDER_TABS.map((tab) => {
                        const count = orders.filter((o) => tab.id === 'all' || (o.canonicalStatus || o.status) === tab.id).length;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                    type="text"
                    placeholder="Tìm theo mã đơn hoặc tên người nhận..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-medium shadow-xs"
                />
            </div>

            {/* Orders Feed */}
            {loading ? (
                <div className="py-24 text-center">
                    <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm font-bold text-slate-400">Đang tải danh sách đơn hàng...</p>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-xs">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                        <i className="fas fa-box-open"></i>
                    </div>
                    <h3 className="text-base font-bold text-slate-700">Không có đơn hàng nào</h3>
                    <p className="text-xs text-slate-400 mt-1">Đơn hàng mới thuộc trạng thái này sẽ xuất hiện ở đây.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map((order) => {
                        const st = order.canonicalStatus || order.status;
                        const items = order.orderItems && order.orderItems.length > 0
                            ? order.orderItems
                            : (order.items || []);

                        let statusBadge = { bg: 'bg-slate-100 text-slate-700', label: st };
                        if (st === 'Pending') statusBadge = { bg: 'bg-amber-100 text-amber-800', label: 'Chờ xác nhận' };
                        if (st === 'Processing') statusBadge = { bg: 'bg-blue-100 text-blue-800', label: 'Đang chuẩn bị hàng' };
                        if (st === 'Shipped') statusBadge = { bg: 'bg-indigo-100 text-indigo-800', label: 'Đang giao hàng' };
                        if (st === 'Delivered') statusBadge = { bg: 'bg-teal-100 text-teal-800', label: 'Đã giao hàng' };
                        if (st === 'Completed') statusBadge = { bg: 'bg-emerald-100 text-emerald-800', label: 'Hoàn thành' };
                        if (st === 'Cancelled') statusBadge = { bg: 'bg-rose-100 text-rose-800', label: 'Đã hủy' };

                        return (
                            <div key={order._id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                                {/* Order Head */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm font-black text-slate-800">
                                            #{order._id.slice(-6).toUpperCase()}
                                        </span>
                                        {order.parentOrderId && (
                                            <span className="text-[11px] font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                                                Mã gộp: {order.parentOrderId}
                                            </span>
                                        )}
                                        <span className="text-slate-300">|</span>
                                        <span className="text-xs text-slate-400">
                                            {new Date(order.createdAt).toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge.bg}`}>
                                            {statusBadge.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Order Body */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Items List */}
                                    <div className="lg:col-span-2 space-y-3">
                                        {items.map((item, idx) => {
                                            const title = item.name || item.title || 'Sản phẩm B2C';
                                            const img = item.image || (item.images && item.images[0]);
                                            const qty = item.quantity || 1;
                                            const price = item.price || 0;

                                            return (
                                                <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50/60 rounded-xl">
                                                    <img
                                                        src={getImageUrl(img)}
                                                        alt={title}
                                                        className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 truncate">{title}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">Số lượng: x{qty}</p>
                                                    </div>
                                                    <span className="text-sm font-extrabold text-slate-800">
                                                        {(price * qty).toLocaleString('vi-VN')}đ
                                                    </span>
                                                </div>
                                            );
                                        })}

                                        {/* Shipping Info */}
                                        {(order.trackingCode || order.shippingCode || order.shipment?.trackingCode) && (
                                            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <i className="fas fa-truck text-emerald-600 text-sm"></i>
                                                    <span>
                                                        <strong>{order.shippingCarrier || 'Giao Hàng Nhanh (GHN)'}:</strong>{' '}
                                                        <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">
                                                            {order.trackingCode || order.shippingCode || order.shipment?.trackingCode}
                                                        </span>
                                                    </span>
                                                </span>
                                                <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full uppercase">
                                                    Đã cấp mã GHN
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Buyer & Delivery Info */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-xs space-y-2">
                                        <p className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                                            Người nhận & Địa chỉ giao
                                        </p>
                                        <p className="font-bold text-slate-800 text-sm">
                                            {order.shippingAddress?.fullName || order.buyer?.name || 'Khách hàng'}
                                        </p>
                                        <p className="text-slate-600">
                                            <i className="fas fa-phone mr-1.5 text-slate-400"></i>
                                            {order.shippingAddress?.phone || order.buyer?.phone || 'Chưa có SĐT'}
                                        </p>
                                        <p className="text-slate-600">
                                            <i className="fas fa-map-marker-alt mr-1.5 text-slate-400"></i>
                                            {order.shippingAddress?.address || order.buyer?.address || 'Nhận tại cửa hàng'}
                                        </p>
                                        <div className="pt-2 border-t border-slate-200 mt-2 flex justify-between items-center">
                                            <span className="font-bold text-slate-500">Tổng tiền thu:</span>
                                            <span className="text-base font-black text-orange-600">
                                                {(order.totalPrice || 0).toLocaleString('vi-VN')}đ
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Action Buttons */}
                                <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedOrderDetail(order)}
                                        className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                        <i className="fas fa-route text-orange-500"></i>
                                        Hành trình GHN & Chi tiết
                                    </button>
                                    {st === 'Pending' && (
                                        <>
                                            <button
                                                onClick={() => handleCancelOrder(order)}
                                                className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                            >
                                                Hủy đơn
                                            </button>

                                            {/* Nút Tạo đơn GHN (Tự động ẩn khi đã có mã vận đơn) */}
                                            {!order.trackingCode && !order.shippingCode && !order.shipment?.trackingCode && (
                                                <button
                                                    onClick={() => handleShipGHN(order._id)}
                                                    disabled={shippingLoadingId === order._id}
                                                    className={`px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                                                        shippingLoadingId === order._id ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                                    title="Tạo vận đơn chính thức qua API GHN"
                                                >
                                                    {shippingLoadingId === order._id ? (
                                                        <>
                                                            <i className="fas fa-spinner fa-spin"></i>
                                                            Đang tạo đơn GHN...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fas fa-truck-fast"></i>
                                                            Tạo đơn GHN
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handlePrepareOrder(order)}
                                                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                                            >
                                                <i className="fas fa-box"></i>
                                                Chuẩn bị hàng & Lấy mã vận đơn
                                            </button>
                                        </>
                                    )}

                                    {st === 'Processing' && (
                                        <>
                                            <button
                                                onClick={() => handleCancelOrder(order)}
                                                className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors"
                                            >
                                                Hủy đơn
                                            </button>

                                            {/* Nút Tạo đơn GHN (nếu đơn đang Processing mà chưa có mã GHN) */}
                                            {!order.trackingCode && !order.shippingCode && !order.shipment?.trackingCode && (
                                                <button
                                                    onClick={() => handleShipGHN(order._id)}
                                                    disabled={shippingLoadingId === order._id}
                                                    className={`px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                                                        shippingLoadingId === order._id ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                                    title="Tạo vận đơn chính thức qua API GHN"
                                                >
                                                    {shippingLoadingId === order._id ? (
                                                        <>
                                                            <i className="fas fa-spinner fa-spin"></i>
                                                            Đang tạo đơn GHN...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fas fa-truck-fast"></i>
                                                            Tạo đơn GHN
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleOpenShippingModal(order)}
                                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                                            >
                                                <i className="fas fa-shipping-fast mr-1.5"></i>
                                                Giao cho Đơn vị vận chuyển
                                            </button>
                                        </>
                                    )}

                                    {st === 'Shipped' && (
                                        <button
                                            onClick={() => handleUpdateStatus(order._id, 'Delivered')}
                                            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                                        >
                                            <i className="fas fa-box-check mr-1.5"></i>
                                            Xác nhận Khách đã nhận hàng
                                        </button>
                                    )}

                                    {st === 'Delivered' && (
                                        <button
                                            onClick={() => handleUpdateStatus(order._id, 'Completed')}
                                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                                        >
                                            <i className="fas fa-check-double mr-1.5"></i>
                                            Hoàn tất đơn hàng
                                        </button>
                                    )}

                                    {st === 'Completed' && (
                                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                                            <i className="fas fa-check-circle"></i> Đơn hàng đã hoàn thành & giải ngân
                                        </span>
                                    )}

                                    {st === 'Cancelled' && (
                                        <span className="text-xs font-bold text-rose-500">
                                            Đơn hàng đã hủy {order.cancelReason ? `(${order.cancelReason})` : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Shipping Dispatch Modal */}
            {shippingModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleConfirmShip} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                                <i className="fas fa-truck text-indigo-600"></i>
                                Giao hàng cho Đơn vị vận chuyển
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShippingModal({ isOpen: false, orderId: null, shippingCarrier: CARRIERS[0], shippingCode: '' })}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị vận chuyển</label>
                            <select
                                value={shippingModal.shippingCarrier}
                                onChange={(e) => setShippingModal({ ...shippingModal, shippingCarrier: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                            >
                                {CARRIERS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Mã vận đơn (Tracking Code)</label>
                            <input
                                type="text"
                                required
                                placeholder="VD: GHTK89320141"
                                value={shippingModal.shippingCode}
                                onChange={(e) => setShippingModal({ ...shippingModal, shippingCode: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShippingModal({ isOpen: false, orderId: null, shippingCarrier: CARRIERS[0], shippingCode: '' })}
                                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                            >
                                Xác nhận xuất kho
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Order Detail & Real-time GHN Tracking Modal */}
            {selectedOrderDetail && (
                <OrderDetailModal
                    order={selectedOrderDetail}
                    onClose={() => setSelectedOrderDetail(null)}
                />
            )}
        </div>
    );
};

export default SellerOrders;
