/**
 * Seed education/blog posts with placeholder images (no stock photos).
 * Usage: node scripts/seedBlogPosts.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const BlogPost = require('../src/models/BlogPost');

const PLACEHOLDER =
  process.env.PRODUCT_PLACEHOLDER_URL
  || 'https://meek-conkies-2480f7.netlify.app/products/placeholder.svg';

const POSTS = [
  { postId: 'clear-pimples', title: 'How to Clear Pimples', excerpt: 'Expert tips for clearing breakouts and maintaining clear, healthy skin.', category: 'Skincare', date: '2026-06-15', sortOrder: 1 },
  { postId: 'hair-growth-skill', title: 'Growing Hair Is a Skill', excerpt: 'Learn the techniques and habits that promote healthy hair growth.', category: 'Hair Care', date: '2026-06-10', sortOrder: 2 },
  { postId: 'hair-breakage', title: 'Hair Breakage Foundation', excerpt: 'Understanding the root causes of hair breakage and how to prevent it.', category: 'Hair Care', date: '2026-06-05', sortOrder: 3 },
  { postId: 'clean-hair-grows', title: 'Why Clean Hair Grows Better', excerpt: 'The science behind scalp health and its impact on hair growth.', category: 'Hair Care', date: '2026-05-28', sortOrder: 4 },
  { postId: 'damaged-barrier', title: 'Signs of a Damaged Skin Barrier', excerpt: 'Recognize the warning signs and learn how to repair your skin barrier.', category: 'Skincare', date: '2026-05-20', sortOrder: 5 },
  { postId: 'melasma-care', title: 'Melasma Care Guide', excerpt: 'A comprehensive guide to understanding and treating melasma.', category: 'Skincare', date: '2026-05-15', sortOrder: 6 },
  { postId: 'glass-skin', title: 'Glass Skin Guide', excerpt: 'Achieve the coveted glass skin look with our step-by-step routine.', category: 'Skincare', date: '2026-05-08', sortOrder: 7 },
  { postId: 'titanium-dioxide', title: 'Titanium Dioxide Sunscreen Benefits', excerpt: 'Why mineral sunscreens with titanium dioxide are essential for skin health.', category: 'Skincare', date: '2026-04-30', sortOrder: 8 },
  { postId: 'hydration-vs-moisture', title: 'Hydration vs Moisturizing', excerpt: 'Understanding the difference and why your skin needs both.', category: 'Skincare', date: '2026-04-22', sortOrder: 9 },
  { postId: 'face-oil-myths', title: 'Face Oil Myths', excerpt: 'Debunking common misconceptions about using oils on your face.', category: 'Skincare', date: '2026-04-15', sortOrder: 10 },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  for (const post of POSTS) {
    await BlogPost.findOneAndUpdate(
      { postId: post.postId },
      {
        ...post,
        date: new Date(post.date),
        imageUrl: PLACEHOLDER,
        placeholder: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('Upserted:', post.postId);
  }

  console.log('Total posts:', await BlogPost.countDocuments());
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
