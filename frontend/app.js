import {
  renderLogin
}
from './pages/login/login.js';

import {
  renderDashboard
}
from './pages/dashboard/dashboard.js';

import {
  renderMarketplace
}
from './pages/marketplace/marketplace.js';

import {
  getToken
}
from './utils/storage.js';

async function router() {

  const token =
    getToken();

  // belum login
  if (!token) {

    renderLogin();

    return;
  }

  // marketplace
  if (
    location.hash === '#marketplace'
  ) {

    renderMarketplace();

    return;
  }

  // default
  renderDashboard();
}

// pertama kali load
window.addEventListener(
  'load',
  router
);

// pindah hash
window.addEventListener(
  'hashchange',
  router
);