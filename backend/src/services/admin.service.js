const prisma = require('../config/prisma');

async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      isBanned: true,
      createdAt: true,
      store: { select: { id: true, name: true } },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async function getAllWastes() {
  return prisma.wasteProduct.findMany({
    include: {
      seller: { select: { id: true, name: true, username: true, email: true } },
      store: { select: { id: true, name: true, location: true } },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });
}

async function getAllOrders() {
  return prisma.order.findMany({
    include: {
      buyer: { select: { id: true, name: true, username: true, email: true } },
      waste: { include: { store: { select: { id: true, name: true } } } },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });
}

async function banUser(userId) {
  return prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      isBanned: true,
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      isBanned: true,
    },
  });
}

async function deleteWaste(wasteId) {
  return prisma.wasteProduct.delete({
    where: {
      id: wasteId,
    },
  });
}

async function getAnalytics() {
  const totalUsers = await prisma.user.count();

  const totalWastes = await prisma.wasteProduct.count();

  const totalOrders = await prisma.order.count();

  const totalStores = await prisma.store.count();

  const totalRevenue = await prisma.order.aggregate({
    where: { paymentStatus: 'paid' },
    _sum: {
      total: true,
    },
  });

  return {
    totalUsers,

    totalWastes,

    totalOrders,

    totalStores,

    totalRevenue: totalRevenue._sum.total || 0,
  };
}

async function setStoreMidtransMerchantId(storeId, merchantId) {
  if (typeof merchantId !== 'string' || !/^[A-Za-z0-9_-]{2,64}$/.test(merchantId.trim()))
    throw new Error('ID merchant Midtrans tidak valid.');
  return prisma.store.update({
    where: { id: storeId },
    data: { midtransMerchantId: merchantId.trim() },
    select: { id: true, name: true, midtransMerchantId: true },
  });
}

module.exports = {
  getAllUsers,
  getAllWastes,
  getAllOrders,
  banUser,
  deleteWaste,
  getAnalytics,
  setStoreMidtransMerchantId,
};
