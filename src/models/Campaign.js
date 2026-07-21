const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    targetAudience: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed'],
      default: 'draft',
    },
    channel: {
      type: String,
      enum: ['facebook', 'instagram', 'tiktok', 'whatsapp', 'website', 'referral', 'other'],
      default: 'website',
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    leadsGenerated: { type: Number, default: 0 },
    customersAcquired: { type: Number, default: 0 },
    salesGenerated: { type: Number, default: 0 },
    spend: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', campaignSchema);
