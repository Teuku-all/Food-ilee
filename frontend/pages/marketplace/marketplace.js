import { getWastes } from '../../services/waste.js';
import { getCurrentUser } from '../../services/user.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast, injectToastStyle } from '../../utils/toast.js';
import { bindSharedHeader, dashboardFooter, dashboardHeader } from '../../ui/shell.js';
import { startChat } from '../../services/chat.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { skeleton } from '../../ui/skeleton.js';
import { marketplacePromoBanner, injectMarketplacePromoStyle } from './promo-banner.js';

let marketplaceProducts = [];
let activeCategory = 'Semua';
let activeSearch = '';
let currentMarketplaceUserId = '';
let isDemoMarketplace = false;

const demoMarketplaceProducts = [
  {
    id: 'demo-waste-vegetables',
    isDemo: true,
    title: 'Sayur Segar Campuran',
    description: 'Contoh sisa sayur segar yang masih layak dimanfaatkan sebagai pakan ternak.',
    price: 2500,
    stock: 18,
    category: 'Pakan Ternak',
    location: 'Pasar Cihapit, Bandung',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80',
    createdAt: new Date().toISOString(),
    store: { name: 'Contoh Penjual' },
  },
  {
    id: 'demo-waste-coffee',
    isDemo: true,
    title: 'Ampas Kopi Kering',
    description: 'Contoh ampas kopi kering untuk bahan campuran kompos.',
    price: 4000,
    stock: 8,
    category: 'Kompos',
    location: 'Dago, Bandung',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80',
    createdAt: new Date().toISOString(),
    store: { name: 'Contoh Penjual' },
  },
  {
    id: 'demo-waste-fruit',
    isDemo: true,
    title: 'Kulit Buah Campuran',
    description: 'Contoh kulit buah untuk bahan organik pengolahan kompos.',
    price: 1500,
    stock: 22,
    category: 'Kompos',
    location: 'Sukajadi, Bandung',
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&q=80',
    createdAt: new Date().toISOString(),
    store: { name: 'Contoh Penjual' },
  },
  {
    id: 'demo-waste-cassava-leaves',
    isDemo: true,
    title: 'Daun Singkong Segar',
    description: 'Contoh daun singkong segar yang dapat dimanfaatkan sebagai pakan ternak.',
    price: 2200,
    stock: 16,
    category: 'Pakan Ternak',
    location: 'Pasar Cihapit, Bandung',
    image: '/assets/foodilee-login-hero.png',
    createdAt: new Date().toISOString(),
    store: { name: 'Contoh Penjual' },
  },
  {
    id: 'demo-waste-coffee-grounds',
    isDemo: true,
    title: 'Ampas Kopi Pilihan',
    description: 'Contoh ampas kopi untuk bahan campuran pupuk dan kompos.',
    price: 3500,
    stock: 12,
    category: 'Kompos',
    location: 'Dago, Bandung',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80',
    createdAt: new Date().toISOString(),
    store: { name: 'Contoh Penjual' },
  },
  {
    id: 'demo-waste-banana-peels',
    isDemo: true,
    title: 'Kulit Pisang Siap Olah',
    description: 'Contoh kulit pisang untuk bahan organik pengolahan kompos.',
    price: 1800,
    stock: 14,
    category: 'Kompos',
    location: 'Sukajadi, Bandung',
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&q=80',
    createdAt: new Date().toISOString(),
    store: { name: 'Contoh Penjual' },
  },
];

export async function renderMarketplace() {
  const revision = getNavigationRevision();
  const app = document.getElementById('app');
  activeCategory = 'Semua';
  activeSearch = '';
  currentMarketplaceUserId = '';
  app.innerHTML = `
    <div class="mp-app">
      ${dashboardHeader('market')}
      <main class="mp-main">
        <section class="mp-intro" aria-labelledby="mp-intro-title">
          <div class="mp-intro-copy">
            <p class="mp-intro-kicker"><span aria-hidden="true"></span> Belanja yang memberi dampak</p>
            <h1 id="mp-intro-title">Marketplace Limbah Organik</h1>
            <p>Temukan limbah organik untuk pakan ternak dan bahan kompos dari sumber terpercaya di sekitar Anda.</p>
          </div>
          <div class="mp-intro-visual">
            <div class="mp-intro-orbit" aria-hidden="true"><span>↻</span></div>
            <div class="mp-product-count" id="mp-product-count" role="status" aria-live="polite"></div>
          </div>
        </section>
        <div class="mp-search-row"><div class="mp-search" role="search"><label class="mp-search-box"><span aria-hidden="true">⌕</span><input id="mp-search-input" type="search" placeholder="Cari nama produk, deskripsi, atau lokasi…" aria-label="Cari produk marketplace"><button id="mp-search-clear" type="button" aria-label="Hapus pencarian" hidden>×</button></label></div><div class="mp-categories" role="group" aria-label="Kategori produk"><button type="button" class="active" aria-pressed="true" data-category="Semua">Semua</button><button type="button" aria-pressed="false" data-category="Pakan Ternak">Pakan Ternak</button><button type="button" aria-pressed="false" data-category="Kompos">Kompos</button></div></div>
        ${marketplacePromoBanner()}
        <div class="mp-demo-banner" id="mp-demo-banner" hidden>Ini data contoh untuk pratinjau. Produk ini belum benar-benar ditawarkan dan belum bisa dipesan.</div>
        <section class="mp-grid" id="mp-grid" aria-live="polite" aria-busy="true">${marketplaceLoadingSkeleton()}</section>
      </main>
      ${dashboardFooter()}
    </div>`;
  injectMarketplaceStyle();
  injectMarketplacePromoStyle();
  injectToastStyle();
  bindSharedHeader();
  bindMarketplaceControls();

  try {
    const [result] = await Promise.all([getWastes(), loadUser(revision)]);
    if (!isRouteCurrent('#marketplace', revision)) return;
    if (result.success === false) throw new Error(result.message || 'Produk belum dapat dimuat.');
    document.getElementById('mp-grid')?.removeAttribute('aria-busy');
    marketplaceProducts = Array.isArray(result.data) ? result.data : [];
    isDemoMarketplace = marketplaceProducts.length === 0;
    if (isDemoMarketplace) marketplaceProducts = demoMarketplaceProducts;
    const demoBanner = document.getElementById('mp-demo-banner');
    if (demoBanner) demoBanner.hidden = !isDemoMarketplace;
    renderProducts();
  } catch (error) {
    if (!isRouteCurrent('#marketplace', revision)) return;
    document.getElementById('mp-grid')?.removeAttribute('aria-busy');
    const grid = document.getElementById('mp-grid');
    if (grid)
      grid.innerHTML = `<div class="mp-empty"><h2>Marketplace belum dapat dimuat</h2><p>${escapeHtml(error.message || 'Periksa koneksi server Anda.')}</p><button type="button" id="mp-retry">Coba lagi</button></div>`;
    document.getElementById('mp-retry')?.addEventListener('click', renderMarketplace);
  }
}

