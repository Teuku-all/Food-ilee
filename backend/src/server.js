require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./app');
const prisma = require('./config/prisma');
const chatService = require('./services/chat.service');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: app.get('corsOrigin') } });
app.set('io', io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, isBanned: true },
    });
    if (!user || user.isBanned) return next(new Error('Unauthorized'));
    socket.data.user = { id: user.id, role: user.role };
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.data.user.id}`);
  socket.on('join_chat', async (chatId) => {
    try {
      await chatService.getMessages(chatId, socket.data.user.id);
      socket.join(`chat:${chatId}`);
      const readMessages = await chatService.markChatRead(chatId, socket.data.user.id);
      for (const message of readMessages) {
        io.to(`chat:${chatId}`).emit('message_status', message);
      }
    } catch {
      socket.emit('chat_error', 'Akses percakapan ditolak');
    }
  });

  socket.on('leave_chat', (chatId) => {
    if (typeof chatId === 'string') socket.leave(`chat:${chatId}`);
  });

  socket.on('send_message', async (data = {}) => {
    try {
      if (typeof data.chatId !== 'string') throw new Error('Percakapan tidak valid');
      const message = await chatService.sendMessage(data.chatId, socket.data.user.id, data.text);
      await chatService.publishMessage(io, message, socket.data.user.id);
    } catch (error) {
      socket.emit('chat_error', error.message);
    }
  });
});


server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} sudah dipakai. Atur PORT di backend/.env atau hentikan server yang lama.`);
  } else {
    console.error('Backend gagal dijalankan:', error.message);
  }
  process.exitCode = 1;
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
