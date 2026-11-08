import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { useToast } from '../components/Toast';


const categoryDataMap = {
    'Điện tử - Công nghệ': {
        subCategories: ['Điện thoại thông minh', 'Máy tính bảng', 'Laptop', 'Phụ kiện', 'Khác'],
        brands: ['Apple', 'Samsung', 'Xiaomi', 'Sony', 'Asus', 'Dell', 'HP', 'Lenovo', 'Khác']
    },
    'Xe cộ': {
        subCategories: ['Xe máy', 'Ô tô', 'Xe đạp', 'Khác'],
        brands: ['Honda', 'Yamaha', 'Suzuki', 'Toyota', 'VinFast', 'Khác']
    },
    'Thời trang': {
        subCategories: ['Quần áo nam', 'Quần áo nữ', 'Giày dép', 'Phụ kiện', 'Khác'],
        brands: ['Adidas', 'Nike', 'Zara', 'H&M', 'Khác']
    },
    'Nội thất': {
        subCategories: ['Bàn ghế', 'Giường', 'Tủ', 'Khác'],
        brands: ['IKEA', 'Hòa Phát', 'Khác']
    }
};

const getCategoryData = (cat1) => categoryDataMap[cat1] || { subCategories: ['Khác'], brands: ['Khác'] };

