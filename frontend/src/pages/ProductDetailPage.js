import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { useToast } from '../components/Toast';
import { RecommendationSection } from '../components/RecommendationSection';
import {
  trackProductView,
  startProductDwellTracker,
  trackEvent
} from '../utils/tracker';


export default function ProductDetailPage() {
  const toast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [mainImage, setMainImage] = useState('');
  
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);

  const [activeTab, setActiveTab] = useState('mota'); // mota, checklist, thanhtoan

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  useEffect(() => {
    let cleanupDwell = () => {};

    const fetchPostAndReviews = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/posts/${id}`);
        setPost(data);
        if (data.images && data.images.length > 0) setMainImage(data.images[0]);
        else if (data.image) setMainImage(data.image); 

        // Track product view (with 30-min deduplication)
        trackProductView(data, 'detail');

        // Track real product dwell time
        cleanupDwell = startProductDwellTracker(data, 'detail');

        if (data.author?._id) {
            const profileRes = await axios.get(`${API_URL}/api/users/public-profile/${data.author._id}`);
            setReviews(profileRes.data.reviews || []);
            setAvgRating(profileRes.data.avgRating || 0);
        }
      } catch (error) {
        console.error("Lỗi tải thông tin sản phẩm:", error);
      }
    };
    fetchPostAndReviews();

    return () => {
      cleanupDwell();
    };
  }, [id, navigate, API_URL]);

  const getImageUrl = (imgStr) => {
    if (!imgStr) return 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
    return imgStr.startsWith('http') ? imgStr : `${API_URL}/${imgStr.replace(/\\/g, '/')}`;
  };

  const handleAddToCart = async (isBuyNow = false) => {
    if (!currentUser) {
        toast.warning('Chú ý', "Bạn phải đăng nhập thì mới mua được nha!");
        navigate('/login');
        return;
    }
    try {
        await axios.post(`${API_URL}/api/users/cart`, {
            userId: currentUser._id,
            postId: post._id,
            quantity: 1
        });
        trackEvent({
          type: 'cart_add',
          productId: post._id,
          category: post.category,
          price: post.price,
          source: 'detail'
        });
        window.dispatchEvent(new Event('cartUpdated')); 
        if (isBuyNow) navigate('/cart');
        else toast.success('Thành công', "🛒 Đã thêm sản phẩm vào giỏ hàng thành công!");
    } catch (error) {
        toast.error('Lỗi', "Lỗi kết nối tới Server!");
    }
  };

  const handleChat = () => {
    if (!currentUser) {
        toast.warning('Chú ý', "Vui lòng đăng nhập để nhắn tin!");
        navigate('/login');
        return;
    }
    trackEvent({
      type: 'chat_product_click',
      productId: post._id,
      category: post.category,
      price: post.price,
      source: 'detail'
    });
    navigate('/chat', { state: { receiver: post.author, post: post } });
  };

  if (!post) return <div className="min-h-screen flex items-center justify-center text-stone-500"><h3>Đang tải dữ liệu...</h3></div>;

  const displayImages = post.images && post.images.length > 0 ? post.images : (post.image ? [post.image] : []);

  // Format Date
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

  return (
    <div className="bg-[#FFFBEB] min-h-screen text-[#1C1917] font-sans">
      <AppHeader />
      
      <main className="max-w-[1200px] mx-auto px-4 py-6">
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-stone-500 mb-6">
          <Link to="/" className="hover:text-[#1C1917] flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Trang chủ
          </Link>
          <span>›</span>
          <Link to="#" className="hover:text-[#1C1917]">{post.category}</Link>
          <span>›</span>
          <span className="text-[#1C1917] font-semibold line-clamp-1">{post.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LEFT COLUMN */}
          <div className="w-full lg:w-[60%] flex flex-col gap-6">
            
            {/* Image Gallery */}
            <div className="bg-white p-2 rounded-xl border border-stone-200 shadow-sm">
              <div className="relative w-full aspect-square md:aspect-[4/3] rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center">
                <img src={getImageUrl(mainImage)} alt={post.title} className="w-full h-full object-cover" onError={(e) => {e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'}} />
                {post.details?.condition && (
                  <span className="absolute top-4 left-4 bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 shadow-sm">
                    {post.details.condition}
                  </span>
                )}
                <button className="absolute bottom-4 right-4 bg-white/80 p-2 rounded-full shadow-sm hover:bg-white text-stone-600">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                </button>
              </div>

              {displayImages.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                  {displayImages.map((img, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setMainImage(img)}
                      className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${mainImage === img ? 'border-[#FACC15]' : 'border-transparent'}`}
                    >
                      <img src={getImageUrl(img)} className="w-full h-full object-cover" alt="" onError={(e) => {e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'}} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Guarantee Banner */}
            <div className="bg-[#FFFBEB] border border-[#FACC15] rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 bg-[#FACC15] rounded-full flex items-center justify-center text-white shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1C1917]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <h4 className="font-bold text-[#1C1917]">Bảo đảm thanh toán & giao nhận</h4>
                <p className="text-sm text-stone-600">Hỗ trợ thanh toán bảo đảm qua VNPay, Ví HaiPay hoặc COD. Kiểm tra hàng và đổi trả 48h.</p>
              </div>
            </div>

            {/* Detail Tabs & Description */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-stone-200">
                <button onClick={() => setActiveTab('mota')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'mota' ? 'bg-[#FACC15] text-[#1C1917]' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'}`}>Mô tả người bán</button>
                <button onClick={() => setActiveTab('checklist')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'checklist' ? 'bg-[#FACC15] text-[#1C1917]' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'}`}>Checklist kiểm hàng</button>
                <button onClick={() => setActiveTab('thanhtoan')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'thanhtoan' ? 'bg-[#FACC15] text-[#1C1917]' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'}`}>Thanh toán & Vận chuyển</button>
              </div>
              
              <div className="p-6">
                {activeTab === 'mota' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-bold text-lg mb-3">Lý do thanh lý & Lịch sử sử dụng</h4>
                      <p className="text-stone-600 leading-relaxed whitespace-pre-line">{post.description}</p>
                    </div>
                  </div>
                )}
                {activeTab === 'checklist' && (
                  <div className="text-stone-600 text-sm space-y-2">
                    <p className="flex gap-2 items-start"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> Kiểm tra ngoại hình, trầy xước so với ảnh.</p>
                    <p className="flex gap-2 items-start"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> Kiểm tra hoạt động các chức năng cơ bản.</p>
                    <p className="flex gap-2 items-start"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> Xác nhận phụ kiện đi kèm nếu có.</p>
                  </div>
                )}
                {activeTab === 'thanhtoan' && (
                  <div className="text-stone-600 text-sm space-y-2">
                    <p>Thanh toán bảo đảm qua ví HaiHand, giữ tiền an toàn cho đến khi bạn nhận và kiểm tra hàng thành công.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-lg">Đánh giá từ khách đã mua ({reviews.length})</h4>
                <div className="flex items-center gap-1 bg-stone-100 px-3 py-1 rounded-full font-bold text-sm">
                  <span className="text-[#EA580C]">★</span> {Number(avgRating) > 0 ? Number(avgRating).toFixed(1) : '5.0'} / 5.0
                </div>
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((rev, index) => (
                    <div key={index} className="bg-stone-50 rounded-lg p-4 border border-stone-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <img src={rev.buyer?.avatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} className="w-10 h-10 rounded-full object-cover" alt="avt" />
                          <div>
                            <p className="font-bold text-sm">{rev.buyer?.name || 'Khách hàng'}</p>
                            <p className="text-xs text-stone-500">{new Date(rev.createdAt).toLocaleString('vi-VN')}</p>
                          </div>
                        </div>
                        <div className="text-[#FACC15] text-sm">{"★".repeat(rev.rating)}</div>
                      </div>
                      <p className="text-sm text-stone-700 italic">"{rev.comment}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-stone-500">
                  <p>Người bán này chưa có đánh giá nào.</p>
                </div>
              )}
            </div>
          </div>


          {/* RIGHT COLUMN */}
          <div className="w-full lg:w-[40%] flex flex-col gap-6">
            
            {/* Main Info Card */}
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-stone-500 mb-2 font-medium">
                <span>Mã tin: #{post._id?.substring(0, 6).toUpperCase()}</span>
                <span>•</span>
                <span>Đăng {formatTimeAgo(post.createdAt)}</span>
              </div>
              
              <h1 className="text-2xl font-bold leading-snug mb-4">{post.title}</h1>
              
              <div className="bg-[#FFFBEB] p-4 rounded-lg border border-[#FACC15]/30 mb-6">
                <div className="flex items-end gap-3 mb-1">
                  <span className="text-3xl font-black text-[#EA580C]">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(post.price)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-100">
                  <p className="text-xs text-stone-500 mb-1">Tình trạng</p>
                  <p className="font-bold text-emerald-700">{post.details?.condition || 'Chưa cập nhật'}</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-100">
                  <p className="text-xs text-stone-500 mb-1">Kho hàng</p>
                  <p className="font-bold text-[#1C1917]">{post.quantity ?? 1} sản phẩm</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-100">
                  <p className="text-xs text-stone-500 mb-1">Hãng</p>
                  <p className="font-bold text-[#1C1917]">{post.details?.brand || 'Chưa cập nhật'}</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-100">
                  <p className="text-xs text-stone-500 mb-1">Danh mục</p>
                  <p className="font-bold text-[#1C1917] line-clamp-1">{post.category || 'Chưa cập nhật'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm text-stone-600 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#EA580C] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <div>
                  <p className="font-bold text-[#1C1917]">{post.location || 'Toàn quốc'}</p>
                  <p className="text-xs mt-0.5">Hỗ trợ giao tận nơi hoặc test trực tiếp tại nhà.</p>
                </div>
              </div>

              {/* Seller Profile */}
              <div className="border border-stone-200 rounded-xl p-4 mb-6 relative">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <Link to={`/public-profile/${post.author?._id}`}>
                    <img src={post.author?.avatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} className="w-14 h-14 rounded-full object-cover border-2 border-stone-100" alt="Seller" />
                  </Link>
                  <div>
                    <Link to={`/public-profile/${post.author?._id}`} className="hover:underline">
                      <h4 className="font-bold text-[#1C1917]">{post.author?.name || 'Người dùng ẩn danh'}</h4>
                    </Link>
                    <p className="text-xs text-stone-500 mt-1">Cá nhân • Đã xác thực</p>
                  </div>
                  <Link to={`/public-profile/${post.author?._id}`} className="absolute top-4 right-4 text-sm font-bold text-[#EA580C] hover:underline">Hồ sơ</Link>
                </div>
                <div className="flex pt-4 text-center divide-x divide-stone-100">
                  <div className="flex-1">
                    <p className="font-bold text-[#1C1917]">★ {Number(avgRating) > 0 ? Number(avgRating).toFixed(1) : '-'}</p>
                    <p className="text-[10px] text-stone-500 text-uppercase mt-1">Đánh giá</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#1C1917]">98%</p>
                    <p className="text-[10px] text-stone-500 text-uppercase mt-1">Phản hồi</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#1C1917]">{reviews.length || 0}</p>
                    <p className="text-[10px] text-stone-500 text-uppercase mt-1">Đã bán</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {currentUser && post.author && currentUser._id === post.author._id ? (
                  <button onClick={() => navigate(`/edit-post/${post._id}`)} className="w-full bg-[#1C1917] text-white font-bold py-3.5 rounded-lg hover:bg-stone-800 transition-colors flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Chỉnh sửa tin của bạn
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => handleAddToCart(true)} 
                      disabled={post.quantity === 0}
                      className="w-full bg-[#FACC15] text-[#1C1917] font-bold py-3.5 rounded-lg hover:bg-[#EAB308] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                      {post.quantity === 0 ? 'Hết hàng' : 'Mua ngay'}
                    </button>
                    <div className="flex gap-3">
                      <button onClick={handleChat} className="flex-1 bg-white border border-[#E7E5E4] text-[#1C1917] font-bold py-3 rounded-lg hover:bg-stone-50 transition-colors flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        Chat ngay
                      </button>
                      <button onClick={() => handleAddToCart(false)} disabled={post.quantity === 0} className="w-14 bg-white border border-[#E7E5E4] text-stone-600 font-bold py-3 rounded-lg hover:bg-stone-50 transition-colors flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-4 mt-6 text-xs font-semibold text-emerald-700">
                <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Đồng kiểm tận tay</span>
                <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Trả hàng 48 giờ</span>
              </div>
            </div>

            {/* Safety Tips Banner */}
            <div className="bg-orange-50 p-5 rounded-xl border border-orange-200">
               <h4 className="font-bold text-[#EA580C] mb-2 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                 Mẹo mua đồ an toàn
               </h4>
               <p className="text-sm text-orange-900 leading-relaxed mb-3">
                 Nên hẹn gặp giao dịch tại nhà riêng hoặc nơi công cộng đông đúc. Tuyệt đối không chuyển tiền cọc trước khi xem hàng.
               </p>
               <Link to="#" className="text-sm font-bold text-[#EA580C] hover:underline">Đọc trọn bộ cẩm nang an toàn →</Link>
            </div>

          </div>
        </div>

        {/* Similar Products Recommendation */}
        <div className="mt-12">
          <RecommendationSection
            title="Sản phẩm tương tự"
            subtitle="Các sản phẩm có đặc điểm, mức giá và danh mục tương đồng"
            icon="🔍"
            fetchUrl={`/api/recommendations/similar/${id}`}
            sourceName="similar"
            currentUser={currentUser}
            limit={5}
          />
        </div>

        {/* Also Viewed Products Recommendation */}
        <div className="mt-8">
          <RecommendationSection
            title="Người xem sản phẩm này cũng xem"
            subtitle="Được nhiều khách hàng khác quan tâm cùng lúc"
            icon="👥"
            fetchUrl={`/api/recommendations/also-viewed/${id}`}
            sourceName="also_viewed"
            currentUser={currentUser}
            limit={5}
          />
        </div>
      </main>
      
      <AppFooter />
    </div>
  );
}
