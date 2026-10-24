import { getCachedCurrentUser, getCurrentUser } from '../services/user.js';
import { removeToken } from '../utils/storage.js';
import { escapeHtml } from '../utils/html.js';
import { brandHeader, brandImage, icon } from './icons.js';

const links = [
  ['Marketplace', '#marketplace', 'market'],
  ['Tambah Limbah', '#tambah-limbah', 'add'],
  ['Tanya AI', '#tanya-ai', 'ai'],
  ['Transaksi', '#transaksi', 'orders'],
  ['Pesan', '#chat', 'chat'],
];

export { icon };

let shellRenderVersion = 0;

export function dashboardHeader(active = '') {
  const currentRoute = location.hash || '#dashboard';
  const nav = links
    .map(([label, href, key]) => {
      const isActive = active ? active === key : currentRoute === href;
      return `<a class="fi-nav-link${isActive ? ' is-active' : ''}" href="${href}"${isActive ? ' aria-current="page"' : ''}>${icon(key)}<span>${label}</span></a>`;
    })
    .join('');
  const accountLinks = [
    ['Profil', '#profil', 'profile'],
    ['Transaksi', '#transaksi', 'orders'],
    ['Pesan', '#chat', 'chat'],
    ['Notifikasi', '#notifikasi', 'bell'],
    ['Kelola Toko', '#kelola-toko', 'store'],
  ]
    .map(([label, href, key]) => {
      const isActive = currentRoute === href;
      return `<a href="${href}"${isActive ? ' class="is-current" aria-current="page"' : ''}>${icon(key)}<span>${label}</span></a>`;
    })
    .join('');

  return `
    <header class="fi-header">
      <a class="fi-header-brand" href="#dashboard" aria-label="Food Ilee">${brandHeader()}</a>
      <nav class="fi-nav" aria-label="Navigasi utama">${nav}</nav>
      <div class="fi-header-actions">
        <a class="fi-cart-link" href="#cart" aria-label="Keranjang belanja, 0 barang" title="Keranjang belanja">
          ${icon('cart')}<span class="fi-cart-count" data-cart-count hidden>0</span>
        </a>
        <div class="fi-account">
        <button class="fi-account-toggle" id="fi-account-toggle" type="button" aria-label="Buka menu akun" aria-haspopup="true" aria-controls="fi-account-menu" aria-expanded="false">
          <span class="fi-avatar" data-user-avatar>U</span>
          <span class="fi-account-meta"><small>Akun Anda</small><span class="fi-account-name" data-user-name>Pengguna</span></span>
          <span class="fi-account-chevron" aria-hidden="true">${icon('chevron')}</span>
        </button>
        <div class="fi-account-menu" id="fi-account-menu" aria-label="Menu akun" aria-hidden="true">
          <div class="fi-account-menu-profile">
            <span class="fi-account-menu-avatar fi-avatar" data-user-avatar>U</span>
            <div class="fi-account-menu-identity"><strong data-user-name>Pengguna</strong><small data-user-email></small></div>
            <span class="fi-account-role" data-user-role>Anggota</span>
          </div>
          <nav class="fi-account-menu-links" aria-label="Tautan akun">
            ${accountLinks}
            <a href="#admin" data-admin-menu hidden>${icon('shield')}<span>Panel Admin</span></a>
          </nav>
          <div class="fi-account-menu-actions">
            <a href="#panduan" data-reopen-onboarding>${icon('guide')}<span>Panduan</span></a>
            <button class="fi-logout" type="button">${icon('logout')}<span>Keluar</span></button>
          </div>
        </div>
        </div>
      </div>
    </header>`;
}

export function dashboardFooter() {
  return `<footer class="fi-footer"><div class="fi-footer-grid"><div class="fi-footer-brand"><a href="#beranda" aria-label="Food Ilee">${brandImage({ tone: 'dark' })}</a><p>Membangun jembatan antara limbah pangan dan inovasi berkelanjutan untuk masa depan bumi.</p></div><div><h3>Jelajahi</h3><a href="#marketplace">Marketplace</a><a href="#tambah-limbah">Tambah Limbah</a><a href="#tanya-ai">Tanya AI</a></div><div><h3>Akun</h3><a href="#profil">Profil Anda</a><a href="#transaksi">Riwayat Transaksi</a><a href="#kelola-toko">Kelola Toko</a></div><div><h3>Bantuan</h3><a href="#panduan">Panduan Food Ilee</a><a href="mailto:halo@foodilee.id">Hubungi Kami</a><span>Indonesia</span></div></div><div class="fi-footer-bottom">© 2026 Food Ilee · Memberdayakan sirkularitas untuk Indonesia hijau.</div></footer>`;
}

