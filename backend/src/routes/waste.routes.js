const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../config/multer");
const wasteController = require("../controllers/waste.controller");
const validate = require("../middlewares/validation.middleware");
const { createWasteSchema } = require("../validations/waste.validation");

router.post(
  '/',
  authMiddleware,

  validate(
    createWasteSchema
  ),

  upload.single('image'),

  wasteController.createWaste
);

router.get("/", authMiddleware, wasteController.getAllWastes);

router.get("/:id", wasteController.getWasteById);

router.delete("/:id", authMiddleware, wasteController.deleteWaste);

router.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  wasteController.updateWaste,
);

module.exports = router;
