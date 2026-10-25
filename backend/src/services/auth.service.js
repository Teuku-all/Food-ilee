const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { createHash, randomBytes } = require('crypto');

const googleClient = new OAuth2Client();

function passwordResetError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function sendPasswordResetEmail({ email, name, resetUrl }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [email],
      subject: 'Atur ulang password Food Ilee',
      html: `<div style="font-family:Arial,sans-serif;color:#173d30;line-height:1.6"><h1 style="font-size:22px">Atur ulang password</h1><p>Halo ${escapeEmailHtml(name || 'Pengguna Food Ilee')},</p><p>Kami menerima permintaan untuk mengatur ulang password akun Food Ilee Anda.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#235347;color:#fff;text-decoration:none">Buat password baru</a></p><p>Tautan ini hanya berlaku selama 1 jam dan hanya dapat digunakan sekali. Jika Anda tidak meminta reset password, abaikan email ini.</p><p style="color:#738078;font-size:12px">Jika tombol tidak berfungsi, salin tautan berikut ke browser:<br>${resetUrl}</p></div>`,
    }),
  });

  if (!response.ok) {
    throw passwordResetError('Layanan email reset password sedang tidak tersedia. Coba lagi nanti.', 503);
  }
}

function escapeEmailHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

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
      tokenVersion: user.authTokenVersion,
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

async function requestPasswordReset(email) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL || !process.env.FRONTEND_URL) {
    throw passwordResetError('Layanan reset password belum dikonfigurasi. Hubungi administrator.', 503);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });
  if (!user) return;

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(token);
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetTokenHash: tokenHash, passwordResetExpires: expires },
  });

  try {
    const resetUrl = new URL(process.env.FRONTEND_URL);
    resetUrl.hash = `reset-password?token=${token}`;
    await sendPasswordResetEmail({ email: user.email, name: user.name, resetUrl: resetUrl.toString() });
  } catch (error) {
    await prisma.user.updateMany({
      where: { id: user.id, passwordResetTokenHash: tokenHash },
      data: { passwordResetTokenHash: null, passwordResetExpires: null },
    });
    console.error('Password reset email could not be sent:', error.message);
  }
}

async function resetPassword(token, newPassword) {
  const tokenHash = hashResetToken(token);
  const now = new Date();
  const user = await prisma.user.findFirst({
    where: { passwordResetTokenHash: tokenHash, passwordResetExpires: { gt: now } },
    select: { id: true },
  });
  if (!user) {
    throw passwordResetError('Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.', 400);
  }

  const password = await bcrypt.hash(newPassword, 10);
  const result = await prisma.user.updateMany({
    where: { id: user.id, passwordResetTokenHash: tokenHash, passwordResetExpires: { gt: now } },
    data: {
      password,
      passwordResetTokenHash: null,
      passwordResetExpires: null,
      authTokenVersion: { increment: 1 },
    },
  });
  if (result.count !== 1) {
    throw passwordResetError('Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.', 400);
  }
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
      tokenVersion: user.authTokenVersion,
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
  requestPasswordReset,
  resetPassword,
  loginWithGoogle,
};
