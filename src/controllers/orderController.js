const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');

function toClientOrder(doc) {
  return {
    id: doc._id.toString(),
    orderNumber: doc.orderNumber,
    source: doc.source,
    items: doc.items,
    subtotal: doc.subtotal,
    total: doc.total,
    deliveryFee: doc.deliveryFee || 0,
    paymentMethod: doc.paymentMethod,
    paymentStatus: doc.paymentStatus || 'pending',
    status: doc.status,
    customerId: doc.customerId ? String(doc.customerId) : null,
    customerName: doc.customerName || '',
    customerEmail: doc.customerEmail || '',
    customerPhone: doc.customerPhone || '',
    deliveryMethod: doc.deliveryMethod || 'in_store',
    deliveryAddress: doc.deliveryAddress || '',
    deliveryCity: doc.deliveryCity || '',
    deliveryCountry: doc.deliveryCountry || '',
    deliveryStatus: doc.deliveryStatus || 'not_required',
    driverName: doc.driverName || '',
    trackingNumber: doc.trackingNumber || '',
    expectedDeliveryDate: doc.expectedDeliveryDate,
    deliveredAt: doc.deliveredAt,
    notes: doc.notes || '',
    soldBy: doc.soldBy,
    createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
    updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt,
  };
}

function makeOrderNumber(prefix) {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}${m}${d}-${rand}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function notify(type, title, message, meta = {}) {
  try {
    await Notification.create({ type, title, message, meta });
  } catch {
    // non-blocking
  }
}

async function upsertCustomerFromOrder({ name, email, phone, location, source, total }) {
  if (!email && !phone) return null;
  let customer = null;
  if (email) customer = await Customer.findOne({ email: email.toLowerCase() });
  if (!customer && phone) customer = await Customer.findOne({ phone });
  if (!customer) {
    customer = await Customer.create({
      name: name || 'Customer',
      email: email || '',
      phone: phone || '',
      whatsapp: phone || '',
      location: location || '',
      source,
      status: 'new',
      totalSpent: total || 0,
      lastPurchaseAt: new Date(),
    });
    await notify('new_customer', 'New customer', `${customer.name} was added from ${source}`);
  } else {
    customer.totalSpent = (customer.totalSpent || 0) + (total || 0);
    customer.lastPurchaseAt = new Date();
    if (customer.status === 'new') customer.status = 'active';
    if (customer.totalSpent >= 2000) {
      customer.status = 'vip';
      customer.loyaltyTier = 'gold';
    } else if (customer.totalSpent >= 800) {
      customer.loyaltyTier = 'silver';
    }
    customer.loyaltyPoints = Math.floor(customer.totalSpent / 10);
    if (name) customer.name = name;
    if (location) customer.location = location;
    await customer.save();
  }
  return customer;
}

async function reserveStock(items, session) {
  const orderItems = [];
  let subtotal = 0;
  const qtyById = new Map();
  for (const item of items) {
    const productId = String(item.productId || '').trim();
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0));
    if (!productId || quantity < 1) throw new Error('Each item needs a productId and quantity.');
    qtyById.set(productId, (qtyById.get(productId) || 0) + quantity);
  }

  for (const [productId, quantity] of qtyById.entries()) {
    const product = await Product.findOne({ productId }).session(session);
    if (!product) throw new Error(`Product not found: ${productId}`);
    if (product.comingSoon) throw new Error(`"${product.name}" is coming soon and cannot be sold.`);
    if (product.stock < quantity) {
      throw new Error(`Insufficient stock for "${product.name}" (available: ${product.stock}).`);
    }
    const updated = await Product.findOneAndUpdate(
      { productId, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true, session }
    );
    if (!updated) throw new Error(`Could not reserve stock for "${product.name}".`);
    if (updated.stock <= 0) {
      updated.status = 'out_of_stock';
      await updated.save({ session });
    } else if (updated.stock <= (updated.lowStockThreshold ?? 5)) {
      await notify('low_stock', 'Low stock', `${updated.name} has ${updated.stock} left`, {
        productId,
        stock: updated.stock,
      });
    }
    subtotal += product.price * quantity;
    orderItems.push({
      productId: product.productId,
      name: product.name,
      category: product.category,
      price: product.price,
      quantity,
    });
  }
  return { orderItems, subtotal };
}

