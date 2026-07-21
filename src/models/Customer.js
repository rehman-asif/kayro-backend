const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    customerType: {
      type: String,
      enum: ['retail', 'wholesale', 'vip', 'walk_in'],
      default: 'retail',
    },
    status: {
      type: String,
      enum: ['new', 'active', 'vip', 'inactive'],
      default: 'new',
    },
    notes: { type: String, default: '' },
    totalSpent: { type: Number, default: 0, min: 0 },
    lastPurchaseAt: { type: Date, default: null },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    loyaltyTier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'vip'],
      default: 'bronze',
    },
    source: {
      type: String,
      enum: ['website', 'pos', 'whatsapp', 'facebook', 'instagram', 'tiktok', 'referral', 'walk_in', 'manual', 'register'],
      default: 'manual',
    },
    birthday: { type: Date, default: null },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ name: 'text', email: 'text', phone: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
