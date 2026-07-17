const express = require('express');
const multer = require('multer');
const { uploadImage } = require('../controllers/uploadController');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'));
      return;
    }
    cb(null, true);
  },
});

router.post('/image', protectAdmin, upload.single('file'), uploadImage);

module.exports = router;
