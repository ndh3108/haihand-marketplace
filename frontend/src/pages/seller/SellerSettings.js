import React, { useState, useEffect } from 'react';
import axiosClient, { persistUser } from '../../api/axiosClient';
import { useToast } from '../../components/Toast';

const SellerSettings = () => {
    const toast = useToast();
    const [shop, setShop] = useState({
        shopName: '',
        phone: '',
        address: '',
        taxCode: '',
        description: '',
        avatar: '',
        banner: ''
    });

    // Structured Pickup Address for GHN / Carrier Shipping
    const [pickupAddress, setPickupAddress] = useState({
        fullName: '',
        phone: '',
        provinceId: '',
        provinceName: '',
        districtId: '',
        districtName: '',
        wardCode: '',
        wardName: '',
        street: ''
    });

    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);

    const [avatarFile, setAvatarFile] = useState(null);
    const [bannerFile, setBannerFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    const [bannerPreview, setBannerPreview] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

    // 1. Fetch Provinces Master Data
    useEffect(() => {
        axiosClient
            .get('/api/shipping/provinces')
            .then((res) => {
                if (Array.isArray(res.data)) setProvinces(res.data);
            })
            .catch((err) => console.warn('Lỗi tải tỉnh thành:', err));
    }, []);

    // 2. Fetch Shop Info
    useEffect(() => {
        const fetchShop = async () => {
            try {
                const { data } = await axiosClient.get('/api/seller/shop');
                const info = data.shopInfo || {};
                const u = data.user || {};

                setShop({
                    shopName: info.shopName || u.name || '',
                    phone: info.phone || u.phone || '',
                    address: info.address || u.address || '',
                    taxCode: info.taxCode || '',
                    description: info.description || '',
                    avatar: info.avatar || u.avatar || '',
                    banner: info.banner || ''
                });

                const pa = info.pickupAddress || {};
                setPickupAddress({
                    fullName: pa.fullName || info.shopName || u.name || '',
                    phone: pa.phone || info.phone || u.phone || '',
                    provinceId: pa.provinceId || '',
                    provinceName: pa.provinceName || '',
                    districtId: pa.districtId || '',
                    districtName: pa.districtName || '',
                    wardCode: pa.wardCode || '',
                    wardName: pa.wardName || '',
                    street: pa.street || info.address || ''
                });

                // Pre-populate districts and wards if already saved
                if (pa.provinceId) {
                    axiosClient
                        .get(`/api/shipping/districts?provinceId=${pa.provinceId}`)
                        .then((res) => {
                            if (Array.isArray(res.data)) setDistricts(res.data);
                        })
                        .catch(() => {});
                }
                if (pa.districtId) {
                    axiosClient
                        .get(`/api/shipping/wards?districtId=${pa.districtId}`)
                        .then((res) => {
                            if (Array.isArray(res.data)) setWards(res.data);
                        })
                        .catch(() => {});
                }
            } catch (error) {
                console.error('Lỗi tải thông tin Shop', error);
                toast.error('Lỗi tải thông tin Shop');
            } finally {
                setLoading(false);
            }
        };

        fetchShop();
    }, [toast]);

    const handleProvinceChange = async (e) => {
        const provId = e.target.value;
        const provObj = provinces.find((p) => String(p.ProvinceID) === String(provId));
        setPickupAddress((prev) => ({
            ...prev,
            provinceId: provId,
            provinceName: provObj ? provObj.ProvinceName : '',
            districtId: '',
            districtName: '',
            wardCode: '',
            wardName: ''
        }));
        setDistricts([]);
        setWards([]);

        if (provId) {
            try {
                const res = await axiosClient.get(`/api/shipping/districts?provinceId=${provId}`);
                if (Array.isArray(res.data)) setDistricts(res.data);
            } catch (err) {
                console.warn('Lỗi tải quận huyện:', err);
            }
        }
    };

    const handleDistrictChange = async (e) => {
        const distId = e.target.value;
        const distObj = districts.find((d) => String(d.DistrictID) === String(distId));
        setPickupAddress((prev) => ({
            ...prev,
            districtId: distId,
            districtName: distObj ? distObj.DistrictName : '',
            wardCode: '',
            wardName: ''
        }));
        setWards([]);

        if (distId) {
            try {
                const res = await axiosClient.get(`/api/shipping/wards?districtId=${distId}`);
                if (Array.isArray(res.data)) setWards(res.data);
            } catch (err) {
                console.warn('Lỗi tải phường xã:', err);
            }
        }
    };

    const handleWardChange = (e) => {
        const wCode = e.target.value;
        const wObj = wards.find((w) => String(w.WardCode) === String(wCode));
        setPickupAddress((prev) => ({
            ...prev,
            wardCode: wCode,
            wardName: wObj ? wObj.WardName : ''
        }));
    };

    const handleAvatarSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleBannerSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setBannerFile(file);
            setBannerPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('shopName', shop.shopName);
            formData.append('phone', shop.phone);

            // Compute composite address string
            let formattedAddress = shop.address;
            if (pickupAddress.provinceName && pickupAddress.districtName && pickupAddress.wardName && pickupAddress.street) {
                formattedAddress = `${pickupAddress.street}, ${pickupAddress.wardName}, ${pickupAddress.districtName}, ${pickupAddress.provinceName}`;
            }
            formData.append('address', formattedAddress);
            formData.append('taxCode', shop.taxCode);
            formData.append('description', shop.description);

            // Append structured pickup address object
            const structuredPickup = {
                fullName: shop.shopName || pickupAddress.fullName,
                phone: shop.phone || pickupAddress.phone,
                provinceId: Number(pickupAddress.provinceId) || undefined,
                provinceName: pickupAddress.provinceName,
                districtId: Number(pickupAddress.districtId) || undefined,
                districtName: pickupAddress.districtName,
                wardCode: String(pickupAddress.wardCode || ''),
                wardName: pickupAddress.wardName,
                street: pickupAddress.street
            };
            formData.append('pickupAddress', JSON.stringify(structuredPickup));

            if (avatarFile) formData.append('avatar', avatarFile);
            if (bannerFile) formData.append('banner', bannerFile);

            const { data } = await axiosClient.put('/api/seller/shop', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data.user) {
                persistUser(data.user);
            }

            toast.success(data.message || 'Đã lưu thông tin gian hàng thành công!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi cập nhật gian hàng!');
        } finally {
            setSaving(false);
        }
    };

    const getImageUrl = (img) => {
        if (!img) return '';
        if (img.startsWith('http')) return img;
        return `${API_URL}/${img.replace(/\\/g, '/')}`;
    };

    if (loading) {
        return (
            <div className="py-24 text-center">
                <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm font-bold text-slate-500">Đang tải hồ sơ Shop...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-16">
            <div>
                <h1 className="text-2xl font-black text-slate-800">Hồ sơ & Thiết lập Gian hàng B2C</h1>
                <p className="text-sm text-slate-500 mt-1">Tùy biến hình ảnh thương hiệu, địa chỉ kho lấy hàng và thông tin liên lạc của Shop</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Banner & Avatar section */}
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                    {/* Banner */}
                    <div className="relative h-44 sm:h-56 bg-gradient-to-r from-orange-400 to-amber-500">
                        {(bannerPreview || shop.banner) && (
                            <img
                                src={bannerPreview || getImageUrl(shop.banner)}
                                alt="Shop Banner"
                                className="w-full h-full object-cover"
                            />
                        )}
                        <label className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-2">
                            <i className="fas fa-camera"></i> Đổi ảnh bìa
                            <input type="file" accept="image/*" onChange={handleBannerSelect} className="hidden" />
                        </label>
                    </div>

                    {/* Avatar */}
                    <div className="p-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
                        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-white shrink-0 group">
                                <img
                                    src={avatarPreview || getImageUrl(shop.avatar) || "https://ui-avatars.com/api/?name=" + encodeURIComponent(shop.shopName || "S") + "&background=EA580C&color=fff"}
                                    alt="Shop Avatar"
                                    className="w-full h-full object-cover"
                                />
                                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-bold">
                                    <i className="fas fa-pen mr-1"></i> Đổi logo
                                    <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                                </label>
                            </div>
                            <div className="sm:mb-2">
                                <h3 className="text-xl font-black text-slate-800">{shop.shopName || "Tên Shop của bạn"}</h3>
                                <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 justify-center sm:justify-start mt-0.5">
                                    <i className="fas fa-badge-check"></i> Gian hàng B2C chính thức
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shop Information Fields */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <i className="fas fa-store text-orange-500"></i>
                        Thông tin kinh doanh
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tên gian hàng (Shop Name) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={shop.shopName}
                                onChange={(e) => setShop({ ...shop, shopName: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-semibold"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Hotline CSKH / Số điện thoại Shop <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={shop.phone}
                                onChange={(e) => setShop({ ...shop, phone: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Mã số thuế doanh nghiệp / Hộ kinh doanh
                            </label>
                            <input
                                type="text"
                                placeholder="VD: 0314892182"
                                value={shop.taxCode}
                                onChange={(e) => setShop({ ...shop, taxCode: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Giới thiệu về gian hàng
                        </label>
                        <textarea
                            rows="3"
                            placeholder="Mô tả các mặt hàng chuyên doanh, cam kết chất lượng, chính sách hậu mãi..."
                            value={shop.description}
                            onChange={(e) => setShop({ ...shop, description: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-medium"
                        ></textarea>
                    </div>
                </div>

                {/* Structured Pickup Address Section */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                            <i className="fas fa-truck-loading text-orange-500"></i>
                            Địa chỉ kho lấy hàng & Đổi trả (Chuẩn Đơn vị vận chuyển)
                        </h3>
                        <span className="text-xs bg-orange-100 text-orange-800 font-bold px-2.5 py-1 rounded-full">
                            Tự động tính phí ship
                        </span>
                    </div>

                    <p className="text-xs text-slate-500">
                        Hệ thống đối soát hãng vận chuyển (GHN / HaiHand Express) sẽ sử dụng tọa độ kho này để tự động tính phí vận chuyển và điều phối shipper tới lấy kiện hàng khi bạn bấm "Chuẩn bị hàng".
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tỉnh / Thành phố <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={pickupAddress.provinceId}
                                onChange={handleProvinceChange}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-orange-500"
                            >
                                <option value="">-- Chọn Tỉnh / Thành phố --</option>
                                {provinces.map((p) => (
                                    <option key={p.ProvinceID} value={p.ProvinceID}>
                                        {p.ProvinceName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Quận / Huyện <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                disabled={!pickupAddress.provinceId}
                                value={pickupAddress.districtId}
                                onChange={handleDistrictChange}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-orange-500 disabled:opacity-50"
                            >
                                <option value="">-- Chọn Quận / Huyện --</option>
                                {districts.map((d) => (
                                    <option key={d.DistrictID} value={d.DistrictID}>
                                        {d.DistrictName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Phường / Xã <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                disabled={!pickupAddress.districtId}
                                value={pickupAddress.wardCode}
                                onChange={handleWardChange}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-orange-500 disabled:opacity-50"
                            >
                                <option value="">-- Chọn Phường / Xã --</option>
                                {wards.map((w) => (
                                    <option key={w.WardCode} value={w.WardCode}>
                                        {w.WardName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Số nhà, tên đường, tòa nhà <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="VD: 456 Lê Lợi, Phường Bến Thành"
                            value={pickupAddress.street}
                            onChange={(e) => setPickupAddress({ ...pickupAddress, street: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-md shadow-orange-500/25 transition-all hover:scale-102 disabled:opacity-50"
                    >
                        {saving ? (
                            <span className="inline-flex items-center gap-2">
                                <i className="fas fa-spinner fa-spin"></i> Đang lưu...
                            </span>
                        ) : 'Lưu thông tin Shop'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SellerSettings;
