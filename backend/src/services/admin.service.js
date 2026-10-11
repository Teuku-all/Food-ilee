const prisma = require('../config/prisma');

async function getAllUsers() {

  return prisma.user.findMany({

    include: {

      store: true
    },

    orderBy: {
      createdAt: 'desc'
    }
  });
}

async function getAllWastes() {

  return prisma.wasteProduct.findMany({

    include: {

      seller: true,

      store: true
    },

    orderBy: {
      createdAt: 'desc'
    }
  });
}

async function getAllOrders() {

  return prisma.order.findMany({

    include: {

      buyer: true,

      waste: true
    },

    orderBy: {
      createdAt: 'desc'
    }
  });
}

async function banUser(
  userId
) {

  return prisma.user.update({

    where: {
      id: userId
    },

    data: {
      isBanned: true
    }
  });
}

async function deleteWaste(
  wasteId
) {

  return prisma.wasteProduct.delete({

    where: {
      id: wasteId
    }
  });
}

async function getAnalytics() {

  const totalUsers =
    await prisma.user.count();

  const totalWastes =
    await prisma.wasteProduct.count();

  const totalOrders =
    await prisma.order.count();

  const totalStores =
    await prisma.store.count();

  const totalRevenue =
    await prisma.order.aggregate({

      _sum: {
        total: true
      }
    });

  return {

    totalUsers,

    totalWastes,

    totalOrders,

    totalStores,

    totalRevenue:
      totalRevenue._sum.total || 0
  };
}

module.exports = {

  getAllUsers,
  getAllWastes,
  getAllOrders,
  banUser,
  deleteWaste,
  getAnalytics
};