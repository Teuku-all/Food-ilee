const orderService =
  require('../services/order.service');

async function midtransWebhook(
  req,
  res
) {

  try {

    const {
      order_id,
      transaction_status
    } = req.body;

    const orderId =
      order_id.replace(
        'ORDER-',
        ''
      );

    await orderService
      .updatePaymentStatus(

        orderId,

        transaction_status
      );

    res.status(200).json({
      success: true
    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message
    });
  }
}

module.exports = {
  midtransWebhook
};