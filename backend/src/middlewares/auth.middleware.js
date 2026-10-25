const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token tidak ditemukan',
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid',
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, isBanned: true, authTokenVersion: true },
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Akun tidak ditemukan',
      });
    }
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Akun ini dinonaktifkan. Hubungi administrator.',
      });
    }
    if ((decoded.tokenVersion ?? 0) !== user.authTokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Sesi berakhir. Silakan masuk kembali.',
      });
    }

    req.user = { id: user.id, role: user.role };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authMiddleware;
