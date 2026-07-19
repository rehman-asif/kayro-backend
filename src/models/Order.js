const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['pos', 'online'],
      default: 'pos',
    },
    items: {
      type: [orderItemSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, 'At least one item is required'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'mobile_money', 'other'],
      required: true,
    },
    customerName: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['completed', 'voided'],
      default: 'completed',
    },
    soldBy: {
      adminId: { type: String, default: '' },
      name: { type: String, default: '' },
      email: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
