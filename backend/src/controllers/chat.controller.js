const chatService =
  require('../services/chat.service');

async function createChat(
  req,
  res
) {

  try {

    const chat =
      await chatService.createChat(

        req.user.id,

        req.body.sellerId
      );

    res.status(201).json({

      success: true,

      data: chat
    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message
    });
  }
}

async function sendMessage(
  req,
  res
) {

  try {

    const message =
      await chatService.sendMessage(

        req.params.chatId,

        req.user.id,

        req.body.text
      );

    res.status(201).json({

      success: true,

      data: message
    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message
    });
  }
}

async function getMessages(
  req,
  res
) {

  try {

    const messages =
      await chatService.getMessages(
        req.params.chatId
      );

    res.status(200).json({

      success: true,

      data: messages
    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message
    });
  }
}

module.exports = {

  createChat,
  sendMessage,
  getMessages
};