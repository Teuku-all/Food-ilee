const prisma = require('../config/prisma');

const SHIPPING_FIELDS = [
  'shippingOriginContactName',
  'shippingOriginContactPhone',
  'shippingOriginAddress',
  'shippingOriginPostalCode',
];
const BANK_FIELDS = ['bankName', 'bankAccountNumber', 'bankAccountHolder'];

function storeProfileData(data, { partial = false } = {}) {
  const shipping = shippingOriginData(data, { partial });
  if (!partial && SHIPPING_FIELDS.some((key) => !shipping[key]))
    throw new Error('Lengkapi nama kontak, telepon, alamat pickup, dan kode pos pengiriman toko.');
  const bank = Object.fromEntries(BANK_FIELDS.map((key) => [key, data[key]]));
  const hasAnyBank = Object.values(bank).some((value) => value !== undefined && String(value).trim());
  if (partial && !hasAnyBank) return shipping;
  if (!partial && !hasAnyBank) throw new Error('Isi nama bank, nomor rekening, dan nama pemilik rekening toko.');
  if (hasAnyBank && BANK_FIELDS.some((key) => typeof bank[key] !== 'string' || !bank[key].trim()))
    throw new Error('Lengkapi nama bank, nomor rekening, dan nama pemilik rekening toko.');
  if (hasAnyBank && !/^\d{6,30}$/.test(bank.bankAccountNumber.replace(/[ -]/g, '')))
    throw new Error('Nomor rekening harus terdiri dari 6–30 angka.');
  return {
    ...shipping,
    ...(hasAnyBank ? {
      bankName: bank.bankName.trim(),
      bankAccountNumber: bank.bankAccountNumber.replace(/[ -]/g, ''),
      bankAccountHolder: bank.bankAccountHolder.trim(),
    } : {}),
  };
}

function shippingOriginData(data, { partial = false } = {}) {
  const values = Object.fromEntries(SHIPPING_FIELDS.map((key) => [key, data[key]]));
  const hasAny = Object.values(values).some((value) => value !== undefined && String(value).trim());
  let region = data.shippingOriginRegion;
  if (typeof region === 'string' && region.trim()) {
    try { region = JSON.parse(region); } catch { throw new Error('Alamat pickup tidak valid. Pilih ulang wilayah toko.'); }
  }
  const hasRegion = region && typeof region === 'object' && !Array.isArray(region);
  if (partial && !hasAny && !hasRegion) return {};
  if (hasAny && SHIPPING_FIELDS.some((key) => typeof values[key] !== 'string' || !values[key].trim()))
    throw new Error('Lengkapi nama kontak, telepon, alamat pickup, dan kode pos pengiriman toko.');
  if (hasRegion && SHIPPING_FIELDS.some((key) => typeof values[key] !== 'string' || !values[key].trim()))
    throw new Error('Lengkapi alamat pickup, kode pos, dan kontak pengiriman toko.');
  if (!partial && !hasRegion) throw new Error('Pilih provinsi hingga desa/kelurahan untuk alamat pickup toko.');
  if (hasRegion && ['provinceCode', 'province', 'cityCode', 'city', 'districtCode', 'district', 'villageCode', 'village', 'details']
    .some((key) => typeof region[key] !== 'string' || !region[key].trim()))
    throw new Error('Pilih provinsi hingga desa/kelurahan dan isi detail alamat pickup toko.');
  if (hasAny && !/^\d{5}$/.test(values.shippingOriginPostalCode.trim()))
    throw new Error('Kode pos pickup toko harus terdiri dari 5 angka.');
  return hasAny || hasRegion
    ? {
        ...Object.fromEntries(SHIPPING_FIELDS.map((key) => [key, values[key].trim()])),
        ...(hasRegion ? { shippingOriginRegion: region } : {}),
      }
    : {};
}

async function createStore(data) {
  const profile = storeProfileData(data);
  const existingStore = await prisma.store.findUnique({
    where: { ownerId: data.ownerId },
  });

  if (existingStore) {
    throw new Error('User sudah punya toko');
  }

  const store = await prisma.store.create({
    data: {
      name: data.name,

      description: data.description,

      location: data.location,

      image: data.image,

      ownerId: data.ownerId,
      ...profile,
    },
  });

  return store;
}

async function getMyStore(ownerId) {
  return prisma.store.findUnique({
    where: {
      ownerId,
    },

    include: {
      products: {
        include: {
          reviews: true,
          orders: true,
        },
      },
    },
  });
}

async function updateStore(ownerId, data) {
  const profile = storeProfileData(data, { partial: true });
  const existing = await prisma.store.findUnique({ where: { ownerId } });
  if (!existing) throw new Error('Toko belum dibuat');
  return prisma.store.update({
    where: { ownerId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.image !== undefined ? { image: data.image } : {}),
      ...profile,
    },
  });
}

module.exports = {
  createStore,
  getMyStore,
  updateStore,
};
