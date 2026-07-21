const express = require('express');
const {
  listOrders,
  getOrderStats,
  createPosSale,
  createOnlineCheckout,
  updateOrder,
  voidOrder,
} = require('../controllers/orderController');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// Public storefront checkout
router.post('/checkout', createOnlineCheckout);

router.get('/stats', protectAdmin, getOrderStats);
router.get('/', protectAdmin, listOrders);
router.post('/pos', protectAdmin, createPosSale);
router.patch('/:id', protectAdmin, updateOrder);
router.post('/:id/void', protectAdmin, voidOrder);

module.exports = router;
