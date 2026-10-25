import { getCachedCurrentUser, getCurrentUser } from '../services/user.js';
import { removeToken } from '../utils/storage.js';
import { escapeHtml } from '../utils/html.js';
import { applyTranslations, getLanguage } from '../utils/i18n.js';
import { showToast as showToastOverlay } from '../utils/toast.js';
import { brandImage, icon } from './icons.js';

const links = [
  ['Marketplace', '#marketplace', 'market'],
  ['Tambah Limbah', '#tambah-limbah', 'add'],
  ['Tanya AI', '#tanya-ai', 'ai'],
  ['Transaksi', '#transaksi', 'orders'],
  ['Pesan', '#chat', 'chat'],
];

export { icon };

let shellRenderVersion = 0;
let lastMobileNavIndex = -1;
let lastMobileNavKind = '';
let mobileNavObserver;
let mobileNavIndicator;
let mobileNavRootObserver;

export function dashboardHeader(active = '') {
  const currentRoute = location.hash || '#dashboard';
  const nav = links
    .map(([label, href, key]) => {
      const isActive = active ? active === key : currentRoute === href;
      return `<a class="fi-nav-link${isActive ? ' is-active' : ''}" href="${href}" aria-label="${label}"${isActive ? ' aria-current="page"' : ''}>${icon(key)}<span>${label}</span></a>`;
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
      <a class="fi-header-brand" href="#dashboard" aria-label="Food Ilee">${brandImage()}</a>
      <nav class="fi-nav" aria-label="Navigasi utama">${nav}</nav>
      <div class="fi-header-actions">
        <a class="fi-cart-link" href="#cart" aria-label="Keranjang belanja, 0 barang" title="Keranjang belanja">
          ${icon('cart')}<span class="fi-cart-count" data-cart-count hidden>0</span>
        </a>
        <div class="fi-account">
        <button class="fi-account-toggle" id="fi-account-toggle" type="button" aria-label="Buka menu akun" aria-haspopup="true" aria-controls="fi-account-menu" aria-expanded="false">
          <span class="fi-avatar" data-user-avatar>U</span>
          <span class="fi-account-meta"><small>Akun Anda</small><span class="fi-account-name" data-user-name data-no-translate>Pengguna</span></span>
          <span class="fi-account-chevron" aria-hidden="true">${icon('chevron')}</span>
        </button>
        <div class="fi-account-menu" id="fi-account-menu" aria-label="Menu akun" aria-hidden="true">
          <div class="fi-account-menu-profile">
            <span class="fi-account-menu-avatar fi-avatar" data-user-avatar>U</span>
            <div class="fi-account-menu-identity"><strong data-user-name data-no-translate>Pengguna</strong><small data-user-email data-no-translate></small></div>
            <span class="fi-account-role" data-user-role>Anggota</span>
          </div>
          <nav class="fi-account-menu-links" aria-label="Tautan akun">
            ${accountLinks}
            <a href="#admin" data-admin-menu hidden>${icon('shield')}<span>Panel Admin</span></a>
          </nav>
          <section class="fi-language-switch" aria-label="Pilih bahasa">
            <div class="fi-language-heading">${icon('globe')}<span>Bahasa</span></div>
            <div class="fi-language-options" role="group" aria-label="Pilih bahasa">
              <button type="button" data-language-choice="id" lang="id">Indonesia</button>
              <button type="button" data-language-choice="en" lang="en">English</button>
            </div>
          </section>
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

export function pageHeading({ title, description, eyebrow = 'FOOD ILEE', symbol = 'leaf' }) {
  return `<header class="fi-page-heading"><span class="fi-page-heading-mark" aria-hidden="true">${icon(symbol)}</span><div><p class="fi-page-eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div></header>`;
}

const pageIntroductions = {
  '#tambah-limbah': { title: 'Tambah Limbah', eyebrow: 'MULAI BERJUAL DI FOOD ILEE', description: 'Bagikan foto, jumlah, dan lokasi agar orang yang tepat bisa menemukannya.', symbol: 'add' },
  '#tanya-ai': { title: 'Tanya AI', eyebrow: 'AI ASSIST', description: 'Tanyakan tentang kategori, penyimpanan, harga, atau pemanfaatan bahan organik.', symbol: 'sparkles' },
  '#chat': { title: 'Pesan', eyebrow: 'KOMUNITAS FOOD ILEE', description: 'Terhubung, berdiskusi, dan temukan peluang bersama.', symbol: 'chat' },
};

export function renderShell(active, content, { footer = true } = {}) {
  injectShellStyles();
  const app = document.getElementById('app');
  shellRenderVersion += 1;
  const introduction = pageIntroductions[location.hash];
  const heading = introduction && !/<h1[\s>]/i.test(content) ? pageHeading(introduction) : '';
  app.innerHTML = `<div class="fi-app">${dashboardHeader(active)}<div class="fi-page">${heading}${content}</div>${footer ? dashboardFooter() : ''}</div>`;
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
  bindHeaderScroll();
  bindMobileNav();
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
  applyTranslations(document.getElementById('app'), getLanguage());
  hydrateAccount(version);
}

export function bindMobileNav() {
  mobileNavObserver?.disconnect();
  const nav = document.querySelector('#app .fi-header .fi-nav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('.fi-nav-link')];
  const kind = nav.closest('.landing-page') ? 'landing' : 'app';
  if (!mobileNavIndicator) {
    mobileNavIndicator = document.createElement('span');
    mobileNavIndicator.className = 'fi-nav-indicator';
    mobileNavIndicator.setAttribute('aria-hidden', 'true');
    document.body.append(mobileNavIndicator);
  }
  const indicator = mobileNavIndicator;
  if (!mobileNavRootObserver) {
    mobileNavRootObserver = new MutationObserver(() => {
      if (!document.querySelector('#app .fi-header .fi-nav')) indicator.classList.remove('is-visible');
    });
    mobileNavRootObserver.observe(document.getElementById('app'), { childList: true });
  }
  let currentIndex = lastMobileNavKind === kind ? lastMobileNavIndex : -1;
  if (lastMobileNavKind !== kind) {
    indicator.getAnimations().forEach((animation) => animation.cancel());
    lastMobileNavIndex = -1;
  }
  lastMobileNavKind = kind;

  const update = () => {
    if (!nav.isConnected) return;
    const index = links.findIndex((link) => link.classList.contains('is-active') || link.hasAttribute('aria-current'));
    if (index < 0) {
      indicator.classList.remove('is-visible');
      return;
    }
    const link = links[index];
    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const target = linkRect.left + linkRect.width / 2;
    const previous = indicator.classList.contains('is-visible')
      ? indicator.getBoundingClientRect().left + indicator.getBoundingClientRect().width / 2
      : target;
    indicator.style.left = `${target}px`;
    indicator.style.top = `${navRect.top - 11}px`;
    indicator.innerHTML = link.querySelector('.fi-icon')?.outerHTML || link.querySelector('svg')?.outerHTML || '';
    indicator.classList.add('is-visible');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) indicator.getAnimations().forEach((animation) => animation.cancel());
    if (currentIndex >= 0 && currentIndex !== index && !reducedMotion) {
      const offset = previous - target;
      indicator.getAnimations().forEach((animation) => animation.cancel());
      indicator.animate(
        [
          { transform: `translateX(calc(-50% + ${offset}px)) scale(.92)`, opacity: .9 },
          { transform: 'translateX(-50%) scale(1.05)', opacity: 1, offset: .78 },
          { transform: 'translateX(-50%) scale(1)', opacity: 1 },
        ],
        { duration: 460, easing: 'cubic-bezier(.32, .72, .25, 1)' },
      );
    }
    currentIndex = index;
    lastMobileNavIndex = index;
  };

  update();
  mobileNavObserver = new MutationObserver(update);
  links.forEach((link) => mobileNavObserver.observe(link, { attributes: true, attributeFilter: ['class', 'aria-current'] }));
  if (document.documentElement.dataset.fiNavResizeBound !== 'true') {
    window.addEventListener('resize', () => {
      const active = document.querySelector('#app .fi-header .fi-nav .fi-nav-link:is(.is-active, [aria-current])');
      const bubble = mobileNavIndicator;
      if (!active || !bubble) return;
      const navBox = active.closest('.fi-nav').getBoundingClientRect();
      const linkBox = active.getBoundingClientRect();
      bubble.style.left = `${linkBox.left + linkBox.width / 2}px`;
      bubble.style.top = `${navBox.top - 11}px`;
    }, { passive: true });
    document.documentElement.dataset.fiNavResizeBound = 'true';
  }
}

export function bindHeaderScroll() {
  const update = () => document.querySelector('#app .fi-header')?.classList.toggle('is-scrolled', window.scrollY > 12);
  if (!document.documentElement.dataset.fiHeaderScrollBound) {
    let frame = 0;
    window.addEventListener('scroll', () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    }, { passive: true });
    document.documentElement.dataset.fiHeaderScrollBound = 'true';
  }
  update();
}

function updateCartBadge() {
  const badge = document.querySelector('[data-cart-count]');
  const link = badge?.closest('.fi-cart-link');
  if (!badge || !link) return;
  let cart = [];
  try {
    const value = JSON.parse(sessionStorage.getItem('foodilee_checkout_cart') || '[]');
    if (Array.isArray(value)) cart = value;
  } catch {
    /* Keranjang rusak atau kosong. */
  }
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
  showToastOverlay(message, type);
}

export function formatRupiah(value) {
  return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
}