function marketplaceLoadingSkeleton() {
  return Array.from({ length: 6 }, () => `<article class="mp-card" aria-hidden="true"><div class="mp-card-image-wrap">${skeleton('100%', '205px')}</div><div class="mp-card-body">${skeleton('75px', '18px', 'pill')}<div style="height:12px"></div>${skeleton('70%', '18px')}<div style="height:12px"></div>${skeleton('80%', '11px')}<div style="height:14px"></div>${skeleton('100%', '39px', 'pill')}</div></article>`).join('');
}

function bindMarketplaceControls() {
  const searchInput = document.getElementById('mp-search-input');
  const clearSearch = document.getElementById('mp-search-clear');
  document.getElementById('mp-promo-explore')?.addEventListener('click', () => {
    searchInput?.focus({ preventScroll: true });
    searchInput?.closest('.mp-search')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
  });
  searchInput?.addEventListener('input', () => {
    activeSearch = searchInput.value.trim().toLocaleLowerCase('id-ID');
    if (clearSearch) clearSearch.hidden = !searchInput.value;
    renderProducts();
  });
  clearSearch?.addEventListener('click', () => {
    if (!searchInput) return;
    searchInput.value = '';
    activeSearch = '';
    clearSearch.hidden = true;
    searchInput.focus();
    renderProducts();
  });
  document.querySelectorAll('.mp-categories button').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.mp-categories button').forEach((item) => {
        item.classList.remove('active');
        item.setAttribute('aria-pressed', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
      activeCategory = button.dataset.category;
      renderProducts();
    });
  });
}

async function loadUser(revision) {
  try {
    const result = await getCurrentUser();
    if (!isRouteCurrent('#marketplace', revision)) return null;
    const user = result.data;
    if (!result.success || !user) return null;
    currentMarketplaceUserId = user.id || '';
  } catch {
    // Nama profil bukan prasyarat untuk menjelajah produk.
  }
  return null;
}

function categoryFor(product) {
  const text =
    `${product.category || ''} ${product.title || ''} ${product.description || ''}`.toLowerCase();
  if (product.category === 'Kompos' || product.category === 'Pakan Ternak') return product.category;
  return /kompos|pupuk|kulit buah|ampas kopi/.test(text) ? 'Kompos' : 'Pakan Ternak';
}

function sellerDisplayName(product) {
  return product.store?.name || 'Toko Food Ilee';
}

function renderProducts() {
  const grid = document.getElementById('mp-grid');
  if (!grid) return;
  const categoryProducts =
    activeCategory === 'Semua'
      ? marketplaceProducts
      : marketplaceProducts.filter((product) => categoryFor(product) === activeCategory);
  const products = activeSearch
    ? categoryProducts.filter((product) =>
        [product.title, product.description, product.location, product.store?.name, product.category]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('id-ID')
          .includes(activeSearch),
      )
    : categoryProducts;
  const productCount = document.getElementById('mp-product-count');
  if (productCount) {
    productCount.textContent = `${products.length} produk tersedia`;
  }
  if (!products.length) {
    const hasFilters = activeCategory !== 'Semua' || activeSearch;
    grid.innerHTML = `<div class="mp-empty"><div class="mp-empty-mark">♧</div><h2>${hasFilters ? 'Produk tidak ditemukan' : marketplaceProducts.length ? 'Belum ada produk di kategori ini' : 'Belum ada produk tersedia'}</h2><p>${hasFilters ? 'Coba kata kunci lain atau ubah kategori pencarian.' : marketplaceProducts.length ? 'Pilih kategori lain untuk menjelajahi produk.' : 'Produk limbah pangan yang tersedia akan muncul di sini.'}</p>${!hasFilters && !marketplaceProducts.length ? '<a href="#tambah-limbah">Mulai tambahkan limbah <span>→</span></a>' : ''}</div>`;
    return;
  }
  grid.innerHTML = products
    .map((product) => {
      const category = categoryFor(product);
      const seller = sellerDisplayName(product);
      const uploaded = new Date(product.createdAt);
      const relativeAge = Number.isNaN(uploaded.getTime())
        ? 'Tersedia sekarang'
        : `Diperbarui ${uploaded.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
      return `<article class="mp-card"><div class="mp-card-image-wrap"><img class="mp-card-image" src="${escapeHtml(product.image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80')}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80'"><span class="mp-category-tag ${category === 'Kompos' ? 'compost' : ''}">${category}</span>${product.isDemo ? '<span class="mp-demo-tag">CONTOH</span>' : ''}</div><div class="mp-card-body"><div class="mp-title-row"><h2>${escapeHtml(product.title || 'Limbah Organik')}</h2><strong>${formatPrice(product.price)}</strong></div><div class="mp-meta"><span>&#9827; &nbsp;${Number(product.stock || 0).toLocaleString('id-ID')} kg</span><i>&#8226;</i><span>&#8982; &nbsp;${escapeHtml(product.location || seller)}</span></div><p class="mp-updated">${relativeAge}</p><button class="mp-card-action" type="button" data-product-id="${escapeHtml(product.id)}">Lihat Detail <span>&rarr;</span></button></div></article>`;
    })
    .join('');
  grid.querySelectorAll('[data-product-id]').forEach((button) =>
    button.addEventListener('click', () => {
      const product = products.find((item) => item.id === button.dataset.productId);
      if (product) showProductDetail(product);
    }),
  );
}

