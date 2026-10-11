const adminService =
  require('../services/admin.service');

async function getAllUsers(
  req,
  res
) {

  try {

    const users =
      await adminService
        .getAllUsers();

    res.status(200).json({

      success: true,

      data: users
    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message
    });
  }
}

async function getAllWastes(
  req,
  res
) {

  try {

    const wastes =
      await adminService
        .getAllWastes();

    res.status(200).json({

      success: true,

      data: wastes
    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message
    });
  }
}

async function getAllOrders(
  req,
  res
) {

  try {

    const orders =
      await adminService
        .getAllOrders();

    res.status(200).json({

      success: true,

      data: orders
    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message
    });
  }
}

async function banUser(
  req,
  res
) {

  try {

    const user =
      await adminService
        .banUser(
          req.params.id
        );

    res.status(200).json({

      success: true,

      data: user
    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message
    });
  }
}

async function deleteWaste(
  req,
  res
) {

  try {

    await adminService
      .deleteWaste(
        req.params.id
      );

    res.status(200).json({

      success: true,

      message:
        'Produk dihapus'
    });

  } catch (error) {

    res.status(500).json({

      success: false,

      message:
        error.message
    });
  }
}

async function getAnalytics(
  req,
  res
) {

  try {

    const data =
      await adminService
        .getAnalytics();

    res.status(200).json({

      success: true,

      data
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

  getAllUsers,
  getAllWastes,
  getAllOrders,
  banUser,
  deleteWaste,
  getAnalytics
};