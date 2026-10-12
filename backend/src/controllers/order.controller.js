const orderService = require('../services/order.service');

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

async function getMyOrders(req, res) {
  try {
    const orders = await orderService.getMyOrders(req.user.id);

    res.status(200).json({
      success: true,

      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
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
  getMyOrders,
  getMySales,
  updateOrderStatus,
};
