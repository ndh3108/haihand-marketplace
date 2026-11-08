const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const trackRouter = require('../routes/track');
const recommendationsRouter = require('../routes/recommendations');

describe('Tracking & Recommendations API Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', trackRouter);
    app.use('/api', recommendationsRouter);
  });

  describe('GET /api/track/status', () => {
    test('returns active status and ttl settings', async () => {
      const res = await request(app).get('/api/track/status');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('active');
      expect(res.body.ttlDays).toBe(90);
    });
  });

  describe('POST /api/track bot detection & input validation', () => {
    test('silently ignores crawler / bot user agents without error', async () => {
      const res = await request(app)
        .post('/api/track')
        .set('User-Agent', 'Googlebot/2.1 (+http://www.google.com/bot.html)')
        .send({
          type: 'product_view',
          anonymousId: 'anon_crawler_123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.ignored).toBe('bot');
      expect(res.body.count).toBe(0);
    });

    test('rejects payload when event list is empty or invalid', async () => {
      const res = await request(app)
        .post('/api/track')
        .send({ events: [] });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/recommendations endpoints resiliency', () => {
    test('GET /api/recommendations/recently-viewed returns 200 and an array', async () => {
      const res = await request(app).get('/api/recommendations/recently-viewed');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/recommendations/for-you returns 200 and an array', async () => {
      const res = await request(app).get('/api/recommendations/for-you');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    }, 15000);

    test('GET /api/recommendations/similar/:productId handles invalid ID safely', async () => {
      const res = await request(app).get('/api/recommendations/similar/invalid-id');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual([]);
    });

    test('GET /api/recommendations/also-viewed/:productId handles invalid ID safely', async () => {
      const res = await request(app).get('/api/recommendations/also-viewed/invalid-id');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual([]);
    });
  });
});
