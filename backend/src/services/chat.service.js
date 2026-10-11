const prisma =
  require('../config/prisma');

async function createChat(
  buyerId,
  sellerId
) {

  const existingChat =
    await prisma.chat.findFirst({

      where: {
        buyerId,
        sellerId
      }
    });

  if (existingChat) {

    return existingChat;
  }

  const chat =
    await prisma.chat.create({

      data: {
        buyerId,
        sellerId
      }
    });

  return chat;
}

async function sendMessage(
  chatId,
  senderId,
  text
) {

  const message =
    await prisma.message.create({

      data: {

        text,

        senderId,

        chatId
      }
    });

  return message;
}

async function getMessages(
  chatId
) {

  return prisma.message.findMany({

    where: {
      chatId
    },

    include: {

      sender: {

        select: {

          id: true,
          email: true
        }
      }
    },

    orderBy: {
      createdAt: 'asc'
    }
  });
}

module.exports = {

  createChat,
  sendMessage,
  getMessages
};