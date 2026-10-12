const express = require('express');

const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');

const upload = require('../middlewares/upload.middleware');

const storeController = require('../controllers/store.controller');

router.post('/', authMiddleware, upload.single('image'), storeController.createStore);

router.get('/me', authMiddleware, storeController.getMyStore);

router.put('/me', authMiddleware, upload.single('image'), storeController.updateStore);

module.exports = router;
