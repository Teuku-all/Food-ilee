const orderService = require('../services/order.service');
const crypto = require('crypto');

async function midtransWebhook(req, res) {
  try {
    const { order_id, transaction_status, status_code, gross_amount, signature_key } = req.body;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey)
      return res.status(503).json({ success: false, message: 'Pembayaran belum dikonfigurasi' });
    if (!order_id || !transaction_status || !status_code || !gross_amount || !signature_key) {
      return res
        .status(400)
        .json({ success: false, message: 'Notifikasi pembayaran tidak lengkap' });
    }

    const expected = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex');
    const suppliedBuffer = Buffer.from(signature_key, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      return res
        .status(401)
        .json({ success: false, message: 'Tanda tangan notifikasi tidak valid' });
    }
    if (!order_id.startsWith('ORDER-')) {
      return res.status(400).json({ success: false, message: 'ID pesanan tidak valid' });
    }

    const orderId = order_id.replace('ORDER-', '');

    await orderService.updatePaymentStatus(
      orderId,

      transaction_status,
    );

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
}

module.exports = {
  midtransWebhook,
};