export default function EditPostPage() {
  const { id } = useParams();
  const [existingImages, setExistingImages] = useState([]);
  const toast = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category1: '',
    category2: '',
    brand: '',
    condition: '',
    description: '',
    city: '',
    district: '',
    ward: '',
    phone: '',
    tradeDirect: false,
    tradeCod: false,
    tradeHaiPay: false,
    commit: false
  });

  const user = JSON.parse(localStorage.getItem('user'));
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/posts/${id}`);
        const parts = (data.location || '').split(',').map(i => i.trim());
        setFormData({
          title: data.title || '',
          price: data.price || '',
          category1: data.category || 'Thời trang',
          category2: '',
          brand: data.details?.brand || '',
          condition: data.details?.condition || '',
          ward: parts.length > 2 ? parts[0] : '',
          district: parts.length > 1 ? parts[parts.length-2] : '',
          city: parts.length > 0 ? parts[parts.length-1] : '',
          description: data.description || '',
          commit: true
        });
        if (data.images && data.images.length > 0) {
            setExistingImages(data.images);
            setPreviewImages(data.images.map(img => img.startsWith('http') ? img : `${API_URL}/${img.replace(/\\/g, '/')}`));
        } else if (data.image) {
            setExistingImages([data.image]);
            setPreviewImages([data.image.startsWith('http') ? data.image : `${API_URL}/${data.image.replace(/\\/g, '/')}`]);
        }
      } catch (err) {
        toast.error('Lỗi', 'Không tải được thông tin bài đăng');
      }
    };
    fetchPost();
  }, [id, API_URL]);


  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Fetch provinces
    axios.get('https://provinces.open-api.vn/api/?depth=3')
      .then(res => setProvinces(res.data))
      .catch(err => {
          console.warn("Lỗi tải danh sách tỉnh thành", err);
      });

    // Fetch categories
    axios.get(`${API_URL}/api/categories`)
      .then(res => setCategories(res.data))
      .catch(err => setCategories([{ name: 'Điện tử - Công nghệ' }]));
  }, []);

  useEffect(() => {
    if (formData.city && provinces.length > 0) {
      const city = provinces.find(p => p.name === formData.city);
      setDistricts(city ? city.districts : []);
    }
  }, [formData.city, provinces]);

  useEffect(() => {
    if (formData.district && districts.length > 0) {
      const dist = districts.find(d => d.name === formData.district);
      setWards(dist && dist.wards ? dist.wards : []);
    }
  }, [formData.district, districts]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
    const previews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviewImages(prev => [...prev, ...previews]);
  };
  
  const removeImage = (index) => {
      const newFiles = [...files];
      newFiles.splice(index, 1);
      setFiles(newFiles);
      
      const newPreviews = [...previewImages];
      newPreviews.splice(index, 1);
      setPreviewImages(newPreviews);
  };

  const handleSuggestionClick = (text) => {
      setFormData(prev => ({...prev, description: prev.description ? prev.description + '\n- ' + text : '- ' + text}));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.commit) return toast.warning('Chú ý', "Vui lòng xác nhận cam kết!");
    if (isSubmitting) return;

    setIsSubmitting(true);

    const data = new FormData();
    data.append('author', user._id); 
    data.append('title', formData.title); 
    data.append('price', formData.price);
    data.append('category', formData.category1);
    data.append('description', formData.description);
    data.append('quantity', 1);
    data.append('location', `${formData.ward}, ${formData.district}, ${formData.city}`);
    data.append('details', JSON.stringify({ brand: formData.brand, condition: formData.condition }));
    
    files.forEach(file => data.append('images', file));

    try {
        await axios.put(`${API_URL}/api/posts/${id}`, data);
        toast.success('Thành công', "Cập nhật tin thành công và đang chờ duyệt!");
        navigate('/profile');
    } catch (error) { 
        console.error("Lỗi đăng bài:", error);
        toast.error('Lỗi', "Lỗi cập nhật tin!");
        setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FFFBEB] min-h-screen font-sans text-[#1C1917]">
      <AppHeader />
      
      {/* Top Banner Alert */}
      <div className="bg-[#FFF8E7] border-b border-orange-100 py-1.5 px-4 text-center">
          <span className="text-[11px] font-bold text-orange-800 flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#EA580C]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Đăng tin chuẩn C2C an toàn • Tiếp cận hơn 50.000 khách mỗi ngày
          </span>
      </div>

      <main className="max-w-[1200px] mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-stone-500 mb-6">
            <Link to="/" className="hover:text-[#1C1917] flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                Trang chủ
            </Link>
            <span>›</span>
            <span className="text-[#1C1917] font-semibold">Đăng tin bán đồ cũ</span>
        </nav>

        {/* Page Title & Auto-save status */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
                <span className="bg-orange-100 text-[#EA580C] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 inline-block">KÊNH NGƯỜI BÁN C2C • Miễn phí 100%</span>
                <h1 className="text-3xl font-black text-[#1C1917] mb-1">Đăng tin bán đồ cũ</h1>
                <p className="text-stone-500 text-sm">Tiếp cận hơn 50.000 người mua đồ cũ mỗi ngày. Đăng tin hoàn toàn miễn phí và nhanh chóng.</p>
            </div>
            <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-100 shadow-sm shrink-0">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Bản nháp tự lưu lúc vừa xong
            </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* Left Column - Main Form */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
                
                {/* 1. Hình ảnh & Video */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-[#FACC15] flex items-center justify-center font-black text-[#1C1917]">1</div>
                        <div>
                            <h3 className="font-bold text-lg">Hình ảnh & Video sản phẩm</h3>
                            <p className="text-xs text-stone-500">Tối đa 6 ảnh và 1 video ngắn (định dạng JPG, PNG, MP4)</p>
                        </div>
                        <span className="ml-auto bg-stone-100 text-stone-500 text-[10px] font-bold px-2 py-1 rounded">Bắt buộc 1 ảnh bìa</span>
                    </div>

                    <div 
                        className="border-2 border-dashed border-stone-300 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors flex flex-col items-center justify-center py-10 mb-4 cursor-pointer"
                        onClick={() => fileInputRef.current.click()}
                    >
                        <input type="file" hidden multiple accept="image/*" ref={fileInputRef} onChange={handleFileChange} />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-stone-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="font-bold text-stone-700">Kéo thả hình ảnh vào đây hoặc <span className="text-[#EA580C]">Bấm để tải lên</span></p>
                        <p className="text-xs text-stone-500 mt-1">Khuyên dùng tỷ lệ 1:1, ảnh chụp thật rõ nét các góc cạnh</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {previewImages.map((src, i) => (
                            <div key={i} className={`relative rounded-xl overflow-hidden aspect-square border-2 ${i === 0 ? 'border-[#FACC15]' : 'border-stone-200'}`}>
                                <img src={src} className="w-full h-full object-cover" alt={`preview-${i}`} />
                                {i === 0 && <div className="absolute top-0 left-0 bg-[#FACC15] text-[#1C1917] text-[10px] font-bold px-2 py-0.5 rounded-br-lg z-10">Ảnh bìa</div>}
                                {i === 1 && <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 backdrop-blur-sm">Góc trái</div>}
                                {i === 2 && <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 backdrop-blur-sm">Phụ kiện đi kèm</div>}
                                <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors z-10">✕</button>
                            </div>
                        ))}
                        <div onClick={() => fileInputRef.current.click()} className="rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 flex flex-col items-center justify-center aspect-square cursor-pointer hover:bg-stone-100 transition-colors">
                            <span className="text-2xl text-stone-400 font-light">+</span>
                            <span className="text-xs text-stone-500 font-medium">Thêm ảnh</span>
                        </div>
                    </div>

                    <div className="mt-4 bg-orange-50 border border-orange-100 rounded-lg p-3 flex gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#EA580C] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-[11px] text-orange-900"><strong className="text-[#EA580C]">Mẹo chụp ảnh để có bản nhanh:</strong> Chụp nơi đủ sáng tự nhiên, chụp rõ các vết xước nhỏ (nếu có), khay SIM, cổng sạc và màn hình thông số máy. Ảnh chân thực giúp tin đăng duyệt ngay và người mua ra quyết định trong 24 giờ.</p>
                    </div>
                </div>

                {/* 2. Thông tin cơ bản */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-full bg-[#FACC15] flex items-center justify-center font-black text-[#1C1917]">2</div>
                        <div>
                            <h3 className="font-bold text-lg">Thông tin cơ bản</h3>
                            <p className="text-xs text-stone-500">Chọn đúng danh mục và tiêu đề giúp người mua dễ dàng tìm thấy món đồ</p>
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between mb-1.5">
                            <label className="text-sm font-bold text-[#1C1917]">Tiêu đề tin đăng <span className="text-red-500">*</span></label>
                            <span className="text-xs text-stone-400">54/100 ký tự</span>
                        </div>
                        <input type="text" className="w-full h-11 px-4 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FACC15] bg-stone-50 focus:bg-white transition-colors" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                        <p className="text-[11px] text-stone-400 mt-1.5">Gợi ý công thức đặt tên: Tên sản phẩm + Dung lượng/Phiên bản + Màu sắc + Tình trạng máy</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                        <div>
                            <label className="block text-sm font-bold text-[#1C1917] mb-1.5">Danh mục cấp 1 <span className="text-red-500">*</span></label>
                            <select className="w-full h-11 px-4 rounded-xl border border-stone-200 bg-stone-50 appearance-none focus:outline-none focus:border-[#FACC15]" value={formData.category1} onChange={e => {
                                const cat1 = e.target.value;
                                const data = getCategoryData(cat1);
                                setFormData({
                                    ...formData, 
                                    category1: cat1,
                                    category2: data.subCategories[0],
                                    brand: data.brands[0]
                                });
                            }}>
                                <option value="">-- Chọn danh mục --</option>
                                {categories.map((c, i) => <option key={i} value={c.name || c}>{c.name || c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-[#1C1917] mb-1.5">Danh mục cấp 2 <span className="text-red-500">*</span></label>
                            <select className="w-full h-11 px-4 rounded-xl border border-stone-200 bg-stone-50 appearance-none focus:outline-none focus:border-[#FACC15]" value={formData.category2} onChange={e => setFormData({...formData, category2: e.target.value})}>
                                {getCategoryData(formData.category1).subCategories.map((sub, idx) => (
                                    <option key={idx} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-[#1C1917] mb-1.5">Hãng sản xuất <span className="text-red-500">*</span></label>
                            <select className="w-full h-11 px-4 rounded-xl border border-stone-200 bg-stone-50 appearance-none focus:outline-none focus:border-[#FACC15]" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})}>
                                {getCategoryData(formData.category1).brands.map((brand, idx) => (
                                    <option key={idx} value={brand}>{brand}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-sm font-bold text-[#1C1917]">Tình trạng sản phẩm <span className="text-red-500">*</span></label>
                            <span className="text-[10px] text-stone-500">Bắt buộc chọn đúng 1 trong 4 nhãn chuẩn</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className={`border rounded-xl p-3 cursor-pointer transition-colors ${formData.condition === 'Mới' ? 'border-[#FACC15] bg-[#FFFBEB]' : 'border-stone-200 hover:border-stone-300'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <input type="radio" name="condition" value="Mới" checked={formData.condition === 'Mới'} onChange={e => setFormData({...formData, condition: e.target.value})} className="text-[#FACC15] focus:ring-[#FACC15]" />
                                    <span className="font-bold text-[#1C1917] text-sm">Mới <span className="font-normal text-stone-500 text-xs ml-1">Chưa sử dụng</span></span>
                                </div>
                                <p className="text-[11px] text-stone-500 pl-6">Nguyên seal, tem niêm phong còn đủ, chưa kích hoạt hoặc dùng thử.</p>
                            </label>
                            <label className={`border rounded-xl p-3 cursor-pointer transition-colors relative ${formData.condition === 'Như mới' ? 'border-[#FACC15] bg-[#FFFBEB]' : 'border-stone-200 hover:border-stone-300'}`}>
                                <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Lựa chọn phổ biến</div>
                                <div className="flex items-center gap-2 mb-1">
                                    <input type="radio" name="condition" value="Như mới" checked={formData.condition === 'Như mới'} onChange={e => setFormData({...formData, condition: e.target.value})} className="text-[#FACC15] focus:ring-[#FACC15]" />
                                    <span className="font-bold text-[#1C1917] text-sm">Như mới <span className="font-normal text-stone-500 text-xs ml-1"></span></span>
                                </div>
                                <p className="text-[11px] text-stone-500 pl-6">Dùng lướt ít ngày, ngoại hình không trầy xước, pin 99-100%, hoạt động hoàn hảo.</p>
                            </label>
                            <label className={`border rounded-xl p-3 cursor-pointer transition-colors ${formData.condition === 'Đã qua sử dụng' ? 'border-[#FACC15] bg-[#FFFBEB]' : 'border-stone-200 hover:border-stone-300'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <input type="radio" name="condition" value="Đã qua sử dụng" checked={formData.condition === 'Đã qua sử dụng'} onChange={e => setFormData({...formData, condition: e.target.value})} className="text-[#FACC15] focus:ring-[#FACC15]" />
                                    <span className="font-bold text-[#1C1917] text-sm">Đã qua sử dụng</span>
                                </div>
                                <p className="text-[11px] text-stone-500 pl-6">Mọi tính năng hoạt động tốt, có vết xước dăm nhẹ theo thời gian, nguyên bản.</p>
                            </label>
                            <label className={`border rounded-xl p-3 cursor-pointer transition-colors ${formData.condition === 'Cũ' ? 'border-[#FACC15] bg-[#FFFBEB]' : 'border-stone-200 hover:border-stone-300'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <input type="radio" name="condition" value="Cũ" checked={formData.condition === 'Cũ'} onChange={e => setFormData({...formData, condition: e.target.value})} className="text-[#FACC15] focus:ring-[#FACC15]" />
                                    <span className="font-bold text-[#1C1917] text-sm">Cũ</span>
                                </div>
                                <p className="text-[11px] text-stone-500 pl-6">Ngoại hình cấn móp hoặc hao mòn rõ rệt nhưng chức năng chính vẫn dùng bình thường.</p>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 3. Giá bán & Phương thức giao dịch */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-full bg-[#FACC15] flex items-center justify-center font-black text-[#1C1917]">3</div>
                        <div>
                            <h3 className="font-bold text-lg">Giá bán & Phương thức giao dịch</h3>
                            <p className="text-xs text-stone-500">Định giá hợp lý để nhận cuộc gọi mua hàng nhanh chóng</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-[#1C1917] mb-1.5">Giá muốn bán (VNĐ) <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input type="number" className="w-full h-14 pl-4 pr-10 text-xl font-bold text-red-600 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FACC15] bg-stone-50 focus:bg-white transition-colors" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
                                <span className="absolute right-4 top-4 font-bold text-stone-400">đ</span>
                            </div>
                            {formData.price && (
                                <p className="text-[11px] text-stone-400 mt-1.5 font-bold">
                                    {new Intl.NumberFormat('vi-VN').format(formData.price)} đ
                                </p>
                            )}
                        </div>
                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex flex-col justify-center text-center">
                            <span className="text-xs text-stone-400 font-bold">Tính năng gợi ý giá thị trường đang được phát triển.</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[#1C1917] mb-3">Phương thức giao dịch & Thanh toán hỗ trợ người mua</label>
                        <div className="space-y-3">
                            <label className="flex items-start gap-3 p-3 rounded-xl border border-stone-200 hover:border-[#FACC15] cursor-pointer transition-colors bg-stone-50/50">
                                <input type="checkbox" checked={formData.tradeDirect} onChange={e => setFormData({...formData, tradeDirect: e.target.checked})} className="mt-1 w-4 h-4 text-[#FACC15] rounded border-stone-300 focus:ring-[#FACC15]" />
                                <div>
                                    <div className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
                                        Gặp trực tiếp xem hàng & Test máy tận nơi
                                        <span className="bg-[#FACC15] text-[#1C1917] text-[9px] px-1.5 py-0.5 rounded font-black">Lựa chọn số 1 an toàn</span>
                                    </div>
                                    <p className="text-[11px] text-stone-500 mt-0.5">Khuyến nghị giao dịch tại quán cafe hoặc địa chỉ công cộng để hai bên cùng an tâm kiểm tra.</p>
                                </div>
                            </label>
                            
                            <label className="flex items-start gap-3 p-3 rounded-xl border border-stone-200 hover:border-[#FACC15] cursor-pointer transition-colors bg-stone-50/50">
                                <input type="checkbox" checked={formData.tradeCod} onChange={e => setFormData({...formData, tradeCod: e.target.checked})} className="mt-1 w-4 h-4 text-[#FACC15] rounded border-stone-300 focus:ring-[#FACC15]" />
                                <div>
                                    <div className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
                                        Giao hàng COD toàn quốc
                                        <span className="bg-stone-200 text-stone-600 text-[9px] px-1.5 py-0.5 rounded font-bold">Đồng kiểm khi nhận</span>
                                    </div>
                                    <p className="text-[11px] text-stone-500 mt-0.5">Hỗ trợ giao hàng qua Viettel Post / GHTK, cho người mua kiểm tra ngoại hình máy đúng như mô tả trước khi trả tiền.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3 rounded-xl border border-stone-200 hover:border-[#FACC15] cursor-pointer transition-colors bg-stone-50/50">
                                <input type="checkbox" checked={formData.tradeHaiPay} onChange={e => setFormData({...formData, tradeHaiPay: e.target.checked})} className="mt-1 w-4 h-4 text-[#FACC15] rounded border-stone-300 focus:ring-[#FACC15]" />
                                <div>
                                    <div className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
                                        Thanh toán bảo an qua Ví HaiPay & Cổng VNPay
                                        <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-bold">Tiền về tài khoản ngay</span>
                                    </div>
                                    <p className="text-[11px] text-stone-500 mt-0.5">Người mua có thể quét mã VNPay-QR hoặc thanh toán trực tiếp từ ví HaiPay. Tiền sẽ được cộng tức thì vào số dư của bạn.</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 4. Mô tả chi tiết & Thông số */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#FACC15] flex items-center justify-center font-black text-[#1C1917]">4</div>
                            <div>
                                <h3 className="font-bold text-lg">Mô tả chi tiết & Thông số</h3>
                                <p className="text-xs text-stone-500">Mô tả càng chi tiết, món đồ càng nhanh tìm được chủ mới</p>
                            </div>
                        </div>
                        <button type="button" className="text-[#EA580C] text-xs font-bold hover:underline flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> Điền mẫu mô tả</button>
                    </div>

                    <textarea className="w-full h-48 p-4 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FACC15] bg-stone-50 focus:bg-white transition-colors text-sm leading-relaxed mb-3" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                    
                    <div className="flex flex-wrap gap-2">
                        <span className="text-xs font-bold text-stone-500 mt-1.5 mr-2">Chạm nhanh thông số:</span>
                        <button type="button" onClick={() => handleSuggestionClick('Còn bảo hành hãng')} className="px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-medium text-stone-600 hover:bg-stone-50">+ Còn bảo hành hãng</button>
                        <button type="button" onClick={() => handleSuggestionClick('Đầy đủ hộp và sạc')} className="px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-medium text-stone-600 hover:bg-stone-50">+ Đầy đủ hộp và sạc</button>
                        <button type="button" onClick={() => handleSuggestionClick('Hàng chính hãng VN/A')} className="px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-medium text-stone-600 hover:bg-stone-50">+ Hàng chính hãng VN/A</button>
                        <button type="button" onClick={() => handleSuggestionClick('Bao test 7 ngày')} className="px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-medium text-stone-600 hover:bg-stone-50">+ Bao test 7 ngày</button>
                    </div>
                </div>

                {/* 5. Địa chỉ giao dịch & Liên hệ */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-full bg-[#FACC15] flex items-center justify-center font-black text-[#1C1917]">5</div>
                        <div>
                            <h3 className="font-bold text-lg">Địa chỉ giao dịch & Liên hệ</h3>
                            <p className="text-xs text-stone-500">Xác thực vị trí giúp khách hàng gần bạn tìm kiếm nhanh hơn</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                        <div>
                            <label className="block text-sm font-bold text-[#1C1917] mb-1.5">Tỉnh / Thành phố <span className="text-red-500">*</span></label>
                            <select className="w-full h-11 px-4 rounded-xl border border-stone-200 bg-stone-50 appearance-none focus:outline-none focus:border-[#FACC15]" required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}>
                                <option value="">-- Chọn --</option>
                                {provinces.map(p => <option key={p.code} value={p.name}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-[#1C1917] mb-1.5">Quận / Huyện <span className="text-red-500">*</span></label>
                            <select className="w-full h-11 px-4 rounded-xl border border-stone-200 bg-stone-50 appearance-none focus:outline-none focus:border-[#FACC15]" required value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} disabled={!formData.city}>
                                <option value="">-- Chọn --</option>
                                {districts.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-[#1C1917] mb-1.5">Phường / Xã <span className="text-red-500">*</span></label>
                            <select className="w-full h-11 px-4 rounded-xl border border-stone-200 bg-stone-50 appearance-none focus:outline-none focus:border-[#FACC15]" required value={formData.ward} onChange={e => setFormData({...formData, ward: e.target.value})} disabled={!formData.district}>
                                <option value="">-- Chọn --</option>
                                {wards.map(w => <option key={w.code} value={w.name}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="w-full md:w-1/3">
                        <label className="block text-sm font-bold text-[#1C1917] mb-1.5">Số điện thoại liên hệ</label>
                        <div className="flex gap-2">
                            <input type="text" className="w-full h-11 px-4 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 font-medium focus:outline-none" value={formData.phone} readOnly />
                            <button type="button" className="px-4 h-11 whitespace-nowrap bg-white border border-stone-200 rounded-xl text-sm font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Đổi số khác
                            </button>
                        </div>
                        <p className="text-[10px] text-stone-400 mt-1.5">Số điện thoại được bảo vệ quyền riêng tư, người mua bấm "Hiện số" mới nhìn thấy số đầy đủ.</p>
                    </div>
                </div>

                {/* Final Actions */}
                <div className="bg-transparent mt-2">
                    <label className="flex items-start gap-3 cursor-pointer mb-6">
                        <input type="checkbox" required checked={formData.commit} onChange={e => setFormData({...formData, commit: e.target.checked})} className="mt-1 w-4 h-4 text-[#FACC15] rounded border-stone-300 focus:ring-[#FACC15]" />
                        <span className="text-sm font-medium text-stone-700">Tôi cam kết các thông tin và hình ảnh đăng tải là sự thật, tình trạng món đồ mô tả trung thực và không kinh doanh các mặt hàng thuộc danh mục cấm theo <strong>Quy chế hoạt động HaiHand</strong>.</span>
                    </label>

                    <div className="flex items-center gap-3">
                        <button type="button" className="px-6 py-3 rounded-xl border border-stone-200 bg-white font-bold text-stone-700 hover:bg-stone-50 transition-colors">Lưu nháp</button>
                        <button type="button" className="px-6 py-3 rounded-xl border border-stone-200 bg-white font-bold text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> Xem trước tin</button>
                        <button type="submit" disabled={isSubmitting} className={`ml-auto px-8 py-3 rounded-xl font-black text-[#1C1917] shadow-sm transition-colors flex items-center gap-2 text-lg ${isSubmitting ? 'bg-stone-300 cursor-not-allowed' : 'bg-[#FACC15] hover:bg-[#EAB308]'}`}>
                            {isSubmitting ? (
                                <svg className="animate-spin h-5 w-5 text-[#1C1917]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            )}
                            {isSubmitting ? 'Đang xử lý...' : 'Cập nhật tin'}
                        </button>
                    </div>
                </div>

            </div>

            {/* Right Column - Sidebar */}
            <div className="w-full lg:w-[320px] shrink-0 space-y-6">
                
                {/* Preview Sticky Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden sticky top-4">
                    <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Xem trước tin đăng</span>
                        <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">Trực quan 100%</span>
                    </div>
                    <div className="p-3 text-[10px] text-stone-500 border-b border-stone-100">
                        Món đồ của bạn sẽ hiển thị trên sàn HaiHand như sau:
                    </div>
                    
                    <div className="p-4">
                        <div className="bg-stone-50 rounded-xl overflow-hidden border border-stone-200">
                            <div className="relative aspect-[4/3] bg-white border-b border-stone-200">
                                <img src={previewImages[0] || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} className="w-full h-full object-cover" alt="preview" />
                                <div className="absolute top-2 left-2 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">Như mới</div>
                                <div className="absolute top-2 right-2 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-stone-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                </div>
                                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> {formData.city || 'Hà Nội'}
                                </div>
                            </div>
                            <div className="p-3 bg-white">
                                <h4 className="font-bold text-sm text-[#1C1917] leading-snug line-clamp-2 mb-1.5">{formData.title || 'Tiêu đề sản phẩm...'}</h4>
                                <div className="font-black text-[#EA580C] text-lg mb-3">
                                    {formData.price ? new Intl.NumberFormat('vi-VN').format(formData.price) : '0'} đ
                                </div>
                                <div className="flex items-center gap-2 border-t border-stone-100 pt-3">
                                    <img src={user.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${API_URL}/${user.avatar.replace(/\\/g, '/')}`) : 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} className="w-6 h-6 rounded-full" alt="avt" />
                                    <span className="text-xs font-bold text-[#1C1917] flex-1 truncate">{user.name}</span>
                                    <span className="text-[10px] text-stone-400">Vừa xong</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Block */}
                <div className="bg-[#FFF8E7] rounded-2xl border border-orange-100 p-5">
                    <h4 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#EA580C]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        Quy tắc duyệt tin HaiHand
                    </h4>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-2 text-xs text-orange-800 leading-relaxed">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span><strong>100% Ảnh thật:</strong> Không dùng ảnh phối cảnh 3D từ hãng hoặc ảnh mạng. Món đồ có sao chụp vậy.</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-orange-800 leading-relaxed">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span><strong>Minh bạch lỗi:</strong> Mô tả rõ tình trạng máy, vết cấn xước nếu có giúp tránh tranh chấp khi đồng kiểm COD.</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-orange-800 leading-relaxed">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span><strong>Định giá thực tế:</strong> Tin có giá sát thực tế bán nhanh gấp 3 lần so với tin kê giá cao rồi mặc cả.</span>
                        </li>
                    </ul>

                    <div className="mt-5 pt-4 border-t border-orange-200">
                        <h5 className="font-bold text-orange-900 text-sm mb-1 flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> Cần hỗ trợ đăng tin?</h5>
                        <p className="text-[10px] text-orange-800 mb-2">Đội ngũ HaiHand sẵn sàng trợ giúp người bán 24/7</p>
                        <div className="flex items-center justify-between">
                            <span className="font-black text-[#EA580C]">Hotline: 1900 9922</span>
                            <span className="text-[10px] text-stone-500 hover:underline cursor-pointer flex items-center">Cẩm nang bán hàng ›</span>
                        </div>
                    </div>
                </div>

            </div>
        </form>
      </main>
      
      <AppFooter />
    </div>
  );
}