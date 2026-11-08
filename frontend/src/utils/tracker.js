/**
 * User Behavioral Tracker
 * HaiHand Marketplace
 * Non-blocking, privacy-first, batching behavioral analytics client
 */

import axiosClient from '../api/axiosClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
const TRACK_ENDPOINT = `${API_URL}/api/track`;
const OPTOUT_KEY = 'haihand_track_optout';
const ANON_ID_KEY = 'haihand_anon_id';
const SESSION_ID_KEY = 'haihand_session_id';
const VIEW_CACHE_PREFIX = 'hh_view_';

// 30 minutes view deduplication window
const VIEW_DEDUPE_MS = 30 * 60 * 1000;

/**
 * Generate cryptographically strong or pseudo-random UUID v4
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or initialize persistent anonymous ID
 */
export function getAnonymousId() {
  try {
    let anonId = localStorage.getItem(ANON_ID_KEY);
    if (!anonId || anonId === 'undefined') {
      anonId = 'anon_' + generateUUID();
      localStorage.setItem(ANON_ID_KEY, anonId);
    }
    return anonId;
  } catch {
    return 'anon_ephemeral_' + Math.random().toString(36).substring(2, 10);
  }
}

/**
 * Get or initialize session-scoped ID (dies when tab/browser closes)
 */
export function getSessionId() {
  try {
    let sessId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessId || sessId === 'undefined') {
      sessId = 'sess_' + generateUUID();
      sessionStorage.setItem(SESSION_ID_KEY, sessId);
    }
    return sessId;
  } catch {
    return 'sess_ephemeral';
  }
}

/**
 * Check if user has opted out of tracking
 */
export function isTrackingOptedOut() {
  try {
    return localStorage.getItem(OPTOUT_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Set privacy opt-out status
 */
export function setTrackingOptOut(optOut) {
  try {
    if (optOut) {
      localStorage.setItem(OPTOUT_KEY, 'true');
    } else {
      localStorage.removeItem(OPTOUT_KEY);
    }
    window.dispatchEvent(new CustomEvent('trackingOptOutChanged', { detail: { optOut } }));
  } catch (e) {
    console.warn('Failed to update tracking preference:', e);
  }
}

// In-memory queue for batching events
let eventQueue = [];
let batchTimer = null;

/**
 * Flush queued events to server via sendBeacon or keepalive fetch
 */
export function flushEvents() {
  if (isTrackingOptedOut() || eventQueue.length === 0) {
    eventQueue = [];
    return;
  }

  const batch = eventQueue.splice(0, 20);
  const payload = JSON.stringify({ events: batch });

  try {
    // 1. Prefer navigator.sendBeacon with Blob for non-blocking transport
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      const sent = navigator.sendBeacon(TRACK_ENDPOINT, blob);
      if (sent) return;
    }

    // 2. Fallback to keepalive fetch
    if (typeof fetch === 'function') {
      fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
      return;
    }

    // 3. Last fallback: axiosClient
    axiosClient.post('/api/track', { events: batch }).catch(() => {});
  } catch (err) {
    // Silently ignore tracking dispatch failure
  }
}

/**
 * Schedule batch transmission
 */
function scheduleFlush() {
  if (batchTimer) return;
  batchTimer = setTimeout(() => {
    batchTimer = null;
    flushEvents();
  }, 1500);
}

// Flush immediately when tab is being closed or hidden
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents();
    }
  });
  window.addEventListener('pagehide', () => {
    flushEvents();
  });
}

/**
 * Core event tracking function
 */
export function trackEvent({
  type,
  productId = null,
  category = '',
  price = null,
  query = '',
  source = 'other',
  meta = {}
}) {
  try {
    if (isTrackingOptedOut()) return;

    const anonId = getAnonymousId();
    const sessId = getSessionId();

    const event = {
      anonymousId: anonId,
      sessionId: sessId,
      type,
      productId: productId ? String(productId) : null,
      category: category ? String(category) : '',
      price: typeof price === 'number' && !isNaN(price) ? price : null,
      query: query ? String(query).slice(0, 200) : '',
      source: source || 'other',
      meta: meta && typeof meta === 'object' ? meta : {}
    };

    eventQueue.push(event);

    if (eventQueue.length >= 5) {
      flushEvents();
    } else {
      scheduleFlush();
    }
  } catch (err) {
    // Tracking must never crash user application
  }
}

