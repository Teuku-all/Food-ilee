const prisma = require('../config/prisma');
const notificationService = require('./notification.service');
const snap = require('../config/midtrans');
const { randomUUID } = require('crypto');
const shippingService = require('./shipping.service');
const supportedCouriers = new Set(['gojek', 'grab']);

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
  const products = await prisma.wasteProduct.findMany({
    where: { id: { in: [...quantities.keys()] } },
    include: { store: true, seller: { include: { store: true } } },
  });
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
    store: product.store || product.seller?.store || null,
  }));
}

function shippingOrigin(store) {
  if (!store) throw new Error('Penjual belum memiliki toko dengan alamat pickup. Hubungi penjual untuk melengkapi profil toko.');
  const origin = {
    contactName: store.shippingOriginContactName,
    contactPhone: store.shippingOriginContactPhone,
    address: store.shippingOriginAddress,
    postalCode: store.shippingOriginPostalCode,
    region: store.shippingOriginRegion,
    latitude: store.latitude,
    longitude: store.longitude,
  };
  if ([origin.contactName, origin.contactPhone, origin.address, origin.postalCode]
    .some((value) => typeof value !== 'string' || !value.trim()))
    throw new Error('Alamat pickup penjual belum lengkap. Penjual harus melengkapi alamat pengiriman di profil toko.');
  if (!/^\d{5}$/.test(origin.postalCode.trim())) throw new Error('Kode pos pickup penjual harus terdiri dari 5 angka.');
  if (!Number.isFinite(origin.latitude) || origin.latitude < -90 || origin.latitude > 90
    || !Number.isFinite(origin.longitude) || origin.longitude < -180 || origin.longitude > 180)
    throw new Error('Titik lokasi pickup penjual belum dipilih. Minta penjual memperbarui alamat toko.');
  return {
    ...origin,
    contactName: origin.contactName.trim(),
    contactPhone: origin.contactPhone.trim(),
    address: origin.address.trim(),
    postalCode: origin.postalCode.trim(),
  };
}

function midtransSplit(store, subtotal) {
  if (process.env.MIDTRANS_SPLIT_ENABLED !== 'true') return undefined;
  const platformMerchantId = process.env.MIDTRANS_PARTNER_MERCHANT_ID?.trim();
  if (!platformMerchantId || !store?.midtransMerchantId?.trim())
    throw new Error('Pembayaran ke rekening penjual belum aktif. Food Ilee harus mengaktifkan Midtrans Partner Split dan mendaftarkan merchant penjual terlebih dahulu.');
  return {
    gross_amount_split: {
      type: 'fixed',
      split_rules: [{ merchant_id: store.midtransMerchantId.trim(), value: String(subtotal) }],
      remaining_split_receiver: platformMerchantId,
    },
  };
}

async function getRates(buyerId, items, address, paymentMethod = 'midtrans', deliveryMethod = 'courier') {
  if (!['midtrans', 'cash'].includes(paymentMethod)) throw new Error('Metode pembayaran tidak didukung.');
  if (!['courier', 'pickup'].includes(deliveryMethod)) throw new Error('Metode pengiriman tidak didukung.');
  if (paymentMethod === 'cash' && deliveryMethod !== 'pickup')
    throw new Error('Pembayaran cash hanya tersedia untuk jemput langsung di toko.');
  const normalized = await getCheckoutItems(items, buyerId);
  if (normalized.some((item) => item.stock < item.quantity)) throw new Error('Stok satu atau beberapa produk tidak mencukupi.');
  const subtotal = normalized.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (paymentMethod === 'midtrans') midtransSplit(normalized[0].store, subtotal);
  const origin = shippingOrigin(normalized[0].store);
  if (deliveryMethod === 'pickup') {
    return [{
      company: 'pickup',
      courierType: 'pickup',
      courierName: 'Jemput langsung',
      serviceName: 'Ambil di toko penjual',
      price: 0,
      collectionMethod: 'pickup',
      pickupAddress: origin,
    }];
  }
  const rates = await shippingService.getRates(origin, address, normalized);
  return rates.filter((rate) => supportedCouriers.has(rate.company));
}

function paymentUrl(token) {
  if (!token) return undefined;
  const host = process.env.MIDTRANS_IS_PRODUCTION === 'true' ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
  return `${host}/snap/v2/vtweb/${encodeURIComponent(token)}`;
}

