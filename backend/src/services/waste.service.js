const prisma = require('../config/prisma');

async function createWaste(data) {
  const store = data.sellerId
    ? await prisma.store.findUnique({
        where: { ownerId: data.sellerId },
        select: {
          id: true,
          shippingOriginContactName: true,
          shippingOriginContactPhone: true,
          shippingOriginAddress: true,
          shippingOriginPostalCode: true,
          shippingOriginRegion: true,
          latitude: true,
          longitude: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountHolder: true,
        },
      })
    : null;
  if (!store) {
    const error = new Error('Buat toko terlebih dahulu sebelum mengunggah produk.');
    error.code = 'STORE_REQUIRED';
    throw error;
  }
  if ([store.shippingOriginContactName, store.shippingOriginContactPhone, store.shippingOriginAddress, store.shippingOriginPostalCode,
    store.bankName, store.bankAccountNumber, store.bankAccountHolder].some((value) => !value?.trim())) {
    const error = new Error('Lengkapi alamat pickup dan rekening toko sebelum mengunggah produk.');
    error.code = 'STORE_PROFILE_INCOMPLETE';
    throw error;
  }
  if (!store.shippingOriginRegion || ['provinceCode', 'province', 'cityCode', 'city', 'districtCode', 'district', 'villageCode', 'village', 'details']
    .some((key) => !String(store.shippingOriginRegion[key] || '').trim()))
    throw new Error('Pilih provinsi hingga desa/kelurahan pada alamat pickup toko sebelum mengunggah produk.');
  if (store.latitude == null || store.longitude == null)
    throw new Error('Pilih titik lokasi pickup toko pada peta sebelum mengunggah produk.');
  if (!/^\d{5}$/.test(store.shippingOriginPostalCode) || !/^\d{6,30}$/.test(store.bankAccountNumber))
    throw new Error('Periksa kembali kode pos pickup dan nomor rekening toko.');
  const waste = await prisma.wasteProduct.create({
    data: {
      title: data.title,

      description: data.description,

      image: data.image,

      price: data.price,

      stock: data.stock,

      sellerId: data.sellerId,

      storeId: store.id,

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

          name: true,

          username: true,
        },
      },

      store: { select: { id: true, name: true, description: true, location: true, image: true, ownerId: true, latitude: true, longitude: true } },
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
          name: true,
          username: true,
        },
      },

      store: { select: { id: true, name: true, description: true, location: true, image: true, ownerId: true, latitude: true, longitude: true } },
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
