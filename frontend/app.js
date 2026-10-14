import { renderLogin } from './pages/login/login.js';
import { renderLanding } from './pages/landing/landing.js';
import { renderDashboard } from './pages/dashboard/dashboard.js';
import { renderMarketplace } from './pages/marketplace/marketplace.js';
import { renderTransactions } from './pages/transactions/transactions.js';
import { renderTambahLimbah } from './pages/tambah-limbah/tambah-limbah.js';
import { renderCreateStore } from './pages/create-store/create-store.js';
import { renderStore } from './pages/store/store.js';
import { renderProfile } from './pages/profile/profile.js';
import { renderAI } from './pages/ai/ai.js';
import { renderAdmin } from './pages/admin/admin.js';
import { renderNotifications } from './pages/notifications/notifications.js';
import { renderChat } from './pages/chat/chat.js';
import { renderCheckout } from './pages/checkout/checkout.js';
import { renderOnboarding, shouldShowOnboarding } from './ui/onboarding.js';
import { getToken, removeToken } from './utils/storage.js';
import { beginNavigation, isCurrentNavigation } from './utils/navigation.js';
import { getCachedCurrentUser } from './services/user.js';

document.addEventListener(
  'close',
  (event) => {
    if (event.target instanceof HTMLDialogElement) event.target.remove();
  },
  true,
);

const protectedRoutes = new Set([
  '#dashboard',
  '#marketplace',
  '#transaksi',
  '#tambah-limbah',
  '#tanya-ai',
  '#profil',
  '#kelola-toko',
  '#buat-toko',
  '#panduan',
  '#admin',
  '#notifikasi',
  '#chat',
  '#checkout',
]);
const landingSectionRoutes = new Set([
  '#tentang',
  '#cara-kerja',
  '#dampak',
  '#pasar',
  '#teknologi',
]);

window.addEventListener('foodilee:session-expired', (event) => {
  if (event.detail?.token && event.detail.token !== getToken()) return;
  removeToken();
  localStorage.removeItem('user');
  if (protectedRoutes.has(location.hash)) location.hash = '#login';
});

async function router() {
  document.querySelectorAll('dialog').forEach((dialog) => {
    if (dialog.open) dialog.close();
    dialog.remove();
  });
  const route = location.hash || '#beranda';
  if (landingSectionRoutes.has(route) && document.querySelector('.landing-page')) return;
  const navigationRevision = beginNavigation();
  const token = getToken();
  if (protectedRoutes.has(route) && !token) {
    location.hash = '#login';
    return;
  }
  if (route === '#login') {
    renderLogin();
    return;
  }
  if (route === '#daftar') {
    renderLogin('register');
    return;
  }
  if (route === '#beranda' || route === '#') {
    renderLanding();
    return;
  }
  if (landingSectionRoutes.has(route)) {
    renderLanding();
    requestAnimationFrame(() => document.getElementById(route.slice(1))?.scrollIntoView());
    return;
  }
  if (route === '#marketplace') {
    await renderMarketplace();
    return;
  }
  if (route === '#transaksi') {
    await renderTransactions();
    return;
  }
  if (route === '#tambah-limbah') {
    await renderTambahLimbah();
    return;
  }
  if (route === '#tanya-ai') {
    renderAI();
    return;
  }
  if (route === '#profil') {
    await renderProfile();
    return;
  }
  if (route === '#kelola-toko') {
    await renderStore();
    return;
  }
  if (route === '#buat-toko') {
    await renderCreateStore();
    return;
  }
  if (route === '#panduan') {
    renderOnboarding({ standalone: true });
    return;
  }
  if (route === '#admin') {
    await renderAdmin();
    return;
  }
  if (route === '#notifikasi') {
    await renderNotifications();
    return;
  }
  if (route === '#chat') {
    await renderChat();
    return;
  }
  if (route === '#checkout') {
    await renderCheckout();
    return;
  }
  if (route === '#dashboard') {
    await renderDashboard();
    if (!isCurrentNavigation(navigationRevision)) return;
    const userId = getCachedCurrentUser()?.data?.id;
    if (shouldShowOnboarding(userId)) renderOnboarding({ userId });
    return;
  }
  renderLanding();
}

function showStartupError(error) {
  console.error('Food Ilee failed to render:', error);
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `<main class="startup-error"><span>Food Ilee</span><h1>Halaman belum dapat dibuka</h1><p>Periksa koneksi Anda, lalu coba kembali.</p><button type="button">Coba lagi</button></main>`;
  app.querySelector('button').addEventListener('click', startApp);
}

async function startApp() {
  try {
    await router();
  } catch (error) {
    showStartupError(error);
  }
}

window.addEventListener('load', startApp);
window.addEventListener('hashchange', startApp);