// @GET /api/orders
exports.listOrders = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 300);
    const filter = {};
    if (req.query.source === 'pos' || req.query.source === 'online') filter.source = req.query.source;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.status(200).json({ success: true, count: orders.length, data: orders.map(toClientOrder) });
  } catch (err) {
    next(err);
  }
};

// @GET /api/orders/stats
exports.getOrderStats = async (_req, res, next) => {
  try {
    const today = startOfToday();
    const all = await Order.find({ status: { $nin: ['voided', 'cancelled'] } });
    const todayOrders = all.filter((o) => o.createdAt >= today);
    const sum = (list) => list.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const byStatus = {};
    for (const o of all) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    const outstanding = all
      .filter((o) => o.paymentStatus === 'pending' || o.paymentStatus === 'partially_paid')
      .reduce((acc, o) => acc + Number(o.total || 0), 0);

    // Best sellers
    const productMap = new Map();
    for (const o of all) {
      for (const item of o.items || []) {
        const cur = productMap.get(item.productId) || { productId: item.productId, name: item.name, qty: 0, revenue: 0 };
        cur.qty += item.quantity;
        cur.revenue += item.price * item.quantity;
        productMap.set(item.productId, cur);
      }
    }
    const bestSellers = [...productMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);

    // Monthly chart (last 6 months)
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      start.setMonth(start.getMonth() - i);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      const monthOrders = all.filter((o) => o.createdAt >= start && o.createdAt < end);
      monthly.push({
        label: start.toLocaleString('en', { month: 'short', year: '2-digit' }),
        revenue: sum(monthOrders),
        orders: monthOrders.length,
      });
    }

    const thisMonth = monthly[monthly.length - 1]?.revenue || 0;
    const lastMonth = monthly[monthly.length - 2]?.revenue || 0;
    const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        totalSales: sum(all),
        todayRevenue: sum(todayOrders),
        orderCount: all.length,
        todayOrderCount: todayOrders.length,
        pendingOrders: byStatus.new || 0,
        completedOrders: (byStatus.completed || 0) + (byStatus.delivered || 0),
        cancelledOrders: (byStatus.cancelled || 0) + (byStatus.voided || 0),
        outstandingPayments: outstanding,
        byStatus,
        bestSellers,
        monthly,
        salesGrowthPercent: Math.round(growth * 10) / 10,
        paymentMethods: ['cash', 'card', 'mobile_money', 'cod', 'bank_transfer'],
      },
    });
  } catch (err) {
    next(err);
  }
};