function showProductDetail(product) {
  const dialog = document.createElement('dialog');
  dialog.className = 'mp-detail-dialog';
  const seller = sellerDisplayName(product);
  dialog.innerHTML = `<form class="mp-detail-card"><button type="button" class="mp-detail-close" aria-label="Tutup">×</button><img src="${escapeHtml(product.image || '')}" alt="${escapeHtml(product.title)}"><div class="mp-detail-copy"><span class="mp-category-tag ${categoryFor(product) === 'Kompos' ? 'compost' : ''}">${escapeHtml(categoryFor(product))}</span><h2>${escapeHtml(product.title)}</h2><p>${escapeHtml(product.description || 'Bahan organik yang tersedia untuk dimanfaatkan kembali.')}</p>${product.isDemo ? '<p class="mp-demo-detail-note">Produk contoh ini belum dapat di-chat atau dipesan.</p>' : ''}<div class="mp-detail-facts"><span><small>PENJUAL</small><strong>${escapeHtml(seller)}</strong></span><span><small>LOKASI</small><strong>${escapeHtml(product.location || 'Hubungi penjual untuk detail lokasi')}</strong></span></div><button class="mp-card-action mp-chat" type="button" ${product.isDemo || !product.seller?.id || product.seller.id === currentMarketplaceUserId ? 'disabled' : ''}>Chat penjual</button><div class="mp-detail-order"><label for="mp-quantity">Jumlah (kg)</label><div class="mp-quantity-row"><div class="mp-quantity-stepper"><button class="mp-quantity-step" type="button" data-step="-1" aria-label="Kurangi jumlah">−</button><input id="mp-quantity" type="number" min="1" max="${Math.max(1, Number(product.stock) || 1)}" step="1" value="1" inputmode="numeric"><button class="mp-quantity-step" type="button" data-step="1" aria-label="Tambah jumlah">+</button></div><span>tersedia ${Number(product.stock || 0)} kg</span></div></div><div class="mp-detail-total"><span>Subtotal produk</span><strong id="mp-order-total">${formatPrice(product.price)}</strong></div><div class="mp-detail-actions"><button class="mp-card-action mp-add-cart" type="button" ${product.isDemo || Number(product.stock) < 1 ? 'disabled' : ''}>Tambah ke keranjang</button><button class="mp-card-action mp-buy" type="submit" ${product.isDemo || Number(product.stock) < 1 ? 'disabled' : ''}>Lihat keranjang <span>&rarr;</span></button></div><small class="mp-payment-note">Periksa produk pilihan Anda di keranjang sebelum membayar.</small></div></form>`;
  injectMarketplaceDetailStyles();
  document.body.append(dialog);
  dialog.showModal();
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const openingAnimation = dialog.animate(
      [
        { opacity: 0, transform: 'translateY(18px) scale(.94)', filter: 'blur(4px)' },
        { opacity: 0.68, transform: 'translateY(4px) scale(.99)', filter: 'blur(1px)', offset: 0.58 },
        { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
      ],
      { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' },
    );
    openingAnimation.onfinish = () => openingAnimation.cancel();
  }
  const quantity = dialog.querySelector('#mp-quantity');
  const total = dialog.querySelector('#mp-order-total');
  const quantityStepButtons = dialog.querySelectorAll('.mp-quantity-step');
  const syncQuantityButtons = () => {
    const value = Number(quantity.value);
    const max = Number(quantity.max);
    quantityStepButtons.forEach((button) => {
      const step = Number(button.dataset.step);
      button.disabled =
        (step < 0 && Number.isInteger(value) && value <= Number(quantity.min)) ||
        (step > 0 && Number.isInteger(value) && value >= max);
    });
  };
  quantityStepButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const min = Number(quantity.min) || 1;
      const max = Number(quantity.max) || min;
      const current = Number(quantity.value);
      const base = Number.isInteger(current) ? Math.min(max, current) : min - 1;
      quantity.value = String(Math.max(min, Math.min(max, base + Number(button.dataset.step))));
      quantity.dispatchEvent(new Event('input', { bubbles: true }));
      quantity.focus({ preventScroll: true });
    });
  });
  syncQuantityButtons();
  quantity.addEventListener('input', () => {
    total.textContent = formatPrice(
      Number(product.price || 0) * Math.max(1, Number(quantity.value) || 1),
    );
    syncQuantityButtons();
  });
  dialog.querySelector('.mp-detail-close').addEventListener('click', () => {
    dialog.close();
    dialog.remove();
  });
  dialog.querySelector('.mp-chat')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    if (!product.seller?.id) return;
    button.disabled = true;
    button.textContent = 'Membuka percakapan…';
    try {
      const chat = await startChat(product.seller.id);
      sessionStorage.setItem('foodilee_chat_id', chat.id);
      dialog.close();
      dialog.remove();
      location.hash = '#chat';
    } catch (error) {
      showToast(error.message || 'Percakapan belum dapat dibuat.', 'error');
      button.disabled = false;
      button.textContent = 'Chat penjual';
    }
  });
  dialog.querySelector('.mp-add-cart')?.addEventListener('click', () => {
    const qty = Number(quantity.value);
    if (!Number.isInteger(qty) || qty < 1 || qty > Number(product.stock)) {
      showToast('Masukkan jumlah stok yang tersedia.', 'error'); return;
    }
    let cart = [];
    try { cart = JSON.parse(sessionStorage.getItem('foodilee_checkout_cart') || '[]'); } catch { cart = []; }
    const existing = cart.find((item) => item.wasteId === product.id);
    if (existing) existing.quantity = Math.min(Number(product.stock), Number(existing.quantity) + qty);
    else cart.push({ wasteId: product.id, quantity: qty });
    sessionStorage.setItem('foodilee_checkout_cart', JSON.stringify(cart));
    let selection = { selected: [], known: [] };
    try {
      const savedSelection = JSON.parse(sessionStorage.getItem('foodilee_checkout_selected') || 'null');
      if (Array.isArray(savedSelection?.selected) && Array.isArray(savedSelection?.known)) selection = savedSelection;
    } catch { /* Pilihan awal keranjang akan dibuat saat dibuka. */ }
    selection.selected = [...new Set([...selection.selected, product.id])];
    selection.known = cart.map((item) => item.wasteId);
    sessionStorage.setItem('foodilee_checkout_selected', JSON.stringify(selection));
    window.dispatchEvent(new Event('foodilee:cart-updated'));
    showToast('Produk ditambahkan ke keranjang belanja.');
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
      dialog.remove();
    }
  });
  dialog.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (product.isDemo) return;
    const button = dialog.querySelector('.mp-buy');
    const qty = Number(quantity.value);
    if (!Number.isInteger(qty) || qty < 1 || qty > Number(product.stock)) {
      showToast('Masukkan jumlah stok yang tersedia.', 'error');
      return;
    }
    let cart = [];
    try { cart = JSON.parse(sessionStorage.getItem('foodilee_checkout_cart') || '[]'); } catch { cart = []; }
    const existing = cart.find((item) => item.wasteId === product.id);
    if (existing) existing.quantity = Math.min(Number(product.stock), Number(existing.quantity) + qty);
    else cart.push({ wasteId: product.id, quantity: qty });
    sessionStorage.setItem('foodilee_checkout_cart', JSON.stringify(cart));
    let selection = { selected: [], known: [] };
    try {
      const savedSelection = JSON.parse(sessionStorage.getItem('foodilee_checkout_selected') || 'null');
      if (Array.isArray(savedSelection?.selected) && Array.isArray(savedSelection?.known)) selection = savedSelection;
    } catch { /* Pilihan awal keranjang akan dibuat saat dibuka. */ }
    selection.selected = [...new Set([...selection.selected, product.id])];
    selection.known = cart.map((item) => item.wasteId);
    sessionStorage.setItem('foodilee_checkout_selected', JSON.stringify(selection));
    window.dispatchEvent(new Event('foodilee:cart-updated'));
    dialog.close(); dialog.remove(); location.hash = '#cart';
  });
}

