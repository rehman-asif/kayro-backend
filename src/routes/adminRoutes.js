const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  adminRegister,
  adminLogin,
  adminLogout,
  getAdminMe,
  adminRefreshToken,
  adminForgotPassword,
  adminResetPassword,
} = require('../controllers/adminAuthController');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admin auth attempts. Please try again in 15 minutes.',
  },
});

router.post('/register', adminAuthLimiter, adminRegister);
router.post('/login', adminAuthLimiter, adminLogin);
router.post('/forgot-password', adminAuthLimiter, adminForgotPassword);
router.post('/reset-password/:token', adminAuthLimiter, adminResetPassword);
router.post('/logout', protectAdmin, adminLogout);
router.get('/me', protectAdmin, getAdminMe);
router.post('/refresh-token', adminRefreshToken);

module.exports = router;
