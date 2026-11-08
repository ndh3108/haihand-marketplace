import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { ProductCard } from '../components/ProductCard';
import { RecommendationSection } from '../components/RecommendationSection';
import { mapPostToProductCard } from '../utils/productMapper';
import { trackEvent } from '../utils/tracker';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

// --- Skeleton Component ---
const ProductSkeleton = () => (
  <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-stone-100 animate-pulse flex flex-col h-full">
    <div className="w-full aspect-square bg-stone-200"></div>
    <div className="p-3 space-y-3 flex-1 flex flex-col">
      <div className="h-4 bg-stone-200 rounded w-3/4"></div>
      <div className="h-4 bg-stone-200 rounded w-1/2"></div>
      <div className="mt-auto h-3 bg-stone-200 rounded w-1/3"></div>
    </div>
  </div>
);

const CategorySkeleton = () => (
  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-stone-100 shadow-sm animate-pulse h-28">
    <div className="w-12 h-12 mb-2 bg-stone-200 rounded-full"></div>
    <div className="h-3 bg-stone-200 rounded w-16"></div>
  </div>
);

export default function HomePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]); 
  const [categories, setCategories] = useState([{name: 'Tất cả', icon: '🏠'}]);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả'); 
  const [keyword, setKeyword] = useState(''); 
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [locationFilter, setLocationFilter] = useState('Tất cả khu vực');
  
  // --- New Loading States ---
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const bannerImages = useMemo(() => [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA-zPGuXVJem8xfroANf5_FLYZr20mL9sBx_w-IJsUgjPb_SjT8R3gsryBj6lQNHlpsRIMMumvRQQ4JYh14ekpQq87raEcLM5M3DIYA1zykxGLscHnqnwf6RtyRG9E-51zYB-ZlqLjUnk5G4PDg34yxHfMrQ18wuS0ZeIHmiNasgJF0jzAPlFhB7SkgVnw968RJwQro7KFvZl36CB2tPbpUhwGQUS8V2FIDBOTQJU8zOhHaVO-6nt7c",
    "https://images.unsplash.com/photo-1581539250439-c96689b516cb?q=80&w=2072&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555529902-5261145633bf?q=80&w=2070&auto=format&fit=crop"
  ], []);
  const [currentBanner, setCurrentBanner] = useState(0);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000'; 
  const { user } = useAuth();

  useEffect(() => {
    if (user?._id) {
        axios.get(`${API_URL}/api/users/favorites/${user._id}`)
             .then(res => setFavoriteIds(res.data.map(post => post._id)))
             .catch(err => console.log(err));
    } else {
        setFavoriteIds([]);
    }
  }, [user?._id, API_URL]);

  const fetchPosts = useCallback(async (currentPage = 1, currentCategory = 'Tất cả', currentKeyword = '', loc = 'Tất cả khu vực') => {
    if (currentPage === 1) setIsLoadingPosts(true);
    else setIsLoadingMore(true);

    try {
      let url = `${API_URL}/api/posts?page=${currentPage}&limit=10`;
      if (currentCategory !== 'Tất cả' && currentCategory !== 'Kết quả tìm kiếm') url += `&category=${currentCategory}`;
      if (currentKeyword.trim()) url += `&search=${currentKeyword}`;
      if (loc !== 'Tất cả khu vực') url += `&location=${loc}`;

      const { data } = await axios.get(url);

      if (currentPage === 1) setPosts(data);
      else setPosts(prev => [...prev, ...data]);
      
      setHasMore(data.length === 10);
    } catch (error) {
      toast.error('Lỗi kết nối', 'Không thể tải tin đăng. Vui lòng thử lại.');
      console.error("Lỗi kết nối Server:", error);
    } finally {
      setIsLoadingPosts(false);
      setIsLoadingMore(false);
    }
  }, [API_URL, toast]);

  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/categories`);
      const dynamicCats = data.map(c => ({ name: c.name, image: c.image }));
      setCategories([{name: 'Tất cả', icon: '🏠'}, ...dynamicCats]);
    } catch (error) { 
      toast.error('Lỗi', 'Không tải được danh mục');
      console.error("Lỗi lấy danh mục:", error); 
    } finally {
      setIsLoadingCategories(false);
    }
  }, [API_URL, toast]);

  const handleCategoryClick = useCallback((category) => {
    if (selectedCategory === category) return;
    setSelectedCategory(category);
    setPage(1);
    fetchPosts(1, category, keyword, locationFilter);
    if (category && category !== 'Tất cả') {
      trackEvent({ type: 'category_view', category, source: 'home' });
    }
  }, [selectedCategory, keyword, locationFilter, fetchPosts]);

  const handleLocationClick = useCallback((loc) => {
    if (locationFilter === loc) return;
    setLocationFilter(loc);
    setPage(1);
    fetchPosts(1, selectedCategory, keyword, loc);
  }, [locationFilter, selectedCategory, keyword, fetchPosts]);

  const handleSearch = useCallback((searchKeyword) => {
    setKeyword(searchKeyword);
    setSelectedCategory('Kết quả tìm kiếm');
    setPage(1);
    fetchPosts(1, 'Kết quả tìm kiếm', searchKeyword, locationFilter);
    if (searchKeyword && searchKeyword.trim()) {
      trackEvent({ type: 'search', query: searchKeyword.trim(), source: 'home' });
    }
  }, [locationFilter, fetchPosts]);

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, selectedCategory, keyword, locationFilter);
  }, [page, selectedCategory, keyword, locationFilter, fetchPosts]);

  useEffect(() => {
    fetchPosts(1, 'Tất cả', '', 'Tất cả khu vực');
    fetchCategories();
    
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % bannerImages.length);
    }, 3500);
    
    return () => clearInterval(timer);
  }, [fetchPosts, fetchCategories, bannerImages.length]);

  const toggleFavorite = useCallback(async (e, postId) => {
      e.stopPropagation(); 
      e.preventDefault();
      if (!user) { toast.warning('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để lưu tin yêu thích!'); navigate('/login'); return; }
      
      const isFav = favoriteIds.includes(postId);
      setFavoriteIds(prev => isFav ? prev.filter(id => id !== postId) : [...prev, postId]);
      
      try {
          await axios.post(`${API_URL}/api/users/favorites`, { userId: user._id, postId: postId });
          toast.success(isFav ? 'Đã bỏ lưu tin' : 'Đã lưu tin thành công!');
      } catch (error) { 
          setFavoriteIds(prev => isFav ? [...prev, postId] : prev.filter(id => id !== postId));
          toast.error('Lỗi', 'Không thể thao tác lúc này');
      }
  }, [user, favoriteIds, API_URL, navigate, toast]);

  const locations = useMemo(() => ['Tất cả khu vực', 'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng'], []);

  return (
    <div className="bg-[#FFFBEB] min-h-screen text-[#1C1917] font-sans">
      <AppHeader onSearch={handleSearch} />
      <main className="max-w-[1200px] mx-auto px-4 py-8 space-y-10">
        
        {/* Banner Section */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row items-stretch border border-[#E7E5E4] min-h-[360px] transition-shadow duration-300 hover:shadow-md">
           <div className="flex-1 space-y-5 p-8 md:p-12 flex flex-col justify-center">
             <span className="inline-flex self-start items-center gap-1 text-sm bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-semibold border border-emerald-200">
               Mùa dọn nhà đón Tết
             </span>
             <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-snug">
               Dọn nhà đón Tết — Thanh lý đồ cũ giá tốt
             </h1>
             <p className="text-stone-500 max-w-md leading-relaxed text-lg">
               Giải phóng không gian sống, chuyển giao vật dụng thân yêu cho người cần với hơn 50.000+ người mua đang tìm kiếm mỗi ngày.
             </p>
             <div className="pt-2 flex flex-wrap gap-3 items-center">
               <Button variant="primary" className="transition-transform duration-300 hover:-translate-y-0.5" onClick={() => handleCategoryClick('Tất cả')}>Khám phá ngay</Button>
               <a 
                 href="/register-seller" 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm bg-stone-900 text-white hover:bg-stone-800 transition-transform duration-300 hover:-translate-y-0.5 shadow-sm text-decoration-none"
               >
                 <i className="fas fa-store text-amber-400"></i> Đăng ký bán hàng B2C
               </a>
             </div>
           </div>
           <div className="w-full md:w-[45%] lg:w-[50%] relative shrink-0 min-h-[250px] md:min-h-full group">
             <div className="absolute inset-0 w-full h-full bg-stone-100">
               {bannerImages.map((img, idx) => (
                 <img 
                   key={idx}
                   src={img} 
                   alt={`Banner ${idx + 1}`} 
                   loading="lazy"
                   className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${currentBanner === idx ? 'opacity-100' : 'opacity-0'}`} 
                 />
               ))}
               {/* Indicators */}
               <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                 {bannerImages.map((_, idx) => (
                   <button 
                     key={idx}
                     onClick={() => setCurrentBanner(idx)}
                     className={`h-2 rounded-full transition-all duration-300 ${currentBanner === idx ? 'bg-[#FACC15] w-8' : 'bg-white/70 w-2 hover:bg-white'}`}
                     aria-label={`Go to slide ${idx + 1}`}
                   />
                 ))}
               </div>
               
               {/* Navigation Arrows */}
               <button 
                 onClick={() => setCurrentBanner(prev => (prev === 0 ? bannerImages.length - 1 : prev - 1))}
                 className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/50 text-white py-4 px-2 transition-all duration-300 opacity-0 group-hover:opacity-100 z-10"
                 aria-label="Previous slide"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
               </button>
               <button 
                 onClick={() => setCurrentBanner(prev => (prev === bannerImages.length - 1 ? 0 : prev + 1))}
                 className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/50 text-white py-4 px-2 transition-all duration-300 opacity-0 group-hover:opacity-100 z-10"
                 aria-label="Next slide"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
               </button>
               
             </div>
           </div>
        </section>

        {/* Categories Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight">Khám phá danh mục đồ cũ</h2>
            <button className="text-[#EA580C] text-sm font-semibold hover:underline flex items-center gap-1 transition-colors hover:text-[#C2410C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C] rounded">
              Tất cả danh mục
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {isLoadingCategories ? (
              Array.from({ length: 8 }).map((_, i) => <CategorySkeleton key={i} />)
            ) : (
              categories.map((cat, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleCategoryClick(cat.name)}
                  aria-pressed={selectedCategory === cat.name}
                  className={`flex flex-col items-center justify-center p-3 bg-white rounded-xl border transition-all duration-300 hover:shadow-md hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FACC15] ${selectedCategory === cat.name ? 'border-[#FACC15] ring-2 ring-[#FACC15]/20 shadow-md' : 'border-[#E7E5E4]'} text-center h-28 w-full`}
                >
                  <div className="w-12 h-12 mb-2 flex items-center justify-center bg-stone-50 rounded-full overflow-hidden text-2xl">
                    {cat.name === 'Tất cả' || cat.name === 'Kết quả tìm kiếm' ? cat.icon : (
                      <img 
                        src={cat.image?.startsWith('http') ? cat.image : `${API_URL}/uploads/${cat.image}`} 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                        alt={cat.name} 
                        onError={(e) => { e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'; }}
                      />
                    )}
                  </div>
                  <span className={`text-xs font-semibold ${selectedCategory === cat.name ? 'text-[#1C1917]' : 'text-stone-600'} line-clamp-2`}>{cat.name}</span>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Filters */}
        <section className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-stone-500 font-medium text-sm mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#EA580C]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Bộ lọc nhanh:
          </div>
          {locations.map(loc => (
            <button 
              key={loc}
              onClick={() => handleLocationClick(loc)}
              aria-pressed={locationFilter === loc}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FACC15] ${locationFilter === loc ? 'bg-[#FACC15] text-[#1C1917] border-[#EAB308] shadow-sm' : 'bg-white text-stone-600 border-[#E7E5E4] hover:bg-stone-50 hover:border-stone-300'}`}
            >
              {loc}
            </button>
          ))}
        </section>

        {/* 1. Recommendation: Recently Viewed Products */}
        <RecommendationSection
          title="Sản phẩm bạn đã xem"
          subtitle="Dựa trên lịch sử duyệt gần đây của bạn"
          icon="🕒"
          fetchUrl="/api/recommendations/recently-viewed"
          sourceName="recently_viewed"
          currentUser={user}
          favoriteIds={favoriteIds}
          onFavorite={toggleFavorite}
          limit={10}
        />

        {/* 2. Recommendation: For You (Personalized Hybrid) */}
        <RecommendationSection
          title="Gợi ý cho bạn"
          subtitle="Sản phẩm cá nhân hoá phù hợp với sở thích của bạn"
          icon="✨"
          fetchUrl="/api/recommendations/for-you"
          sourceName="for_you"
          currentUser={user}
          favoriteIds={favoriteIds}
          onFavorite={toggleFavorite}
          limit={10}
        />

        {/* Product Grid */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                {selectedCategory === 'Tất cả' ? 'Tin mới đăng' : selectedCategory}
              </h2>
              {!isLoadingPosts && (
                <div className="flex items-center gap-2 bg-white border border-[#E7E5E4] px-3 py-1.5 rounded-full text-stone-500 text-sm shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-medium">Vừa cập nhật</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 text-sm font-semibold">
               <button className="px-4 py-1.5 border border-[#1C1917] rounded-full bg-[#1C1917] text-white transition-colors">Mới nhất</button>
               <button className="px-4 py-1.5 border border-[#E7E5E4] rounded-full bg-white text-stone-500 hover:bg-stone-50 transition-colors">Gần bạn nhất</button>
               <button className="px-4 py-1.5 border border-[#E7E5E4] rounded-full bg-white text-stone-500 hover:bg-stone-50 transition-colors">Giá thấp → cao</button>
            </div>
          </div>
          
          {isLoadingPosts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : posts.length === 0 ? (
             <div className="space-y-6">
               <div className="flex flex-col items-center justify-center py-16 px-4 text-stone-500 bg-white rounded-2xl shadow-sm border border-[#E7E5E4] min-h-[260px]">
                  <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-[#1C1917] mb-2">Không tìm thấy kết quả</h3>
                  <p className="max-w-md text-center mb-6 text-sm">Chúng tôi không tìm thấy tin đăng nào phù hợp với yêu cầu của bạn. Hãy thử đổi bộ lọc hoặc xem các gợi ý hấp dẫn bên dưới nhé.</p>
                  <Button variant="secondary" onClick={() => handleCategoryClick('Tất cả')}>Xem tất cả tin</Button>
               </div>
               <RecommendationSection
                 title="Có thể bạn quan tâm"
                 subtitle="Sản phẩm nổi bật khác dành riêng cho bạn"
                 icon="💡"
                 fetchUrl="/api/recommendations/for-you"
                 sourceName="search_fallback"
                 currentUser={user}
                 favoriteIds={favoriteIds}
                 onFavorite={toggleFavorite}
                 limit={5}
               />
             </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {posts.map((post) => {
                  const mapped = mapPostToProductCard(post, user, favoriteIds);
                  if (!mapped) return null;

                  return (
                    <div key={post._id} className="transition-transform duration-300 hover:-translate-y-1">
                      <ProductCard 
                        product={mapped.product} 
                        isFavorited={mapped.isFavorited}
                        isAuthor={mapped.isAuthor}
                        onFavorite={(e) => toggleFavorite(e, post._id)}
                      />
                    </div>
                  );
                })}
              </div>
              
              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <Button variant="secondary" onClick={handleLoadMore} disabled={isLoadingMore} className="px-8 py-3 group relative overflow-hidden transition-all duration-300">
                    <span className={`flex items-center transition-opacity duration-300 ${isLoadingMore ? 'opacity-0' : 'opacity-100'}`}>
                      Xem thêm tin đăng khác <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </span>
                    {isLoadingMore && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-stone-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

      </main>
      <AppFooter />
    </div>
  );
};