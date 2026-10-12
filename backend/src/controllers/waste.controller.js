const wasteService = require('../services/waste.service');

async function createWaste(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Foto wajib diupload',
      });
    }

    const waste = await wasteService.createWaste({
      title: req.body.title,

      description: req.body.description,

      category: req.body.category,

      location: req.body.location,

      image: req.file.path,
      price: Number(req.body.price),
      stock: Number(req.body.stock),

      sellerId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Limbah berhasil ditambahkan',
      data: waste,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function getAllWastes(req, res) {
  try {
    const result = await wasteService.getAllWastes({ ...req.query, userId: req.user.id });

    res.status(200).json({
      success: true,

      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
}

async function deleteWaste(req, res) {
  try {
    const { id } = req.params;

    await wasteService.deleteWaste(id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Limbah berhasil dihapus',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function updateWaste(req, res) {
  try {
    const updatedWaste = await wasteService.updateWaste(
      req.params.id,

      req.user.id,

      {
        title: req.body.title,

        description: req.body.description,

        category: req.body.category,

        location: req.body.location,

        price: Number(req.body.price),

        stock: Number(req.body.stock),

        image: req.file ? req.file.path : undefined,
      },
    );

    res.status(200).json({
      success: true,
      message: 'Limbah berhasil diupdate',
      data: updatedWaste,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function getWasteById(req, res) {
  try {
    const waste = await wasteService.getWasteById(req.params.id);

    res.status(200).json({
      success: true,

      data: waste,
    });
  } catch (error) {
    res.status(404).json({
      success: false,

      message: error.message,
    });
  }
}

module.exports = {
  createWaste,
  getAllWastes,
  deleteWaste,
  updateWaste,
  getWasteById,
};
