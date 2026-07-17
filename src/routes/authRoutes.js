const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, logout, getMe, refreshToken } = require('../controllers/authController');
const { protectUser } = require('../middleware/auth');

const router = express.Router();

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again in 15 minutes.',
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// @POST /api/auth/register
router.post('/register', authLimiter, register);

// @POST /api/auth/login
router.post('/login', authLimiter, login);

// @POST /api/auth/logout
router.post('/logout', logout);

// @GET /api/auth/me  (protected)
router.get('/me', protectUser, getMe);

// @POST /api/auth/refresh-token
router.post('/refresh-token', refreshToken);

module.exports = router;
