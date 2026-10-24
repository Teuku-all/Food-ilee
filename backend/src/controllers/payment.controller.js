const orderService = require('../services/order.service');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const snap = require('../config/midtrans');

async function refreshPaymentStatus(req, res) {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, buyerId: req.user.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    if (order.paymentStatus === 'pending' && order.paymentToken) {
      const result = await snap.transaction.status(`ORDER-${order.id}`);
      if (Number(result.gross_amount) !== Number(order.total))
        return res.status(409).json({ success: false, message: 'Nominal pembayaran belum cocok dengan pesanan' });
      const status = result.transaction_status === 'capture' && result.fraud_status !== 'accept'
        ? (result.fraud_status === 'challenge' ? 'challenge' : 'deny')
        : result.transaction_status;
      await orderService.updatePaymentStatus(order.id, status);
    } else if (order.paymentStatus === 'paid') {
      await orderService.createPaidShipment(order.id);
    }
    const latest = await orderService.getMyOrder(req.params.id, req.user.id);
    if (latest?.paymentStatus === 'pending' && latest.paymentToken) {
      const host = process.env.MIDTRANS_IS_PRODUCTION === 'true'
        ? 'https://app.midtrans.com'
        : 'https://app.sandbox.midtrans.com';
      latest.paymentUrl = `${host}/snap/v2/vtweb/${encodeURIComponent(latest.paymentToken)}`;
      latest.snapToken = latest.paymentToken;
      latest.snapClientKey = process.env.MIDTRANS_CLIENT_KEY;
      latest.snapJsUrl = `${host}/snap/snap.js`;
    }
    return res.json({ success: true, data: latest });
  } catch (error) {
    return res.status(502).json({ success: false, message: 'Status pembayaran belum dapat diperiksa' });
  }
}

async function midtransWebhook(req, res) {
  try {
    const { order_id, transaction_status, status_code, gross_amount, signature_key, fraud_status } = req.body;
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
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { total: true } });
    if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    if (Number(gross_amount) !== Number(order.total))
      return res.status(400).json({ success: false, message: 'Nominal notifikasi tidak sesuai pesanan' });

    const verifiedStatus = transaction_status === 'capture' && fraud_status !== 'accept'
      ? (fraud_status === 'challenge' ? 'challenge' : 'deny')
      : transaction_status;
    await orderService.updatePaymentStatus(
      orderId,
      verifiedStatus,
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

async function biteshipWebhook(req, res) {
  const body = req.body;
  const emptyPayload =
    body == null ||
    (typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 0);
  if (emptyPayload) return res.status(200).send('ok');

  const secret = process.env.BITESHIP_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ success: false, message: 'Webhook pengiriman belum dikonfigurasi' });
  const supplied = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const left = Buffer.from(supplied);
  const right = Buffer.from(secret);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right))
    return res.status(401).json({ success: false, message: 'Otentikasi webhook tidak valid' });
  try {
    if (!['order.status', 'order.waybill_id', 'order.price'].includes(req.body?.event))
      return res.status(200).json({ success: true, ignored: true });
    await orderService.updateShippingStatus(req.body);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  midtransWebhook,
  refreshPaymentStatus,
  biteshipWebhook,
};
