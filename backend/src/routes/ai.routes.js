const express = require('express');

const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');

const aiController = require('../controllers/ai.controller');

router.post('/chat', authMiddleware, aiController.askAI);

router.post('/recommend', authMiddleware, aiController.recommendWaste);

module.exports = router;
