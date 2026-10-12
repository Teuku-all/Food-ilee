const prisma = require('../config/prisma');

async function createChat(buyerId, sellerId) {
  if (!sellerId || buyerId === sellerId) throw new Error('Penjual tidak valid');
  const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { id: true } });
  if (!seller) throw new Error('Penjual tidak ditemukan');
  const existingChat = await prisma.chat.findFirst({
    where: {
      buyerId,
      sellerId,
    },
  });

  if (existingChat) {
    return existingChat;
  }

  const chat = await prisma.chat.create({
    data: {
      buyerId,
      sellerId,
    },
  });

  return chat;
}

async function sendMessage(chatId, senderId, text) {
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, OR: [{ buyerId: senderId }, { sellerId: senderId }] },
    select: { id: true },
  });
  if (!chat) throw new Error('Akses percakapan ditolak');
  const cleanText = typeof text === 'string' ? text.trim() : '';
  if (!cleanText || cleanText.length > 4000) throw new Error('Pesan harus berisi 1-4000 karakter');
  const message = await prisma.message.create({
    data: {
      text: cleanText,

      senderId,

      chatId,
    },
  });

  return message;
}

async function getMessages(chatId, userId) {
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, OR: [{ buyerId: userId }, { sellerId: userId }] },
    select: { id: true },
  });
  if (!chat) throw new Error('Akses percakapan ditolak');
  return prisma.message.findMany({
    where: {
      chatId,
    },

    include: {
      sender: {
        select: {
          id: true,
          email: true,
        },
      },
    },

    orderBy: {
      createdAt: 'asc',
    },
  });
}

async function getMyChats(userId) {
  return prisma.chat.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    include: {
      buyer: { select: { id: true, name: true, username: true, email: true } },
      seller: { select: { id: true, name: true, username: true, email: true } },
      messages: { take: 1, orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = {
  createChat,
  sendMessage,
  getMessages,
  getMyChats,
};
