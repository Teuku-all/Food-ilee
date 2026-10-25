const multer = require('multer');

const cloudinary = require('../config/cloudinary');

const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,

  params: {
    folder: 'foodilee',

    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
  storage,
  limits: {
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (allowedImageTypes.has(file.mimetype)) return callback(null, true);
    const error = new Error('Unggah foto berformat JPG, PNG, atau WebP.');
    error.status = 400;
    callback(error);
  },
});

module.exports = upload;
