const prisma = require('../config/prisma');

async function createWaste(data) {
  const store = data.sellerId
    ? await prisma.store.findUnique({ where: { ownerId: data.sellerId }, select: { id: true } })
    : null;
  const waste = await prisma.wasteProduct.create({
    data: {
      title: data.title,

      description: data.description,

      image: data.image,

      price: data.price,

      stock: data.stock,

      sellerId: data.sellerId,

      storeId: data.storeId || store?.id,

      category: data.category,

      location: data.location,
    },
  });

  return waste;
}

async function getAllWastes(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 10));

  const skip = (page - 1) * limit;

  const search = query.search || '';

  const category = query.category;

  const sort = query.sort;

  const minPrice = query.minPrice !== undefined ? Number.parseInt(query.minPrice, 10) : undefined;
  const maxPrice = query.maxPrice !== undefined ? Number.parseInt(query.maxPrice, 10) : undefined;

  const where = {
    title: {
      contains: search,

      mode: 'insensitive',
    },
  };

  if (query.mine === 'true' && query.userId) {
    where.sellerId = query.userId;
  }

  // filter category
  if (category) {
    where.category = category;
  }

  // filter harga
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};

    if (minPrice !== undefined) {
      where.price.gte = minPrice;
    }

    if (maxPrice !== undefined) {
      where.price.lte = maxPrice;
    }
  }

  let orderBy = {
    createdAt: 'desc',
  };

  // sorting
  if (sort === 'price_asc') {
    orderBy = {
      price: 'asc',
    };
  }

  if (sort === 'price_desc') {
    orderBy = {
      price: 'desc',
    };
  }

  const wastes = await prisma.wasteProduct.findMany({
    where,

    include: {
      seller: {
        select: {
          id: true,

          email: true,
        },
      },

      store: true,
    },

    orderBy,

    skip,

    take: limit,
  });

  const total = await prisma.wasteProduct.count({
    where,
  });

  return {
    page,

    limit,

    total,

    totalPages: Math.ceil(total / limit),

    data: wastes,
  };
}

async function deleteWaste(id, sellerId) {
  const waste = await prisma.wasteProduct.findFirst({
    where: {
      id,
      sellerId,
    },
  });

  if (!waste) {
    throw new Error('Produk tidak ditemukan');
  }

  await prisma.wasteProduct.delete({
    where: {
      id,
    },
  });

  return true;
}

async function updateWaste(id, sellerId, data) {
  const waste = await prisma.wasteProduct.findFirst({
    where: {
      id,
      sellerId,
    },
  });

  if (!waste) {
    throw new Error('Produk tidak ditemukan');
  }

  const updatedWaste = await prisma.wasteProduct.update({
    where: {
      id,
    },

    data: {
      title: data.title,

      description: data.description,

      image: data.image || waste.image,

      price: data.price,

      stock: data.stock,

      category: data.category,

      location: data.location,
    },
  });

  return updatedWaste;
}

async function getWasteById(id) {
  const waste = await prisma.wasteProduct.findUnique({
    where: {
      id,
    },

    include: {
      seller: {
        select: {
          id: true,
          email: true,
        },
      },

      store: true,
    },
  });

  if (!waste) {
    throw new Error('Produk tidak ditemukan');
  }

  return waste;
}

module.exports = {
  createWaste,
  getAllWastes,
  deleteWaste,
  updateWaste,
  getWasteById,
};
