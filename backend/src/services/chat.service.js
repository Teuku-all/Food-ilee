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
  await prisma.message.updateMany({
    where: { chatId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date(), deliveredAt: new Date() },
  });
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

async function markMessageDelivered(messageId, recipientId) {
  const message = await prisma.message.findFirst({
    where: { id: messageId, senderId: { not: recipientId }, deliveredAt: null,
      chat: { OR: [{ buyerId: recipientId }, { sellerId: recipientId }] } },
    select: { id: true },
  });
  if (!message) return null;
  return prisma.message.update({ where: { id: messageId }, data: { deliveredAt: new Date() } });
}

async function getChatRecipient(chatId, senderId) {
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, OR: [{ buyerId: senderId }, { sellerId: senderId }] },
    select: { buyerId: true, sellerId: true },
  });
  if (!chat) throw new Error('Akses percakapan ditolak');
  return chat.buyerId === senderId ? chat.sellerId : chat.buyerId;
}

async function publishMessage(io, message, senderId) {
  const recipientId = await getChatRecipient(message.chatId, senderId);
  const recipientRoom = io.sockets.adapter.rooms.get(`user:${recipientId}`);
  io.to(`user:${recipientId}`).emit('receive_message', message);
  if (!recipientRoom?.size) return message;
  const delivered = await markMessageDelivered(message.id, recipientId);
  if (!delivered) return message;
  io.to(`chat:${message.chatId}`).emit('message_status', {
    id: delivered.id,
    deliveredAt: delivered.deliveredAt,
    readAt: delivered.readAt,
  });
  return delivered;
}

async function markChatRead(chatId, userId) {
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, OR: [{ buyerId: userId }, { sellerId: userId }] },
    select: { id: true },
  });
  if (!chat) throw new Error('Akses percakapan ditolak');
  await prisma.message.updateMany({
    where: { chatId, senderId: { not: userId }, readAt: null },
    data: { deliveredAt: new Date(), readAt: new Date() },
  });
  return prisma.message.findMany({
    where: { chatId, senderId: { not: userId }, readAt: { not: null } },
    select: { id: true, deliveredAt: true, readAt: true },
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
  markMessageDelivered,
  getChatRecipient,
  publishMessage,
  markChatRead,
  getMyChats,
};
