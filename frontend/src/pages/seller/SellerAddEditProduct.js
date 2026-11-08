import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../components/Toast';

const CATEGORIES = [
    'Đồ điện tử & Công nghệ',
    'Thời trang & Phụ kiện',
    'Đồ gia dụng & Đời sống',
    'Mẹ & Bé',
    'Sách & Văn phòng phẩm',
    'Thể thao & Dã ngoại',
    'Làm đẹp & Sức khỏe',
    'Xe cộ & Phụ tùng',
    'Khác'
];

const CONDITIONS = [
    'Mới 100% (Nguyên hộp)',
    'Như mới 99%',
    'Đã qua sử dụng (Tốt)',
    'Đã qua sử dụng (Khá)'
];

const SellerAddEditProduct = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);
    const toast = useToast();

    const [form, setForm] = useState({
        name: '',
        sku: '',
        category: CATEGORIES[0],
        price: '',
        originalPrice: '',
        stockQuantity: '10',
        condition: CONDITIONS[0],
        location: '',
        description: '',
        status: 'active'
    });

    const [variants, setVariants] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

    useEffect(() => {
        if (!isEditMode) return;

        const fetchProduct = async () => {
            try {
                const { data } = await axiosClient.get(`/api/posts/${id}`);
                setForm({
                    name: data.name || data.title || '',
                    sku: data.sku || '',
                    category: data.category || CATEGORIES[0],
                    price: data.price != null ? String(data.price) : '',
                    originalPrice: data.originalPrice != null ? String(data.originalPrice) : '',
                    stockQuantity: String(data.stockQuantity != null ? data.stockQuantity : (data.quantity || 0)),
                    condition: data.condition || data.details?.condition || CONDITIONS[0],
                    location: data.location || '',
                    description: data.description || '',
                    status: data.status || 'active'
                });
                setExistingImages(Array.isArray(data.images) ? data.images : (data.image ? [data.image] : []));
                setVariants(Array.isArray(data.variants) ? data.variants : []);
            } catch (error) {
                console.error("Lỗi tải chi tiết sản phẩm:", error);
                toast.error('Không tìm thấy sản phẩm hoặc bạn không có quyền sửa.');
                navigate('/seller-channel/products');
            } finally {
                setInitialLoading(false);
            }
        };

        fetchProduct();
    }, [id, isEditMode, navigate, toast]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + selectedFiles.length + existingImages.length > 8) {
            toast.warning('Tối đa 8 ảnh', 'Bạn chỉ có thể tải lên tối đa 8 hình ảnh cho sản phẩm.');
            return;
        }

        setSelectedFiles((prev) => [...prev, ...files]);
        const newPreviews = files.map((f) => URL.createObjectURL(f));
        setPreviewUrls((prev) => [...prev, ...newPreviews]);
    };

    const removeNewFile = (idx) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
        setPreviewUrls((prev) => prev.filter((_, i) => i !== idx));
    };

    const removeExistingImage = (img) => {
        setExistingImages((prev) => prev.filter((i) => i !== img));
    };

    // Variant Helpers
    const addVariant = () => {
        setVariants([...variants, { name: '', price: form.price || 0, stock: 1, sku: '' }]);
    };

    const updateVariant = (idx, key, val) => {
        const next = [...variants];
        next[idx][key] = val;
        setVariants(next);
    };

    const removeVariant = (idx) => {
        setVariants(variants.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.warning('Vui lòng nhập tên sản phẩm.');
        if (!form.price || Number(form.price) <= 0) return toast.warning('Vui lòng nhập giá bán hợp lệ.');
        if (Number(form.stockQuantity) < 0) return toast.warning('Số lượng tồn kho không được âm.');
        if (selectedFiles.length === 0 && existingImages.length === 0) {
            return toast.warning('Vui lòng tải lên ít nhất 1 ảnh sản phẩm.');
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', form.name.trim());
            formData.append('title', form.name.trim());
            formData.append('sku', form.sku.trim());
            formData.append('category', form.category);
            formData.append('price', Number(form.price));
            formData.append('originalPrice', Number(form.originalPrice) || 0);
            formData.append('stockQuantity', Number(form.stockQuantity));
            formData.append('quantity', Number(form.stockQuantity));
            formData.append('condition', form.condition);
            formData.append('location', form.location);
            formData.append('description', form.description);
            formData.append('status', form.status);
            formData.append('variants', JSON.stringify(variants));

            selectedFiles.forEach((file) => {
                formData.append('images', file);
            });

            if (isEditMode) {
                await axiosClient.put(`/api/seller/products/${id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Đã cập nhật thông tin sản phẩm thành công!');
            } else {
                await axiosClient.post('/api/seller/products', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Đã đăng sản phẩm mới lên sàn B2C!');
            }

            navigate('/seller-channel/products');
        } catch (error) {
            console.error('Lỗi lưu sản phẩm:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu sản phẩm.');
        } finally {
            setLoading(false);
        }
    };

    const getImageUrl = (img) => {
        if (!img) return '';
        if (img.startsWith('http')) return img;
        return `${API_URL}/${img.replace(/\\/g, '/')}`;
    };

    if (initialLoading) {
        return (
            <div className="py-24 text-center">
                <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm font-bold text-slate-500">Đang tải dữ liệu sản phẩm...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-16">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        to="/seller-channel/products"
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 inline-flex items-center gap-1.5 mb-1"
                    >
                        <i className="fas fa-arrow-left"></i> Quay lại danh sách sản phẩm
                    </Link>
                    <h1 className="text-2xl font-black text-slate-800">
                        {isEditMode ? 'Chỉnh sửa sản phẩm B2C' : 'Đăng sản phẩm B2C mới'}
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Basic Info */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <i className="fas fa-info-circle text-orange-500"></i>
                        Thông tin cơ bản
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tên sản phẩm <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="VD: Laptop Dell XPS 13 9310 Core i7 16GB RAM 512GB SSD..."
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-semibold"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Danh mục ngành hàng <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-medium"
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Mã SKU Shop
                                </label>
                                <input
                                    type="text"
                                    placeholder="VD: LAPTOP-XPS-01"
                                    value={form.sku}
                                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-mono uppercase"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Price & Inventory */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <i className="fas fa-tag text-orange-500"></i>
                        Giá bán & Tồn kho
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Giá bán B2C (VNĐ) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                required
                                min="1000"
                                step="1000"
                                placeholder="VD: 550000"
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-bold text-slate-800"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Giá niêm yết cũ (nếu có)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="1000"
                                placeholder="VD: 750000"
                                value={form.originalPrice}
                                onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-medium text-slate-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Số lượng tồn kho <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                required
                                min="0"
                                placeholder="VD: 50"
                                value={form.stockQuantity}
                                onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-bold text-slate-800"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Tình trạng sản phẩm</label>
                            <select
                                value={form.condition}
                                onChange={(e) => setForm({ ...form, condition: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-medium"
                            >
                                {CONDITIONS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Kho xuất hàng / Địa chỉ</label>
                            <input
                                type="text"
                                placeholder="VD: Kho Tân Bình, TP.HCM"
                                value={form.location}
                                onChange={(e) => setForm({ ...form, location: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Product Variants */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                                <i className="fas fa-layer-group text-orange-500"></i>
                                Phân loại hàng / Biến thể (Tùy chọn)
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">Tạo các biến thể màu sắc, size, dung lượng</p>
                        </div>
                        <button
                            type="button"
                            onClick={addVariant}
                            className="px-3.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl text-xs font-bold transition-colors"
                        >
                            + Thêm phân loại
                        </button>
                    </div>

                    {variants.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">Sản phẩm này không có biến thể phân loại.</p>
                    ) : (
                        <div className="space-y-3">
                            {variants.map((v, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
                                    <div className="flex-1 min-w-[140px]">
                                        <input
                                            type="text"
                                            placeholder="Tên biến thể (VD: Màu Đen - Size L)"
                                            value={v.name}
                                            onChange={(e) => updateVariant(idx, 'name', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                                        />
                                    </div>
                                    <div className="w-28">
                                        <input
                                            type="number"
                                            placeholder="Giá"
                                            value={v.price}
                                            onChange={(e) => updateVariant(idx, 'price', Number(e.target.value))}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                        />
                                    </div>
                                    <div className="w-20">
                                        <input
                                            type="number"
                                            placeholder="Kho"
                                            value={v.stock}
                                            onChange={(e) => updateVariant(idx, 'stock', Number(e.target.value))}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeVariant(idx)}
                                        className="text-slate-400 hover:text-red-500 p-2"
                                    >
                                        <i className="fas fa-trash-alt text-xs"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 4. Images Upload */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <i className="fas fa-images text-orange-500"></i>
                        Hình ảnh sản phẩm (Tối đa 8 ảnh) <span className="text-red-500">*</span>
                    </h3>

                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Existing Images */}
                        {existingImages.map((img, idx) => (
                            <div key={'exist-' + idx} className="relative w-24 h-24 rounded-2xl border-2 border-slate-200 overflow-hidden group">
                                <img src={getImageUrl(img)} alt="Exist" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeExistingImage(img)}
                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <i className="fas fa-times text-xs"></i>
                                </button>
                            </div>
                        ))}

                        {/* New Preview Images */}
                        {previewUrls.map((url, idx) => (
                            <div key={'new-' + idx} className="relative w-24 h-24 rounded-2xl border-2 border-orange-300 overflow-hidden group">
                                <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeNewFile(idx)}
                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <i className="fas fa-times text-xs"></i>
                                </button>
                            </div>
                        ))}

                        {/* Upload Button */}
                        {existingImages.length + previewUrls.length < 8 && (
                            <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50/50 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-orange-600">
                                <i className="fas fa-camera text-xl mb-1"></i>
                                <span className="text-[10px] font-bold">Thêm ảnh</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>
                </div>

                {/* 5. Description */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <i className="fas fa-align-left text-orange-500"></i>
                        Mô tả chi tiết sản phẩm
                    </h3>

                    <div>
                        <textarea
                            rows="6"
                            placeholder="Mô tả công năng, thông số kỹ thuật, chế độ bảo hành và nguồn gốc sản phẩm..."
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-medium"
                        ></textarea>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-bold text-slate-700">Trạng thái mở bán:</span>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name="status"
                                    value="active"
                                    checked={form.status === 'active'}
                                    onChange={() => setForm({ ...form, status: 'active' })}
                                    className="text-orange-500 focus:ring-orange-500"
                                />
                                Đang bán
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name="status"
                                    value="inactive"
                                    checked={form.status === 'inactive'}
                                    onChange={() => setForm({ ...form, status: 'inactive' })}
                                    className="text-orange-500 focus:ring-orange-500"
                                />
                                Tạm ẩn
                            </label>
                        </div>
                    </div>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-4 pt-4">
                    <Link
                        to="/seller-channel/products"
                        className="px-6 py-3 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        Hủy bỏ
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/25 transition-all hover:scale-102 disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="inline-flex items-center gap-2">
                                <i className="fas fa-spinner fa-spin"></i> Đang lưu...
                            </span>
                        ) : isEditMode ? 'Lưu thay đổi' : 'Đăng bán sản phẩm'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SellerAddEditProduct;
