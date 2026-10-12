const userService = require('../services/user.service');

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
    res.status(500).json({
      success: false,

      message: error.message,
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
  getMyProfile,
  updateProfile,
  getPublicProfile,
};
