const {
  applyDecay,
  calculatePriceStats,
  determineSegment
} = require('../services/behaviorAnalysisService');
const {
  applyCatalogFilters,
  cosineSimilarity
} = require('../services/recommendationService');
const {
  EVENT_WEIGHTS,
  HALF_LIFE_MS,
  RECOMMENDATION
} = require('../config/behaviorConfig');

describe('Behavior Analysis & Recommendation Engine Tests', () => {

  describe('1. Temporal Exponential Decay (Half-life = 14 days)', () => {
    test('score decays to exactly 50% after one half-life period', () => {
      const initialScore = 10.0;
      const t0 = new Date('2026-01-01T00:00:00Z');
      const t14DaysLater = new Date(t0.getTime() + HALF_LIFE_MS);

      const decayed = applyDecay(initialScore, t0, t14DaysLater);
      expect(decayed).toBeCloseTo(5.0, 3);
    });

    test('score remains identical with 0 elapsed time', () => {
      const initialScore = 8.0;
      const t0 = new Date('2026-01-01T12:00:00Z');

      const decayed = applyDecay(initialScore, t0, t0);
      expect(decayed).toBe(8.0);
    });

    test('score decays to 25% after two half-life periods (28 days)', () => {
      const initialScore = 16.0;
      const t0 = new Date('2026-01-01T00:00:00Z');
      const t28DaysLater = new Date(t0.getTime() + 2 * HALF_LIFE_MS);

      const decayed = applyDecay(initialScore, t0, t28DaysLater);
      expect(decayed).toBeCloseTo(4.0, 3);
    });

    test('handles 0 or negative scores safely without errors', () => {
      expect(applyDecay(0, new Date())).toBe(0);
      expect(applyDecay(-5, new Date())).toBe(0);
    });
  });

  describe('2. Price Statistics (Median & IQR calculation)', () => {
    test('computes median, IQR and preferred bounds correctly for price samples', () => {
      const prices = [100000, 200000, 300000, 400000, 500000];
      const stats = calculatePriceStats(prices);

      expect(stats.median).toBe(300000);
      expect(stats.sampleCount).toBe(5);
      expect(stats.minPreferred).toBeLessThanOrEqual(stats.median);
      expect(stats.maxPreferred).toBeGreaterThanOrEqual(stats.median);
    });

    test('handles empty or invalid price lists gracefully', () => {
      const emptyStats = calculatePriceStats([]);
      expect(emptyStats.median).toBe(0);
      expect(emptyStats.sampleCount).toBe(0);

      const invalidStats = calculatePriceStats(['invalid', null, undefined, -100]);
      expect(invalidStats.sampleCount).toBe(0);
    });
  });

  describe('3. User Segment Determination', () => {
    test('classifies as buyer when purchase events exist', () => {
      const segment = determineSegment({}, [{ type: 'purchase' }]);
      expect(segment).toBe('buyer');
    });

    test('classifies as high_intent when cart_add or favorite_add exists', () => {
      const segment = determineSegment({}, [{ type: 'cart_add' }]);
      expect(segment).toBe('high_intent');

      const segmentFav = determineSegment({}, [{ type: 'favorite_add' }]);
      expect(segmentFav).toBe('high_intent');
    });

    test('classifies as browsing when >= 3 views exist', () => {
      const events = [
        { type: 'product_view' },
        { type: 'product_view' },
        { type: 'product_view' }
      ];
      const segment = determineSegment({}, events);
      expect(segment).toBe('browsing');
    });

    test('defaults to new for empty interactions', () => {
      const segment = determineSegment({}, []);
      expect(segment).toBe('new');
    });
  });

  describe('4. Cosine Similarity for Content Embeddings', () => {
    test('returns 1.0 for identical vectors', () => {
      const vecA = [0.2, 0.5, 0.8];
      const sim = cosineSimilarity(vecA, vecA);
      expect(sim).toBeCloseTo(1.0, 5);
    });

    test('returns 0 for orthogonal vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      const sim = cosineSimilarity(vecA, vecB);
      expect(sim).toBe(0);
    });

    test('returns 0 for mismatched lengths or invalid inputs', () => {
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
      expect(cosineSimilarity(null, [1, 2])).toBe(0);
      expect(cosineSimilarity([], [])).toBe(0);
    });
  });

  describe('5. Catalog Visibility & Diversity Rules in Recommendations', () => {
    const mockProducts = [
      { _id: 'p1', title: 'Máy ảnh Canon', status: 'active', stockQuantity: 2, sellerId: 'sellerA' },
      { _id: 'p2', title: 'Ống kính Sony', status: 'active', stockQuantity: 1, sellerId: 'sellerA' },
      { _id: 'p3', title: 'Chân máy', status: 'active', stockQuantity: 3, sellerId: 'sellerA' }, // 3rd item from sellerA
      { _id: 'p4', title: 'Đèn Flash', status: 'APPROVED', stockQuantity: 5, sellerId: 'sellerB' },
      { _id: 'p5', title: 'Túi máy ảnh', status: 'inactive', stockQuantity: 4, sellerId: 'sellerC' }, // Inactive
      { _id: 'p6', title: 'Pin phụ', status: 'active', stockQuantity: 0, sellerId: 'sellerD' }, // Out of stock
      { _id: 'p7', title: 'Thẻ nhớ', status: 'active', stockQuantity: 1, sellerId: 'userMe' } // Own product
    ];

    test('strictly enforces CATALOG_VISIBLE (rejects inactive, out_of_stock, zero stock)', () => {
      const filtered = applyCatalogFilters(mockProducts, {
        currentUserId: 'userMe',
        maxPerSeller: 2
      });

      const ids = filtered.map((p) => p._id);
      expect(ids).not.toContain('p5'); // status inactive
      expect(ids).not.toContain('p6'); // stock 0
    });

    test('excludes own products of current user', () => {
      const filtered = applyCatalogFilters(mockProducts, {
        currentUserId: 'userMe',
        maxPerSeller: 2
      });

      const ids = filtered.map((p) => p._id);
      expect(ids).not.toContain('p7'); // belongs to userMe
    });

    test('enforces seller diversity limit (maximum 2 products per seller)', () => {
      const filtered = applyCatalogFilters(mockProducts, {
        currentUserId: 'otherUser',
        maxPerSeller: 2
      });

      const sellerAProducts = filtered.filter((p) => p.sellerId === 'sellerA');
      expect(sellerAProducts.length).toBeLessThanOrEqual(2);
      expect(sellerAProducts.map((p) => p._id)).toEqual(['p1', 'p2']);
      expect(filtered.map((p) => p._id)).not.toContain('p3'); // capped at 2
    });
  });

  describe('6. Behavioral Weights & Privacy Guards', () => {
    test('weights match specification: view=1, dwell=2, favorite=4, cart=5, purchase=8', () => {
      expect(EVENT_WEIGHTS.product_view).toBe(1.0);
      expect(EVENT_WEIGHTS.product_dwell).toBe(2.0);
      expect(EVENT_WEIGHTS.favorite_add).toBe(4.0);
      expect(EVENT_WEIGHTS.cart_add).toBe(5.0);
      expect(EVENT_WEIGHTS.purchase).toBe(8.0);
      expect(EVENT_WEIGHTS.search_click).toBe(1.5);
    });

    test('recommendation constants defined with correct bounds', () => {
      expect(RECOMMENDATION.VIEW_DEDUPE_MS).toBe(30 * 60 * 1000); // 30 minutes
      expect(RECOMMENDATION.MIN_DWELL_SECONDS).toBe(5);
      expect(RECOMMENDATION.SIGNIFICANT_DWELL_SECONDS).toBe(30);
      expect(RECOMMENDATION.MAX_DWELL_SECONDS).toBe(300);
      expect(RECOMMENDATION.MAX_PER_SELLER).toBe(2);
    });
  });
});

