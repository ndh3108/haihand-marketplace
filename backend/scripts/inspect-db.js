const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
require('../models/User'); // Register User model

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const { getForYou, getRecentlyViewed } = require('../services/recommendationService');
  const forYouResult = await getForYou({ limit: 10 });
  console.log('forYouResult count:', forYouResult.length);
  if (forYouResult.length > 0) {
    console.log('First 3 for you items:');
    forYouResult.slice(0, 3).forEach(p => console.log('-', p.title || p.name, `(${p.price?.toLocaleString()}đ) - Reason: ${p.recoReason}`));
  }

  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
