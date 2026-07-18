const express = require('express');
const {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
} = require('../controllers/productController');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.get('/', listProducts);
router.get('/stats', protectAdmin, getProductStats);
router.post('/', protectAdmin, createProduct);
router.patch('/:id', protectAdmin, updateProduct);
router.delete('/:id', protectAdmin, deleteProduct);

module.exports = router;
