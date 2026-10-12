require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const aiRoutes = require('./routes/ai.routes');
const storeRoutes = require('./routes/store.routes');
const chatRoutes = require('./routes/chat.routes');
const authRoutes = require('./routes/auth.routes');
const wasteRoutes = require('./routes/waste.routes');
const orderRoutes = require('./routes/order.routes');
const app = express();
const reviewRoutes = require('./routes/review.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');
const paymentRoutes = require('./routes/payment.routes');
const rateLimit = require('express-rate-limit');
const userRoutes = require('./routes/user.routes');

const localFrontendOrigins =
  process.env.NODE_ENV === 'production'
    ? []
    : [
        'http://localhost:5501',
        'http://127.0.0.1:5501',
        'http://localhost:5502',
        'http://127.0.0.1:5502',
      ];
const configuredOrigins = [process.env.FRONTEND_URL, ...(process.env.CORS_ORIGINS || '').split(',')]
  .map((value) => {
    if (!value?.trim()) return null;
    try {
      return new URL(value.trim()).origin;
    } catch {
      return null;
    }
  })
  .filter(Boolean);
const allowedOrigins = new Set([...localFrontendOrigins, ...configuredOrigins]);
const corsOrigin = (origin, callback) => callback(null, !origin || allowedOrigins.has(origin));

app.use(cors({ origin: corsOrigin }));
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Terlalu banyak request' },
});
app.use('/api', limiter);

app.use('/api/users', userRoutes);
app.use('/api/stores', storeRoutes);

app.use('/api/admin', adminRoutes);

app.use('/api/notifications', notificationRoutes);

app.use('/api/reviews', reviewRoutes);

app.use('/api/orders', orderRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/wastes', wasteRoutes);

app.use('/api/ai', aiRoutes);

app.use('/api/payments', paymentRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Food Ilee API Running',
  });
});

app.use('/api/chat', chatRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

const PORT = process.env.PORT || 5000;

const http = require('http');

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./config/prisma');
const chatService = require('./services/chat.service');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
  },
});
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
  socket.on('join_chat', async (chatId) => {
    try {
      await chatService.getMessages(chatId, socket.data.user.id);
      socket.join(`chat:${chatId}`);
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
      io.to(`chat:${data.chatId}`).emit('receive_message', message);
    } catch (error) {
      socket.emit('chat_error', error.message);
    }
  });
});

const errorMiddleware = require('./middlewares/error.middleware');
app.use(errorMiddleware);

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} sudah dipakai. Atur PORT di backend/.env atau hentikan server yang lama.`,
    );
  } else {
    console.error('Backend gagal dijalankan:', error.message);
  }
  process.exitCode = 1;
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
