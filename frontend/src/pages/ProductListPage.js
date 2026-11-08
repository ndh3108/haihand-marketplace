import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { ProductCard } from '../components/ProductCard';

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  // Filters from URL
  const category = searchParams.get('category') || '';
  const location = searchParams.get('location') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  useEffect(() => {
    // Fetch categories
    axios.get(`${API_URL}/api/categories`)
      .then(({ data }) => setCategories(data))
      .catch((err) => {
        console.warn("API lỗi, dùng danh mục ảo");
        setCategories([
          { _id: '1', name: 'Điện thoại & Tablet' },
          { _id: '2', name: 'Laptop & Máy tính' },
          { _id: '3', name: 'Xe máy & Phương tiện' },
          { _id: '4', name: 'Đồ gia dụng' }
        ]);
      });
  }, [API_URL]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/posts`, {
        params: { category, location, search, sort, minPrice, maxPrice }
      });
      setPosts(res.data);
    } catch (err) {
      console.warn("Lỗi tải danh sách sản phẩm:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, location, search, sort, minPrice, maxPrice]);

  const handleSortChange = (e) => {
    searchParams.set('sort', e.target.value);
    setSearchParams(searchParams);
  };

  const applyPriceFilter = (min, max) => {
    if (min !== null) searchParams.set('minPrice', min); else searchParams.delete('minPrice');
    if (max !== null) searchParams.set('maxPrice', max); else searchParams.delete('maxPrice');
    setSearchParams(searchParams);
  };

  const handleCategorySelect = (name) => {
    if (name === 'Tất cả') searchParams.delete('category');
    else searchParams.set('category', name);
    setSearchParams(searchParams);
  };

  const handleLocationSelect = (loc) => {
    if (loc === 'Toàn quốc') searchParams.delete('location');
    else searchParams.set('location', loc);
    setSearchParams(searchParams);
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handleSearchSubmit = (keyword) => {
    if (keyword) searchParams.set('search', keyword);
    else searchParams.delete('search');
    setSearchParams(searchParams);
  };

  const getImageUrl = (post) => {
    if (post.images && post.images.length > 0) {
        return post.images[0].startsWith('http') ? post.images[0] : `${API_URL}/${post.images[0].replace(/\\/g, '/')}`;
    }
    if (post.image) {
        return post.image.startsWith('http') ? post.image : `${API_URL}/uploads/${post.image}`;
    }
    return 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Mới'; 
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " năm trước";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " tháng trước";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " ngày trước";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " giờ trước";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " phút trước";
    return "Vừa xong";
  };

  const [inputMin, setInputMin] = useState(minPrice);
  const [inputMax, setInputMax] = useState(maxPrice);

  const formatCurrency = (val) => {
    if (!val) return '';
    return parseInt(val).toLocaleString('vi-VN') + 'đ';
  };

  return (
    <div className="bg-[#FFFBEB] min-h-screen font-sans text-[#1C1917]">
      <AppHeader onSearch={handleSearchSubmit} />

      <main className="max-w-[1200px] mx-auto px-4 py-6">
        
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-stone-500 mb-4">
          <Link to="/" className="hover:text-[#1C1917] flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Trang chủ
          </Link>
          <span>›</span>
          <span className="text-[#1C1917] font-semibold">{category || 'Tất cả danh mục'}</span>
          <span className="ml-auto text-xs">Tìm thấy {posts.length} kết quả xác thực</span>
        </nav>

        {/* Filter Tags & Sort */}
        <div className="flex flex-wrap items-center justify-between mb-6 bg-white p-3 rounded-xl border border-stone-200 shadow-sm gap-4">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="font-medium text-stone-500 mr-2">Đang lọc theo:</span>
            {location && (
              <span className="bg-stone-100 px-3 py-1.5 rounded-full flex items-center gap-2 font-medium">
                📍 {location}
                <button onClick={() => handleLocationSelect('Toàn quốc')} className="text-stone-400 hover:text-stone-600">×</button>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="bg-stone-100 px-3 py-1.5 rounded-full flex items-center gap-2 font-medium">
                💰 {formatCurrency(minPrice || 0)} - {formatCurrency(maxPrice || 999999999)}
                <button onClick={() => applyPriceFilter(null, null)} className="text-stone-400 hover:text-stone-600">×</button>
              </span>
            )}
            {search && (
              <span className="bg-stone-100 px-3 py-1.5 rounded-full flex items-center gap-2 font-medium">
                Từ khóa: "{search}"
                <button onClick={() => handleSearchSubmit('')} className="text-stone-400 hover:text-stone-600">×</button>
              </span>
            )}
            {(location || minPrice || maxPrice || search || category) && (
              <button onClick={handleClearFilters} className="text-[#EA580C] font-semibold ml-2 hover:underline text-xs">
                Xóa tất cả
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-500 font-medium">Sắp xếp:</span>
            <select 
              value={sort}
              onChange={handleSortChange}
              className="bg-stone-100 border-none font-semibold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#FACC15] outline-none"
            >
              <option value="newest">Mới đăng gần đây</option>
              <option value="price-asc">Giá thấp đến cao</option>
              <option value="price-desc">Giá cao đến thấp</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT SIDEBAR (Bộ lọc) */}
          <aside className="w-full lg:w-[260px] shrink-0 space-y-6">
            
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-3 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#EA580C]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                <h3 className="font-bold text-lg">Bộ lọc tìm kiếm</h3>
              </div>

              {/* Danh mục con */}
              <div className="mb-6">
                <h4 className="font-semibold text-stone-900 mb-3 flex items-center justify-between">
                  Danh mục
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                </h4>
                <ul className="space-y-1 text-sm font-medium">
                  <li 
                    onClick={() => handleCategorySelect('Tất cả')}
                    className={`px-3 py-2 rounded-lg cursor-pointer transition-colors ${!category ? 'bg-orange-50 text-[#EA580C]' : 'text-stone-600 hover:bg-stone-50'}`}
                  >
                    Tất cả danh mục
                  </li>
                  {categories.map(cat => (
                    <li 
                      key={cat._id}
                      onClick={() => handleCategorySelect(cat.name)}
                      className={`px-3 py-2 rounded-lg cursor-pointer transition-colors ${category === cat.name ? 'bg-orange-50 text-[#EA580C]' : 'text-stone-600 hover:bg-stone-50'}`}
                    >
                      {cat.name}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Khu vực */}
              <div className="mb-6">
                <h4 className="font-semibold text-stone-900 mb-3 flex items-center justify-between">
                  Khu vực mua bán
                </h4>
                <ul className="space-y-2 text-sm font-medium">
                  {['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Toàn quốc'].map(loc => (
                    <li key={loc}>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={location === loc || (loc === 'Toàn quốc' && !location)}
                          onChange={() => handleLocationSelect(loc)}
                          className="w-4 h-4 rounded border-stone-300 text-[#FACC15] focus:ring-[#FACC15]"
                        />
                        <span className="text-stone-600 group-hover:text-[#1C1917]">{loc}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Khoảng giá */}
              <div className="mb-6">
                <h4 className="font-semibold text-stone-900 mb-3">Khoảng giá (VND)</h4>
                <div className="flex items-center gap-2 mb-3">
                  <input 
                    type="number" 
                    placeholder="TỐI THIỂU" 
                    value={inputMin}
                    onChange={(e) => setInputMin(e.target.value)}
                    className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded text-center focus:outline-none focus:border-[#FACC15]"
                  />
                  <span className="text-stone-400">-</span>
                  <input 
                    type="number" 
                    placeholder="TỐI ĐA" 
                    value={inputMax}
                    onChange={(e) => setInputMax(e.target.value)}
                    className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded text-center focus:outline-none focus:border-[#FACC15]"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button onClick={() => { setInputMin(0); setInputMax(8000000); }} className="text-[10px] px-2 py-1 bg-stone-100 rounded text-stone-600 hover:bg-stone-200 font-semibold">&lt; 8 triệu</button>
                  <button onClick={() => { setInputMin(10000000); setInputMax(20000000); }} className="text-[10px] px-2 py-1 bg-[#FACC15] rounded text-[#1C1917] font-semibold">10 - 20 tr</button>
                  <button onClick={() => { setInputMin(25000000); setInputMax(999999999); }} className="text-[10px] px-2 py-1 bg-stone-100 rounded text-stone-600 hover:bg-stone-200 font-semibold">&gt; 25 triệu</button>
                </div>
                <button 
                  onClick={() => applyPriceFilter(inputMin, inputMax)}
                  className="w-full py-2 bg-[#FACC15] font-bold rounded-lg hover:bg-[#EAB308] transition-colors text-[#1C1917] text-sm"
                >
                  Áp dụng mức giá
                </button>
              </div>

              <button 
                onClick={handleClearFilters}
                className="w-full py-2 bg-stone-100 text-stone-600 font-bold rounded-lg hover:bg-stone-200 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Thiết lập lại bộ lọc
              </button>
            </div>
          </aside>

          {/* MAIN GRID */}
          <div className="flex-1">
            {loading ? (
               <div className="flex flex-col items-center justify-center py-20">
                 <div className="w-10 h-10 border-4 border-stone-200 border-t-[#FACC15] rounded-full animate-spin"></div>
                 <p className="mt-4 font-bold text-stone-500">Đang tìm món đồ ngon cho bạn...</p>
               </div>
            ) : posts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                  {posts.map(post => (
                    <ProductCard 
                      key={post._id}
                      product={{
                        id: post._id,
                        title: post.title,
                        price: post.price,
                        imageUrl: getImageUrl(post),
                        condition: post.condition || "Đã qua sử dụng",
                        location: post.location || 'Toàn quốc',
                        timeAgo: formatTimeAgo(post.createdAt),
                        category: post.category
                      }}
                      isFavorited={false}
                      isAuthor={false}
                      onFavorite={() => {}}
                    />
                  ))}
                </div>

                {/* B2C Merchant Banner */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between border border-amber-200/80 shadow-xs mb-8 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shrink-0 shadow-xs text-xl text-white">
                       🏪
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1C1917] text-lg">Bạn là nhà phân phối hoặc chủ cửa hàng?</h4>
                      <p className="text-sm text-stone-600 mt-1">Đăng ký mở gian hàng B2C chính hãng trên HaiHand để tiếp cận hàng ngàn khách hàng tiềm năng mỗi ngày!</p>
                    </div>
                  </div>
                  <a 
                    href="/register-seller" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="bg-[#1C1917] text-white font-bold py-2.5 px-6 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap text-decoration-none shadow-xs"
                  >
                    Mở Gian Hàng B2C 🚀
                  </a>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-stone-200 pt-6">
                  <p className="text-sm text-stone-500 font-medium mb-4 sm:mb-0">Hiển thị <strong className="text-[#1C1917]">1 - {posts.length}</strong> trên <strong className="text-[#1C1917]">{posts.length}</strong> tin đăng</p>
                  
                  <div className="flex items-center gap-1 text-sm font-semibold">
                    <button className="px-3 py-1.5 rounded-lg text-stone-400 cursor-not-allowed flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Trang trước
                    </button>
                    <button className="w-8 h-8 rounded-lg bg-[#FACC15] text-[#1C1917] flex items-center justify-center">1</button>
                    <button className="w-8 h-8 rounded-lg text-stone-600 hover:bg-stone-100 flex items-center justify-center transition-colors">2</button>
                    <button className="w-8 h-8 rounded-lg text-stone-600 hover:bg-stone-100 flex items-center justify-center transition-colors">3</button>
                    <span className="px-1 text-stone-400">...</span>
                    <button className="w-8 h-8 rounded-lg text-stone-600 hover:bg-stone-100 flex items-center justify-center transition-colors">24</button>
                    <button className="px-3 py-1.5 rounded-lg text-[#1C1917] hover:bg-stone-100 transition-colors flex items-center gap-1">
                      Trang sau <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-16 text-center">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">Huhu, không tìm thấy món nào khớp với lọc của bạn!</h3>
                <p className="text-stone-500 mb-6">Hãy thử bỏ bớt bộ lọc hoặc tìm với từ khóa khác xem sao nhé.</p>
                <button onClick={handleClearFilters} className="bg-[#FACC15] text-[#1C1917] font-bold py-2.5 px-8 rounded-full shadow-sm hover:bg-[#EAB308] transition-colors">
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}