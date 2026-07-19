const express = require('express');
const {
  listOrders,
  getOrderStats,
  createPosSale,
  voidOrder,
} = require('../controllers/orderController');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.use(protectAdmin);

router.get('/stats', getOrderStats);
router.get('/', listOrders);
router.post('/pos', createPosSale);
router.post('/:id/void', voidOrder);

module.exports = router;
