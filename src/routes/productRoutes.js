const express = require('express');
const {
  listProducts,
  createProduct,
  deleteProduct,
  getProductStats,
} = require('../controllers/productController');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.get('/', listProducts);
router.get('/stats', protectAdmin, getProductStats);
router.post('/', protectAdmin, createProduct);
router.delete('/:id', protectAdmin, deleteProduct);

module.exports = router;
