const prisma = require('../config/prisma');

async function createReview(reviewerId, wasteId, rating, comment) {
  const normalizedRating = Number(rating);
  const normalizedComment = typeof comment === 'string' ? comment.trim() : '';
  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    throw new Error('Rating harus berupa angka 1 sampai 5');
  }
  if (normalizedComment.length < 3 || normalizedComment.length > 1000) {
    throw new Error('Ulasan harus berisi 3–1000 karakter');
  }

  const waste = await prisma.wasteProduct.findUnique({
    where: {
      id: wasteId,
    },
  });

  if (!waste) {
    throw new Error('Produk tidak ditemukan');
  }

  if (waste.sellerId === reviewerId) {
    throw new Error('Anda tidak dapat mengulas produk sendiri');
  }

  const completedOrder = await prisma.order.findFirst({
    where: { buyerId: reviewerId, wasteId, status: 'completed', paymentStatus: 'paid' },
    select: { id: true },
  });
  if (!completedOrder) {
    throw new Error('Ulasan hanya tersedia setelah pesanan selesai dan dibayar');
  }

  // cek sudah pernah review
  const existingReview = await prisma.review.findFirst({
    where: {
      reviewerId,
      wasteId,
    },
  });

  if (existingReview) {
    throw new Error('Sudah mereview produk ini');
  }

  const review = await prisma.review.create({
    data: {
      reviewerId,

      wasteId,

      rating: normalizedRating,

      comment: normalizedComment,
    },
  });

  return review;
}

async function getWasteReviews(wasteId) {
  const reviews = await prisma.review.findMany({
    where: {
      wasteId,
    },

    include: {
      reviewer: {
        select: {
          id: true,
          email: true,
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });

  // average rating
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length).toFixed(1)
      : 0;

  return {
    averageRating,

    totalReviews: reviews.length,

    reviews,
  };
}

module.exports = {
  createReview,
  getWasteReviews,
};
