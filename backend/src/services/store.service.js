const prisma = require('../config/prisma');

async function createStore(data) {
  const existingStore = await prisma.store.findUnique({
    where: {
      ownerId: data.ownerId,
    },
  });

  if (existingStore) {
    throw new Error('User sudah punya toko');
  }

  const store = await prisma.store.create({
    data: {
      name: data.name,

      description: data.description,

      location: data.location,

      image: data.image,

      ownerId: data.ownerId,
    },
  });

  return store;
}

async function getMyStore(ownerId) {
  return prisma.store.findUnique({
    where: {
      ownerId,
    },

    include: {
      products: {
        include: {
          reviews: true,
          orders: true,
        },
      },
    },
  });
}

async function updateStore(ownerId, data) {
  const existing = await prisma.store.findUnique({ where: { ownerId } });
  if (!existing) throw new Error('Toko belum dibuat');
  return prisma.store.update({
    where: { ownerId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.image !== undefined ? { image: data.image } : {}),
    },
  });
}

module.exports = {
  createStore,
  getMyStore,
  updateStore,
};
