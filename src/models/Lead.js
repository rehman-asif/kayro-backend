const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },
    source: {
      type: String,
      enum: ['website', 'facebook', 'instagram', 'tiktok', 'whatsapp', 'referral', 'walk_in', 'contact', 'manual'],
      default: 'manual',
    },
    interest: { type: String, default: '' },
    stage: {
      type: String,
      enum: ['new', 'contacted', 'interested', 'follow_up', 'converted', 'lost'],
      default: 'new',
    },
    assignedStaff: { type: String, default: '' },
    followUpDate: { type: Date, default: null },
    notes: { type: String, default: '' },
    message: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lead', leadSchema);
