const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * Middleware to verify admin JWT token (Access Token only)
 */
const protectAdmin = async (req, res, next) => {
  let token = null;

  // 1. Read token from cookies (httpOnly)
  if (req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token;
  }
  // 2. Fallback to Authorization Header (Bearer token)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized as admin, no token provided',
    });
  }

  try {
    // Verify token using Admin JWT Secret
    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);

    // Guard against refresh tokens being used as access tokens
    if (decoded.tokenType !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type, admin access token required',
      });
    }

    // Verify role claims
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden, admin access required',
      });
    }

    // Verify the admin still exists
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'The administrator account no longer exists',
      });
    }

    // Attach admin to request
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

module.exports = { protectAdmin };
