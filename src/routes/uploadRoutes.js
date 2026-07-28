const express = require('express');
const multer = require('multer');
const { uploadImage, uploadPaymentProof } = require('../controllers/uploadController');
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
// Public: customers upload M-PESA / EcoCash payment screenshots at checkout
router.post('/payment-proof', upload.single('file'), uploadPaymentProof);

module.exports = router;
