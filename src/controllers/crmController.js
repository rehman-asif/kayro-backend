const Customer = require('../models/Customer');
const Subscriber = require('../models/Subscriber');
const Lead = require('../models/Lead');
const Campaign = require('../models/Campaign');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Admin = require('../models/Admin');
const { STAFF_ROLES } = require('../middleware/adminAuth');

function toCustomer(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    whatsapp: doc.whatsapp || doc.phone,
    location: doc.location,
    customerType: doc.customerType,
    status: doc.status,
    notes: doc.notes,
    totalSpent: doc.totalSpent,
    lastPurchaseAt: doc.lastPurchaseAt,
    loyaltyPoints: doc.loyaltyPoints,
    loyaltyTier: doc.loyaltyTier,
    source: doc.source,
    birthday: doc.birthday,
    joinedAt: doc.joinedAt || doc.createdAt,
    createdAt: doc.createdAt,
  };
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
exports.getCrmDashboard = async (_req, res, next) => {
  try {
    const [customers, leads, orders, products, subscribers, notifications] = await Promise.all([
      Customer.find(),
      Lead.find(),
      Order.find({ status: { $nin: ['voided'] } }),
      Product.find(),
      Subscriber.find({ active: true }),
      Notification.find().sort({ createdAt: -1 }).limit(12),
    ]);

    const now = new Date();
    const day30 = new Date(now.getTime() - 30 * 86400000);
    const newCustomers = customers.filter((c) => (c.joinedAt || c.createdAt) >= day30);
    const activeOrders = orders.filter((o) => !['cancelled', 'voided'].includes(o.status));
    const revenue = activeOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const outstanding = activeOrders
      .filter((o) => ['pending', 'partially_paid'].includes(o.paymentStatus))
      .reduce((s, o) => s + Number(o.total || 0), 0);

    const followUps = [
      ...leads.filter((l) => l.stage === 'follow_up' || (l.followUpDate && l.followUpDate <= now)),
      ...customers.filter((c) => !c.lastPurchaseAt || c.lastPurchaseAt < day30),
    ];

    const lowStock = products.filter((p) => p.stock <= (p.lowStockThreshold ?? 5));

    res.status(200).json({
      success: true,
      data: {
        totalCustomers: customers.length,
        newCustomers: newCustomers.length,
        totalOrders: activeOrders.length,
        pendingOrders: activeOrders.filter((o) => o.status === 'new').length,
        completedOrders: activeOrders.filter((o) => ['completed', 'delivered'].includes(o.status)).length,
        cancelledOrders: orders.filter((o) => ['cancelled', 'voided'].includes(o.status)).length,
        totalSales: revenue,
        outstandingPayments: outstanding,
        subscribers: subscribers.length,
        openLeads: leads.filter((l) => !['converted', 'lost'].includes(l.stage)).length,
        lowStockCount: lowStock.length,
        followUpDue: followUps.length,
        recentActivity: notifications.map((n) => ({
          id: n._id.toString(),
          type: n.type,
          title: n.title,
          message: n.message,
          createdAt: n.createdAt,
          read: n.read,
        })),
        lowStock: lowStock.slice(0, 8).map((p) => ({
          id: p.productId,
          name: p.name,
          stock: p.stock,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Customers ───────────────────────────────────────────────────────────────
exports.listCustomers = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const status = req.query.status;
    const filter = {};
    if (status) filter.status = status;
    if (q) filter.$or = [
      { name: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
      { phone: new RegExp(q, 'i') },
    ];
    const customers = await Customer.find(filter).sort({ createdAt: -1 }).limit(200);
    res.status(200).json({ success: true, count: customers.length, data: customers.map(toCustomer) });
  } catch (err) {
    next(err);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: toCustomer(customer) });
  } catch (err) {
    next(err);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.status(200).json({ success: true, data: toCustomer(customer) });
  } catch (err) {
    next(err);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.status(200).json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    next(err);
  }
};

exports.getCustomerProfile = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    const orders = await Order.find({
      $or: [
        { customerId: customer._id },
        ...(customer.email ? [{ customerEmail: customer.email }] : []),
        ...(customer.phone ? [{ customerPhone: customer.phone }] : []),
      ],
    }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({
      success: true,
      data: {
        customer: toCustomer(customer),
        orders: orders.map((o) => ({
          id: o._id.toString(),
          orderNumber: o.orderNumber,
          total: o.total,
          status: o.status,
          paymentStatus: o.paymentStatus,
          createdAt: o.createdAt,
          items: o.items,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Subscribers ─────────────────────────────────────────────────────────────
exports.subscribe = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required' });
    }
    const existing = await Subscriber.findOne({ email });
    if (existing) {
      existing.active = true;
      await existing.save();
      return res.status(200).json({ success: true, message: 'You are already subscribed', data: existing });
    }
    const sub = await Subscriber.create({ email, source: req.body.source || 'website' });
    res.status(201).json({ success: true, message: 'Subscribed', data: sub });
  } catch (err) {
    next(err);
  }
};

exports.listSubscribers = async (_req, res, next) => {
  try {
    const list = await Subscriber.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: list.length,
      data: list.map((s) => ({
        id: s._id.toString(),
        email: s.email,
        source: s.source,
        active: s.active,
        subscribedAt: s.subscribedAt || s.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteSubscriber = async (req, res, next) => {
  try {
    await Subscriber.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Subscriber removed' });
  } catch (err) {
    next(err);
  }
};

// ─── Leads ───────────────────────────────────────────────────────────────────
exports.listLeads = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.stage) filter.stage = req.query.stage;
    const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(200);
    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads.map((l) => ({
        id: l._id.toString(),
        name: l.name,
        email: l.email,
        phone: l.phone,
        whatsapp: l.whatsapp || l.phone,
        source: l.source,
        interest: l.interest,
        stage: l.stage,
        assignedStaff: l.assignedStaff,
        followUpDate: l.followUpDate,
        notes: l.notes,
        message: l.message,
        createdAt: l.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

exports.createLead = async (req, res, next) => {
  try {
    const lead = await Lead.create(req.body);
    await Notification.create({
      type: 'new_lead',
      title: 'New lead',
      message: `${lead.name} · ${lead.source}`,
    });
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

exports.updateLead = async (req, res, next) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.status(200).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

exports.deleteLead = async (req, res, next) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    next(err);
  }
};

// Public contact form → lead
exports.createContactLead = async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ success: false, message: 'Name and message are required' });
    }
    const lead = await Lead.create({
      name,
      email: email || '',
      phone: phone || '',
      message,
      source: 'contact',
      stage: 'new',
      interest: 'Website contact',
    });
    await Notification.create({ type: 'new_lead', title: 'Contact form lead', message: name });
    res.status(201).json({ success: true, message: 'Message received', data: { id: lead._id.toString() } });
  } catch (err) {
    next(err);
  }
};

// ─── Follow-ups ──────────────────────────────────────────────────────────────
exports.getFollowUps = async (_req, res, next) => {
  try {
    const now = new Date();
    const d30 = new Date(now - 30 * 86400000);
    const d60 = new Date(now - 60 * 86400000);
    const d90 = new Date(now - 90 * 86400000);

    const customers = await Customer.find();
    const leads = await Lead.find({ stage: { $nin: ['converted', 'lost'] } });

    const inactive30 = customers.filter((c) => !c.lastPurchaseAt || c.lastPurchaseAt < d30);
    const inactive60 = customers.filter((c) => !c.lastPurchaseAt || c.lastPurchaseAt < d60);
    const inactive90 = customers.filter((c) => !c.lastPurchaseAt || c.lastPurchaseAt < d90);
    const vip = customers.filter((c) => c.status === 'vip' || c.loyaltyTier === 'vip' || c.loyaltyTier === 'gold');
    const dueLeads = leads.filter((l) => l.stage === 'follow_up' || (l.followUpDate && l.followUpDate <= now));

    res.status(200).json({
      success: true,
      data: {
        dueLeads: dueLeads.map((l) => ({ id: l._id.toString(), name: l.name, phone: l.phone, stage: l.stage, followUpDate: l.followUpDate })),
        inactive30: inactive30.map(toCustomer),
        inactive60: inactive60.map(toCustomer),
        inactive90: inactive90.map(toCustomer),
        vip: vip.map(toCustomer),
        counts: {
          dueLeads: dueLeads.length,
          inactive30: inactive30.length,
          inactive60: inactive60.length,
          inactive90: inactive90.length,
          vip: vip.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Campaigns ───────────────────────────────────────────────────────────────
exports.listCampaigns = async (_req, res, next) => {
  try {
    const list = await Campaign.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: list.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        targetAudience: c.targetAudience,
        status: c.status,
        channel: c.channel,
        startDate: c.startDate,
        endDate: c.endDate,
        leadsGenerated: c.leadsGenerated,
        customersAcquired: c.customersAcquired,
        salesGenerated: c.salesGenerated,
        spend: c.spend,
        roi: c.spend > 0 ? Math.round(((c.salesGenerated - c.spend) / c.spend) * 1000) / 10 : null,
        notes: c.notes,
      })),
    });
  } catch (err) {
    next(err);
  }
};

exports.createCampaign = async (req, res, next) => {
  try {
    const c = await Campaign.create(req.body);
    res.status(201).json({ success: true, data: c });
  } catch (err) {
    next(err);
  }
};

exports.updateCampaign = async (req, res, next) => {
  try {
    const c = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!c) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.status(200).json({ success: true, data: c });
  } catch (err) {
    next(err);
  }
};

exports.deleteCampaign = async (req, res, next) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─── Notifications ───────────────────────────────────────────────────────────
exports.listNotifications = async (_req, res, next) => {
  try {
    const list = await Notification.find().sort({ createdAt: -1 }).limit(50);
    res.status(200).json({
      success: true,
      data: list.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

exports.markNotificationsRead = async (_req, res, next) => {
  try {
    await Notification.updateMany({ read: false }, { $set: { read: true } });
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─── Settings ────────────────────────────────────────────────────────────────
function toClientSettings(s) {
  return {
    businessName: s.businessName || 'The Precious Creations',
    logoUrl: s.logoUrl || '/logo.png',
    brandColor: s.brandColor || '#7A2E2E',
    phone: s.phone || '',
    whatsapp: s.whatsapp || '',
    email: s.email || '',
    address: s.address || '',
    currency: s.currency || 'LSL',
    currencySymbol: s.currencySymbol || 'M',
    paymentMethods: Array.isArray(s.paymentMethods) ? s.paymentMethods : ['cash', 'card', 'mobile_money'],
    deliveryFee: Number(s.deliveryFee || 0),
    lowStockThreshold: Number(s.lowStockThreshold ?? 5),
  };
}

exports.getSettings = async (_req, res, next) => {
  try {
    let s = await Settings.findOne({ key: 'business' });
    if (!s) s = await Settings.create({ key: 'business' });
    res.status(200).json({ success: true, data: toClientSettings(s) });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const allowed = [
      'businessName',
      'logoUrl',
      'brandColor',
      'phone',
      'whatsapp',
      'email',
      'address',
      'currency',
      'currencySymbol',
      'paymentMethods',
      'deliveryFee',
      'lowStockThreshold',
    ];
    const patch = { key: 'business' };
    for (const key of allowed) {
      if (req.body[key] != null) patch[key] = req.body[key];
    }
    if (patch.deliveryFee != null) patch.deliveryFee = Number(patch.deliveryFee) || 0;
    if (patch.lowStockThreshold != null) patch.lowStockThreshold = Math.max(0, Number(patch.lowStockThreshold) || 0);
    if (patch.paymentMethods != null && !Array.isArray(patch.paymentMethods)) {
      patch.paymentMethods = String(patch.paymentMethods)
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    }

    const s = await Settings.findOneAndUpdate(
      { key: 'business' },
      { $set: patch },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({
      success: true,
      message: 'Settings saved',
      data: toClientSettings(s),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Staff ───────────────────────────────────────────────────────────────────
exports.listStaff = async (_req, res, next) => {
  try {
    const staff = await Admin.find().select('-password -resetPasswordToken -resetPasswordExpire');
    res.status(200).json({
      success: true,
      data: staff.map((a) => ({
        id: a._id.toString(),
        name: a.name,
        email: a.email,
        role: a.role,
        active: a.active !== false,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

exports.createStaff = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email, password required' });
    }
    if (!STAFF_ROLES.includes(role) || role === 'superadmin') {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const exists = await Admin.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const staff = await Admin.create({ name, email, password, role });
    res.status(201).json({
      success: true,
      data: { id: staff._id.toString(), name: staff.name, email: staff.email, role: staff.role },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateStaff = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name != null) updates.name = req.body.name;
    if (req.body.role != null && req.body.role !== 'superadmin') updates.role = req.body.role;
    if (req.body.active != null) updates.active = Boolean(req.body.active);
    const staff = await Admin.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.status(200).json({ success: true, data: staff });
  } catch (err) {
    next(err);
  }
};

// ─── Reports ─────────────────────────────────────────────────────────────────
exports.getReports = async (req, res, next) => {
  try {
    const range = req.query.range || 'monthly';
    const orders = await Order.find({ status: { $nin: ['voided', 'cancelled'] } });
    const customers = await Customer.find();
    const products = await Product.find();

    const now = new Date();
    let from = new Date(0);
    if (range === 'daily') {
      from = new Date(now); from.setHours(0, 0, 0, 0);
    } else if (range === 'weekly') {
      from = new Date(now.getTime() - 7 * 86400000);
    } else if (range === 'monthly') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'annual') {
      from = new Date(now.getFullYear(), 0, 1);
    }

    const filtered = orders.filter((o) => o.createdAt >= from);
    const revenue = filtered.reduce((s, o) => s + o.total, 0);
    const byProduct = new Map();
    for (const o of filtered) {
      for (const i of o.items) {
        const cur = byProduct.get(i.productId) || { name: i.name, qty: 0, revenue: 0 };
        cur.qty += i.quantity;
        cur.revenue += i.price * i.quantity;
        byProduct.set(i.productId, cur);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        range,
        from,
        orderCount: filtered.length,
        revenue,
        customerCount: customers.length,
        productCount: products.length,
        avgOrderValue: filtered.length ? revenue / filtered.length : 0,
        salesByProduct: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue),
        retentionHint: customers.filter((c) => c.lastPurchaseAt).length,
      },
    });
  } catch (err) {
    next(err);
  }
};
