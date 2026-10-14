const prisma = require('../config/prisma');
const notificationService = require('./notification.service');
const snap = require('../config/midtrans');
const { randomUUID } = require('crypto');
const shippingService = require('./shipping.service');

async function getCheckoutItems(requestItems, buyerId) {
  if (!Array.isArray(requestItems) || !requestItems.length || requestItems.length > 20)
    throw new Error('Keranjang kosong atau jumlah produk melebihi batas.');
  const quantities = new Map();
  for (const item of requestItems) {
    const id = String(item?.wasteId || '');
    const quantity = Number(item?.quantity);
    if (!id || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Produk atau jumlah pesanan tidak valid.');
    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }
  const products = await prisma.wasteProduct.findMany({ where: { id: { in: [...quantities.keys()] } } });
  if (products.length !== quantities.size) throw new Error('Satu atau beberapa produk sudah tidak tersedia.');
  if (products.some((product) => product.sellerId === buyerId)) throw new Error('Anda tidak dapat membeli produk dari toko sendiri.');
  if (new Set(products.map((product) => product.sellerId)).size !== 1) throw new Error('Checkout hanya dapat berisi produk dari satu toko.');
  return products.map((product) => ({
    wasteId: product.id,
    title: product.title,
    unitPrice: product.price,
    quantity: quantities.get(product.id),
    stock: product.stock,
    image: product.image,
    sellerId: product.sellerId,
  }));
}

async function getRates(buyerId, items, address) {
  const normalized = await getCheckoutItems(items, buyerId);
  if (normalized.some((item) => item.stock < item.quantity)) throw new Error('Stok satu atau beberapa produk tidak mencukupi.');
  return shippingService.getRates(address, normalized);
}

function paymentUrl(token) {
  if (!token) return undefined;
  const host = process.env.MIDTRANS_IS_PRODUCTION === 'true' ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
  return `${host}/snap/v2/vtweb/${encodeURIComponent(token)}`;
}

async function createCheckout(buyerId, { items, address, courier, courierType, checkoutKey }) {
  if (typeof checkoutKey !== 'string' || !/^[a-f0-9-]{36}$/i.test(checkoutKey))
    throw new Error('Kunci checkout tidak valid. Muat ulang halaman dan coba lagi.');
  const previous = await prisma.order.findFirst({ where: { buyerId, checkoutKey }, include: { items: true, waste: true } });
  if (previous) return { ...previous, paymentUrl: paymentUrl(previous.paymentToken) };
  shippingService.validateAddress(address);
  const normalized = await getCheckoutItems(items, buyerId);
  if (normalized.some((item) => item.stock < item.quantity)) throw new Error('Stok satu atau beberapa produk tidak mencukupi.');
  const rates = await shippingService.getRates(address, normalized);
  const selected = rates.find((rate) => rate.company === courier && rate.courierType === courierType);
  if (!selected || !Number.isSafeInteger(Number(selected.price)) || selected.price < 0)
    throw new Error('Layanan pengiriman berubah. Muat ulang pilihan ongkir.');
  const subtotal = normalized.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = subtotal + Number(selected.price);
  const id = randomUUID();
  let reserved;
  try {
    reserved = await prisma.$transaction(async (tx) => {
    for (const item of normalized) {
      const update = await tx.wasteProduct.updateMany({
        where: { id: item.wasteId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (!update.count) throw new Error('Stok berubah saat checkout. Muat ulang keranjang.');
    }
    return tx.order.create({
      data: {
        id,
        checkoutKey,
        buyerId,
        wasteId: normalized[0].wasteId,
        quantity: normalized.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
        discount: 0,
        shippingCost: Number(selected.price),
        total,
        shippingAddress: { ...address, collectionMethod: selected.collectionMethod },
        courier: selected.company,
        courierService: selected.courierType,
        courierServiceName: selected.serviceName,
        items: { create: normalized.map(({ wasteId, title, unitPrice, quantity, image }) => ({ wasteId, title, unitPrice, quantity, image })) },
      },
    });
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const existing = await prisma.order.findFirst({ where: { buyerId, checkoutKey }, include: { items: true, waste: true } });
      if (existing) return { ...existing, paymentUrl: paymentUrl(existing.paymentToken) };
    }
    throw error;
  }
  try {
    const buyer = await prisma.user.findUnique({ where: { id: buyerId }, select: { email: true, name: true } });
    const payment = await snap.createTransaction({
      transaction_details: { order_id: `ORDER-${id}`, gross_amount: total },
      item_details: [
        ...normalized.map((item) => ({ id: item.wasteId, price: item.unitPrice, quantity: item.quantity, name: item.title.slice(0, 50) })),
        ...(Number(selected.price) ? [{ id: 'shipping', price: Number(selected.price), quantity: 1, name: `Ongkir ${selected.courierName} ${selected.serviceName}`.slice(0, 50) }] : []),
      ],
      customer_details: { email: buyer?.email || '', first_name: buyer?.name || 'Pembeli Food Ilee' },
      callbacks: { finish: `${process.env.FRONTEND_URL || 'http://localhost:5501'}/#transaksi` },
    });
    const paidOrder = await prisma.order.update({ where: { id }, data: { paymentToken: payment.token } });
    if (normalized[0].sellerId) {
      try {
        await notificationService.createNotification(
          normalized[0].sellerId,
          'Pesanan Baru',
          `Pesanan baru dengan ${normalized.length} produk menunggu pembayaran`,
        );
      } catch (notificationError) {
        console.error('Order notification failed:', notificationError.message);
      }
    }
    return { ...reserved, ...paidOrder, paymentUrl: payment.redirect_url };
  } catch (error) {
    await prisma.$transaction(normalized.map((item) => prisma.wasteProduct.update({ where: { id: item.wasteId }, data: { stock: { increment: item.quantity } } })));
    await prisma.order.delete({ where: { id } });
    throw error;
  }
}

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
      data: {
        id, quantity, total, subtotal: total, buyerId, wasteId, paymentToken: payment.token,
        items: { create: [{ wasteId, title: waste.title, unitPrice: waste.price, quantity, image: waste.image }] },
      },
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
      items: true,
    },

    orderBy: {
      createdAt: 'desc',
    },
  });
}

async function getMyOrder(orderId, buyerId) {
  return prisma.order.findFirst({
    where: { id: orderId, buyerId },
    include: { items: true, waste: { include: { store: true } } },
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
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new Error('Pesanan pembayaran tidak ditemukan');
  // Midtrans may retry a notification. Never rewind a paid order or restore stock twice.
  if (paymentStatus === 'paid' && order.paymentStatus === 'paid') {
    await createPaidShipment(orderId);
    return order;
  }
  if (order.paymentStatus === 'paid' && !['refund', 'partial_refund'].includes(paymentStatus))
    return order;
  if (paymentStatus === 'paid' && order.status === 'cancelled') {
    try {
      const reactivated = await prisma.$transaction(async (tx) => {
        const claimed = await tx.order.updateMany({
          where: { id: orderId, status: 'cancelled', paymentStatus: { not: 'paid' } },
          data: { paymentStatus: 'paid', status: 'payment_review' },
        });
        if (!claimed.count) return null;
        const items = order.items.length ? order.items : [{ wasteId: order.wasteId, quantity: order.quantity }];
        for (const item of items) {
          const stock = await tx.wasteProduct.updateMany({
            where: { id: item.wasteId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (!stock.count) {
            const error = new Error('Stok tidak cukup untuk memproses pembayaran terlambat.');
            error.code = 'INSUFFICIENT_STOCK';
            throw error;
          }
        }
        return tx.order.update({ where: { id: orderId }, data: { status: 'processing' } });
      });
      if (reactivated) {
        await createPaidShipment(orderId);
        return reactivated;
      }
      return prisma.order.findUnique({ where: { id: orderId } });
    } catch (error) {
      if (error.code !== 'INSUFFICIENT_STOCK') throw error;
      return prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'paid', status: 'payment_review' } });
    }
  }
  if (orderStatus === 'cancelled' && order.status === 'cancelled') return order;
  if (orderStatus === 'cancelled' && order.status !== 'pending') return order;
  if (orderStatus === 'cancelled' && order.status === 'pending') {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: 'pending' },
        data: { paymentStatus, status: 'cancelled' },
      });
      if (!updated.count) return;
      const items = order.items.length ? order.items : [{ wasteId: order.wasteId, quantity: order.quantity }];
      for (const item of items) {
        await tx.wasteProduct.update({
          where: { id: item.wasteId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });
    return prisma.order.findUnique({ where: { id: orderId } });
  }
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus, ...(orderStatus ? { status: orderStatus } : {}) },
  });
  if (paymentStatus === 'paid') await createPaidShipment(orderId);
  return updatedOrder;
}

