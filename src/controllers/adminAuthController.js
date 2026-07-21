const Admin = require('../models/Admin');
const { generateAdminTokens } = require('../utils/generateToken');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createOrUpdateContact } = require('../services/hubspotService');
const { STAFF_ROLES } = require('../middleware/adminAuth');

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
};

const setAdminCookies = (res, accessToken, refreshToken) => {
  res.cookie('admin_token', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('admin_refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const adminRegister = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please provide name, email, and password');
    }
    if (password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }

    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(409);
      throw new Error('An admin account with this email already exists');
    }

    const adminCount = await Admin.countDocuments();
    const admin = await Admin.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: adminCount === 0 ? 'superadmin' : 'admin',
    });

    const { accessToken, refreshToken } = generateAdminTokens(admin);
    setAdminCookies(res, accessToken, refreshToken);

    // Sync admin to HubSpot (non-blocking)
    createOrUpdateContact({ name: admin.name, email: admin.email });

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
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

const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide email and password');
    }

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

    const { accessToken, refreshToken } = generateAdminTokens(admin);
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

const getAdminMe = async (req, res, next) => {
  try {
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

    if (!STAFF_ROLES.includes(decoded.role)) {
      res.status(403);
      throw new Error('Forbidden, not a staff token');
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

const adminForgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400);
      throw new Error('Please provide your email address');
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      res.status(200).json({
        success: true,
        message: 'If an admin account exists for that email, a reset link has been generated.',
      });
      return;
    }

    const resetToken = admin.getResetPasswordToken();
    await admin.save({ validateBeforeSave: false });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/admin/reset-password/${resetToken}`;

    res.status(200).json({
      success: true,
      message: 'Password reset link generated. Use the link below to set a new password.',
      data: { resetUrl },
    });
  } catch (error) {
    next(error);
  }
};

const adminResetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const admin = await Admin.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!admin) {
      res.status(400);
      throw new Error('Invalid or expired reset token');
    }

    admin.password = password;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;
    await admin.save();

    const { accessToken, refreshToken } = generateAdminTokens(admin);
    setAdminCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
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

module.exports = {
  adminRegister,
  adminLogin,
  adminLogout,
  getAdminMe,
  adminRefreshToken,
  adminForgotPassword,
  adminResetPassword,
};
