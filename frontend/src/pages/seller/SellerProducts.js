import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

const SellerProducts = () => {
    const toast = useToast();
    const confirm = useConfirm();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axiosClient.get('/api/seller/products');
            setProducts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Lỗi tải sản phẩm Shop', error);
            toast.error('Lỗi khi tải danh sách sản phẩm Shop!');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleDeleteProduct = async (product) => {
        const isConfirmed = await confirm({
            title: 'Ẩn sản phẩm',
            message: `Bạn có chắc muốn ẩn sản phẩm "${product.name || product.title}" khỏi gian hàng?`,
            confirmText: 'Ẩn sản phẩm',
            cancelText: 'Hủy'
        });

        if (isConfirmed) {
            try {
                await axiosClient.delete(`/api/seller/products/${product._id}`);
                toast.success('Đã ẩn sản phẩm thành công!');
                fetchProducts();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Lỗi khi thao tác sản phẩm');
            }
        }
    };

    const getImageUrl = (img) => {
        if (!img) return 'https://via.placeholder.com/150';
        if (img.startsWith('http')) return img;
        return `${API_URL}/${img.replace(/\\/g, '/')}`;
    };

    const filteredProducts = products.filter((p) => {
        const title = (p.name || p.title || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const matchesSearch = title.includes(search.toLowerCase()) || sku.includes(search.toLowerCase());

        if (filterStatus === 'all') return matchesSearch;
        if (filterStatus === 'active') return matchesSearch && (p.status === 'active' || p.status === 'APPROVED');
        if (filterStatus === 'inactive') return matchesSearch && p.status === 'inactive';
        if (filterStatus === 'out_of_stock') return matchesSearch && (p.status === 'out_of_stock' || (p.stockQuantity || p.quantity || 0) <= 0);
        return matchesSearch;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Quản lý Kho & Sản phẩm B2C</h1>
                    <p className="text-sm text-slate-500 mt-1">Kiểm soát danh mục, tồn kho và trạng thái niêm yết của Shop</p>
                </div>
                <Link
                    to="/seller-channel/products/create"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 transition-all hover:scale-102"
                >
                    <i className="fas fa-plus"></i>
                    Đăng sản phẩm mới
                </Link>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                        type="text"
                        placeholder="Tìm theo tên sản phẩm, mã SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-medium transition-all"
                    />
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {[
                        { id: 'all', label: 'Tất cả' },
                        { id: 'active', label: 'Đang bán' },
                        { id: 'out_of_stock', label: 'Hết hàng' },
                        { id: 'inactive', label: 'Đã ẩn' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                filterStatus === tab.id
                                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-sm font-bold text-slate-400">Đang tải kho sản phẩm...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                            <i className="fas fa-box-open"></i>
                        </div>
                        <h3 className="text-base font-bold text-slate-700">Chưa có sản phẩm phù hợp</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            Hãy thử đổi bộ lọc hoặc bấm "Đăng sản phẩm mới" để bắt đầu mở bán trên sàn.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                <tr>
                                    <th className="py-3.5 px-6">Sản phẩm</th>
                                    <th className="py-3.5 px-6">SKU / Phân loại</th>
                                    <th className="py-3.5 px-6">Giá niêm yết</th>
                                    <th className="py-3.5 px-6">Tồn kho</th>
                                    <th className="py-3.5 px-6">Trạng thái</th>
                                    <th className="py-3.5 px-6 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map((p) => {
                                    const stock = Number(p.stockQuantity != null ? p.stockQuantity : p.quantity) || 0;
                                    const isOut = stock <= 0 || p.status === 'out_of_stock';
                                    const isInactive = p.status === 'inactive';
                                    const firstImg = (p.images && p.images[0]) || p.image;

                                    return (
                                        <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                                            {/* Product Info */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={getImageUrl(firstImg)}
                                                        alt={p.name || p.title}
                                                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                                                    />
                                                    <div className="min-w-0 max-w-xs">
                                                        <p className="font-bold text-slate-800 line-clamp-1">{p.name || p.title}</p>
                                                        <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                                                            {p.category || 'Khác'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* SKU */}
                                            <td className="py-4 px-6 font-mono text-xs text-slate-600">
                                                {p.sku ? (
                                                    <span className="bg-slate-100 px-2 py-1 rounded-md font-bold">{p.sku}</span>
                                                ) : (
                                                    <span className="text-slate-300 italic">Chưa tạo SKU</span>
                                                )}
                                                {p.variants && p.variants.length > 0 && (
                                                    <p className="text-[10px] text-orange-600 font-bold mt-1">
                                                        {p.variants.length} phân loại
                                                    </p>
                                                )}
                                            </td>

                                            {/* Price */}
                                            <td className="py-4 px-6">
                                                <span className="font-extrabold text-slate-900 block">
                                                    {(p.price || 0).toLocaleString('vi-VN')}đ
                                                </span>
                                                {p.originalPrice > p.price && (
                                                    <span className="text-[11px] text-slate-400 line-through">
                                                        {p.originalPrice.toLocaleString('vi-VN')}đ
                                                    </span>
                                                )}
                                            </td>

                                            {/* Stock */}
                                            <td className="py-4 px-6">
                                                {isOut ? (
                                                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                                                        Hết hàng (0)
                                                    </span>
                                                ) : stock <= 5 ? (
                                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                                                        Sắp hết ({stock})
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                                                        Còn {stock} cái
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-4 px-6">
                                                {isInactive ? (
                                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                                        Đã ẩn
                                                    </span>
                                                ) : isOut ? (
                                                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                                                        Hết hàng
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                                        Đang bán
                                                    </span>
                                                )}
                                            </td>

                                            {/* Action Buttons */}
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        to={`/seller-channel/products/edit/${p._id}`}
                                                        className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                        title="Chỉnh sửa sản phẩm"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteProduct(p)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Ẩn sản phẩm"
                                                    >
                                                        <i className="fas fa-eye-slash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SellerProducts;
