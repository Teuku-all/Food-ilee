const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5433/foodilee?sslmode=disable';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

async function resetDemoData() {
  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany();
    await tx.order.deleteMany();
    await tx.review.deleteMany();
    await tx.notification.deleteMany();
    await tx.message.deleteMany();
    await tx.chat.deleteMany();
    await tx.wasteProduct.deleteMany();
    await tx.store.deleteMany();
    await tx.user.deleteMany();
  });
}

async function main() {
  await resetDemoData();

  const buyerPassword = await bcrypt.hash('buyer12345', 10);
  const sellerPassword = await bcrypt.hash('seller12345', 10);

  const buyer = await prisma.user.create({
    data: {
      email: 'buyer@example.com',
      password: buyerPassword,
      name: 'Rina Pembeli',
      username: 'rina_pembeli',
      role: 'user',
      bio: 'Mencari bahan pangan yang lebih bernilai dan ramah lingkungan.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    },
  });

  const seller = await prisma.user.create({
    data: {
      email: 'seller@example.com',
      password: sellerPassword,
      name: 'Toko Sirkular',
      username: 'toko_sirkular',
      role: 'user',
      bio: 'Mengubah limbah makanan menjadi produk bernilai untuk pasar lokal.',
      avatar: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=600&q=80',
    },
  });

  const store = await prisma.store.create({
    data: {
      name: 'Toko Sirkular',
      description: 'Koleksi bahan pangan sisa berkualitas untuk didistribusikan kembali ke komunitas sekitar.',
      location: 'Jl. Raya Kebon Jeruk No. 10, Jakarta Barat',
      latitude: -6.1714,
      longitude: 106.7689,
      image: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80',
      ownerId: seller.id,
      shippingOriginContactName: 'Pak Deni',
      shippingOriginContactPhone: '081234567890',
      shippingOriginAddress: 'Jl. Raya Kebon Jeruk No. 10, Jakarta Barat',
      shippingOriginPostalCode: '11520',
      shippingOriginRegion: {
        provinceCode: '31',
        province: 'DKI Jakarta',
        cityCode: '3173',
        city: 'Jakarta Barat',
        districtCode: '317301',
        district: 'Kebon Jeruk',
        villageCode: '3173011001',
        village: 'Kebon Jeruk',
        details: 'Depan minimarket besar',
      },
      bankName: 'Bank Mandiri',
      bankAccountNumber: '1234567890',
      bankAccountHolder: 'Toko Sirkular',
    },
  });

  const products = [
    {
      title: 'Kulit Pisang Kering',
      description: 'Kulit pisang yang dikeringkan untuk pakan ternak dan kompos organik.',
      price: 18000,
      stock: 45,
      weightPerUnitGrams: 500,
      category: 'Kulit',
      location: 'Jakarta Barat',
      image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Ampas Tahu Segar',
      description: 'Ampas tahu hasil produksi harian dengan tekstur lembut dan siap diolah.',
      price: 22000,
      stock: 30,
      weightPerUnitGrams: 750,
      category: 'Siap Olah',
      location: 'Kebon Jeruk',
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Daun Singkong',
      description: 'Daun singkong segar yang cocok untuk pakan ternak atau bahan olahan rumah tangga.',
      price: 15000,
      stock: 60,
      weightPerUnitGrams: 500,
      category: 'Sayur',
      location: 'Jakarta Barat',
      image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Cangkang Telur',
      description: 'Cangkang telur bersih hasil pengolahan rumah tangga, siap untuk dijadikan pupuk organik.',
      price: 12000,
      stock: 80,
      weightPerUnitGrams: 400,
      category: 'Organik',
      location: 'Jakarta Barat',
      image: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Ampas Kelapa',
      description: 'Ampas kelapa yang masih berguna untuk media tanam dan pakan ternak.',
      price: 25000,
      stock: 35,
      weightPerUnitGrams: 1000,
      category: 'Organik',
      location: 'Kebon Jeruk',
      image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  await prisma.wasteProduct.createMany({
    data: products.map((product) => ({
      ...product,
      sellerId: seller.id,
      storeId: store.id,
    })),
  });

  const totalProducts = await prisma.wasteProduct.count({ where: { sellerId: seller.id } });

  console.log('Demo database reset complete.');
  console.log({ buyer: { email: buyer.email, username: buyer.username, password: 'buyer12345' }, seller: { email: seller.email, username: seller.username, password: 'seller12345' }, store: { name: store.name, location: store.location }, products: totalProducts });
}

main()
  .catch((error) => {
    console.error('Failed to seed demo data:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