// @POST /api/orders/pos
exports.createPosSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, paymentMethod, customerName, customerPhone, notes } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Add at least one product to the sale.' });
    }
    const allowed = ['cash', 'card', 'mobile_money', 'other', 'bank_transfer'];
    if (!allowed.includes(paymentMethod)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid payment method.' });
    }

    const { orderItems, subtotal } = await reserveStock(items, session);
    const admin = req.admin || {};
    const customer = await upsertCustomerFromOrder({
      name: customerName,
      phone: customerPhone,
      source: 'pos',
      total: subtotal,
    });

    const [order] = await Order.create(
      [
        {
          orderNumber: makeOrderNumber('POS'),
          source: 'pos',
          items: orderItems,
          subtotal,
          total: subtotal,
          paymentMethod,
          paymentStatus: 'paid',
          status: 'completed',
          customerId: customer?._id || null,
          customerName: String(customerName || customer?.name || '').trim(),
          customerPhone: String(customerPhone || customer?.phone || '').trim(),
          deliveryMethod: 'in_store',
          deliveryStatus: 'not_required',
          notes: String(notes || '').trim(),
          soldBy: {
            adminId: admin._id?.toString?.() || '',
            name: admin.name || '',
            email: admin.email || '',
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    await notify('new_order', 'POS sale completed', `${order.orderNumber} · M${order.total}`);
    res.status(201).json({ success: true, message: 'Sale completed', data: toClientOrder(order) });
  } catch (err) {
    try { await session.abortTransaction(); } catch {}
    if (err.message && /stock|found|coming soon/i.test(err.message)) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  } finally {
    session.endSession();
  }
};

// @POST /api/orders/checkout — public online checkout
exports.createOnlineCheckout = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      items,
      name,
      email,
      phone,
      address,
      city,
      country,
      notes,
      deliveryMethod = 'delivery',
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }
    if (!name || !phone) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Name and phone are required.' });
    }

    const { orderItems, subtotal } = await reserveStock(items, session);
    const customer = await upsertCustomerFromOrder({
      name,
      email,
      phone,
      location: [address, city, country].filter(Boolean).join(', '),
      source: 'website',
      total: subtotal,
    });

    const [order] = await Order.create(
      [
        {
          orderNumber: makeOrderNumber('WEB'),
          source: 'online',
          items: orderItems,
          subtotal,
          total: subtotal,
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          status: 'new',
          customerId: customer?._id || null,
          customerName: String(name).trim(),
          customerEmail: String(email || '').trim().toLowerCase(),
          customerPhone: String(phone).trim(),
          deliveryMethod: deliveryMethod === 'pickup' ? 'pickup' : 'delivery',
          deliveryAddress: String(address || '').trim(),
          deliveryCity: String(city || '').trim(),
          deliveryCountry: String(country || 'Lesotho').trim(),
          deliveryStatus: deliveryMethod === 'pickup' ? 'not_required' : 'pending',
          notes: String(notes || '').trim(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    await notify('new_order', 'New online order', `${order.orderNumber} from ${name}`);
    await notify('pending_payment', 'Payment pending', `${order.orderNumber} awaits payment`);
    res.status(201).json({ success: true, message: 'Order placed', data: toClientOrder(order) });
  } catch (err) {
    try { await session.abortTransaction(); } catch {}
    if (err.message && /stock|found|coming soon|Cart|required/i.test(err.message)) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  } finally {
    session.endSession();
  }
};

// @PATCH /api/orders/:id
exports.updateOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const fields = [
      'status', 'paymentStatus', 'paymentMethod', 'notes', 'deliveryMethod',
      'deliveryAddress', 'deliveryCity', 'deliveryCountry', 'deliveryStatus',
      'driverName', 'trackingNumber', 'expectedDeliveryDate', 'customerName',
      'customerEmail', 'customerPhone',
    ];
    for (const f of fields) {
      if (req.body[f] != null) order[f] = req.body[f];
    }
    if (req.body.status === 'delivered' || req.body.deliveryStatus === 'delivered') {
      order.deliveredAt = new Date();
      order.deliveryStatus = 'delivered';
      if (order.status === 'ready' || order.status === 'processing') order.status = 'delivered';
      await notify('delivery_completed', 'Delivery completed', order.orderNumber);
    }
    if (req.body.paymentStatus === 'paid') {
      await notify('payment_received', 'Payment received', order.orderNumber);
    }
    await order.save();
    res.status(200).json({ success: true, data: toClientOrder(order) });
  } catch (err) {
    next(err);
  }
};

// @POST /api/orders/:id/void
exports.voidOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status === 'voided' || order.status === 'cancelled') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Order is already cancelled/voided' });
    }
    for (const item of order.items) {
      await Product.findOneAndUpdate(
        { productId: item.productId },
        { $inc: { stock: item.quantity }, $set: { status: 'active' } },
        { session }
      );
    }
    order.status = order.source === 'pos' ? 'voided' : 'cancelled';
    order.paymentStatus = order.paymentStatus === 'paid' ? 'refunded' : order.paymentStatus;
    await order.save({ session });
    await session.commitTransaction();
    res.status(200).json({ success: true, message: 'Order voided and stock restored', data: toClientOrder(order) });
  } catch (err) {
    try { await session.abortTransaction(); } catch {}
    next(err);
  } finally {
    session.endSession();
  }
};
