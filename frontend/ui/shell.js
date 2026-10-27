import { getCachedCurrentUser, getCurrentUser } from '../services/user.js';
import { getToken, removeToken } from '../utils/storage.js';
import { escapeHtml } from '../utils/html.js';
import { applyTranslations, getLanguage } from '../utils/i18n.js';
import { showToast as showToastOverlay } from '../utils/toast.js';
import { brandImage, icon } from './icons.js';
import { getCachedStore, getStoreAccess } from '../utils/store-access.js';

const links = [
  ['Marketplace', '#marketplace', 'market'],
  ['Tambah Limbah', '#tambah-limbah', 'add'],
  ['Tanya AI', '#tanya-ai', 'ai'],
  ['Transaksi', '#transaksi', 'orders'],
  ['Pesan', '#chat', 'chat'],
];

export { icon };

let shellRenderVersion = 0;
let mobileNavObserver;
let mobileNavAnimation;
let mobileNavActiveCenter;
let mobileNavResizeBound = false;
let desktopNavGeometry;
let desktopNavIndicator;
let desktopNavAnimation;
let desktopNavResizeObserver;
let desktopNavObserved;
let retainedDashboardHeader;

function captureDesktopNavPosition() {
  const nav = desktopNavIndicator?.parentElement;
  if (!desktopNavIndicator?.isConnected || !nav) return;
  const bounds = desktopNavIndicator.getBoundingClientRect();
  const origin = nav.getBoundingClientRect();
  desktopNavGeometry = {
    x: bounds.left - origin.left - nav.clientLeft + nav.scrollLeft,
    y: bounds.top - origin.top - nav.clientTop + nav.scrollTop,
    width: bounds.width,
    height: bounds.height,
  };
}

