const Admin = require('../models/Admin');
const { generateAdminTokens } = require('../utils/generateToken');
const jwt = require('jsonwebtoken');

// ─── Cookie Options ──────────────────────────────────────────────────────────
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // 'none' required for Netlify (frontend) ↔ Railway (API) cross-site cookies
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
};

const setAdminCookies = (res, accessToken, refreshToken) => {
  res.cookie('admin_token', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie('admin_refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// ─── @POST /api/admin/auth/login ──────────────────────────────────────────────
const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide email and password');
    }

    // Only check against Admin collection
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      res.status(401);
      throw new Error('Invalid admin credentials');
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid admin credentials');
    }

    // Generate admin-specific tokens (signed with JWT_ADMIN_SECRET)
    const { accessToken, refreshToken } = generateAdminTokens(admin);

    // Set separate admin httpOnly cookies
    setAdminCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── @POST /api/admin/auth/logout ─────────────────────────────────────────────
const adminLogout = async (req, res, next) => {
  try {
    res.clearCookie('admin_token', cookieOptions);
    res.clearCookie('admin_refresh_token', cookieOptions);

    res.status(200).json({
      success: true,
      message: 'Admin logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ─── @GET /api/admin/auth/me ──────────────────────────────────────────────────
const getAdminMe = async (req, res, next) => {
  try {
    // req.admin is set by protectAdmin middleware
    res.status(200).json({
      success: true,
      data: {
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
        role: req.admin.role,
        createdAt: req.admin.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── @POST /api/admin/auth/refresh-token ──────────────────────────────────────
const adminRefreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.admin_refresh_token || req.body?.refreshToken;

    if (!token) {
      res.status(401);
      throw new Error('Admin refresh token not provided');
    }

    const refreshSecret =
      process.env.JWT_ADMIN_REFRESH_SECRET || `${process.env.JWT_ADMIN_SECRET}_refresh`;

    const decoded = jwt.verify(token, refreshSecret);

    if (decoded.tokenType !== 'refresh') {
      res.status(401);
      throw new Error('Invalid admin refresh token');
    }

    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      res.status(403);
      throw new Error('Forbidden, not an admin token');
    }

    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) {
      res.status(401);
      throw new Error('Admin account no longer exists');
    }

    const { accessToken, refreshToken: newRefreshToken } = generateAdminTokens(admin);
    setAdminCookies(res, accessToken, newRefreshToken);

    res.status(200).json({
      success: true,
      message: 'Admin token refreshed successfully',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      error.message = 'Admin refresh token expired, please log in again';
      res.status(401);
    }
    next(error);
  }
};

module.exports = { adminLogin, adminLogout, getAdminMe, adminRefreshToken };
