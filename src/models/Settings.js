const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'business' },
    businessName: { type: String, default: 'The Precious Creations' },
    logoUrl: { type: String, default: '/logo.png' },
    brandColor: { type: String, default: '#7A2E2E' },
    phone: { type: String, default: '+266 5733 3532' },
    whatsapp: { type: String, default: '+26657333532' },
    email: { type: String, default: 'nletjoko1@icloud.com' },
    address: { type: String, default: 'NRH Mall, Room 13, Top Floor, Kingsway, Maseru, Lesotho' },
    currency: { type: String, default: 'LSL' },
    currencySymbol: { type: String, default: 'M' },
    paymentMethods: {
      type: [String],
      default: ['mpesa', 'cod', 'cash', 'card', 'mobile_money', 'bank_transfer'],
    },
    mpesaMerchantNumber: {
      type: String,
      default: '80227',
      trim: true,
    },
    deliveryFee: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
