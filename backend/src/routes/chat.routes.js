const express =
  require('express');

const router =
  express.Router();

const authMiddleware =
  require('../middlewares/auth.middleware');

const chatController =
  require('../controllers/chat.controller');

router.post(
  '/',
  authMiddleware,
  chatController.createChat
);

router.post(
  '/:chatId/messages',
  authMiddleware,
  chatController.sendMessage
);

router.get(
  '/:chatId/messages',
  authMiddleware,
  chatController.getMessages
);

module.exports = router;