function injectMarketplaceDetailStyles() {
  if (document.getElementById('marketplace-detail-style')) return;
  const style = document.createElement('style');
  style.id = 'marketplace-detail-style';
  style.textContent = `
    .mp-detail-dialog{
      position:fixed;inset:0;box-sizing:border-box;margin:auto;
      width:min(820px,calc(100vw - 24px));max-height:calc(100dvh - 28px);
      padding:0;overflow-y:auto;overscroll-behavior:contain;
      border:1px solid #dbe8e1;border-radius:24px;background:#f9fcfa;
      color:#173d3c;box-shadow:0 25px 90px #091b1460;
    }
    .mp-detail-dialog[open]::backdrop{
      background:#102c2480;backdrop-filter:blur(4px);
      animation:mp-detail-backdrop-in 360ms ease-out both;
    }
    @keyframes mp-detail-backdrop-in{from{background:#102c2400;backdrop-filter:blur(0)}to{background:#102c2480;backdrop-filter:blur(4px)}}
    .mp-detail-card{
      position:relative;box-sizing:border-box;display:grid;
      grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);
      align-items:start;gap:24px;margin:0;padding:24px;
    }
    .mp-detail-card>img{
      display:block;width:100%;height:100%;min-height:390px;max-height:500px;
      border:1px solid #e4ece6;border-radius:18px;object-fit:cover;background:#f0f3ef;
    }
    .mp-detail-copy{min-width:0;padding:18px 12px 10px 0}
    .mp-detail-copy>.mp-category-tag{position:static;display:inline-block;max-width:100%;width:fit-content}
    .mp-detail-copy h2{margin:14px 0 8px;color:#174a3b;font-size:26px;line-height:1.25;letter-spacing:-.4px}
    .mp-detail-copy>p{margin:0 0 12px;color:#69766f;font-size:13px;line-height:1.7}
    .mp-detail-copy>.mp-demo-detail-note{margin:12px 0;padding:11px 13px;border:1px solid #e5e9cf;border-radius:12px;background:#f5f7e9;color:#68734b;font-size:12px;line-height:1.6}
    .mp-detail-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:18px 0}
    .mp-detail-facts>span{display:flex;min-width:0;flex-direction:column;gap:6px;padding:12px;border:1px solid #e3ece6;border-radius:13px;background:#fff}
    .mp-detail-facts small{color:#829189;font-size:9px;font-weight:700;letter-spacing:.1em}
    .mp-detail-facts strong{overflow:hidden;color:#42544a;font-size:11px;font-weight:550;text-overflow:ellipsis;white-space:nowrap}
    .mp-chat{margin:0 0 14px;background:#eef7f5;color:#075653;border:1px solid #c8e0dc}
    .mp-chat:hover{background:#dcefeb}
    .mp-chat:disabled{opacity:.55;cursor:not-allowed}
    .mp-detail-order{padding:15px 0;border-top:1px solid #e7eeea}
    .mp-detail-order>label{display:block;margin-bottom:9px;color:#375748;font-size:12px;font-weight:650}
    .mp-detail-order .mp-quantity-row{display:flex;align-items:center;flex-wrap:wrap;gap:11px}
    .mp-quantity-stepper{display:inline-flex;align-items:center;gap:7px;padding:4px;border:1px solid #dce9e1;border-radius:12px;background:#fff}
    .mp-quantity-step{display:grid;width:34px;height:34px;flex:none;place-items:center;padding:0;border:1px solid #dce7e0;border-radius:9px;background:#fff;color:#145746;font:500 19px/1 Inter,Arial,sans-serif;cursor:pointer;transition:background 150ms ease,border-color 150ms ease}
    .mp-quantity-step:hover:not(:disabled){border-color:#a8c8b6;background:#edf6f0}
    .mp-quantity-step:focus-visible{outline:3px solid #087b7840;outline-offset:2px}
    .mp-quantity-step:disabled{opacity:.42;cursor:not-allowed}
    .mp-quantity-stepper input{box-sizing:border-box;width:48px;height:34px;padding:0 2px;border:0;border-radius:6px;background:transparent;color:#173d3c;font:500 14px Inter,Arial,sans-serif;text-align:center;appearance:textfield;-moz-appearance:textfield}
    .mp-quantity-stepper input::-webkit-inner-spin-button,.mp-quantity-stepper input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
    .mp-quantity-stepper input:focus-visible{outline:2px solid #087b7840;outline-offset:1px}
    .mp-detail-order .mp-quantity-row>span{color:#74847b;font-size:11px}
    .mp-detail-total{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:6px 0 2px;color:#69756f;font-size:12px}
    .mp-detail-total strong{color:#145746;font-size:20px}
    .mp-detail-actions{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;margin-top:16px}
    .mp-detail-actions .mp-card-action{box-sizing:border-box;width:100%;min-width:0;min-height:46px;height:auto;margin:0;padding:12px 16px;line-height:1.4;white-space:normal}
    .mp-detail-actions .mp-add-cart{border:1px solid #c6ded5;background:#eaf4f0;color:#145746}
    .mp-detail-actions .mp-add-cart:hover{background:#dcefeb}
    .mp-detail-actions .mp-buy{background:#176457;color:#fff}
    .mp-detail-actions .mp-buy:hover{background:#005448}
    .mp-detail-actions .mp-card-action:disabled{opacity:.55;cursor:not-allowed}
    .mp-payment-note{display:block;margin-top:13px;color:#849188;font-size:10px;line-height:1.55;text-align:center}
    .mp-detail-close{position:absolute;top:14px;right:14px;z-index:2;display:grid;width:40px;height:40px;place-items:center;border:1px solid #e3ebe6;border-radius:50%;background:#fff;color:#46564d;font-size:21px;line-height:1;cursor:pointer;box-shadow:0 4px 14px #173d3c18;transition:background 160ms ease,transform 160ms ease}
    .mp-detail-close:hover{transform:rotate(90deg);background:#edf5f1}
    .mp-detail-close:focus-visible{outline:3px solid #087b78;outline-offset:3px}
    @media(max-width:620px){
      .mp-detail-dialog{width:min(480px,calc(100vw - 20px));max-height:calc(100dvh - 20px);border-radius:20px}
      .mp-detail-card{grid-template-columns:minmax(0,1fr);gap:14px;padding:12px}
      .mp-detail-card>img{width:100%;height:clamp(140px,24vh,205px);min-height:0;max-height:none;border-radius:15px}
      .mp-detail-copy{padding:5px 5px 10px}
      .mp-detail-copy h2{margin-top:10px;font-size:22px}
      .mp-detail-facts{gap:8px;margin:14px 0}
      .mp-detail-facts>span{padding:10px}
      .mp-detail-order{padding-block:13px}
      .mp-detail-actions{gap:9px;margin-top:14px}
      .mp-detail-actions .mp-card-action{min-height:48px}
      .mp-detail-close{top:18px;right:18px}
    }
    @media(prefers-reduced-motion:reduce){
      .mp-detail-dialog[open]::backdrop{animation:none}
      .mp-detail-close{transition:none}
    }
  `;
  document.head.append(style);
}