export function renderShell(active, content, { footer = true } = {}) {
  injectShellStyles();
  const app = document.getElementById('app');
  shellRenderVersion += 1;
  app.innerHTML = `<div class="fi-app">${dashboardHeader(active)}<div class="fi-page">${content}</div>${footer ? dashboardFooter() : ''}</div>`;
  bindShell(shellRenderVersion);
}

export function bindSharedHeader() {
  injectShellStyles();
  shellRenderVersion += 1;
  bindShell(shellRenderVersion);
}

export function injectShellStyles() {
  if (document.querySelector('[data-fi-shell-style]')) return;
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('../styles/shell.css', import.meta.url).href;
  stylesheet.dataset.fiShellStyle = 'true';
  document.head.append(stylesheet);
}
export function bindShell(version = shellRenderVersion) {
  updateCartBadge();
  if (!document.documentElement.dataset.fiCartBound) {
    window.addEventListener('foodilee:cart-updated', updateCartBadge);
    document.documentElement.dataset.fiCartBound = 'true';
  }
  const toggle = document.querySelector('.fi-account-toggle');
  const menu = document.querySelector('.fi-account-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
    });
    menu.addEventListener('click', (event) => {
      if (!event.target.closest('a')) return;
      closeAccountMenu(menu, toggle);
    });
    if (!document.documentElement.dataset.fiMenuBound) {
      document.addEventListener('click', (event) => {
        const currentMenu = document.querySelector('.fi-account-menu');
        const currentToggle = document.querySelector('.fi-account-toggle');
        if (
          !currentMenu ||
          !currentToggle ||
          currentMenu.contains(event.target) ||
          currentToggle.contains(event.target)
        )
          return;
        closeAccountMenu(currentMenu, currentToggle);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const currentMenu = document.querySelector('.fi-account-menu');
        const currentToggle = document.querySelector('.fi-account-toggle');
        if (!currentMenu?.classList.contains('open')) return;
        closeAccountMenu(currentMenu, currentToggle);
        currentToggle?.focus();
      });
      document.documentElement.dataset.fiMenuBound = 'true';
    }
    document.querySelector('.fi-logout')?.addEventListener('click', () => {
      removeToken();
      localStorage.removeItem('user');
      location.hash = '#login';
    });
  }
  hydrateAccount(version);
}

function updateCartBadge() {
  const badge = document.querySelector('[data-cart-count]');
  const link = badge?.closest('.fi-cart-link');
  if (!badge || !link) return;
  let cart = [];
  try {
    const value = JSON.parse(sessionStorage.getItem('foodilee_checkout_cart') || '[]');
    if (Array.isArray(value)) cart = value;
  } catch { /* Keranjang rusak atau kosong. */ }
  const count = cart.reduce((total, item) => total + Math.max(0, Number(item?.quantity) || 0), 0);
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.hidden = count === 0;
  link.setAttribute('aria-label', `Keranjang belanja, ${count} barang`);
}

function closeAccountMenu(menu, toggle) {
  menu.classList.remove('open');
  menu.setAttribute('aria-hidden', 'true');
  toggle.setAttribute('aria-expanded', 'false');
}

async function hydrateAccount(version) {
  const header = document.querySelector('.fi-header');
  const cached = getCachedCurrentUser();
  if (version === shellRenderVersion && header?.isConnected && cached?.success && cached.data)
    applyAccountUser(cached.data);
  try {
    const result = await getCurrentUser();
    if (version !== shellRenderVersion || !header?.isConnected || !result.success || !result.data)
      return;
    applyAccountUser(result.data);
  } catch {
    // Header tetap bisa digunakan meski profil belum dapat dimuat.
  }
}

function applyAccountUser(user) {
  const adminLink = document.querySelector('[data-admin-menu]');
  if (adminLink) adminLink.hidden = user.role !== 'admin';
  const name = user.name || user.username || user.email?.split('@')[0] || 'Pengguna';
  document.querySelectorAll('[data-user-name]').forEach((el) => {
    el.textContent = name;
  });
  document.querySelectorAll('[data-user-avatar]').forEach((el) => {
    if (user.avatar) el.innerHTML = `<img src="${escapeHtml(user.avatar)}" alt="">`;
    else el.textContent = name.charAt(0).toUpperCase();
  });
  document.querySelectorAll('[data-user-email]').forEach((el) => {
    el.textContent = user.email || '';
  });
  document.querySelectorAll('[data-user-role]').forEach((el) => {
    el.textContent = user.role === 'admin' ? 'Admin' : 'Anggota';
  });
}

export function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `fi-toast${type === 'error' ? ' error' : ''}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

export function formatRupiah(value) {
  return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
}
