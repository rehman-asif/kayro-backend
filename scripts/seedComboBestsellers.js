/**
 * Seed combo bestsellers as placeholders (upsert only — never deletes catalog).
 *
 * Usage: node scripts/seedComboBestsellers.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../src/models/Product');

const PLACEHOLDER =
  process.env.PRODUCT_PLACEHOLDER_URL
  || 'https://meek-conkies-2480f7.netlify.app/products/placeholder.svg';

const COMBOS = [
  {
    productId: 'turmeric-glow-combo',
    name: 'Turmeric Glow Up Combo',
    category: 'Bundles',
    price: 650,
    description: 'Complete turmeric glow system for radiant skin.',
    ingredients: 'Turmeric Body Oil, Glow Lotion, Body Wash',
    benefits: ['Complete glow system', 'Best value', 'Radiant skin'],
    featured: true,
    placeholder: true,
    stock: 25,
  },
  {
    productId: 'stretch-mark-glow-combo',
    name: 'Stretch Mark & Glow Combo',
    category: 'Bundles',
    price: 720,
    description: 'Bundle combining stretch mark treatment with glow products.',
    ingredients: 'Stretch Mark Oil, Glow Oil, Body Lotion',
    benefits: ['Dual action', 'Complete care', 'Save more'],
    featured: true,
    placeholder: true,
    stock: 25,
  },
  {
    productId: 'complete-hair-combo',
    name: 'Complete Hair Care Bundle',
    category: 'Bundles',
    price: 850,
    description: 'Full hair care system for growth, moisture, and strength.',
    ingredients: 'Growth Oil, Hair Butter, Shampoo',
    benefits: ['Complete hair system', 'Maximum results', 'Best savings'],
    featured: true,
    placeholder: true,
    stock: 25,
  },
  {
    productId: 'hair-growth-combo',
    name: 'Extreme Hair Growth Combo',
    category: 'Hair Care',
    price: 580,
    description: 'Complete hair growth system with oil and complementary products.',
    ingredients: 'Growth Oil, Hair Butter, Shampoo',
    benefits: ['Complete system', 'Maximum growth', 'Best value'],
    featured: true,
    placeholder: true,
    stock: 25,
  },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  for (const combo of COMBOS) {
    await Product.findOneAndUpdate(
      { productId: combo.productId },
      {
        ...combo,
        imageUrl: PLACEHOLDER,
        isDynamic: true,
        publishedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('Upserted combo:', combo.productId);
  }

  const count = await Product.countDocuments();
  console.log('Total products now:', count);
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
