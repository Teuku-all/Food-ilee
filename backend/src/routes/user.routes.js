const express = require('express');

const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');

const upload = require('../middlewares/upload.middleware');

const userController = require('../controllers/user.controller');

router.get('/username-availability', authMiddleware, userController.checkUsernameAvailability);

router.get('/me', authMiddleware, userController.getMyProfile);

router.put(
  '/me',
  authMiddleware,

  upload.single('avatar'),

  userController.updateProfile,
);

router.get('/:username', userController.getPublicProfile);

module.exports = router;
