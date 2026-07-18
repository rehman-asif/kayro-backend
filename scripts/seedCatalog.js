/**
 * Restore the full product catalog with placeholder images only.
 * Does NOT delete products — upserts by productId so admin can edit/replace photos.
 *
 * Usage: node scripts/seedCatalog.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../src/models/Product');

const PLACEHOLDER =
  process.env.PRODUCT_PLACEHOLDER_URL
  || 'https://meek-conkies-2480f7.netlify.app/products/placeholder.svg';

const CATALOG = [
  { productId: 'vitamin-c-serum', name: 'Vitamin C Serum', category: 'Serums', price: 450, featured: true, description: 'Brightening serum with potent Vitamin C for radiant, even-toned skin.', ingredients: 'Vitamin C, Hyaluronic Acid, Botanical Extracts', benefits: ['Brightens skin', 'Reduces dark spots', 'Boosts collagen'] },
  { productId: 'goji-berry-serum', name: 'Goji Berry Serum', category: 'Serums', price: 480, featured: true, description: 'Antioxidant-rich serum infused with goji berry for youthful, glowing skin.', ingredients: 'Goji Berry Extract, Vitamin E, Rosehip Oil', benefits: ['Anti-aging', 'Antioxidant protection', 'Deep hydration'] },
  { productId: 'vitamin-c-ha-serum', name: 'Vitamin C Hyaluronic Acid Serum', category: 'Serums', price: 520, description: 'Dual-action serum combining Vitamin C with Hyaluronic Acid for plump, luminous skin.', ingredients: 'Vitamin C, Hyaluronic Acid, Niacinamide', benefits: ['Hydrating', 'Brightening', 'Plumping effect'] },
  { productId: 'glow-serum', name: 'Glow Serum', category: 'Serums', price: 490, description: 'Multi-benefit glow serum for an instant radiant complexion.', ingredients: 'Botanical Glow Complex, Vitamin B5, Squalane', benefits: ['Instant glow', 'Smooth texture', 'Even tone'] },
  { productId: 'lavender-soap', name: 'Lavender Soap', category: 'Soaps', price: 85, featured: true, description: 'Handcrafted lavender soap for calming, gentle cleansing.', ingredients: 'Lavender Essential Oil, Shea Butter, Olive Oil', benefits: ['Calming', 'Gentle cleanse', 'Moisturizing'] },
  { productId: 'goji-rosehip-soap', name: 'Goji Berry & Rosehip Soap', category: 'Soaps', price: 90, description: 'Nourishing soap with goji berry and rosehip for revitalized skin.', ingredients: 'Goji Berry, Rosehip Oil, Coconut Oil', benefits: ['Revitalizing', 'Antioxidant-rich', 'Soft skin'] },
  { productId: 'rooibos-soap', name: 'Rooibos Soap', category: 'Soaps', price: 85, description: 'South African rooibos-infused soap with antioxidant properties.', ingredients: 'Rooibos Extract, Cocoa Butter, Castor Oil', benefits: ['Antioxidant', 'Soothing', 'Natural cleanse'] },
  { productId: 'honey-oats-soap', name: 'Honey & Oats Soap', category: 'Soaps', price: 80, description: 'Gentle exfoliating soap with honey and oats for soft, smooth skin.', ingredients: 'Raw Honey, Colloidal Oats, Goat Milk', benefits: ['Exfoliating', 'Moisturizing', 'Gentle'] },
  { productId: 'rice-kaolin-soap', name: 'Rice Flour & Kaolin Clay Soap', category: 'Soaps', price: 85, description: 'Purifying soap with rice flour and kaolin clay for balanced skin.', ingredients: 'Rice Flour, Kaolin Clay, Jojoba Oil', benefits: ['Purifying', 'Oil control', 'Brightening'] },
  { productId: 'coconut-oat-soap', name: 'Coconut Milk & Oat Soap', category: 'Soaps', price: 80, description: 'Creamy coconut milk soap with oats for deep nourishment.', ingredients: 'Coconut Milk, Oats, Almond Oil', benefits: ['Deep nourishment', 'Gentle', 'Hydrating'] },
  { productId: 'coffee-cedarwood-soap', name: 'Coffee & Cedarwood Soap', category: 'Soaps', price: 85, description: 'Invigorating coffee and cedarwood soap for an energizing cleanse.', ingredients: 'Coffee Grounds, Cedarwood Oil, Shea Butter', benefits: ['Exfoliating', 'Energizing', 'Aromatherapy'] },
  { productId: 'neem-soap', name: 'Neem Soap', category: 'Soaps', price: 90, comingSoon: true, description: 'Antibacterial neem soap for clear, healthy skin. Coming soon.', ingredients: 'Neem Extract, Tea Tree Oil, Coconut Oil', benefits: ['Antibacterial', 'Acne-fighting', 'Purifying'] },
  { productId: 'hair-growth-oil', name: 'Extreme Hair Growth Oil', category: 'Hair Care', price: 350, featured: true, description: 'Powerful botanical oil blend for extreme hair growth and thickness.', ingredients: 'Castor Oil, Rosemary, Peppermint, Biotin', benefits: ['Hair growth', 'Thickens hair', 'Strengthens roots'] },
  { productId: 'hair-butter', name: 'Hair Butter', category: 'Hair Care', price: 280, description: 'Rich hair butter for deep moisture and curl definition.', ingredients: 'Shea Butter, Mango Butter, Argan Oil', benefits: ['Deep moisture', 'Curl definition', 'Frizz control'] },
  { productId: 'moisturizing-shampoo', name: 'Moisturizing and Conditioning Shampoo', category: 'Hair Care', price: 220, description: 'Gentle shampoo that cleanses while deeply conditioning hair.', ingredients: 'Aloe Vera, Coconut Oil, Silk Proteins', benefits: ['Moisturizing', 'Gentle cleanse', 'Soft hair'] },
  { productId: 'hair-growth-combo', name: 'Extreme Hair Growth Combo', category: 'Hair Care', price: 580, featured: true, description: 'Complete hair growth system with oil and complementary products.', ingredients: 'Growth Oil, Hair Butter, Shampoo', benefits: ['Complete system', 'Maximum growth', 'Best value'] },
  { productId: 'coffee-scrub', name: 'Coffee Scrub', category: 'Body Care', price: 180, featured: true, description: 'Exfoliating coffee body scrub for smooth, glowing skin.', ingredients: 'Coffee Grounds, Coconut Oil, Brown Sugar', benefits: ['Exfoliating', 'Cellulite reduction', 'Smooth skin'] },
  { productId: 'stretch-mark-oil', name: 'Stretch Mark Oil', category: 'Body Care', price: 320, featured: true, description: 'Targeted oil to reduce the appearance of stretch marks.', ingredients: 'Rosehip Oil, Vitamin E, Cocoa Butter', benefits: ['Reduces stretch marks', 'Skin elasticity', 'Nourishing'] },
  { productId: 'turmeric-body-oil', name: 'Turmeric Body Oil', category: 'Body Care', price: 280, description: 'Golden turmeric body oil for radiant, even-toned skin.', ingredients: 'Turmeric Extract, Sweet Almond Oil, Vitamin E', benefits: ['Brightening', 'Anti-inflammatory', 'Glowing skin'] },
  { productId: 'glowing-face-body-oil', name: 'Glowing Face and Body Oil', category: 'Body Care', price: 350, description: 'Multi-use glow oil for face and body radiance.', ingredients: 'Jojoba Oil, Marula Oil, Vitamin C', benefits: ['All-over glow', 'Lightweight', 'Versatile'] },
  { productId: 'dark-spot-corrector', name: 'Dark Spot Corrector', category: 'Body Care', price: 380, description: 'Targeted treatment for dark spots and hyperpigmentation.', ingredients: 'Kojic Acid, Niacinamide, Licorice Root', benefits: ['Fades dark spots', 'Even tone', 'Brightening'] },
  { productId: 'dark-inner-thigh-cream', name: 'Dark Inner Thigh Cream', category: 'Body Care', price: 290, description: 'Specialized cream for dark inner thigh areas.', ingredients: 'Alpha Arbutin, Kojic Acid, Shea Butter', benefits: ['Lightens dark areas', 'Moisturizing', 'Gentle formula'] },
  { productId: 'dark-armpits-rollon', name: 'Dark Armpits Roll-On', category: 'Body Care', price: 250, description: 'Convenient roll-on treatment for underarm darkening.', ingredients: 'Niacinamide, AHA, Aloe Vera', benefits: ['Lightens underarms', 'Easy application', 'Deodorizing'] },
  { productId: 'turmeric-glow-lotion', name: 'Turmeric Glow Up Body Lotion', category: 'Body Care', price: 260, description: 'Luxurious turmeric body lotion for all-over radiance.', ingredients: 'Turmeric, Shea Butter, Glycerin', benefits: ['Glowing skin', 'Deep hydration', 'Even tone'] },
  { productId: 'lemongrass-turmeric-wash', name: 'Lemongrass and Turmeric Body Wash', category: 'Body Care', price: 200, description: 'Refreshing body wash with lemongrass and turmeric.', ingredients: 'Lemongrass Oil, Turmeric, Coconut Surfactants', benefits: ['Refreshing', 'Antibacterial', 'Brightening'] },
  { productId: 'turmeric-glow-combo', name: 'Turmeric Glow Up Combo', category: 'Bundles', price: 650, featured: true, description: 'Complete turmeric glow system for radiant skin.', ingredients: 'Turmeric Body Oil, Glow Lotion, Body Wash', benefits: ['Complete glow system', 'Best value', 'Radiant skin'] },
  { productId: 'stretch-mark-glow-combo', name: 'Stretch Mark & Glow Combo', category: 'Bundles', price: 720, featured: true, description: 'Bundle combining stretch mark treatment with glow products.', ingredients: 'Stretch Mark Oil, Glow Oil, Body Lotion', benefits: ['Dual action', 'Complete care', 'Save more'] },
  { productId: 'complete-hair-combo', name: 'Complete Hair Care Bundle', category: 'Bundles', price: 850, featured: true, description: 'Full hair care system for growth, moisture, and strength.', ingredients: 'Growth Oil, Hair Butter, Shampoo', benefits: ['Complete hair system', 'Maximum results', 'Best savings'] },
  { productId: 'ylang-garden-diffuser', name: 'Ylang Garden Diffuser', category: 'Diffusers', price: 420, description: 'Floral ylang ylang reed diffuser for a serene home atmosphere.', ingredients: 'Ylang Ylang, Jasmine, Sandalwood', benefits: ['Relaxing aroma', 'Long-lasting', 'Elegant design'] },
  { productId: 'honey-queen-diffuser', name: 'Honey Queen Diffuser', category: 'Diffusers', price: 420, description: 'Warm honey and floral reed diffuser for cozy elegance.', ingredients: 'Honey Accord, Vanilla, Rose', benefits: ['Warm scent', 'Luxurious', 'Home wellness'] },
  { productId: 'lady-million', name: 'Lady Million', category: 'Perfumes', price: 550, description: 'Luxurious feminine fragrance with floral and amber notes.', ingredients: 'Floral, Amber, Vanilla', benefits: ['Long-lasting', 'Elegant scent', 'Signature fragrance'] },
  { productId: 'the-most-wanted', name: 'The Most Wanted', category: 'Perfumes', price: 550, description: 'Bold, captivating fragrance for the confident individual.', ingredients: 'Spice, Wood, Amber', benefits: ['Bold scent', 'All-day wear', 'Statement fragrance'] },
  { productId: 'be-delicious', name: 'Be Delicious', category: 'Perfumes', price: 520, description: "Fresh, fruity fragrance that's irresistibly delightful.", ingredients: 'Apple, Cucumber, White Rose', benefits: ['Fresh scent', 'Light & playful', 'Daily wear'] },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  for (const item of CATALOG) {
    await Product.findOneAndUpdate(
      { productId: item.productId },
      {
        ...item,
        featured: Boolean(item.featured),
        comingSoon: Boolean(item.comingSoon),
        imageUrl: PLACEHOLDER,
        placeholder: true,
        isDynamic: true,
        stock: item.comingSoon ? 0 : 25,
        publishedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('Upserted:', item.productId);
  }

  console.log('Total products:', await Product.countDocuments());
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
