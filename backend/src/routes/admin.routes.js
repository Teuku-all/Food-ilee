const express =
  require('express');

const router =
  express.Router();

const authMiddleware =
  require('../middlewares/auth.middleware');

const adminMiddleware =
  require('../middlewares/admin.middleware');

const adminController =
  require('../controllers/admin.controller');

router.use(
  authMiddleware,
  adminMiddleware
);

router.get(
  '/users',
  adminController.getAllUsers
);

router.get(
  '/wastes',
  adminController.getAllWastes
);

router.get(
  '/orders',
  adminController.getAllOrders
);

router.patch(
  '/users/:id/ban',
  adminController.banUser
);

router.delete(
  '/wastes/:id',
  adminController.deleteWaste
);

router.get(
  '/analytics',
  adminController.getAnalytics
);

module.exports = router;