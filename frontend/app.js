import { renderLogin, renderPasswordReset } from './pages/login/login.js';
import { renderLanding } from './pages/landing/landing.js';
import { renderMarketplace } from './pages/marketplace/marketplace.js';
import { renderTransactions } from './pages/transactions/transactions.js';
import { renderAddWaste } from './pages/add-waste/add-waste.js';
import { renderCreateStore } from './pages/create-store/create-store.js';
import { renderStore } from './pages/store/store.js';
import { renderProfile } from './pages/profile/profile.js';
import { renderAI } from './pages/ai/ai.js';
import { renderAdmin } from './pages/admin/admin.js';
import { renderNotifications } from './pages/notifications/notifications.js';
import { renderChat } from './pages/chat/chat.js';
import { renderCheckout } from './pages/checkout/checkout.js';
import { renderCart } from './pages/cart/cart.js';
import { renderOnboarding, shouldShowOnboarding } from './ui/onboarding.js';
import { getToken, removeToken } from './utils/storage.js';
import { beginNavigation, isCurrentNavigation } from './utils/navigation.js';
import { getCachedCurrentUser } from './services/user.js';
import { getStoreAccess } from './utils/store-access.js';

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
  '#cart',
  '#checkout',
]);
const landingSectionRoutes = new Set([
  '#tentang',
  '#cara-kerja',
  '#dampak',
  '#pasar',
  '#teknologi',
]);
let lastStartedRoute = null;

window.addEventListener('foodilee:session-expired', (event) => {
  if (event.detail?.token && event.detail.token !== getToken()) return;
  removeToken();
  localStorage.removeItem('user');
  if (protectedRoutes.has(location.hash)) location.hash = '#login';
});

async function router(route = location.hash || '#beranda') {
  if (route.startsWith('#reset-password')) {
    const query = route.split('?')[1] || '';
    renderPasswordReset(new URLSearchParams(query).get('token'));
    return;
  }
  if (landingSectionRoutes.has(route) && document.querySelector('.landing-page')) {
    document.getElementById(route.slice(1))?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    });
    return;
  }
  const authMode = route === '#login' ? 'login' : route === '#daftar' ? 'register' : null;
  const switchingAuthInPlace =
    authMode && document.querySelector('.auth-page')?.dataset.authMode === authMode;
  if (!switchingAuthInPlace) {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
  document.querySelectorAll('dialog').forEach((dialog) => {
    if (dialog.open) dialog.close();
    dialog.remove();
  });
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
    if (!isCurrentNavigation(navigationRevision)) return;
    const userId = getCachedCurrentUser()?.data?.id;
    if (shouldShowOnboarding(userId)) {
      const showOnboarding = () => {
        if (isCurrentNavigation(navigationRevision) && location.hash === '#marketplace')
          renderOnboarding({ userId });
      };
      if (document.documentElement.dataset.authMarketplaceArrival) {
        window.addEventListener('foodilee:auth-marketplace-ready', showOnboarding, { once: true });
      } else {
        showOnboarding();
      }
    }
    return;
  }
  if (route === '#transaksi') {
    await renderTransactions();
    return;
  }
  if (route === '#tambah-limbah') {
    await renderAddWaste();
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
    if (!isCurrentNavigation(navigationRevision) || !document.querySelector('.st-dashboard'))
      return;
    const userId = getCachedCurrentUser()?.data?.id;
    if (shouldShowOnboarding(userId)) renderOnboarding({ userId });
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
  if (route === '#cart') {
    await renderCart();
    return;
  }
  if (route === '#checkout') {
    await renderCheckout();
    return;
  }
  if (route === '#dashboard') {
    let store = null;
    try {
      store = await getStoreAccess();
    } catch {
      /* Keep the legacy link usable during a store lookup failure. */
    }
    if (!isCurrentNavigation(navigationRevision)) return;
    location.replace(store ? '#kelola-toko' : '#marketplace');
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
  const requestedRoute = location.hash || '#beranda';
  if (requestedRoute === lastStartedRoute) return;
  lastStartedRoute = requestedRoute;
  try {
    await router(requestedRoute);
  } catch (error) {
    if ((location.hash || '#beranda') !== requestedRoute) return;
    lastStartedRoute = null;
    showStartupError(error);
  }
}

window.addEventListener('load', startApp);
window.addEventListener('hashchange', startApp);
