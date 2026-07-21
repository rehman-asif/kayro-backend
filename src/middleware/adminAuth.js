const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const STAFF_ROLES = ['superadmin', 'admin', 'manager', 'sales_staff', 'pos_staff', 'delivery_staff'];

/**
 * Middleware to verify admin/staff JWT access token
 */
const protectAdmin = async (req, res, next) => {
  let token = null;

  if (req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized as admin, no token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);

    if (decoded.tokenType !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type, admin access token required',
      });
    }

    if (!STAFF_ROLES.includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden, staff access required',
      });
    }

    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'The administrator account no longer exists',
      });
    }

    if (admin.active === false) {
      return res.status(403).json({
        success: false,
        message: 'This staff account is disabled',
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin Auth Middleware Error:', error.message);

    let message = 'Not authorized as admin, token failed';
    if (error.name === 'TokenExpiredError') {
      message = 'Admin access token expired';
    }

    return res.status(401).json({
      success: false,
      message,
    });
  }
};

/** Restrict to specific roles */
const requireRoles = (...roles) => (req, res, next) => {
  if (!req.admin || !roles.includes(req.admin.role)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission for this action',
    });
  }
  next();
};

module.exports = { protectAdmin, requireRoles, STAFF_ROLES };
