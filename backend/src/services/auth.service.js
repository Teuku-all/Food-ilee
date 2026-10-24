const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { randomBytes } = require('crypto');

const googleClient = new OAuth2Client();

async function registerUser(data) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (existingUser) {
    throw new Error('Email sudah digunakan');
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      username: data.username,
      email: data.email,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}
async function loginUser(data) {
  const user = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (!user) {
    throw new Error('Email tidak ditemukan');
  }

  if (user.isBanned) {
    throw new Error('Akun ini dinonaktifkan. Hubungi administrator.');
  }

  const isMatch = await bcrypt.compare(data.password, user.password);

  if (!isMatch) {
    throw new Error('Password salah');
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },

    process.env.JWT_SECRET,

    {
      expiresIn: '7d',
    },
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  };
}

async function loginWithGoogle(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const error = new Error('Login Google belum dikonfigurasi oleh administrator.');
    error.status = 503;
    throw error;
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch {
    const error = new Error('Token Google tidak valid atau sudah kedaluwarsa.');
    error.status = 401;
    throw error;
  }

  if (!payload?.email || payload.email_verified !== true) {
    const error = new Error('Akun Google harus memiliki alamat email terverifikasi.');
    error.status = 401;
    throw error;
  }

  const email = payload.email.trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const usernameBase = (
      email
        .split('@')[0]
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 20) || 'pengguna'
    ).padEnd(3, '_');
    const password = await bcrypt.hash(randomBytes(32).toString('hex'), 10);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const username = `${usernameBase}_${randomBytes(3).toString('hex')}`;
      try {
        user = await prisma.user.create({
          data: {
            email,
            name: payload.name || email.split('@')[0],
            username,
            password,
            avatar: payload.picture || undefined,
          },
        });
        break;
      } catch (error) {
        if (error.code !== 'P2002') throw error;
        user = await prisma.user.findUnique({ where: { email } });
        if (user) break;
      }
    }

    if (!user) throw new Error('Akun Google belum dapat dibuat. Silakan coba lagi.');
  }

  if (user.isBanned) {
    const error = new Error('Akun ini dinonaktifkan. Hubungi administrator.');
    error.status = 403;
    throw error;
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    },
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  };
}

module.exports = {
  registerUser,
  loginUser,
  loginWithGoogle,
};