async function createCheckout(buyerId, {
  items, address, courier, courierType, checkoutKey, paymentMethod = 'midtrans', deliveryMethod = 'courier',
}) {
  if (!['midtrans', 'cash'].includes(paymentMethod)) throw new Error('Metode pembayaran tidak didukung.');
  if (!['courier', 'pickup'].includes(deliveryMethod)) throw new Error('Metode pengiriman tidak didukung.');
  if (paymentMethod === 'cash' && deliveryMethod !== 'pickup')
    throw new Error('Pembayaran cash hanya tersedia untuk jemput langsung di toko.');
  if (deliveryMethod === 'courier' && paymentMethod !== 'midtrans')
    throw new Error('Pengiriman GoSend dan GrabExpress hanya mendukung pembayaran online.');
  if (paymentMethod === 'midtrans' && !process.env.MIDTRANS_CLIENT_KEY?.trim())
    throw new Error('MIDTRANS_CLIENT_KEY belum dikonfigurasi pada backend.');
  if (typeof checkoutKey !== 'string' || !/^[a-f0-9-]{36}$/i.test(checkoutKey))
    throw new Error('Kunci checkout tidak valid. Muat ulang halaman dan coba lagi.');
  const previous = await prisma.order.findFirst({ where: { buyerId, checkoutKey }, include: { items: true, waste: true } });
  if (previous) return { ...previous, paymentUrl: paymentUrl(previous.paymentToken) };
  if (deliveryMethod === 'courier') shippingService.validateAddress(address);
  const normalized = await getCheckoutItems(items, buyerId);
  if (normalized.some((item) => item.stock < item.quantity)) throw new Error('Stok satu atau beberapa produk tidak mencukupi.');
  const origin = shippingOrigin(normalized[0].store);
  let selected;
  if (deliveryMethod === 'pickup') {
    if (courier !== 'pickup' || courierType !== 'pickup')
      throw new Error('Pilihan jemput langsung tidak valid. Muat ulang checkout.');
    selected = {
      company: 'pickup',
      courierType: 'pickup',
      serviceName: 'Ambil di toko penjual',
      price: 0,
      collectionMethod: 'pickup',
    };
  } else {
    if (!supportedCouriers.has(courier))
      throw new Error('Pengiriman hanya tersedia melalui GoSend atau GrabExpress.');
    const rates = await shippingService.getRates(origin, address, normalized);
    selected = rates.find((rate) => rate.company === courier && rate.courierType === courierType);
    if (!selected || !Number.isSafeInteger(Number(selected.price)) || selected.price < 0)
      throw new Error('Layanan pengiriman berubah. Muat ulang pilihan ongkir.');
  }
  const subtotal = normalized.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shippingCost = Number(selected.price);
  const total = subtotal + shippingCost;
  const transactionSplitSettings = paymentMethod === 'midtrans' ? midtransSplit(normalized[0].store, subtotal) : undefined;
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
        shippingCost,
        total,
        paymentMethod,
        ...(paymentMethod === 'midtrans' ? {
          sellerSettlementAmount: subtotal,
          sellerSettlementStatus: transactionSplitSettings ? 'split' : 'pending_manual',
        } : {}),
        ...(paymentMethod === 'cash' ? {
          sellerSettlementAmount: subtotal,
          sellerSettlementStatus: 'cash_pending',
          status: 'processing',
        } : {}),
        shippingAddress: deliveryMethod === 'pickup'
          ? { collectionMethod: 'pickup' }
          : { ...address, collectionMethod: selected.collectionMethod || 'pickup' },
        sellerShippingOrigin: origin,
        courier: selected.company,
        courierService: selected.courierType,
        courierServiceName: selected.serviceName,
        ...(deliveryMethod === 'pickup' ? { shippingStatus: 'awaiting_pickup' } : {}),
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
  if (paymentMethod === 'cash') {
    if (normalized[0].sellerId) {
      try {
        await notificationService.createNotification(
          normalized[0].sellerId,
          'Pesanan jemput langsung',
          'Pembeli akan mengambil pesanan dan membayar cash langsung ke penjual.',
        );
      } catch (notificationError) {
        console.error('Order notification failed:', notificationError.message);
      }
    }
    return prisma.order.findUnique({ where: { id }, include: { items: true, waste: true } });
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
      ...(transactionSplitSettings ? { transaction_split_settings: transactionSplitSettings } : {}),
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
    include: { store: true, seller: { include: { store: true } } },
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
    const sellerStore = waste.store || waste.seller?.store;
    const transactionSplitSettings = waste.sellerId ? midtransSplit(sellerStore, total) : undefined;
    const payment = await snap.createTransaction({
      transaction_details: { order_id: `ORDER-${id}`, gross_amount: total },
      ...(transactionSplitSettings ? { transaction_split_settings: transactionSplitSettings } : {}),
      customer_details: {
        email: buyer?.email || '',
        first_name: buyer?.name || 'Pembeli Food Ilee',
      },
      callbacks: { finish: `${process.env.FRONTEND_URL || 'http://localhost:5501'}/#transaksi` },
    });
    const order = await prisma.order.create({
      data: {
        id, quantity, total, subtotal: total, buyerId, wasteId, paymentToken: payment.token,
        ...(waste.sellerId ? { sellerSettlementAmount: total, sellerSettlementStatus: transactionSplitSettings ? 'split' : 'pending_manual' } : {}),
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
          store: { select: { id: true, name: true, description: true, location: true, image: true } },
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
    include: { items: true, waste: { include: { store: { select: { id: true, name: true, description: true, location: true, image: true } } } } },
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
  return createShipmentForOrder(orderId, 'midtrans');
}

async function createCodShipment(orderId) {
  return createShipmentForOrder(orderId, 'cod');
}

async function createShipmentForOrder(orderId, paymentMethod) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { buyer: { select: { email: true } }, items: true },
  });
  const eligible = paymentMethod === 'cod'
    ? order?.paymentMethod === 'cod' && order.paymentStatus === 'pending'
    : order?.paymentMethod !== 'cod' && order?.paymentStatus === 'paid' && order?.courier !== 'pickup';
  if (!order || !eligible || !order.shippingAddress || order.biteshipOrderId) return;
  const reserved = await prisma.order.updateMany({
    where: { id: orderId, paymentMethod, paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid', biteshipOrderId: null },
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
  const order = await prisma.order.findFirst({ where: { biteshipOrderId: externalId }, include: { items: true } });
  if (!order) throw new Error('Pesanan pengiriman tidak ditemukan.');
  const data = {};
  if (typeof payload.status === 'string' && payload.status) data.shippingStatus = payload.status;
  if (typeof payload.courier_waybill_id === 'string' && payload.courier_waybill_id) data.trackingNumber = payload.courier_waybill_id;
  if (typeof payload.courier_link === 'string' && payload.courier_link.startsWith('https://')) data.trackingUrl = payload.courier_link;
  if (!Object.keys(data).length) return order;
  if (order.paymentMethod === 'cod') {
    const normalizedStatus = String(payload.status || '').toLowerCase();
    if (normalizedStatus === 'delivered') {
      await prisma.order.updateMany({
        where: { id: order.id, paymentMethod: 'cod', paymentStatus: 'pending' },
        data: { ...data, paymentStatus: 'paid', status: 'completed' },
      });
      return prisma.order.findUnique({ where: { id: order.id } });
    }
    if (['cancelled', 'rejected', 'courier_not_found', 'returned'].includes(normalizedStatus)) {
      await prisma.$transaction(async (tx) => {
        const cancelled = await tx.order.updateMany({
          where: { id: order.id, paymentMethod: 'cod', paymentStatus: 'pending', status: 'processing' },
          data: { ...data, paymentStatus: 'cancelled', status: 'cancelled' },
        });
        if (!cancelled.count) return;
        const items = order.items?.length ? order.items : [{ wasteId: order.wasteId, quantity: order.quantity }];
        for (const item of items) {
          await tx.wasteProduct.update({ where: { id: item.wasteId }, data: { stock: { increment: item.quantity } } });
        }
      });
      return prisma.order.findUnique({ where: { id: order.id } });
    }
  }
  return prisma.order.update({ where: { id: order.id }, data });
}

async function getMySales(sellerId) {
  return prisma.order.findMany({
    where: { waste: { sellerId } },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      waste: { include: { store: { select: { id: true, name: true, description: true, location: true, image: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function updateSellerOrderStatus(orderId, sellerId, status) {
  const allowed = ['shipped', 'completed'];
  if (!allowed.includes(status)) throw new Error('Status pesanan tidak didukung');
  const order = await prisma.order.findFirst({ where: { id: orderId, waste: { sellerId } } });
  if (!order) throw new Error('Pesanan tidak ditemukan');
  if (order.paymentMethod === 'cod') throw new Error('Status pesanan COD diperbarui otomatis dari webhook kurir.');
  const isPickup = order.courier === 'pickup';
  const transitions = isPickup
    ? { processing: ['completed'] }
    : { processing: ['shipped'], shipped: ['completed'] };
  if (!transitions[order.status]?.includes(status))
    throw new Error('Perubahan status ini tidak dapat dilakukan');
  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: order.status },
    data: {
      status,
      ...(isPickup && order.paymentMethod === 'cash'
        ? { paymentStatus: 'paid', sellerSettlementStatus: 'cash_received' }
        : {}),
      ...(isPickup ? { shippingStatus: 'picked_up' } : {}),
    },
  });
  if (!updated.count) throw new Error('Status pesanan baru saja berubah. Muat ulang halaman.');
  return prisma.order.findUnique({ where: { id: orderId } });
}

module.exports = {
  getRates,
  createCheckout,
  createPaidShipment,
  createCodShipment,
  createOrder,
  getMyOrders,
  getMyOrder,
  updatePaymentStatus,
  updateShippingStatus,
  getMySales,
  updateSellerOrderStatus,
};