function updateDesktopNavIndicator(nav, { animate = true } = {}) {
  const desktop = window.matchMedia('(min-width: 769px)').matches;
  const active = nav?.querySelector('.fi-nav-link[aria-current], .fi-nav-link.is-active');
  if (!desktop || nav?.closest('.landing-nav') || !active) {
    desktopNavAnimation?.cancel();
    desktopNavResizeObserver?.disconnect();
    desktopNavObserved = undefined;
    nav?.querySelector(':scope > .fi-nav-indicator')?.remove();
    nav?.classList.remove('has-active-indicator', 'is-nav-moving');
    desktopNavGeometry = undefined;
    return;
  }

  captureDesktopNavPosition();
  desktopNavAnimation?.cancel();

  let indicator = nav.querySelector(':scope > .fi-nav-indicator');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'fi-nav-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    nav.append(indicator);
  }
  nav.classList.add('has-active-indicator');
  desktopNavIndicator = indicator;

  const navBounds = nav.getBoundingClientRect();
  const activeBounds = active.getBoundingClientRect();
  const target = {
    x: activeBounds.left - navBounds.left - nav.clientLeft + nav.scrollLeft,
    y: activeBounds.top - navBounds.top - nav.clientTop + nav.scrollTop,
    width: activeBounds.width,
    height: activeBounds.height,
  };
  const previous = desktopNavGeometry;
  const moved =
    previous &&
    (Math.abs(previous.x - target.x) > 1 ||
      Math.abs(previous.y - target.y) > 1 ||
      Math.abs(previous.width - target.width) > 1);
  const setGeometry = (geometry) => {
    indicator.style.setProperty('--fi-nav-x', `${geometry.x}px`);
    indicator.style.setProperty('--fi-nav-y', `${geometry.y}px`);
    indicator.style.setProperty('--fi-nav-width', `${geometry.width}px`);
    indicator.style.setProperty('--fi-nav-height', `${geometry.height}px`);
  };

  setGeometry(target);
  indicator.classList.add('is-ready');
  if (animate && moved && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    nav.classList.add('is-nav-moving');
    const animation = indicator.animate(
      [previous, target].map((geometry) => ({
        transform: `translate3d(${geometry.x}px, ${geometry.y}px, 0)`,
        width: `${geometry.width}px`,
        height: `${geometry.height}px`,
      })),
      { duration: 460, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
    desktopNavAnimation = animation;
    animation.finished
      .catch(() => {})
      .finally(() => {
        if (desktopNavAnimation !== animation) return;
        desktopNavAnimation = undefined;
        nav.classList.remove('is-nav-moving');
      });
  } else {
    nav.classList.remove('is-nav-moving');
  }
  desktopNavGeometry = target;

  if (desktopNavObserved !== nav) {
    desktopNavResizeObserver?.disconnect();
    desktopNavObserved = nav;
    let width = nav.clientWidth;
    let height = nav.clientHeight;
    desktopNavResizeObserver = new ResizeObserver(() => {
      if (!nav.isConnected || (width === nav.clientWidth && height === nav.clientHeight)) return;
      width = nav.clientWidth;
      height = nav.clientHeight;
      updateDesktopNavIndicator(nav, { animate: false });
    });
    desktopNavResizeObserver.observe(nav);
  }
}

function animateMobileNavSelection(dock) {
  if (!window.matchMedia('(max-width: 768px)').matches) {
    mobileNavActiveCenter = undefined;
    return;
  }
  const active = dock.querySelector('.fi-nav-link[aria-current], .fi-nav-link.is-active');
  if (!active) return;
  const bounds = active.getBoundingClientRect();
  const center = bounds.left + bounds.width / 2;
  const previousCenter = mobileNavActiveCenter;
  mobileNavActiveCenter = center;
  if (
    previousCenter === undefined ||
    Math.abs(previousCenter - center) < 1 ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return;
  const activeIcon = active.querySelector('.fi-icon');
  if (!activeIcon?.animate) return;
  mobileNavAnimation?.cancel();
  mobileNavAnimation = activeIcon.animate(
    [
      { transform: `translateX(calc(-50% + ${previousCenter - center}px))` },
      { transform: 'translateX(-50%)' },
    ],
    { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  );
}

export function dashboardHeader(active = '') {
  captureDesktopNavPosition();
  const currentHeader = document.querySelector('#app .fi-header:not(.landing-nav)');
  if (currentHeader?.isConnected) {
    retainedDashboardHeader = currentHeader;
    currentHeader.remove();
  }
  const currentRoute = location.hash || '#marketplace';
  const storeAvailable = Boolean(getCachedStore());
  const navLinks = storeAvailable ? [...links, ['Kelola Toko', '#kelola-toko', 'store']] : links;
  const nav = navLinks
    .map(([label, href, key]) => {
      const isActive = active ? active === key : currentRoute === href;
      return `<a class="fi-nav-link${isActive ? ' is-active' : ''}${href === '#kelola-toko' ? ' fi-nav-store' : ''}" href="${href}" aria-label="${label}"${isActive ? ' aria-current="page"' : ''}>${icon(key)}<span>${label}</span></a>`;
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
      <a class="fi-header-brand" href="${storeAvailable ? '#kelola-toko' : '#marketplace'}" aria-label="Food Ilee">${brandImage()}</a>
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

export function pageHeading({ title, description, eyebrow = 'FOOD ILEE' }) {
  return `<header class="fi-page-heading"><p class="fi-page-eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></header>`;
}

const pageIntroductions = {
  '#tambah-limbah': {
    title: 'Tambah Limbah',
    eyebrow: 'MULAI BERJUAL DI FOOD ILEE',
    description: 'Bagikan foto, jumlah, dan lokasi agar orang yang tepat bisa menemukannya.',
  },
  '#tanya-ai': {
    title: 'Tanya AI',
    eyebrow: 'AI ASSIST',
    description: 'Tanyakan tentang kategori, penyimpanan, harga, atau pemanfaatan bahan organik.',
  },
  '#chat': {
    title: 'Pesan',
    eyebrow: 'KOMUNITAS FOOD ILEE',
    description: 'Terhubung, berdiskusi, dan temukan peluang bersama.',
  },
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
  restoreDashboardHeader();
  bindHeaderScroll();
  syncStoreNavigation(version);
  updateCartBadge();
  if (!document.documentElement.dataset.fiCartBound) {
    window.addEventListener('foodilee:cart-updated', updateCartBadge);
    document.documentElement.dataset.fiCartBound = 'true';
  }
  const toggle = document.querySelector('.fi-account-toggle');
  const menu = document.querySelector('.fi-account-menu');
  const header = toggle?.closest('.fi-header');
  if (toggle && menu && header && !header.dataset.fiHeaderBound) {
    header.dataset.fiHeaderBound = 'true';
    toggle.addEventListener('click', () => {
      setAccountMenuOpen(menu, toggle, !menu.classList.contains('open'));
    });
    toggle.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      setAccountMenuOpen(menu, toggle, true);
      menu.querySelector('a:not([hidden]), button:not([disabled])')?.focus();
    });
    toggle.closest('.fi-account')?.addEventListener('focusout', (event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget))
        closeAccountMenu(menu, toggle);
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
  bindMobileNav();
  hydrateAccount(version);
}

function restoreDashboardHeader() {
  const nextHeader = document.querySelector('#app .fi-header:not(.landing-nav)');
  const previousHeader = retainedDashboardHeader;
  retainedDashboardHeader = undefined;
  if (!nextHeader || !previousHeader) return;

  const linkSignature = (header) =>
    [...header.querySelectorAll('.fi-nav > .fi-nav-link')]
      .map((link) => link.getAttribute('href'))
      .join('|');
  if (linkSignature(previousHeader) !== linkSignature(nextHeader)) return;

  const syncCurrentLinks = (selector) => {
    previousHeader.querySelectorAll(selector).forEach((link) => {
      const href = link.getAttribute('href');
      const next = [...nextHeader.querySelectorAll(selector)].find(
        (candidate) => candidate.getAttribute('href') === href,
      );
      const current = Boolean(next?.hasAttribute('aria-current'));
      link.classList.toggle('is-active', current && selector.includes('fi-nav'));
      link.classList.toggle('is-current', current && !selector.includes('fi-nav'));
      if (current) link.setAttribute('aria-current', next.getAttribute('aria-current') || 'page');
      else link.removeAttribute('aria-current');
    });
  };

  syncCurrentLinks('.fi-nav > .fi-nav-link');
  syncCurrentLinks('.fi-account-menu-links > a');
  previousHeader
    .querySelector('.fi-header-brand')
    ?.setAttribute(
      'href',
      nextHeader.querySelector('.fi-header-brand')?.getAttribute('href') || '#marketplace',
    );
  const toggle = previousHeader.querySelector('.fi-account-toggle');
  const menu = previousHeader.querySelector('.fi-account-menu');
  if (toggle && menu) closeAccountMenu(menu, toggle);
  nextHeader.replaceWith(previousHeader);
}

async function syncStoreNavigation(version) {
  const header = document.querySelector('#app .fi-header:not(.landing-nav)');
  if (!header || !getToken()) return;
  const token = getToken();
  try {
    const store = await getStoreAccess();
    if (version !== shellRenderVersion || !header.isConnected || getToken() !== token) return;
    const nav = header.querySelector('.fi-nav');
    const existing = nav?.querySelector('.fi-nav-store');
    header
      .querySelector('.fi-header-brand')
      ?.setAttribute('href', store ? '#kelola-toko' : '#marketplace');
    if (store && !existing) {
      nav.insertAdjacentHTML(
        'beforeend',
        `<a class="fi-nav-link fi-nav-store${location.hash === '#kelola-toko' ? ' is-active' : ''}" href="#kelola-toko" aria-label="Kelola Toko"${location.hash === '#kelola-toko' ? ' aria-current="page"' : ''}>${icon('store')}<span>Kelola Toko</span></a>`,
      );
      applyTranslations(nav.lastElementChild, getLanguage());
      bindMobileNav();
    } else if (!store && existing) {
      existing.remove();
      bindMobileNav();
    }
  } catch {
    // Keep the shared navigation usable if the store check is temporarily unavailable.
  }
}

export function bindMobileNav() {
  // Keep the dock outside sticky or clipped page containers so it stays fixed
  // to the viewport while scrolling, including on the landing page.
  document.querySelectorAll('body > .fi-nav-indicator').forEach((indicator) => indicator.remove());
  const app = document.getElementById('app');
  const source = app?.querySelector('.fi-header .fi-nav');
  mobileNavObserver?.disconnect();
  app?.querySelector(':scope > .fi-mobile-nav')?.remove();
  if (!source) {
    mobileNavActiveCenter = undefined;
    return;
  }
  const dock = source.cloneNode(true);
  dock.querySelector(':scope > .fi-nav-indicator')?.remove();
  dock.classList.remove('has-active-indicator');
  dock.classList.add('fi-mobile-nav');
  dock.setAttribute('aria-label', 'Navigasi utama mobile');
  if (source.closest('.landing-nav')) {
    const home = dock.querySelector('.fi-nav-link');
    home.href = '#beranda';
    home.innerHTML = `${icon('home')}<span>Beranda</span>`;
    home.classList.add('is-active');
    home.setAttribute('aria-current', 'location');
  }
  app.append(dock);
  updateDesktopNavIndicator(source);
  app.querySelectorAll('.fi-header .fi-nav-link, .fi-mobile-nav .fi-nav-link').forEach((link) => {
    const label = link.querySelector('span')?.textContent.trim();
    if (label) link.setAttribute('aria-label', label);
  });
  animateMobileNavSelection(dock);
  mobileNavObserver = new MutationObserver(() => animateMobileNavSelection(dock));
  mobileNavObserver.observe(dock, {
    attributes: true,
    subtree: true,
    attributeFilter: ['class', 'aria-current'],
  });
  if (!mobileNavResizeBound) {
    window.addEventListener(
      'resize',
      () => {
        const active = document.querySelector('#app > .fi-mobile-nav .fi-nav-link[aria-current]');
        const bounds = active?.getBoundingClientRect();
        mobileNavActiveCenter = bounds ? bounds.left + bounds.width / 2 : undefined;
        updateDesktopNavIndicator(document.querySelector('#app .fi-header .fi-nav'), {
          animate: false,
        });
      },
      { passive: true },
    );
    mobileNavResizeBound = true;
  }
}

export function bindHeaderScroll() {
  const update = () =>
    document.querySelector('#app .fi-header')?.classList.toggle('is-scrolled', window.scrollY > 12);
  if (!document.documentElement.dataset.fiHeaderScrollBound) {
    let frame = 0;
    window.addEventListener(
      'scroll',
      () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          update();
        });
      },
      { passive: true },
    );
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

function setAccountMenuOpen(menu, toggle, open) {
  menu.classList.toggle('open', open);
  menu.setAttribute('aria-hidden', String(!open));
  toggle.setAttribute('aria-expanded', String(open));
}

function closeAccountMenu(menu, toggle) {
  setAccountMenuOpen(menu, toggle, false);
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
