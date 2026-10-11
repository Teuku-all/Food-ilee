const storeService =
  require('../services/store.service');

async function createStore(
  req,
  res
) {

  try {
    console.log(req.body);
    console.log(req.file);

    const store =
      await storeService.createStore({

        name:
          req.body.name,

        description:
          req.body.description,

        image:
          req.file
            ? req.file.path
            : null,

        ownerId:
          req.user.id
      });

    res.status(201).json({

      success: true,

      data: store
    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message
    });
  }
}

async function getMyStore(
  req,
  res
) {

  try {

    const store =
      await storeService.getMyStore(
        req.user.id
      );

    res.status(200).json({

      success: true,

      data: store
    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message
    });
  }
}

module.exports = {
  createStore,
  getMyStore
};