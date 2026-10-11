const prisma = require("../config/prisma");
const notificationService = require("./notification.service");
const snap = require("../config/midtrans");

async function createOrder(buyerId, wasteId, quantity) {
  const waste = await prisma.wasteProduct.findUnique({
    where: {
      id: wasteId,
    },
  });

  if (!waste) {
    throw new Error("Produk tidak ditemukan");
  }

  if (waste.stock < quantity) {
    throw new Error("Stock tidak cukup");
  }

  const total = waste.price * quantity;

  const midtransToken =
  await snap.createTransaction({

    transaction_details: {

      order_id:
        `ORDER-${Date.now()}`,

      gross_amount:
        total
    },

    customer_details: {

      email:
        'buyer@gmail.com'
    }
  });

const order =
  await prisma.order.create({

    data: {

      quantity,

      total,

      buyerId,

      wasteId,

      paymentToken:
        midtransToken.token
    }
  });

  await notificationService.createNotification(
    waste.sellerId,

    "Order Baru",

    `Pesanan baru untuk ${waste.title}`,
  );

  // kurangi stock
  await prisma.wasteProduct.update({
    where: {
      id: wasteId,
    },

    data: {
      stock: waste.stock - quantity,
    },
  });

  return order;
}

async function getMyOrders(buyerId) {
  return prisma.order.findMany({
    where: {
      buyerId,
    },

    include: {
      waste: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

async function updatePaymentStatus(
  orderId,
  status
) {

  return prisma.order.update({

    where: {
      id: orderId
    },

    data: {
      paymentStatus: status
    }
  });
}

module.exports = {
  createOrder,
  getMyOrders,
  updatePaymentStatus
};
