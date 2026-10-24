const express = require('express');

const router = express.Router();

const authController = require('../controllers/auth.controller');

const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const {
  registerSchema,
  loginSchema,
  googleLoginSchema,
} = require('../validations/auth.validation');

router.post('/register', validate(registerSchema), authController.register);

router.post('/login', validate(loginSchema), authController.login);

router.post('/google', validate(googleLoginSchema), authController.googleLogin);

router.get('/me', authMiddleware, authController.currentUser);

module.exports = router;