async function createPaidShipment(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { buyer: { select: { email: true } }, items: true },
  });
  if (!order || order.paymentStatus !== 'paid' || !order.shippingAddress || order.biteshipOrderId) return;
  const reserved = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: 'paid', biteshipOrderId: null },
    data: { biteshipOrderId: `creating:${orderId}`, shippingStatus: 'creating' },
  });
  if (!reserved.count) return;
  try {
    const shipment = await shippingService.createShipment(order, order.buyer, order.items);
    await prisma.order.update({
      where: { id: orderId },
      data: {
        biteshipOrderId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
        shippingStatus: shipment.status,
        status: 'processing',
      },
    });
  } catch (error) {
    const configurationMissing = /belum dikonfigurasi|BITESHIP_/i.test(error.message);
    // Keep the reservation after an ambiguous remote request so retries cannot book a second shipment.
    await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingStatus: configurationMissing ? 'configuration_missing' : 'creation_requires_review',
        ...(configurationMissing ? { biteshipOrderId: null } : {}),
      },
    });
    console.error('Biteship shipment creation needs review:', error.message);
  }
}

async function updateShippingStatus(payload) {
  const externalId = payload.order_id;
  if (!externalId) throw new Error('Notifikasi Biteship tidak memiliki order_id.');
  const order = await prisma.order.findFirst({ where: { biteshipOrderId: externalId } });
  if (!order) throw new Error('Pesanan pengiriman tidak ditemukan.');
  const data = {};
  if (typeof payload.status === 'string' && payload.status) data.shippingStatus = payload.status;
  if (typeof payload.courier_waybill_id === 'string' && payload.courier_waybill_id) data.trackingNumber = payload.courier_waybill_id;
  if (typeof payload.courier_link === 'string' && payload.courier_link.startsWith('https://')) data.trackingUrl = payload.courier_link;
  if (!Object.keys(data).length) return order;
  return prisma.order.update({ where: { id: order.id }, data });
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
  getRates,
  createCheckout,
  createPaidShipment,
  createOrder,
  getMyOrders,
  getMyOrder,
  updatePaymentStatus,
  updateShippingStatus,
  getMySales,
  updateSellerOrderStatus,
};
