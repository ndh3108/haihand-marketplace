/**
 * Shared Product Mapper for ProductCard component
 * HaiHand Marketplace
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
const PLACEHOLDER_IMG = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';

/**
 * Format timestamp into friendly Vietnamese relative time
 */
export function formatTimeAgo(dateString) {
  if (!dateString) return 'Vừa xong';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 30) return `${days} ngày trước`;
  return new Date(dateString).toLocaleDateString('vi-VN');
}

/**
 * Extract clean, normalized image URL
 */
export function getProductImageUrl(post) {
  if (!post) return PLACEHOLDER_IMG;

  if (Array.isArray(post.images) && post.images.length > 0 && post.images[0]) {
    const first = post.images[0];
    return first.startsWith('http') ? first : `${API_URL}/${first.replace(/\\/g, '/')}`;
  }

  if (post.image && typeof post.image === 'string') {
    return post.image.startsWith('http') ? post.image : `${API_URL}/uploads/${post.image}`;
  }

  return PLACEHOLDER_IMG;
}

/**
 * Map raw MongoDB Post/Product document to standard ProductCard props
 */
export function mapPostToProductCard(post, currentUser = null, favoriteIds = []) {
  if (!post) return null;

  const currentUserId = currentUser?._id ? currentUser._id.toString() : null;
  const authorId = post.author?._id ? post.author._id.toString() : (post.author || post.sellerId?._id || post.sellerId || '').toString();

  const isAuthor = Boolean(currentUserId && authorId && currentUserId === authorId);
  const isFavorited = Array.isArray(favoriteIds) && favoriteIds.some((fav) => {
    const fid = fav?._id ? fav._id.toString() : fav.toString();
    return fid === post._id?.toString();
  });

  return {
    product: {
      id: post._id ? post._id.toString() : '',
      title: post.title || post.name || 'Sản phẩm HaiHand',
      price: Number(post.price) || 0,
      imageUrl: getProductImageUrl(post),
      condition: post.condition || 'Đã qua sử dụng',
      location: post.location || 'Toàn quốc',
      timeAgo: formatTimeAgo(post.createdAt || post.date),
      category: post.category || 'Khác',
      recoSource: post.recoSource || null,
      recoReason: post.recoReason || null
    },
    isAuthor,
    isFavorited,
    rawPost: post
  };
}

