const prisma = require('../config/prisma');
const notificationService = require('./notification.service');
const snap = require('../config/midtrans');
const { randomUUID } = require('crypto');

async function createOrder(buyerId, wasteId, quantity) {
  if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
    throw new Error('Jumlah pesanan harus berupa bilangan bulat lebih dari nol');
  }

  quantity = Number(quantity);
  const waste = await prisma.wasteProduct.findUnique({
    where: {
      id: wasteId,
    },
  });

  if (!waste) {
    throw new Error('Produk tidak ditemukan');
  }

  if (waste.sellerId && waste.sellerId === buyerId) {
    throw new Error('Anda tidak dapat memesan produk dari toko sendiri');
  }

  if (waste.stock < quantity) {
    throw new Error('Stock tidak cukup');
  }

  const total = waste.price * quantity;
  const reserved = await prisma.wasteProduct.updateMany({
    where: { id: wasteId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
  if (!reserved.count) throw new Error('Stok berubah atau tidak cukup untuk jumlah tersebut');

  const id = randomUUID();
  try {
    const buyer = await prisma.user.findUnique({
      where: { id: buyerId },
      select: { email: true, name: true },
    });
    const payment = await snap.createTransaction({
      transaction_details: { order_id: `ORDER-${id}`, gross_amount: total },
      customer_details: {
        email: buyer?.email || '',
        first_name: buyer?.name || 'Pembeli Food Ilee',
      },
      callbacks: { finish: `${process.env.FRONTEND_URL || 'http://localhost:5501'}/#transaksi` },
    });
    const order = await prisma.order.create({
      data: { id, quantity, total, buyerId, wasteId, paymentToken: payment.token },
    });
    if (waste.sellerId) {
      try {
        await notificationService.createNotification(
          waste.sellerId,
          'Pesanan Baru',
          `Pesanan baru untuk ${waste.title}`,
        );
      } catch (notificationError) {
        console.error('Order notification failed:', notificationError.message);
      }
    }
    return { ...order, paymentUrl: payment.redirect_url };
  } catch (error) {
    await prisma.$transaction([
      prisma.wasteProduct.update({
        where: { id: wasteId },
        data: { stock: { increment: quantity } },
      }),
    ]);
    throw error;
  }
}

async function getMyOrders(buyerId) {
  return prisma.order.findMany({
    where: {
      buyerId,
    },

    include: {
      waste: {
        include: {
          store: true,
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });
}

async function updatePaymentStatus(orderId, status) {
  const paymentStatus = status === 'settlement' || status === 'capture' ? 'paid' : status;
  const orderStatus =
    paymentStatus === 'paid'
      ? 'processing'
      : ['expire', 'cancel', 'deny', 'failure'].includes(status)
        ? 'cancelled'
        : undefined;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Pesanan pembayaran tidak ditemukan');
  // Midtrans may retry a notification. Never rewind a paid order or restore stock twice.
  if (paymentStatus === 'paid' && order.paymentStatus === 'paid') return order;
  if (order.paymentStatus === 'paid' && !['refund', 'partial_refund'].includes(paymentStatus))
    return order;
  if (orderStatus === 'cancelled' && order.status === 'cancelled') return order;
  if (orderStatus === 'cancelled' && order.status !== 'pending') return order;
  if (orderStatus === 'cancelled' && order.status === 'pending') {
    const updated = await prisma.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { paymentStatus, status: 'cancelled' },
    });
    if (updated.count)
      await prisma.wasteProduct.update({
        where: { id: order.wasteId },
        data: { stock: { increment: order.quantity } },
      });
    return prisma.order.findUnique({ where: { id: orderId } });
  }
  return prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus, ...(orderStatus ? { status: orderStatus } : {}) },
  });
}

async function getMySales(sellerId) {
  return prisma.order.findMany({
    where: { waste: { sellerId } },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      waste: { include: { store: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function updateSellerOrderStatus(orderId, sellerId, status) {
  const allowed = ['shipped', 'completed'];
  if (!allowed.includes(status)) throw new Error('Status pesanan tidak didukung');
  const order = await prisma.order.findFirst({ where: { id: orderId, waste: { sellerId } } });
  if (!order) throw new Error('Pesanan tidak ditemukan');
  const transitions = { processing: ['shipped'], shipped: ['completed'] };
  if (!transitions[order.status]?.includes(status))
    throw new Error('Perubahan status ini tidak dapat dilakukan');
  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: order.status },
    data: { status },
  });
  if (!updated.count) throw new Error('Status pesanan baru saja berubah. Muat ulang halaman.');
  return prisma.order.findUnique({ where: { id: orderId } });
}

module.exports = {
  createOrder,
  getMyOrders,
  updatePaymentStatus,
  getMySales,
  updateSellerOrderStatus,
};
