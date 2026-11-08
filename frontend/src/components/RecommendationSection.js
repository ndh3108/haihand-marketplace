import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { ProductCard } from './ProductCard';
import { mapPostToProductCard } from '../utils/productMapper';
import {
  trackRecommendationImpression,
  trackRecommendationClick
} from '../utils/tracker';

const ProductSkeleton = () => (
  <div className="bg-white border border-[#E7E5E4] rounded-lg p-3 animate-pulse">
    <div className="w-full aspect-square bg-stone-200 rounded-md mb-3" />
    <div className="h-4 bg-stone-200 rounded w-3/4 mb-2" />
    <div className="h-4 bg-stone-200 rounded w-1/2" />
  </div>
);

export const RecommendationSection = ({
  title,
  subtitle,
  icon,
  fetchUrl,
  products: initialProducts = null,
  sourceName = 'recommendation',
  currentUser = null,
  favoriteIds = [],
  onFavorite = () => {},
  limit = 10,
  className = ''
}) => {
  const [items, setItems] = useState(initialProducts || []);
  const [isLoading, setIsLoading] = useState(Boolean(fetchUrl && !initialProducts));
  const sectionRef = useRef(null);
  const impressionSentRef = useRef(false);

  // Fetch recommendations if fetchUrl is provided
  useEffect(() => {
    if (initialProducts) {
      setItems(initialProducts);
      setIsLoading(false);
      return;
    }

    if (!fetchUrl) return;

    let isMounted = true;
    setIsLoading(true);

    axiosClient
      .get(fetchUrl, { params: { limit } })
      .then((res) => {
        if (!isMounted) return;
        const data = Array.isArray(res.data) ? res.data : [];
        setItems(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn(`[RecommendationSection] Fetch failed for ${sourceName}:`, err.message);
        setItems([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fetchUrl, initialProducts, limit, sourceName]);

  // Track impression when section enters viewport
  useEffect(() => {
    if (isLoading || items.length === 0 || impressionSentRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting && !impressionSentRef.current) {
          impressionSentRef.current = true;
          trackRecommendationImpression(
            sourceName,
            items.map((it) => it._id || it.id)
          );
        }
      },
      { threshold: 0.25 }
    );

    const currentElem = sectionRef.current;
    if (currentElem) observer.observe(currentElem);

    return () => {
      if (currentElem) observer.unobserve(currentElem);
    };
  }, [isLoading, items, sourceName]);

  // If not loading and no items, hide the entire section cleanly
  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <section ref={sectionRef} className={`my-8 ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#EA580C] flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-xl md:text-2xl font-black text-[#1C1917] tracking-tight flex items-center gap-2">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs md:text-sm text-stone-500 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Product Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: Math.min(5, limit) }).map((_, idx) => (
            <ProductSkeleton key={idx} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((post) => {
            const mapped = mapPostToProductCard(post, currentUser, favoriteIds);
            if (!mapped) return null;

            return (
              <div
                key={post._id || post.id}
                onClick={() => trackRecommendationClick(post, sourceName)}
                className="transition-transform duration-200 hover:-translate-y-1 relative"
              >
                {post.recoReason && (
                  <div className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60 truncate max-w-full">
                    <span>✨</span>
                    <span className="truncate">{post.recoReason}</span>
                  </div>
                )}
                <ProductCard
                  product={mapped.product}
                  isFavorited={mapped.isFavorited}
                  isAuthor={mapped.isAuthor}
                  onFavorite={(e) => onFavorite(e, post._id || post.id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

