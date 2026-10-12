const userService = require('../services/user.service');

async function checkUsernameAvailability(req, res) {
  const username = String(req.query.username || '').trim();
  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({
      success: false,
      message: 'Username harus terdiri dari 3 sampai 30 karakter.',
    });
  }

  try {
    const available = await userService.isUsernameAvailable(username, req.user.id);
    return res.status(200).json({ success: true, data: { available } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getMyProfile(req, res) {
  try {
    const user = await userService.getMyProfile(req.user.id);

    res.status(200).json({
      success: true,

      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function updateProfile(req, res) {
  try {
    const user = await userService.updateProfile(
      req.user.id,

      {
        name: req.body.name,

        username: req.body.username,

        bio: req.body.bio,

        avatar: req.file ? req.file.path : undefined,
      },
    );

    res.status(200).json({
      success: true,

      data: user,
    });
  } catch (error) {
    const conflict = error.code === 'USERNAME_TAKEN' || error.code === 'P2002';
    res.status(conflict ? 409 : error.code === 'INVALID_USERNAME' ? 400 : 500).json({
      success: false,
      message: conflict ? 'Username tidak tersedia. Gunakan username lain.' : error.message,
    });
  }
}

async function getPublicProfile(req, res) {
  try {
    const user = await userService.getPublicProfile(req.params.username);

    res.status(200).json({
      success: true,

      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
}

module.exports = {
  checkUsernameAvailability,
  getMyProfile,
  updateProfile,
  getPublicProfile,
};
