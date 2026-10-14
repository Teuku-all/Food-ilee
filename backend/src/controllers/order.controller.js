const orderService = require('../services/order.service');

function withPaymentUrl(order) {
  if (!order?.paymentToken || order.paymentStatus !== 'pending') return order;
  const host = process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com';
  return { ...order, paymentUrl: `${host}/snap/v2/vtweb/${encodeURIComponent(order.paymentToken)}` };
}

async function createOrder(req, res) {
  try {
    const order = await orderService.createOrder(
      req.user.id,

      req.body.wasteId,

      req.body.quantity,
    );

    res.status(201).json({
      success: true,

      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
}

async function getShippingRates(req, res) {
  try {
    const data = await orderService.getRates(req.user.id, req.body.items, req.body.address);
    res.json({ success: true, data });
  } catch (error) {
    const unavailable = /BITESHIP|Biteship|tidak dapat dihubungi|timeout|waktu|layanan data/i.test(error.message);
    res.status(unavailable ? 503 : 400).json({ success: false, message: error.message });
  }
}

async function createCheckout(req, res) {
  try {
    const order = await orderService.createCheckout(req.user.id, req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    const unavailable = /BITESHIP|Biteship|tidak dapat dihubungi|timeout|waktu|layanan data|Midtrans/i.test(error.message);
    res.status(unavailable ? 503 : 400).json({ success: false, message: error.message });
  }
}

async function getMyOrders(req, res) {
  try {
    const orders = await orderService.getMyOrders(req.user.id);

    res.status(200).json({
      success: true,
      data: orders.map(withPaymentUrl),
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
}

async function getMyOrder(req, res) {
  try {
    const order = await orderService.getMyOrder(req.params.id, req.user.id);
    if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    res.status(200).json({ success: true, data: withPaymentUrl(order) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getMySales(req, res) {
  try {
    const orders = await orderService.getMySales(req.user.id);
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const order = await orderService.updateSellerOrderStatus(
      req.params.id,
      req.user.id,
      req.body.status,
    );
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  createOrder,
  getShippingRates,
  createCheckout,
  getMyOrders,
  getMyOrder,
  getMySales,
  updateOrderStatus,
};
