const express = require('express');

const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');

const reviewController = require('../controllers/review.controller');

router.post('/', authMiddleware, reviewController.createReview);

router.get('/:wasteId', reviewController.getWasteReviews);

module.exports = router;
