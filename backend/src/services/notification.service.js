const prisma =
  require('../config/prisma');

async function createNotification(
  userId,
  title,
  message
) {

  return prisma.notification.create({

    data: {

      userId,

      title,

      message
    }
  });
}

async function getMyNotifications(
  userId
) {

  return prisma.notification.findMany({

    where: {
      userId
    },

    orderBy: {
      createdAt: 'desc'
    }
  });
}

async function markAsRead(
  notificationId,
  userId
) {

  return prisma.notification.update({

    where: {
      id: notificationId
    },

    data: {
      isRead: true
    }
  });
}

module.exports = {

  createNotification,
  getMyNotifications,
  markAsRead
};