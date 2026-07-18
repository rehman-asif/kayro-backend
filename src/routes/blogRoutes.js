const express = require('express');
const {
  listPosts,
  createPost,
  updatePost,
  deletePost,
} = require('../controllers/blogController');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.get('/', listPosts);
router.post('/', protectAdmin, createPost);
router.patch('/:id', protectAdmin, updatePost);
router.delete('/:id', protectAdmin, deletePost);

module.exports = router;
