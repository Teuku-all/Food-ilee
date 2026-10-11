const multer =
  require('multer');

const cloudinary =
  require('../config/cloudinary');

const {
  CloudinaryStorage
} = require(
  'multer-storage-cloudinary'
);

const storage =
  new CloudinaryStorage({

    cloudinary,

    params: {

      folder:
        'foodilee',

      allowed_formats: [
        'jpg',
        'png',
        'jpeg',
        'webp'
      ]
    }
  });

const upload =
  multer({
    storage
  });

module.exports =
  upload;