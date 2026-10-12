const storeService = require('../services/store.service');

async function createStore(req, res) {
  try {
    const store = await storeService.createStore({
      name: req.body.name,

      description: req.body.description,

      location: req.body.location,

      image: req.file ? req.file.path : null,

      ownerId: req.user.id,
    });

    res.status(201).json({
      success: true,

      data: store,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
}

async function getMyStore(req, res) {
  try {
    const store = await storeService.getMyStore(req.user.id);

    res.status(200).json({
      success: true,

      data: store,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
}

async function updateStore(req, res) {
  try {
    const store = await storeService.updateStore(req.user.id, {
      name: req.body.name,
      description: req.body.description,
      location: req.body.location,
      image: req.file ? req.file.path : undefined,
    });
    res.status(200).json({ success: true, data: store });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  createStore,
  getMyStore,
  updateStore,
};
