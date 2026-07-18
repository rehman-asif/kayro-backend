/**
 * Seed signature-range categories with placeholder images (no stock photos).
 * Usage: node scripts/seedCategories.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../src/models/Category');

const PLACEHOLDER =
  process.env.PRODUCT_PLACEHOLDER_URL
  || 'https://meek-conkies-2480f7.netlify.app/products/placeholder.svg';

const CATEGORIES = [
  { slug: 'Serums', label: 'Serums', sortOrder: 1 },
  { slug: 'Soaps', label: 'Soaps', sortOrder: 2 },
  { slug: 'Hair Care', label: 'Hair Care', sortOrder: 3 },
  { slug: 'Body Care', label: 'Body Care', sortOrder: 4 },
  { slug: 'Bundles', label: 'Bundles', sortOrder: 5 },
  { slug: 'Diffusers', label: 'Diffusers', sortOrder: 6 },
  { slug: 'Perfumes', label: 'Perfumes', sortOrder: 7 },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  for (const cat of CATEGORIES) {
    await Category.findOneAndUpdate(
      { slug: cat.slug },
      {
        ...cat,
        imageUrl: PLACEHOLDER,
        placeholder: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('Upserted category:', cat.slug);
  }

  console.log('Total categories:', await Category.countDocuments());
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
