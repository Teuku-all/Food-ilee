const express =
  require('express');

const router =
  express.Router();

const authMiddleware =
  require('../middlewares/auth.middleware');

const notificationController =
  require(
    '../controllers/notification.controller'
  );

router.get(
  '/',
  authMiddleware,
  notificationController
    .getMyNotifications
);

router.patch(
  '/:id/read',
  authMiddleware,
  notificationController
    .markAsRead
);

module.exports = router;