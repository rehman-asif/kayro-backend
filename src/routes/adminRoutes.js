const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  adminLogin,
  adminLogout,
  getAdminMe,
  adminRefreshToken,
} = require('../controllers/adminAuthController');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Stricter: 5 attempts per window for admins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admin login attempts. Please try again in 15 minutes.',
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// @POST /api/admin/auth/login
router.post('/login', adminAuthLimiter, adminLogin);

// @POST /api/admin/auth/logout  (protected)
router.post('/logout', protectAdmin, adminLogout);

// @GET /api/admin/auth/me  (protected)
router.get('/me', protectAdmin, getAdminMe);

// @POST /api/admin/auth/refresh-token
router.post('/refresh-token', adminRefreshToken);

module.exports = router;
