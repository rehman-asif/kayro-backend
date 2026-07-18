const mongoose = require('mongoose');

const marketingSchema = new mongoose.Schema(
  {
    productDescription: { type: String, default: '' },
    instagramCaption: { type: String, default: '' },
    tiktokCaption: { type: String, default: '' },
    facebookCaption: { type: String, default: '' },
    hashtags: { type: String, default: '' },
    campaignIdeas: { type: String, default: '' },
    customerTarget: { type: String, default: '' },
    emailMessage: { type: String, default: '' },
    whatsappMessage: { type: String, default: '' },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Serums', 'Soaps', 'Hair Care', 'Body Care', 'Bundles', 'Diffusers', 'Perfumes'],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    ingredients: {
      type: String,
      default: '',
    },
    benefits: {
      type: [String],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    stock: {
      type: Number,
      default: 25,
      min: 0,
    },
    marketing: {
      type: marketingSchema,
      default: () => ({}),
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    isDynamic: {
      type: Boolean,
      default: true,
    },
    placeholder: {
      type: Boolean,
      default: false,
    },
    comingSoon: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
