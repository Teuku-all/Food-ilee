const prisma =
  require('../config/prisma');

async function createStore(data) {

  const existingStore =
    await prisma.store.findUnique({

      where: {
        ownerId: data.ownerId
      }
    });

  if (existingStore) {

    throw new Error(
      'User sudah punya toko'
    );
  }

  const store =
    await prisma.store.create({

      data: {

        name:
          data.name,

        description:
          data.description,

        image:
          data.image,

        ownerId:
          data.ownerId
      }
    });

  return store;
}

async function getMyStore(ownerId) {

  return prisma.store.findUnique({

    where: {
      ownerId
    },

    include: {
      products: true
    }
  });
}

module.exports = {
  createStore,
  getMyStore
};