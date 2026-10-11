require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const aiRoutes = require("./routes/ai.routes");
const storeRoutes = require("./routes/store.routes");
const chatRoutes = require("./routes/chat.routes");
const authRoutes = require("./routes/auth.routes");
const wasteRoutes = require("./routes/waste.routes");
const orderRoutes = require("./routes/order.routes");
const app = express();
const reviewRoutes = require("./routes/review.routes");
const notificationRoutes = require("./routes/notification.routes");
const adminRoutes = require("./routes/admin.routes");
const paymentRoutes = require("./routes/payment.routes");
const rateLimit = require("express-rate-limit");
const userRoutes = require("./routes/user.routes");

app.use(cors());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Terlalu banyak request" },
});
app.use("/api", limiter);

app.use('/api/users', userRoutes);
app.use("/api/stores", storeRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/reviews", reviewRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/wastes", wasteRoutes);

app.use("/api/ai", aiRoutes);

app.use("/api/payments", paymentRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Food Ilee API Running",
  });
});

app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 5000;

const http = require("http");

const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_chat", (chatId) => {
    socket.join(chatId);
  });

  socket.on("send_message", (data) => {
    io.to(data.chatId).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const errorMiddleware = require("./middlewares/error.middleware");
app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
