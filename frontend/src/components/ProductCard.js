import React from 'react';
import { Link } from 'react-router-dom';
import { ConditionBadge } from './ConditionBadge';

export const ProductCard = ({ product, isFavorited, isAuthor, onFavorite }) => {
  return (
    <article className="bg-[#FFFFFF] border border-[#E7E5E4] rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col group">
      <Link to={`/post/${product.id}`} className="relative w-full aspect-square overflow-hidden bg-stone-50 block">
        <img 
          src={product.imageUrl} 
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 rounded-t-lg" 
          onError={(e) => {e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'}}
        />
        <ConditionBadge 
          condition={product.condition} 
          className="absolute top-2 left-2 shadow-sm" 
        />
        {!isAuthor && (
          <button 
            aria-label={isFavorited ? "Bỏ yêu thích" : "Yêu thích"}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFavorite(e); }}
            className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-colors shadow-sm ${isFavorited ? 'bg-white text-red-500' : 'bg-white/80 hover:bg-white text-stone-500'}`}
          >
            {isFavorited ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>
        )}
      </Link>
      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
        <h3 className="text-sm font-medium text-stone-900 line-clamp-2 leading-snug">
          <Link to={`/post/${product.id}`} className="hover:underline">
            {product.title}
          </Link>
        </h3>
        <div className="pt-1">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold text-[#EA580C]">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
            </span>
          </div>
          <div className="mt-2 space-y-0.5 text-stone-500 text-xs">
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{product.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{product.timeAgo}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
