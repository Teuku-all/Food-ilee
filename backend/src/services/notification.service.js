const prisma = require('../config/prisma');

async function createNotification(userId, title, message) {
  return prisma.notification.create({
    data: {
      userId,

      title,

      message,
    },
  });
}

async function getMyNotifications(userId) {
  return prisma.notification.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: 'desc',
    },
  });
}

async function markAsRead(notificationId, userId) {
  const updated = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
  if (!updated.count) throw new Error('Notifikasi tidak ditemukan');
  return prisma.notification.findFirst({ where: { id: notificationId, userId } });
}

module.exports = {
  createNotification,
  getMyNotifications,
  markAsRead,
};
