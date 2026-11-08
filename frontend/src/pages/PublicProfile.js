import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { useToast } from '../components/Toast';


const PublicProfile = () => {
  const toast = useToast();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
  const currentUser = React.useMemo(() => {
      const stored = localStorage.getItem('user');
      return stored && stored !== "undefined" ? JSON.parse(stored) : null;
  }, []);

  useEffect(() => {
    
    axios.get(`${API_URL}/api/users/public-profile/${userId}`)
      .then(res => {
          setData(res.data);
          
          setCounts({ 
              followers: res.data.followersCount || 0, 
              following: res.data.followingCount || 0 
          });
      })
      .catch(err => {
          console.error("Lỗi tải trang cá nhân:", err);
      });

    
    if (currentUser && currentUser._id !== userId) {
        axios.get(`${API_URL}/api/users/follow-status`, { 
            params: { followerId: currentUser._id, followingId: userId } 
        })
        .then(res => {
            setIsFollowing(res.data.isFollowing);
        })
        .catch(err => console.error("Lỗi kiểm tra trạng thái theo dõi:", err));
    }
  }, [userId, currentUser, API_URL]);

  const formatActiveStatus = (lastActive) => {
      if (!lastActive) return "Chưa có thông tin";
      const diff = Date.now() - new Date(lastActive).getTime();
      if (diff < 5 * 60000) return "Đang hoạt động";
      if (diff < 60 * 60000) return `Hoạt động ${Math.floor(diff/60000)} phút trước`;
      if (diff < 24 * 3600000) return `Hoạt động ${Math.floor(diff/3600000)} giờ trước`;
      if (diff < 7 * 24 * 3600000) return `Hoạt động ${Math.floor(diff/86400000)} ngày trước`;
      return "Đã lâu không hoạt động";
  };

  const handleFollow = async () => {
    if (!currentUser) {
        toast.warning('Chú ý', "Vui lòng đăng nhập để theo dõi người dùng này!");
        return;
    }
    
    try {
        const { data: resData } = await axios.post(`${API_URL}/api/users/follow`, {
            followerId: currentUser._id,
            followingId: userId
        });
        
        setIsFollowing(resData.isFollowing);

        
        const updateRes = await axios.get(`${API_URL}/api/users/public-profile/${userId}`);
        setCounts({ 
            followers: updateRes.data.followersCount || 0, 
            following: updateRes.data.followingCount || 0 
        });
    } catch (e) {
        toast.info('Thông báo', "Không thể thực hiện thao tác theo dõi lúc này!");
    }
  };

  const handleChat = () => {
    if (!currentUser) {
        toast.warning('Chú ý', "Vui lòng đăng nhập để nhắn tin!");
        return;
    }
    
    navigate('/chat', { state: { receiver: data.user } });
  };

  if (!data) return <div className="text-center py-5">Đang tải thông tin...</div>;

  return (
    <div className="bg-[#F5F5F5] min-h-screen font-sans text-[#1C1917] pb-10">
      <AppHeader />
      
      <div className="max-w-[1000px] mx-auto px-4 py-4 space-y-4">
        
        {/* Profile Header Box */}
        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col md:flex-row items-start md:items-center gap-5 border border-stone-100">
          <div className="relative shrink-0">
            <img 
              src={
                data.user.avatar 
                 ? (data.user.avatar.startsWith('http') 
                   ? data.user.avatar 
                     : `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/${data.user.avatar.replace(/\\/g, '/')}`) 
                 : 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
             } 
             className="w-24 h-24 rounded-full object-cover border border-stone-200"
             alt="avatar"
             onError={(e) => { e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'; }}
            />
          </div>
          
          <div className="flex-1 w-full">
            <h1 className="text-xl font-bold text-[#1C1917] mb-1.5">{data.user.name}</h1>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-stone-500 mb-1.5">
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${formatActiveStatus(data.user.lastActive) === 'Đang hoạt động' ? 'bg-emerald-500' : 'bg-stone-400'}`}></span>
                {formatActiveStatus(data.user.lastActive)}
              </span>
              <span>•</span>
              <span>Tỷ lệ phản hồi: {data.responseRate ?? 100}%</span>
              <span>•</span>
              <span>Người theo dõi: <span className="font-bold underline cursor-pointer">{counts.followers}</span></span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-stone-500 mb-4">
              <span className="text-[#1C1917] font-bold">
                  {data.reviews?.length > 0 ? data.avgRating : 0} <span className="text-[#FACC15]">★</span> <span className="text-stone-500 font-normal underline">({data.reviews?.length || 0} đánh giá)</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Đã tham gia: {new Date(data.user.createdAt).toLocaleDateString('vi-VN')}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {data.user.address || 'Chưa cung cấp'}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button className="px-4 py-1.5 bg-white border border-stone-200 text-[#1C1917] text-sm font-semibold rounded-full flex items-center gap-1.5 hover:bg-stone-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  Chia sẻ
              </button>
              
              {currentUser?._id !== userId && (
                <>
                  <button 
                    onClick={handleFollow} 
                    className={`px-4 py-1.5 border text-sm font-semibold rounded-full flex items-center gap-1.5 transition-colors ${isFollowing ? 'border-stone-200 bg-stone-100 text-stone-700 hover:bg-stone-200' : 'border-[#FACC15] text-[#1C1917] hover:bg-[#FACC15]/10'}`}
                  >
                    {isFollowing ? (
                        <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Đang theo dõi</>
                    ) : (
                        <>+ Theo dõi</>
                    )}
                  </button>
                  <button onClick={handleChat} className="px-5 py-1.5 bg-[#FACC15] text-[#1C1917] text-sm font-bold rounded-full shadow-sm hover:opacity-90 transition-opacity ml-auto md:ml-2">
                    Chat với người bán
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Posts Box */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-stone-100">
          <h2 className="text-lg font-bold text-[#1C1917] mb-4">Tất cả tin đăng ({data.posts?.length || 0})</h2>
          
          <div className="flex items-center gap-2 mb-4">
              <button className="px-3 py-1 bg-[#1C1917] text-white text-[13px] font-semibold rounded-full">Tin đang hoạt động ({data.posts?.length || 0})</button>
              <button className="px-3 py-1 bg-white border border-stone-200 text-stone-600 text-[13px] font-semibold rounded-full hover:bg-stone-50">Đã bán (0)</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.posts && data.posts.length > 0 ? (
              data.posts.map(post => (
                <div key={post._id} className="bg-white border border-stone-200 rounded-lg overflow-hidden hover:shadow-md cursor-pointer group flex flex-col" onClick={() => navigate(`/post/${post._id}`)}>
                  <div className="relative aspect-square">
                    <img 
                      src={post.images?.[0] || post.image || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} 
                      className="w-full h-full object-cover" 
                      alt={post.title} 
                    />
                    <div className="absolute top-2 right-2 text-white hover:text-[#FACC15] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </div>
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="text-sm text-[#1C1917] line-clamp-2 mb-1 group-hover:text-[#EA580C] transition-colors">{post.title}</h3>
                    <p className="text-[#EA580C] font-bold text-base mt-auto">{Number(post.price).toLocaleString('vi-VN')} đ</p>
                    <div className="flex items-center gap-1 text-[11px] text-stone-500 mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="truncate">{post.location}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-10 text-stone-500">Người dùng này chưa có tin đăng nào.</div>
            )}
          </div>
        </div>

        {/* Reviews Box */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-stone-100">
          <h2 className="text-lg font-bold text-[#1C1917] mb-4">Đánh giá</h2>
          
          <div className="flex flex-col md:flex-row gap-6 mb-6">
              <div className="bg-[#FEF9C3] rounded-xl p-6 flex flex-col items-center justify-center min-w-[200px]">
                  <div className="text-4xl font-bold text-[#1C1917] flex items-baseline gap-1">
                      {data.reviews?.length > 0 ? data.avgRating : 0} <span className="text-[#EAB308] text-2xl">★</span>
                  </div>
                  <div className="font-bold text-[#1C1917] mt-1">{data.reviews?.length > 0 ? 'Rất hài lòng' : 'Chưa có đánh giá'}</div>
                  <div className="text-xs text-stone-600 mt-1">({data.reviews?.length || 0} đánh giá từ người dùng)</div>
              </div>
              
              <div className="flex-1">
                  <div className="text-sm font-semibold text-[#1C1917] mb-3 flex items-center gap-1">
                      Người dùng đánh giá <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  {data.reviews && data.reviews.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1.5 border border-stone-200 rounded-full text-xs text-stone-600">Giao tiếp lịch sự, thân thiện ({data.reviews.length})</span>
                          <span className="px-3 py-1.5 border border-stone-200 rounded-full text-xs text-stone-600">Phản hồi tin nhắn nhanh ({Math.max(1, Math.floor(data.reviews.length * 0.8))})</span>
                          <span className="px-3 py-1.5 border border-stone-200 rounded-full text-xs text-stone-600">Đáng tin cậy ({Math.max(1, Math.floor(data.reviews.length * 0.9))})</span>
                      </div>
                  ) : (
                      <div className="text-sm text-stone-400 italic">Chưa có đủ dữ liệu đánh giá</div>
                  )}
              </div>
          </div>

          <div className="text-sm text-stone-500 mb-3">Lọc đánh giá theo</div>
          <div className="flex items-center gap-2 mb-6">
              <button className="px-3 py-1 bg-[#1C1917] text-white text-[13px] font-semibold rounded-full">Tất cả ({data.reviews?.length || 0})</button>
              <button className="px-3 py-1 bg-white border border-stone-200 text-stone-600 text-[13px] font-semibold rounded-full hover:bg-stone-50">Từ người mua ({data.reviews?.length || 0})</button>
              <button className="px-3 py-1 bg-white border border-stone-200 text-stone-600 text-[13px] font-semibold rounded-full hover:bg-stone-50">Từ người bán (0)</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.reviews && data.reviews.length > 0 ? (
                data.reviews.map(rev => (
                  <div key={rev._id} className="border border-stone-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <img 
                        src={rev.buyer?.avatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'} 
                        className="w-10 h-10 rounded-full object-cover" 
                        alt="buyer" 
                      />
                      <div>
                          <div className="font-bold text-sm text-[#1C1917]">{rev.buyer?.name || 'Người dùng'}</div>
                          <div className="flex items-center gap-2">
                              <div className="text-[#FACC15] text-[10px]">{"★".repeat(rev.rating)}{"☆".repeat(5-rev.rating)}</div>
                              <span className="text-[10px] text-stone-400">• vài ngày trước</span>
                          </div>
                      </div>
                    </div>
                    <div className="mt-3">
                        <span className="px-2 py-1 bg-stone-100 text-stone-600 text-[11px] rounded">Giao tiếp lịch sự, thân thiện</span>
                    </div>
                    <p className="text-sm text-[#1C1917] mt-3">"{rev.comment}"</p>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-6 text-stone-500 text-sm">Chưa có đánh giá nào cho người bán này.</div>
              )}
          </div>
        </div>

      </div>
      <AppFooter />
    </div>
  );
};

export default PublicProfile;