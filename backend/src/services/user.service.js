const prisma = require('../config/prisma');

async function isUsernameAvailable(username, userId) {
  const existingUser = await prisma.user.findFirst({
    where: {
      username: { equals: username.trim(), mode: 'insensitive' },
      ...(userId ? { NOT: { id: userId } } : {}),
    },
    select: { id: true },
  });
  return !existingUser;
}

async function getMyProfile(userId) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,

      email: true,

      name: true,

      username: true,

      avatar: true,

      bio: true,

      role: true,

      createdAt: true,
    },
  });
}

async function updateProfile(userId, data) {
  const username = data.username?.trim().toLowerCase();
  if (!username || username.length < 3 || username.length > 30) {
    const error = new Error('Username harus terdiri dari 3 sampai 30 karakter.');
    error.code = 'INVALID_USERNAME';
    throw error;
  }
  if (!(await isUsernameAvailable(username, userId))) {
    const error = new Error('Username tidak tersedia. Gunakan username lain.');
    error.code = 'USERNAME_TAKEN';
    throw error;
  }

  return prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      name: data.name,

      username,

      bio: data.bio,

      avatar: data.avatar,
    },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      avatar: true,
      bio: true,
      role: true,
      createdAt: true,
    },
  });
}

async function getPublicProfile(username) {
  return prisma.user.findUnique({
    where: {
      username,
    },

    select: {
      id: true,

      name: true,

      username: true,

      avatar: true,

      bio: true,

      store: { select: { id: true, name: true, description: true, location: true, image: true } },
    },
  });
}

module.exports = {
  getMyProfile,
  updateProfile,
  getPublicProfile,
  isUsernameAvailable,
};
