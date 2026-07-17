const User = require('../models/User');
const { generateUserTokens } = require('../utils/generateToken');
const { createOrUpdateContact } = require('../services/hubspotService');
const jwt = require('jsonwebtoken');

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // 'none' required for Netlify (frontend) ↔ Railway (API) cross-site cookies
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
};

const setUserCookies = (res, accessToken, refreshToken) => {
  res.cookie('user_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('user_refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
};

const register = async (req, res, next) => {
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
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      res.status(409);
      throw new Error('An account with this email already exists');
    }
    const user = await User.create({ name, email, password });
    const { accessToken, refreshToken } = generateUserTokens(user);
    setUserCookies(res, accessToken, refreshToken);
    setImmediate(() => {
      createOrUpdateContact({ name: user.name, email: user.email });
    });
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide email and password');
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(401);
      throw new Error('Invalid email or password');
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid email or password');
    }
    const { accessToken, refreshToken } = generateUserTokens(user);
    setUserCookies(res, accessToken, refreshToken);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    res.clearCookie('user_token', cookieOptions);
    res.clearCookie('user_refresh_token', cookieOptions);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.user_refresh_token || req.body?.refreshToken;
    if (!token) {
      res.status(401);
      throw new Error('Refresh token not provided');
    }
    const refreshSecret =
      process.env.JWT_USER_REFRESH_SECRET || `${process.env.JWT_USER_SECRET}_refresh`;
    const decoded = jwt.verify(token, refreshSecret);
    if (decoded.tokenType !== 'refresh' || decoded.role !== 'user') {
      res.status(401);
      throw new Error('Invalid refresh token');
    }
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401);
      throw new Error('User no longer exists');
    }
    const { accessToken, refreshToken: newRefreshToken } = generateUserTokens(user);
    setUserCookies(res, accessToken, newRefreshToken);
    res.status(200).json({ success: true, message: 'Token refreshed successfully' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      error.message = 'Refresh token expired, please log in again';
      res.status(401);
    }
    next(error);
  }
};

module.exports = { register, login, logout, getMe, refreshToken };
