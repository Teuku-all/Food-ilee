const prisma =
  require('../config/prisma');

async function createWaste(data) {

  const waste =
    await prisma.wasteProduct.create({

      data: {

        title: data.title,

        description:
          data.description,

        image: data.image,

        price:
          data.price,

        stock:
          data.stock,

        sellerId:
          data.sellerId,

        storeId:
          data.storeId
      }
    });

  return waste;
}

async function getAllWastes(
  query
) {

  const page =
    parseInt(query.page) || 1;

  const limit =
    parseInt(query.limit) || 10;

  const skip =
    (page - 1) * limit;

  const search =
    query.search || '';

  const category =
    query.category;

  const sort =
    query.sort;

  const minPrice =
    query.minPrice
      ? parseInt(query.minPrice)
      : undefined;

  const maxPrice =
    query.maxPrice
      ? parseInt(query.maxPrice)
      : undefined;

  const where = {

    title: {

      contains: search,

      mode: 'insensitive'
    }
  };

  // filter category
  if (category) {

    where.category =
      category;
  }

  // filter harga
  if (
    minPrice ||
    maxPrice
  ) {

    where.price = {};

    if (minPrice) {

      where.price.gte =
        minPrice;
    }

    if (maxPrice) {

      where.price.lte =
        maxPrice;
    }
  }

  let orderBy = {

    createdAt: 'desc'
  };

  // sorting
  if (
    sort === 'price_asc'
  ) {

    orderBy = {
      price: 'asc'
    };
  }

  if (
    sort === 'price_desc'
  ) {

    orderBy = {
      price: 'desc'
    };
  }

  const wastes =
    await prisma.wasteProduct.findMany({

      where,

      include: {

        seller: {

          select: {

            id: true,

            email: true
          }
        },

        store: true
      },

      orderBy,

      skip,

      take: limit
    });

  const total =
    await prisma.wasteProduct.count({
      where
    });

  return {

    page,

    limit,

    total,

    totalPages:
      Math.ceil(
        total / limit
      ),

    data: wastes
  };
}

async function deleteWaste(
  id,
  sellerId
) {

  const waste =
    await prisma.wasteProduct.findFirst({

      where: {
        id,
        sellerId
      }
    });

  if (!waste) {

    throw new Error(
      'Produk tidak ditemukan'
    );
  }

  await prisma.wasteProduct.delete({
    where: {
      id
    }
  });

  return true;
}

async function updateWaste(
  id,
  sellerId,
  data
) {

  const waste =
    await prisma.wasteProduct.findFirst({

      where: {
        id,
        sellerId
      }
    });

  if (!waste) {

    throw new Error(
      'Produk tidak ditemukan'
    );
  }

  const updatedWaste =
    await prisma.wasteProduct.update({

      where: {
        id
      },

      data: {

        title:
          data.title,

        description:
          data.description,

        image:
          data.image || waste.image,

        price:
          data.price,

        stock:
          data.stock
      }
    });

  return updatedWaste;
}

async function getWasteById(id) {

  const waste =
    await prisma.wasteProduct.findUnique({

      where: {
        id
      },

      include: {

        seller: {

          select: {

            id: true,
            email: true
          }
        },

        store: true
      }
    });

  if (!waste) {

    throw new Error(
      'Produk tidak ditemukan'
    );
  }

  return waste;
}

module.exports = {
  createWaste,
  getAllWastes,
  deleteWaste,
  updateWaste,
  getWasteById
};