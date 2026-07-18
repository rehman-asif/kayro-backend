const express = require('express');
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.get('/', listCategories);
router.post('/', protectAdmin, createCategory);
router.patch('/:id', protectAdmin, updateCategory);
router.delete('/:id', protectAdmin, deleteCategory);

module.exports = router;
