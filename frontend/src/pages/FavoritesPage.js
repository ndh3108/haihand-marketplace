import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { RecommendationSection } from '../components/RecommendationSection';

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;
      try {
        const { data } = await axios.get(`${API_URL}/api/users/favorites/${user._id}`);
        setFavorites(data);
      } catch (error) { console.error(error); }
    };
    fetchFavorites();
  }, [user?._id]);

  const handleRemoveFavorite = async (e, postId) => {
    e.stopPropagation(); 
    try {
      await axios.post(`${API_URL}/api/users/favorites`, { userId: user._id, postId: postId });
      setFavorites(favorites.filter(item => item._id !== postId));
    } catch (error) { console.error(error); }
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

  if (!user) return <div className="p-5 text-center fw-bold fs-4">Vui lòng đăng nhập để xem mục Yêu thích!</div>;

  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: '#f9f9f9' }}>
      <style>
        {`
          .heart-btn-hover { transition: all 0.2s ease-in-out; }
          .heart-btn-hover:hover { transform: scale(1.15); }
          .heart-btn-hover:active { transform: scale(0.9); }
          .hover-shadow:hover { box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.15) !important; transform: translateY(-2px); transition: all 0.2s; }
        `}
      </style>

      <AppHeader />

      <div className="container py-5 flex-grow-1">
        <button onClick={() => navigate(-1)} className="btn btn-warning fw-bold mb-4 rounded-pill px-4 shadow-sm">
          ⬅ Quay lại
        </button>
        
        <h2 className="fw-bold mb-4 text-danger">❤️ Danh sách Yêu thích</h2>
        
        {favorites.length === 0 ? (
          <div className="text-center p-5 bg-white shadow-sm rounded-4">
            <div style={{ fontSize: '80px', marginBottom: '20px', opacity: 0.5 }}>💔</div>
            <h4 className="text-muted fw-bold">Bạn chưa lưu sản phẩm nào.</h4>
            <p className="text-muted">Hãy lướt một vòng và thả tim cho món đồ bạn thích nhé!</p>
            <button onClick={() => navigate('/')} className="btn btn-warning mt-3 fw-bold rounded-pill px-5 py-3 fs-5 shadow-sm">
              Khám phá ngay
            </button>
          </div>
        ) : (
          <div className="row">
            {favorites.map((post) => (
              <div className="col-6 col-md-3 mb-4" key={post._id}>
                <div className="card h-100 border-0 shadow-sm hover-shadow position-relative" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                  
                  
                  <button 
                    onClick={(e) => handleRemoveFavorite(e, post._id)} 
                    className="position-absolute m-2 btn btn-light shadow-sm rounded-circle d-flex justify-content-center align-items-center heart-btn-hover" 
                    style={{ width: '35px', height: '35px', zIndex: 10, top: 0, right: 0, padding: 0 }} 
                    title="Bỏ lưu tin"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#dc3545">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>

                  <div style={{ height: '180px', overflow: 'hidden', cursor: 'pointer' }} className="bg-light d-flex align-items-center justify-content-center position-relative" onClick={() => navigate(`/post/${post._id}`)}>
                    
                    <img 
                        src={getImageUrl(post)} 
                        className="card-img-top" 
                        alt={post.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => { e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png' }} 
                    />
                  </div>
                  <div className="card-body p-3 d-flex flex-column" onClick={() => navigate(`/post/${post._id}`)} style={{ cursor: 'pointer' }}>
                    <h6 className="card-title text-truncate fw-bold mb-1" style={{ fontSize: '14px', color: '#333' }}>{post.title}</h6>
                    <p className="text-danger fw-bold fs-6 mb-2">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(post.price)}</p>
                    <div className="mt-auto d-flex justify-content-between align-items-center border-top pt-2">
                      <small className="text-muted" style={{ fontSize: '11px' }}>📍 {post.location || 'Toàn quốc'}</small>
                      <span className="badge bg-light text-muted fw-normal" style={{ fontSize: '10px' }}>{post.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5">
          <RecommendationSection
            title="Gợi ý dành cho bạn"
            subtitle="Các món đồ hấp dẫn có thể bạn sẽ muốn lưu lại"
            icon="❤️"
            fetchUrl="/api/recommendations/for-you"
            sourceName="favorites"
            currentUser={user}
            limit={8}
          />
        </div>
      </div>

      <AppFooter /> 
    </div>
  );
};

export default FavoritesPage;