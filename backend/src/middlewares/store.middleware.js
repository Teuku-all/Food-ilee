const prisma = require('../config/prisma');

async function requireStore(req, res, next) {
  try {
    const store = await prisma.store.findUnique({
      where: { ownerId: req.user.id },
      select: { id: true },
    });

    if (!store) {
      return res.status(403).json({
        success: false,
        message: 'Buat toko terlebih dahulu sebelum mengunggah produk.',
        code: 'STORE_REQUIRED',
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = requireStore;
