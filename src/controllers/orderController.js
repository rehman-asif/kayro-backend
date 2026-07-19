const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');

function toClientOrder(doc) {
  return {
    id: doc._id.toString(),
    orderNumber: doc.orderNumber,
    source: doc.source,
    items: doc.items,
    subtotal: doc.subtotal,
    total: doc.total,
    paymentMethod: doc.paymentMethod,
    customerName: doc.customerName || '',
    notes: doc.notes || '',
    status: doc.status,
    soldBy: doc.soldBy,
    createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
  };
}

function makeOrderNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `POS-${y}${m}${d}-${rand}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// @GET /api/orders
exports.listOrders = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const source = req.query.source;
    const filter = {};
    if (source === 'pos' || source === 'online') filter.source = source;

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders.map(toClientOrder),
    });
  } catch (err) {
    next(err);
  }
};

// @GET /api/orders/stats
exports.getOrderStats = async (_req, res, next) => {
  try {
    const today = startOfToday();
    const [allCompleted, todayCompleted] = await Promise.all([
      Order.find({ status: 'completed' }),
      Order.find({ status: 'completed', createdAt: { $gte: today } }),
    ]);

    const sum = (list) => list.reduce((acc, o) => acc + Number(o.total || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        totalSales: sum(allCompleted),
        todayRevenue: sum(todayCompleted),
        orderCount: allCompleted.length,
        todayOrderCount: todayCompleted.length,
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
    const { items, paymentMethod, customerName, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Add at least one product to the sale.' });
    }

    const allowedPayments = ['cash', 'card', 'mobile_money', 'other'];
    if (!allowedPayments.includes(paymentMethod)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid payment method.' });
    }

    const normalized = items.map((item) => ({
      productId: String(item.productId || '').trim(),
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 0)),
    }));

    if (normalized.some((i) => !i.productId || i.quantity < 1)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Each item needs a productId and quantity.' });
    }

    // Merge duplicate product lines
    const qtyById = new Map();
    for (const item of normalized) {
      qtyById.set(item.productId, (qtyById.get(item.productId) || 0) + item.quantity);
    }

    const orderItems = [];
    let subtotal = 0;

    for (const [productId, quantity] of qtyById.entries()) {
      const product = await Product.findOne({ productId }).session(session);
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: `Product not found: ${productId}` });
      }
      if (product.comingSoon) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `"${product.name}" is marked coming soon and cannot be sold.`,
        });
      }
      if (product.stock < quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}" (available: ${product.stock}).`,
        });
      }

      const updated = await Product.findOneAndUpdate(
        { productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true, session }
      );

      if (!updated) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Could not reserve stock for "${product.name}". Try again.`,
        });
      }

      const lineTotal = product.price * quantity;
      subtotal += lineTotal;
      orderItems.push({
        productId: product.productId,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity,
      });
    }

    const admin = req.admin || {};
    const [order] = await Order.create(
      [
        {
          orderNumber: makeOrderNumber(),
          source: 'pos',
          items: orderItems,
          subtotal,
          total: subtotal,
          paymentMethod,
          customerName: String(customerName || '').trim(),
          notes: String(notes || '').trim(),
          status: 'completed',
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

    res.status(201).json({
      success: true,
      message: 'Sale completed',
      data: toClientOrder(order),
    });
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch {
      // ignore
    }
    next(err);
  } finally {
    session.endSession();
  }
};

// @POST /api/orders/:id/void — restore stock for a voided POS sale
exports.voidOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status === 'voided') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Order is already voided' });
    }

    for (const item of order.items) {
      await Product.findOneAndUpdate(
        { productId: item.productId },
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    order.status = 'voided';
    await order.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Sale voided and stock restored',
      data: toClientOrder(order),
    });
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch {
      // ignore
    }
    next(err);
  } finally {
    session.endSession();
  }
};
