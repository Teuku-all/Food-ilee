const prisma =
  require('../config/prisma');

async function getMyProfile(
  userId
) {

  return prisma.user.findUnique({

    where: {
      id: userId
    },

    select: {

      id: true,

      email: true,

      name: true,

      username: true,

      avatar: true,

      bio: true,

      role: true,

      createdAt: true
    }
  });
}

async function updateProfile(
  userId,
  data
) {

  return prisma.user.update({

    where: {
      id: userId
    },

    data: {

      name:
        data.name,

      username:
        data.username,

      bio:
        data.bio,

      avatar:
        data.avatar
    }
  });
}

async function getPublicProfile(
  username
) {

  return prisma.user.findUnique({

    where: {
      username
    },

    select: {

      id: true,

      name: true,

      username: true,

      avatar: true,

      bio: true,

      store: true
    }
  });
}

module.exports = {

  getMyProfile,
  updateProfile,
  getPublicProfile
};