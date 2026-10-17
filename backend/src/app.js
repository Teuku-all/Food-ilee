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

const errorMiddleware = require('./middlewares/error.middleware');
app.use(errorMiddleware);
app.set('corsOrigin', corsOrigin);

module.exports = app;
