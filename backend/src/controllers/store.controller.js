const storeService = require('../services/store.service');

async function createStore(req, res) {
  try {
    const store = await storeService.createStore({
      name: req.body.name,

      description: req.body.description,

      location: req.body.location,

      image: req.file ? req.file.path : null,

      ownerId: req.user.id,
      shippingOriginContactName: req.body.shippingOriginContactName,
      shippingOriginContactPhone: req.body.shippingOriginContactPhone,
      shippingOriginAddress: req.body.shippingOriginAddress,
      shippingOriginPostalCode: req.body.shippingOriginPostalCode,
      shippingOriginRegion: req.body.shippingOriginRegion,
      bankName: req.body.bankName,
      bankAccountNumber: req.body.bankAccountNumber,
      bankAccountHolder: req.body.bankAccountHolder,
    });

    res.status(201).json({
      success: true,

      data: store,
    });
  } catch (error) {
    res.status(400).json({
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
      shippingOriginContactName: req.body.shippingOriginContactName,
      shippingOriginContactPhone: req.body.shippingOriginContactPhone,
      shippingOriginAddress: req.body.shippingOriginAddress,
      shippingOriginPostalCode: req.body.shippingOriginPostalCode,
      shippingOriginRegion: req.body.shippingOriginRegion,
      bankName: req.body.bankName,
      bankAccountNumber: req.body.bankAccountNumber,
      bankAccountHolder: req.body.bankAccountHolder,
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
