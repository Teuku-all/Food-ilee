const notificationService = require('../services/notification.service');

async function getMyNotifications(req, res) {
  try {
    const notifications = await notificationService.getMyNotifications(req.user.id);

    res.status(200).json({
      success: true,

      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
}

async function markAsRead(req, res) {
  try {
    const notification = await notificationService.markAsRead(
      req.params.id,

      req.user.id,
    );

    res.status(200).json({
      success: true,

      data: notification,
    });
  } catch (error) {
    res.status(error.message === 'Notifikasi tidak ditemukan' ? 404 : 500).json({
      success: false,

      message: error.message,
    });
  }
}

module.exports = {
  getMyNotifications,
  markAsRead,
};
