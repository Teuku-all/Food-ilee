const authService = require('../services/auth.service');

async function register(req, res) {
  try {
    const user = await authService.registerUser({
      email: req.body.email,

      password: req.body.password,

      name: req.body.name,

      username: req.body.username,
    });

    res.status(201).json({
      success: true,
      message: 'Register berhasil',
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function login(req, res) {
  try {
    const result = await authService.loginUser(req.body);

    res.status(200).json({
      success: true,
      message: 'Login berhasil',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function googleLogin(req, res) {
  try {
    const result = await authService.loginWithGoogle(req.body.credential);

    res.status(200).json({
      success: true,
      message: 'Login berhasil',
      data: result,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Login Google gagal.',
    });
  }
}

async function currentUser(req, res) {
  try {
    res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  register,
  login,
  googleLogin,
  currentUser,
};
