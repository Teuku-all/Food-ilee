const express = require('express');

const router = express.Router();

const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/:id/status', authMiddleware, paymentController.refreshPaymentStatus);
router.post('/biteship/webhook', paymentController.biteshipWebhook);

router.post('/midtrans/webhook', paymentController.midtransWebhook);

module.exports = router;
