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
    deliveryFee: { type: Number, default: 0, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'mobile_money', 'bank_transfer', 'other', 'cod', 'mpesa', 'ecocash'],
      default: 'cash',
    },
    paymentReference: {
      type: String,
      default: '',
      trim: true,
    },
    paymentProofUrl: {
      type: String,
      default: '',
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'refunded'],
      default: 'pending',
    },
    // Pipeline: new → confirmed → processing → ready → delivered → completed | cancelled | voided
    status: {
      type: String,
      enum: [
        'new',
        'confirmed',
        'processing',
        'ready',
        'delivered',
        'completed',
        'cancelled',
        'voided',
      ],
      default: 'new',
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, default: '', trim: true },
    customerEmail: { type: String, default: '', trim: true, lowercase: true },
    customerPhone: { type: String, default: '', trim: true },
    deliveryMethod: {
      type: String,
      enum: ['pickup', 'delivery', 'in_store'],
      default: 'in_store',
    },
    deliveryAddress: { type: String, default: '' },
    deliveryCity: { type: String, default: '' },
    deliveryCountry: { type: String, default: 'Lesotho' },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'out_for_delivery', 'delivered', 'not_required'],
      default: 'not_required',
    },
    driverName: { type: String, default: '' },
    trackingNumber: { type: String, default: '' },
    expectedDeliveryDate: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    notes: { type: String, default: '', trim: true },
    soldBy: {
      adminId: { type: String, default: '' },
      name: { type: String, default: '' },
      email: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
