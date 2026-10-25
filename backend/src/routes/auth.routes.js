const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const authController = require('../controllers/auth.controller');

const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validations/auth.validation');

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan reset password. Coba lagi nanti.' },
});

router.post('/register', validate(registerSchema), authController.register);

router.post('/login', validate(loginSchema), authController.login);

router.post('/google', validate(googleLoginSchema), authController.googleLogin);

router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), authController.forgotPassword);

router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), authController.resetPassword);

router.get('/me', authMiddleware, authController.currentUser);

module.exports = router;
