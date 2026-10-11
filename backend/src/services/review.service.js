const prisma =
  require('../config/prisma');

async function createReview(
  reviewerId,
  wasteId,
  rating,
  comment
) {

  const waste =
    await prisma.wasteProduct.findUnique({

      where: {
        id: wasteId
      }
    });

  if (!waste) {

    throw new Error(
      'Produk tidak ditemukan'
    );
  }

  // cek sudah pernah review
  const existingReview =
    await prisma.review.findFirst({

      where: {
        reviewerId,
        wasteId
      }
    });

  if (existingReview) {

    throw new Error(
      'Sudah mereview produk ini'
    );
  }

  const review =
    await prisma.review.create({

      data: {

        reviewerId,

        wasteId,

        rating,

        comment
      }
    });

  return review;
}

async function getWasteReviews(
  wasteId
) {

  const reviews =
    await prisma.review.findMany({

      where: {
        wasteId
      },

      include: {

        reviewer: {

          select: {

            id: true,
            email: true
          }
        }
      },

      orderBy: {
        createdAt: 'desc'
      }
    });

  // average rating
  const averageRating =

    reviews.length > 0

      ? (
          reviews.reduce(
            (acc, item) =>
              acc + item.rating,
            0
          ) / reviews.length
        ).toFixed(1)

      : 0;

  return {

    averageRating,

    totalReviews:
      reviews.length,

    reviews
  };
}

module.exports = {

  createReview,
  getWasteReviews
};