function formatPrice(price) {
  return `Rp${Number(price || 0).toLocaleString('id-ID')}`;
}

function injectMarketplaceStyle() {
  if (document.getElementById('marketplace-style')) return;
  const style = document.createElement('style');
  style.id = 'marketplace-style';
  style.textContent = `
    .mp-app{--mp-deep:#004847;--mp-green:#087b78;--mp-ink:#173d3c;--mp-muted:#56716f;--mp-line:#bfd4d2;min-height:100vh;background:#dce8e6;color:var(--mp-ink);font-family:Inter,Arial,sans-serif;font-size:14px}.mp-main{max-width:1304px;margin:auto;padding:47px 0 80px}
    .mp-intro{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:20px;padding:22px 26px;border:1px solid #fff;border-radius:22px;background:linear-gradient(125deg,#f2f8f6,#e9f3f0);box-shadow:0 8px 22px #123a2a0a}
    .mp-intro-copy{min-width:0;max-width:780px}
    .mp-intro h1{margin:0;color:var(--mp-deep);font-size:clamp(30px,3.4vw,42px);line-height:1.15;font-weight:650;letter-spacing:-1.6px}.mp-intro-copy>p{max-width:630px;margin:10px 0 0;color:#596d66;font-size:15px;line-height:1.7}
    .mp-product-count{display:inline-flex;align-items:center;gap:9px;flex:none;padding:10px 14px;border:1px solid #d8e8de;border-radius:13px;background:#fff;color:#45665b;font-size:12px;font-weight:600;box-shadow:0 4px 12px #123a2a0a}.mp-product-count::before{content:'';width:8px;height:8px;flex:none;border-radius:50%;background:#4d9b72}
    /* Keep the notice in document flow, with visible elevation above the page. */
    .mp-demo-banner{
      position:relative;box-sizing:border-box;width:fit-content;max-width:100%;
      margin:4px auto 30px;padding:16px 22px;
      border:1px solid #b9d1b1;border-left:4px solid #719764;border-radius:18px;
      background:linear-gradient(135deg,#ffffff,#f1f8ec);color:#46623b;
      font-size:13px;line-height:1.65;
      box-shadow:0 12px 28px #173d3c24,0 4px 8px #173d3c12,inset 0 1px 0 #ffffff;
      transform:translateY(-3px);
      transition:transform 240ms ease,box-shadow 240ms ease,border-color 240ms ease;
    }
    @media(hover:hover) and (pointer:fine){
      .mp-demo-banner:hover{
        transform:translateY(-7px);border-color:#91b486;
        box-shadow:0 20px 38px #173d3c30,0 7px 14px #173d3c17,inset 0 1px 0 #ffffff;
      }
    }
    @media(max-width:640px){.mp-demo-banner{padding:14px 16px;margin-bottom:26px;font-size:12px}}
    @media(prefers-reduced-motion:reduce){.mp-demo-banner,.mp-demo-banner:hover{transition:none;transform:none}}
    .mp-categories{display:flex;gap:14px;margin:48px 0 32px}.mp-categories button{min-width:110px;height:40px;padding:0 25px;border:0;border-radius:999px;background:#f0f1ef;color:#45504c;font:500 14px Inter,Arial,sans-serif;cursor:pointer}.mp-categories button.active{background:var(--mp-deep);color:white}.mp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}
    .mp-card{
      --mp-card-lift:-10px;--mp-arrow-shift:4px;
      position:relative;padding:20px;border-radius:28px;background:#edf6f5;
      box-shadow:0 8px 22px #123a2a12,inset 0 0 0 1px #ffffff80;
      transition:transform 280ms cubic-bezier(.2,.7,.2,1),box-shadow 280ms ease;
    }
    .mp-card .mp-card-image{transform:scale(1);transition:transform 420ms cubic-bezier(.2,.7,.2,1)}
    .mp-card .mp-card-action span{transition:transform 280ms ease}
    .mp-card:has(:focus-visible){
      transform:translateY(var(--mp-card-lift));
      box-shadow:0 24px 44px #123a2a30,0 8px 16px #123a2a18,inset 0 0 0 1px #8bbeb5;
    }
    .mp-card:has(:focus-visible) .mp-card-action span{transform:translateX(var(--mp-arrow-shift))}
    .mp-card:has(:focus-visible) .mp-card-image{transform:scale(1.035)}
    .mp-card .mp-card-action:focus-visible{outline:3px solid #087b78;outline-offset:4px}
    @media(hover:hover) and (pointer:fine){
      .mp-card:hover{
        transform:translateY(var(--mp-card-lift));
        box-shadow:0 24px 44px #123a2a30,0 8px 16px #123a2a18,inset 0 0 0 1px #8bbeb5;
      }
      .mp-card:hover .mp-card-action span{transform:translateX(var(--mp-arrow-shift))}
      .mp-card:hover .mp-card-image{transform:scale(1.035)}
    }
    @media(prefers-reduced-motion:reduce){
      .mp-card{--mp-card-lift:0px;--mp-arrow-shift:0px;transition:none}
      .mp-card .mp-card-action span,.mp-card .mp-card-image{transition:none}
      .mp-card:is(:hover,:has(:focus-visible)) .mp-card-image{transform:scale(1)}
    }
    .mp-card-image-wrap{height:192px;position:relative;overflow:hidden;border-radius:26px}.mp-card-image{width:100%;height:100%;object-fit:cover;background:#eff2ef}.mp-category-tag{position:absolute;top:12px;left:12px;padding:5px 13px;border-radius:999px;background:#ffe3a5;color:#a45316;font-size:11px;font-weight:600}.mp-category-tag.compost{background:#c7e9c9;color:#2b7533}.mp-demo-tag{position:absolute;top:12px;right:12px;padding:5px 10px;border-radius:999px;background:#ffffffdf;color:#59675d;font-size:9px;font-weight:700;letter-spacing:.08em}.mp-card-body{padding:22px 0 0}.mp-title-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.mp-title-row h2{overflow:hidden;margin:0;color:#202925;font-size:16px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.mp-title-row strong{flex:none;color:var(--mp-deep);font-size:16px;font-weight:700}.mp-meta{display:flex;align-items:center;gap:11px;margin-top:11px;color:#818b86;font-size:12px}.mp-meta span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mp-meta i{font-style:normal;color:#9ca6a1}.mp-updated{margin:20px 0 13px;color:#505c57;font-size:12px;font-weight:600}.mp-card-action{width:100%;height:43px;padding:0 20px;border:0;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:8px;background:#176457;color:#fff;font:500 13px Inter,Arial,sans-serif;cursor:pointer;transition:background .16s}.mp-card-action:hover{background:#005448}.mp-card-action span{font-size:16px}.mp-loading{grid-column:1/-1;min-height:300px;display:grid;place-items:center;color:var(--mp-muted)}.mp-empty{grid-column:1/-1;min-height:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.mp-empty-mark{width:55px;height:55px;margin-bottom:15px;border-radius:18px;display:grid;place-items:center;background:#edf5f1;color:var(--mp-deep);font-size:25px}.mp-empty h2{margin:0 0 8px;color:#163d35;font-size:19px}.mp-empty p{margin:0 0 17px;color:#74807b;font-size:14px}.mp-empty button,.mp-empty a{padding:11px 19px;border:0;border-radius:999px;background:var(--mp-deep);color:#fff;font:500 13px Inter,Arial,sans-serif;text-decoration:none;cursor:pointer}
    @media(max-width:920px){.mp-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}}
    @media(max-width:640px){.mp-main{margin:0 16px;padding:31px 0 52px}.mp-intro{grid-template-columns:minmax(0,1fr);justify-items:start;gap:12px;padding:16px 18px;border-radius:18px}.mp-intro h1{font-size:29px;letter-spacing:-.8px}.mp-intro-copy>p{font-size:14px;line-height:1.65}.mp-product-count{padding:8px 11px;font-size:11px}.mp-categories{gap:8px;margin:29px 0 21px}.mp-categories button{min-width:0;height:36px;padding:0 16px;font-size:12px}.mp-grid{grid-template-columns:1fr;gap:14px}.mp-card{padding:13px;border-radius:22px}.mp-card-image-wrap{height:200px;border-radius:18px}.mp-card-body{padding-top:15px}.mp-title-row h2,.mp-title-row strong{font-size:14px}.mp-meta{font-size:11px}.mp-updated{margin:15px 0 11px}}
  `;
  style.textContent += `.mp-search{max-width:680px;margin:28px 0 0}.mp-search-box{min-height:52px;padding:0 15px;border:1px solid #c7d9d6;border-radius:16px;display:flex;align-items:center;gap:11px;background:#f4f8f7;box-shadow:0 8px 24px #123a2a08}.mp-search-box>span{color:#4e7771;font-size:25px;line-height:1;transform:rotate(-20deg)}.mp-search-box input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#173d3c;font:400 14px Inter,Arial,sans-serif}.mp-search-box input::placeholder{color:#899894}.mp-search-box button{width:30px;height:30px;border:0;border-radius:50%;background:#e2ece9;color:#48615a;font-size:21px;line-height:1;cursor:pointer}.mp-search-box button[hidden]{display:none}.mp-categories{margin-top:24px}@media(max-width:640px){.mp-search{margin-top:20px}.mp-search-box{min-height:47px;padding:0 12px}.mp-search-box input{font-size:12px}.mp-categories{margin-top:20px}}`;
  style.textContent += `.mp-search-row{display:flex;align-items:center;gap:18px;margin:28px 0 0}.mp-search-row .mp-search{flex:1;min-width:220px;max-width:none;margin:0}.mp-search-row .mp-categories{flex:none;display:flex;flex-wrap:wrap;gap:9px;margin:0}.mp-search-row .mp-categories button{min-width:auto;padding:0 18px}@media(max-width:760px){.mp-search-row{align-items:stretch;flex-direction:column;gap:12px;margin-top:20px}.mp-search-row .mp-search{width:100%;min-width:0}.mp-search-row .mp-categories{gap:8px}.mp-search-row .mp-categories button{height:36px;padding:0 16px;font-size:12px}}`;
  style.textContent += `.mp-intro{position:relative;isolation:isolate;min-height:220px;box-sizing:border-box;overflow:hidden;grid-template-columns:minmax(0,1fr) minmax(190px,280px);gap:26px;padding:31px 36px;border:1px solid #c9ded3;border-radius:26px;background:radial-gradient(ellipse at 82% 15%,#d9eee0 0,transparent 31%),linear-gradient(115deg,#f8fbf7 0%,#edf5ef 60%,#e2f0e6 100%);box-shadow:0 16px 38px #174e3210}.mp-intro:before{position:absolute;z-index:-1;right:-70px;top:-185px;width:420px;height:420px;border:1px solid #a8cdb544;border-radius:50%;content:'';box-shadow:0 0 0 24px #a9cfad13,0 0 0 50px #a9cfad0e}.mp-intro-copy{position:relative;z-index:1;max-width:700px}.mp-intro-kicker{display:inline-flex;align-items:center;gap:8px;margin:0 0 12px;padding:6px 11px;border:1px solid #cfe1d2;border-radius:999px;background:#ffffffb8;color:#52785e;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}.mp-intro-kicker span{width:7px;height:7px;border-radius:50%;background:#5e9d68;box-shadow:0 0 0 3px #5e9d681c}.mp-intro h1{font-size:clamp(30px,3.3vw,40px);font-weight:650;letter-spacing:-1.5px}.mp-intro-copy>p:last-child{max-width:610px;margin:11px 0 0;color:#5d7064;font-size:15px;line-height:1.65}.mp-intro-visual{position:relative;z-index:1;min-height:150px;display:flex;align-items:flex-end;justify-content:flex-end}.mp-intro-orbit{position:absolute;right:19px;top:50%;width:138px;height:138px;border:1px dashed #82b48b88;border-radius:50%;display:grid;place-items:center;transform:translateY(-55%);animation:mp-orbit-breathe 7s ease-in-out infinite}.mp-intro-orbit:before,.mp-intro-orbit:after{position:absolute;border:1px solid #8dbb9555;border-radius:50%;content:''}.mp-intro-orbit:before{inset:-17px}.mp-intro-orbit:after{inset:-34px}.mp-intro-orbit span{width:62px;height:62px;border:1px solid #b7d5ba;border-radius:20px;display:grid;place-items:center;background:linear-gradient(145deg,#fff,#e0f0e1);box-shadow:0 12px 24px #2863421a;color:#37804d;font-size:35px;transform:rotate(-9deg)}.mp-product-count{position:relative;z-index:2;padding:10px 13px;border-color:#d5e5d8;background:#ffffffed;color:#466d50;box-shadow:0 7px 18px #174e3212}.mp-product-count:before{background:#55a06a;box-shadow:0 0 0 3px #55a06a20}.mp-search-row{margin-top:23px}.mp-search-row .mp-search-box{background:#fff;border-color:#d5e2dc;box-shadow:0 7px 19px #173d2c08;transition:border-color .18s,box-shadow .18s}.mp-search-row .mp-search-box:focus-within{border-color:#79a985;box-shadow:0 0 0 3px #7cad8930,0 9px 22px #173d2c0b}.mp-search-row .mp-categories button{border:1px solid transparent;transition:background .18s,color .18s,border-color .18s,transform .18s}.mp-search-row .mp-categories button:hover{transform:translateY(-1px);border-color:#c9ddd0}.mp-search-row .mp-categories button.active{background:#1d6845}.mp-grid:not([aria-busy="true"]) .mp-card{animation:mp-card-enter .48s cubic-bezier(.2,.7,.25,1) backwards}.mp-grid:not([aria-busy="true"]) .mp-card:nth-child(3n + 2){animation-delay:65ms}.mp-grid:not([aria-busy="true"]) .mp-card:nth-child(3n){animation-delay:120ms}@keyframes mp-card-enter{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes mp-orbit-breathe{0%,100%{transform:translateY(-55%) scale(1);opacity:.85}50%{transform:translateY(-55%) scale(1.035);opacity:1}}.mp-card{border:1px solid #e0ebe5;box-shadow:0 8px 23px #123a2a10,inset 0 0 0 1px #ffffff90}.mp-empty{min-height:320px;padding:30px 20px;border:1px solid #e0ebe3;border-radius:24px;background:radial-gradient(ellipse at 50% 0,#f0f7f0,transparent 65%),#fbfdfb}.mp-empty-mark{border:1px solid #d9e9db;background:#edf6ee;animation:mp-empty-drift 4s ease-in-out infinite}.mp-empty p{max-width:480px;line-height:1.65}.mp-card-action{background:#1d6845}.mp-card-action:hover{background:#14583a}@keyframes mp-empty-drift{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@media(max-width:920px){.mp-intro{grid-template-columns:minmax(0,1fr) 195px;padding:27px}.mp-intro-visual{min-height:135px}.mp-intro-orbit{right:7px;width:120px;height:120px}.mp-intro-orbit span{width:55px;height:55px}}@media(max-width:760px){.mp-intro{grid-template-columns:minmax(0,1fr);gap:5px;padding:24px 23px 17px}.mp-intro-visual{width:100%;min-height:73px;align-items:center;justify-content:flex-end}.mp-intro-orbit{right:20px;top:50%;width:72px;height:72px;transform:translateY(-50%)}.mp-intro-orbit:before{inset:-10px}.mp-intro-orbit:after{inset:-20px}.mp-intro-orbit span{width:39px;height:39px;border-radius:13px;font-size:23px}.mp-product-count{font-size:10px}.mp-search-row{margin-top:18px}}@media(max-width:640px){.mp-intro{padding:20px 18px 14px;border-radius:20px}.mp-intro h1{font-size:28px}.mp-intro-copy>p:last-child{font-size:13px}.mp-intro-kicker{font-size:8px}.mp-grid{gap:16px}.mp-card{animation-delay:0ms!important}}@media(prefers-reduced-motion:reduce){.mp-intro-orbit,.mp-empty-mark{animation:none}.mp-grid:not([aria-busy="true"]) .mp-card{animation:none}}`;
  style.textContent += `.mp-main{max-width:1440px;padding-top:34px;padding-bottom:60px}@media(max-width:640px){.mp-main{padding-top:24px;padding-bottom:42px}}`;
  document.head.appendChild(style);
}
