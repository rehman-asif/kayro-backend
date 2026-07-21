const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'new_order',
        'new_customer',
        'new_lead',
        'low_stock',
        'payment_received',
        'pending_payment',
        'delivery_completed',
        'follow_up_due',
        'system',
      ],
      default: 'system',
    },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    read: { type: Boolean, default: false },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