/**
 * Deduplicated Product View Tracker (1 view per product per 30 minutes)
 */
export function trackProductView(product, source = 'detail') {
  if (!product || isTrackingOptedOut()) return;

  try {
    const pId = product.id || product._id;
    if (!pId) return;

    const cacheKey = VIEW_CACHE_PREFIX + pId;
    const lastViewedAt = sessionStorage.getItem(cacheKey);
    const now = Date.now();

    if (lastViewedAt && now - parseInt(lastViewedAt, 10) < VIEW_DEDUPE_MS) {
      // Deduplicated within 30 minutes, skip sending view event
      return;
    }

    sessionStorage.setItem(cacheKey, String(now));

    trackEvent({
      type: 'product_view',
      productId: pId,
      category: product.category || '',
      price: product.price || null,
      source,
      meta: {
        condition: product.condition || '',
        location: product.location || ''
      }
    });
  } catch (err) {
    // Silent fail
  }
}

/**
 * Real dwell time tracker using visibilitychange
 * Returns a cleanup function to be invoked on component unmount
 */
export function startProductDwellTracker(product, source = 'detail') {
  if (!product || isTrackingOptedOut()) return () => {};

  const pId = product.id || product._id;
  if (!pId) return () => {};

  let visibleStartTime = document.visibilityState === 'visible' ? Date.now() : null;
  let accumulatedDwellMs = 0;
  let hasSent = false;

  const flushDwell = () => {
    if (hasSent) return;

    if (visibleStartTime !== null) {
      accumulatedDwellMs += (Date.now() - visibleStartTime);
      visibleStartTime = null;
    }

    const dwellSeconds = Math.round(accumulatedDwellMs / 1000);

    // Only send dwell if viewed between 5 seconds and 300 seconds (5 mins)
    if (dwellSeconds >= 5) {
      hasSent = true;
      trackEvent({
        type: 'product_dwell',
        productId: pId,
        category: product.category || '',
        price: product.price || null,
        source,
        meta: {
          duration: Math.min(300, dwellSeconds)
        }
      });
      flushEvents();
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      visibleStartTime = Date.now();
    } else {
      if (visibleStartTime !== null) {
        accumulatedDwellMs += (Date.now() - visibleStartTime);
        visibleStartTime = null;
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', flushDwell);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', flushDwell);
    flushDwell();
  };
}

/**
 * Track Recommendation Section Impression (IntersectionObserver)
 */
export function trackRecommendationImpression(sectionName, productIds = []) {
  if (isTrackingOptedOut() || !productIds || productIds.length === 0) return;

  trackEvent({
    type: 'recommendation_impression',
    source: sectionName,
    meta: {
      section: sectionName,
      count: productIds.length,
      productIds: productIds.slice(0, 10).map(String)
    }
  });
}

/**
 * Track Click on Recommended Product
 */
export function trackRecommendationClick(product, sectionName) {
  if (!product || isTrackingOptedOut()) return;

  const pId = product.id || product._id;
  trackEvent({
    type: 'recommendation_click',
    productId: pId,
    category: product.category || '',
    price: product.price || null,
    source: sectionName,
    meta: {
      recoSource: product.recoSource || sectionName,
      recoReason: product.recoReason || ''
    }
  });
  flushEvents();
}

/**
 * Track Click on Product inside AI Chat
 */
export function trackChatProductClick(product) {
  if (!product || isTrackingOptedOut()) return;

  const pId = product.id || product._id;
  trackEvent({
    type: 'chat_product_click',
    productId: pId,
    category: product.category || '',
    price: product.price || null,
    source: 'chatbot',
    meta: {
      name: product.name || product.title || ''
    }
  });
  flushEvents();
}

/**
 * Helper to sync anonymous history to user account after login
 */
export async function syncAnonymousIdentity(token) {
  try {
    const anonId = localStorage.getItem(ANON_ID_KEY);
    if (!anonId) return;

    await axiosClient.post('/api/track/merge', { anonymousId: anonId }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    // Silent fail
  }
}

