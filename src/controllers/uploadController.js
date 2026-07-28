const cloudinary = require('../config/cloudinary');

const uploadImage = async (req, res, next) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      res.status(500);
      throw new Error('Cloudinary is not configured on the server');
    }

    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an image file');
    }

    const folder = req.uploadFolder || 'tpc-products';

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, uploaded) => {
          if (error) reject(error);
          else resolve(uploaded);
        }
      );
      stream.end(req.file.buffer);
    });

    res.status(200).json({
      success: true,
      data: {
        url: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    next(error);
  }
};

const uploadPaymentProof = async (req, res, next) => {
  req.uploadFolder = 'tpc-payment-proofs';
  return uploadImage(req, res, next);
};

module.exports = { uploadImage, uploadPaymentProof };
