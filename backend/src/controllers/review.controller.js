const reviewService = require('../services/review.service');

async function createReview(req, res) {
  try {
    const review = await reviewService.createReview(
      req.user.id,

      req.body.wasteId,

      req.body.rating,

      req.body.comment,
    );

    res.status(201).json({
      success: true,

      data: review,
    });
  } catch (error) {
    res.status(error.message === 'Produk tidak ditemukan' ? 404 : 400).json({
      success: false,

      message: error.message,
    });
  }
}

async function getWasteReviews(req, res) {
  try {
    const data = await reviewService.getWasteReviews(req.params.wasteId);

    res.status(200).json({
      success: true,

      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
}

module.exports = {
  createReview,
  getWasteReviews,
};
