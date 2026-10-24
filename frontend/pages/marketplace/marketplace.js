import { getWastes } from '../../services/waste.js';
import { getCurrentUser } from '../../services/user.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast, injectToastStyle } from '../../utils/toast.js';
import { bindSharedHeader, dashboardFooter, dashboardHeader } from '../../ui/shell.js';
import { startChat } from '../../services/chat.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { skeleton } from '../../ui/skeleton.js';
import { marketplacePromoBanner, injectMarketplacePromoStyle } from './promo-banner.js';
import { icon } from '../../ui/icons.js';
import { getStores } from '../../services/store.js';
import { addMapTiles, loadLeaflet, validCoordinates } from '../../utils/location-map.js';

let marketplaceProducts = [];
let activeCategory = 'Semua';
let activeSearch = '';
let activeSort = 'newest';
let currentMarketplaceUserId = '';
let isDemoMarketplace = false;
let marketplaceLocation = null;
let marketplaceRadius = 10;
let marketplaceStores = [];
let marketplaceMap = null;
let marketplaceStoreLayer = null;
let marketplaceStoreLoadError = '';
let marketplaceMapLoading = false;
let marketplaceLocationLabel = 'Banda Aceh';

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
    image: './assets/demo-vegetables.jpg',
    createdAt: new Date().toISOString(),
    store: { name: 'Contoh Penjual' },
  },
  {
    id: 'demo-waste-compost-mix',
    isDemo: true,
    title: 'Bahan Kompos Campuran',
    description: 'Contoh bahan organik campuran yang dapat diolah menjadi kompos.',
    price: 3000,
    stock: 8,
    category: 'Kompos',
    location: 'Dago, Bandung',
    image: './assets/landing-compost-demo.jpg',
    createdAt: new Date().toISOString(),
    store: { name: 'Contoh Penjual' },
  },
  {
    id: 'demo-waste-banana-peels',
    isDemo: true,
    title: 'Kulit Pisang Siap Olah',
    description: 'Contoh kulit pisang untuk bahan organik pengolahan kompos.',
    price: 1500,
    stock: 22,
    category: 'Kompos',
    location: 'Sukajadi, Bandung',
    image: './assets/demo-banana-peels.jpg',
    createdAt: new Date().toISOString(),
    store: { name: 'Contoh Penjual' },
  },
];

export async function renderMarketplace() {
  marketplaceMap?.remove();
  marketplaceMap = null;
  marketplaceStoreLayer = null;
  marketplaceMapLoading = false;
  const revision = getNavigationRevision();
  const app = document.getElementById('app');
  activeCategory = 'Semua';
  activeSearch = '';
  activeSort = 'newest';
  currentMarketplaceUserId = '';
  marketplaceStores = [];
  marketplaceStoreLoadError = '';
  marketplaceRadius = 10;
  marketplaceLocationLabel = 'Banda Aceh';
  marketplaceLocation = getSavedMarketplaceLocation();
  app.innerHTML = `
    <div class="mp-app">
      ${dashboardHeader('market')}
      <main class="mp-main">
        ${marketplacePromoBanner()}
        <div class="mp-search-row"><div class="mp-search" role="search"><label class="mp-search-box"><span aria-hidden="true">${icon('search')}</span><input id="mp-search-input" type="search" placeholder="Cari nama produk, deskripsi, atau lokasi…" aria-label="Cari produk marketplace"><button id="mp-search-clear" type="button" aria-label="Hapus pencarian" hidden>×</button></label></div><div class="mp-categories" role="group" aria-label="Kategori produk"><button type="button" class="active" aria-pressed="true" data-category="Semua">Semua</button><button type="button" aria-pressed="false" data-category="Pakan Ternak">Pakan Ternak</button><button type="button" aria-pressed="false" data-category="Kompos">Kompos</button></div></div>

        <div class="mp-demo-banner" id="mp-demo-banner" hidden>Ini data contoh untuk pratinjau. Produk ini belum benar-benar ditawarkan dan belum bisa dipesan.</div>
        <section class="mp-results-head" aria-label="Hasil marketplace">
          <div class="mp-results-copy"><p class="mp-results-eyebrow"><span aria-hidden="true">${icon('leaf')}</span> PILIHAN YANG LEBIH BIJAK</p><div class="mp-results-title-row"><h2>Temukan bahan terbaik</h2><span class="mp-result-pill" id="mp-result-count" aria-live="polite">Memuat pilihan…</span></div><p class="mp-results-help">Bahan organik untuk kebutuhan pakan ternak dan kompos.</p></div>
          <label class="mp-sort-label" for="mp-sort"><span class="mp-sort-icon" aria-hidden="true">${icon('orders')}</span><span class="mp-sort-copy"><small>URUTKAN PRODUK</small><select id="mp-sort"><option value="newest">Terbaru</option><option value="price-low">Harga terendah</option><option value="price-high">Harga tertinggi</option></select></span></label>
        </section>
        <section class="mp-location-panel"><div><h2>Produk dan toko di sekitar</h2><p id="mp-location-status" role="status">Pilih lokasi untuk memfilter produk berdasarkan jarak.</p></div><div class="mp-location-controls"><label for="mp-radius">Jarak pencarian<select id="mp-radius"><option value="3">3 km</option><option value="5">5 km</option><option value="10" selected>10 km</option><option value="25">25 km</option><option value="0">Semua jarak</option></select></label><button type="button" class="mp-use-location" id="mp-use-location">Gunakan lokasi saya</button><button type="button" class="mp-toggle-map" id="mp-toggle-map" aria-expanded="false" aria-controls="mp-map-panel">Lihat peta toko</button></div></section>
        <section class="mp-map-panel" id="mp-map-panel" aria-label="Peta lokasi toko" hidden><div class="mp-map-heading"><h2>Lokasi toko</h2><span id="mp-map-status" role="status">Peta akan dimuat saat dibuka.</span></div><div id="mp-store-map" class="mp-store-map" role="application" aria-label="Peta toko terdekat"></div></section>
        <section class="mp-grid" id="mp-grid" aria-live="polite" aria-busy="true">${marketplaceLoadingSkeleton()}</section>
        <aside class="mp-guidance" aria-label="Mulai berkontribusi"><span class="mp-guidance-icon">${icon('leaf')}</span><div><p>JADI BAGIAN DARI SIKLUSNYA</p><h2>Punya bahan organik yang masih bisa dimanfaatkan?</h2><span>Bagikan foto, jumlah, dan lokasi agar orang yang tepat bisa menemukannya.</span></div><a href="#tambah-limbah">Buat penawaran ${icon('arrow')}</a></aside>
      </main>
      ${dashboardFooter()}
    </div>`;
  injectMarketplaceStyle();
  injectMarketplaceExperienceStyles();
  injectMarketplacePromoStyle();
  injectToastStyle();
  bindSharedHeader();
  bindMarketplaceControls();
  bindMarketplaceLocationControls();

  try {
    const [result, storesResult] = await Promise.all([
      getWastes(),
      getStores().catch((error) => ({ success: false, message: error.message })),
      loadUser(revision),
    ]);
    if (!isRouteCurrent('#marketplace', revision)) return;
    if (result.success === false) throw new Error(result.message || 'Produk belum dapat dimuat.');
    document.getElementById('mp-grid')?.removeAttribute('aria-busy');
    marketplaceProducts = Array.isArray(result.data) ? result.data : [];
    marketplaceStores = storesResult.success && Array.isArray(storesResult.data) ? storesResult.data : [];
    if (!storesResult.success) {
      marketplaceStoreLoadError = storesResult.message || 'Lokasi toko belum dapat dimuat.';
      const status = document.getElementById('mp-map-status');
      if (status) status.textContent = marketplaceStoreLoadError;
    }
    isDemoMarketplace = marketplaceProducts.length === 0;
    if (isDemoMarketplace) marketplaceProducts = demoMarketplaceProducts;
    const demoBanner = document.getElementById('mp-demo-banner');
    if (demoBanner) demoBanner.hidden = !isDemoMarketplace;
    updateMarketplaceLocationStatus();
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

  function getSavedMarketplaceLocation() {
    try {
      const savedAddress = JSON.parse(localStorage.getItem('foodilee_shipping_address') || 'null');
      if (validCoordinates(savedAddress?.latitude, savedAddress?.longitude)) {
        marketplaceLocationLabel = 'alamat tersimpan';
        return { latitude: Number(savedAddress.latitude), longitude: Number(savedAddress.longitude) };
      }
      const savedLocation = JSON.parse(localStorage.getItem('foodilee_marketplace_location') || 'null');
      if (validCoordinates(savedLocation?.latitude, savedLocation?.longitude)) {
        marketplaceLocationLabel = 'lokasi terakhir';
        return { latitude: Number(savedLocation.latitude), longitude: Number(savedLocation.longitude) };
      }
    } catch {
      marketplaceLocationLabel = 'Banda Aceh';
    }
    return { latitude: 5.5483, longitude: 95.3238 };
  }

  function distanceInKm(first, second) {
    const radians = (degrees) => degrees * Math.PI / 180;
    const latitudeDelta = radians(second.latitude - first.latitude);
    const longitudeDelta = radians(second.longitude - first.longitude);
    const value = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude))
      * Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  function bindMarketplaceLocationControls() {
    document.getElementById('mp-toggle-map')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      const panel = document.getElementById('mp-map-panel');
      if (!panel) return;
      const shouldOpen = panel.hidden;
      panel.hidden = !shouldOpen;
      button.setAttribute('aria-expanded', String(shouldOpen));
      button.textContent = shouldOpen ? 'Sembunyikan peta' : 'Lihat peta toko';
      if (!shouldOpen) return;
      if (marketplaceMap) {
        requestAnimationFrame(() => marketplaceMap?.invalidateSize());
        return;
      }
      if (marketplaceMapLoading) return;
      marketplaceMapLoading = true;
      try {
        await mountMarketplaceMap(getNavigationRevision());
      } finally {
        marketplaceMapLoading = false;
      }
    });
    document.getElementById('mp-radius')?.addEventListener('change', (event) => {
      marketplaceRadius = Number(event.currentTarget.value);
      updateMarketplaceLocationStatus();
      refreshMarketplaceMap();
      renderProducts();
    });
    document.getElementById('mp-use-location')?.addEventListener('click', () => {
      const status = document.getElementById('mp-location-status');
      if (!navigator.geolocation) {
        status.textContent = 'Perangkat ini tidak mendukung lokasi otomatis. Peta tetap dapat dijelajahi.';
        return;
      }
      status.textContent = 'Mencari lokasi perangkat…';
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          marketplaceLocation = { latitude: coords.latitude, longitude: coords.longitude };
          marketplaceLocationLabel = 'lokasi Anda';
          localStorage.setItem('foodilee_marketplace_location', JSON.stringify(marketplaceLocation));
          updateMarketplaceLocationStatus();
          refreshMarketplaceMap();
          renderProducts();
        },
        () => {
          status.textContent = 'Lokasi tidak tersedia. Izinkan akses lokasi atau pilih Semua jarak.';
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      );
    });
  }

  function updateMarketplaceLocationStatus() {
    const status = document.getElementById('mp-location-status');
    if (!status) return;
    status.textContent = marketplaceRadius
      ? `Menampilkan produk dalam radius ${marketplaceRadius} km dari ${marketplaceLocationLabel}.`
      : 'Menampilkan produk dari semua lokasi.';
  }

  async function mountMarketplaceMap(revision) {
    const status = document.getElementById('mp-map-status');
    try {
      const leaflet = await loadLeaflet();
      if (!isRouteCurrent('#marketplace', revision)) return;
      const element = document.getElementById('mp-store-map');
      if (!element) return;
      marketplaceMap = leaflet.map(element);
      addMapTiles(leaflet, marketplaceMap);
      marketplaceStoreLayer = leaflet.layerGroup().addTo(marketplaceMap);
      refreshMarketplaceMap();
      requestAnimationFrame(() => marketplaceMap?.invalidateSize());
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  }

  function refreshMarketplaceMap() {
    if (!marketplaceMap || !marketplaceStoreLayer) return;
    const visibleStores = marketplaceStores.filter((store) =>
      validCoordinates(store.latitude, store.longitude)
      && (!marketplaceLocation || !marketplaceRadius
        || distanceInKm(marketplaceLocation, store) <= marketplaceRadius),
    );
    marketplaceStoreLayer.clearLayers();
    const leaflet = window.L;
    const points = [];
    for (const store of visibleStores) {
      const point = [Number(store.latitude), Number(store.longitude)];
      points.push(point);
      const distance = marketplaceLocation
        ? `<br><small>${distanceInKm(marketplaceLocation, store).toFixed(1)} km dari lokasi Anda</small>`
        : '';
      leaflet.circleMarker(point, {
        radius: 8,
        color: '#fff',
        weight: 2,
        fillColor: '#235347',
        fillOpacity: 1,
      })
        .bindPopup(`<strong>${escapeHtml(store.name || 'Toko Food Ilee')}</strong><br>${escapeHtml(store.location || 'Lokasi toko')}${distance}`)
        .addTo(marketplaceStoreLayer);
    }
    if (marketplaceLocation) {
      const point = [marketplaceLocation.latitude, marketplaceLocation.longitude];
      points.push(point);
      leaflet.circleMarker(point, {
        radius: 7,
        color: '#fff',
        weight: 2,
        fillColor: '#3879cc',
        fillOpacity: 1,
      }).bindPopup(`Pusat pencarian: ${escapeHtml(marketplaceLocationLabel)}`).addTo(marketplaceStoreLayer);
    }
    if (points.length > 1) marketplaceMap.fitBounds(points, { padding: [24, 24], maxZoom: 15 });
    else if (points.length === 1) marketplaceMap.setView(points[0], 14);
    else marketplaceMap.setView([5.5483, 95.3238], 14);
    const status = document.getElementById('mp-map-status');
    if (status) status.textContent = marketplaceStoreLoadError || `${visibleStores.length} toko ditampilkan pada peta.`;
  }

function marketplaceLoadingSkeleton() {
  return Array.from({ length: 6 }, () => `<article class="mp-card" aria-hidden="true"><div class="mp-card-image-wrap">${skeleton('100%', '205px')}</div><div class="mp-card-body">${skeleton('75px', '18px', 'pill')}<div style="height:12px"></div>${skeleton('70%', '18px')}<div style="height:12px"></div>${skeleton('80%', '11px')}<div style="height:14px"></div>${skeleton('100%', '39px', 'pill')}</div></article>`).join('');
}

function bindMarketplaceControls() {
  const searchInput = document.getElementById('mp-search-input');
  const clearSearch = document.getElementById('mp-search-clear');
  document.getElementById('mp-sort')?.addEventListener('change', (event) => {
    activeSort = event.currentTarget.value;
    renderProducts();
  });
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

function storeForProduct(product) {
  return product.store
    || marketplaceStores.find((store) => store.ownerId === product.seller?.id)
    || null;
}

function sellerDisplayName(product) {
  return storeForProduct(product)?.name || 'Toko Food Ilee';
}

function renderProducts() {
  const grid = document.getElementById('mp-grid');
  if (!grid) return;
  const nearbyProducts = marketplaceLocation && marketplaceRadius
    ? marketplaceProducts.filter((product) => {
        const store = storeForProduct(product);
        return validCoordinates(store?.latitude, store?.longitude)
          && distanceInKm(marketplaceLocation, store) <= marketplaceRadius;
      })
    : marketplaceProducts;
  const categoryProducts =
    activeCategory === 'Semua'
      ? nearbyProducts
      : nearbyProducts.filter((product) => categoryFor(product) === activeCategory);
  const products = (activeSearch
    ? categoryProducts.filter((product) =>
        [product.title, product.description, product.location, storeForProduct(product)?.name, product.category]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('id-ID')
          .includes(activeSearch),
      )
    : categoryProducts).slice();
  products.sort((first, second) => {
    if (activeSort === 'price-low') return Number(first.price || 0) - Number(second.price || 0);
    if (activeSort === 'price-high') return Number(second.price || 0) - Number(first.price || 0);
    return new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime();
  });
  const productCount = document.getElementById('mp-product-count');
  if (productCount) {
    productCount.textContent = `${products.length} produk tersedia`;
  }
  const resultCount = document.getElementById('mp-result-count');
  if (resultCount) resultCount.textContent = `${products.length} pilihan tersedia`;
  if (!products.length) {
    const hasFilters = activeCategory !== 'Semua' || activeSearch || Boolean(marketplaceLocation && marketplaceRadius);
    const noNearbyProducts = Boolean(marketplaceLocation && marketplaceRadius && !nearbyProducts.length);
    grid.innerHTML = `<div class="mp-empty"><div class="mp-empty-mark">${icon('leaf')}</div><h2>${noNearbyProducts ? 'Belum ada produk di sekitar' : hasFilters ? 'Produk tidak ditemukan' : marketplaceProducts.length ? 'Belum ada produk di kategori ini' : 'Belum ada produk tersedia'}</h2><p>${noNearbyProducts ? 'Perluas jarak pencarian atau pilih semua lokasi untuk melihat produk lainnya.' : hasFilters ? 'Coba kata kunci lain atau ubah kategori pencarian.' : marketplaceProducts.length ? 'Pilih kategori lain untuk menjelajahi produk.' : 'Produk limbah pangan yang tersedia akan muncul di sini.'}</p>${!hasFilters && !marketplaceProducts.length ? '<a href="#tambah-limbah">Mulai tambahkan limbah <span>→</span></a>' : ''}</div>`;
    if (hasFilters) {
      const resetButton = document.createElement('button');
      resetButton.type = 'button';
      resetButton.textContent = 'Hapus filter dan lihat semua';
      resetButton.addEventListener('click', () => {
        activeSearch = '';
        marketplaceRadius = 0;
        const radiusSelect = document.getElementById('mp-radius');
        if (radiusSelect) radiusSelect.value = '0';
        const searchInput = document.getElementById('mp-search-input');
        if (searchInput) searchInput.value = '';
        const clearSearch = document.getElementById('mp-search-clear');
        if (clearSearch) clearSearch.hidden = true;
        document.querySelector('.mp-categories [data-category="Semua"]')?.click();
        updateMarketplaceLocationStatus();
        refreshMarketplaceMap();
      });
      grid.querySelector('.mp-empty')?.append(resetButton);
    }
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
      const store = storeForProduct(product);
      const distance = marketplaceLocation && validCoordinates(store?.latitude, store?.longitude)
        ? `${distanceInKm(marketplaceLocation, store).toFixed(1)} km`
        : '';
      return `<article class="mp-card"><div class="mp-card-image-wrap"><img class="mp-card-image" src="${escapeHtml(product.image || './assets/landing-food-demo.jpg')}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.onerror=null;this.src='./assets/landing-food-demo.jpg'"><span class="mp-category-tag ${category === 'Kompos' ? 'compost' : ''}">${category}</span>${product.isDemo ? '<span class="mp-demo-tag">CONTOH</span>' : ''}</div><div class="mp-card-body"><div class="mp-title-row"><h2>${escapeHtml(product.title || 'Limbah Organik')}</h2><strong>${formatPrice(product.price)}</strong></div><div class="mp-meta"><span>${icon('box')} ${Number(product.stock || 0).toLocaleString('id-ID')} kg</span><i>&#8226;</i><span>${icon('pin')} ${distance ? `${escapeHtml(distance)} · ` : ''}${escapeHtml(product.location || seller)}</span></div><p class="mp-updated">${relativeAge}</p><button class="mp-card-action" type="button" data-product-id="${escapeHtml(product.id)}">Lihat Detail <span>&rarr;</span></button></div></article>`;
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
      color:#163832;box-shadow:0 25px 90px #091b1460;
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
    .mp-chat{margin:0 0 14px;background:#eef7f5;color:#163832;border:1px solid #c8e0dc}
    .mp-chat:hover{background:#dcefeb}
    .mp-chat:disabled{opacity:.55;cursor:not-allowed}
    .mp-detail-order{padding:15px 0;border-top:1px solid #e7eeea}
    .mp-detail-order>label{display:block;margin-bottom:9px;color:#375748;font-size:12px;font-weight:650}
    .mp-detail-order .mp-quantity-row{display:flex;align-items:center;flex-wrap:wrap;gap:11px}
    .mp-quantity-stepper{display:inline-flex;align-items:center;gap:7px;padding:4px;border:1px solid #dce9e1;border-radius:12px;background:#fff}
    .mp-quantity-step{display:grid;width:34px;height:34px;flex:none;place-items:center;padding:0;border:1px solid #dce7e0;border-radius:9px;background:#fff;color:#145746;font:500 19px/1 Inter,Arial,sans-serif;cursor:pointer;transition:background 150ms ease,border-color 150ms ease}
    .mp-quantity-step:hover:not(:disabled){border-color:#a8c8b6;background:#edf6f0}
    .mp-quantity-step:focus-visible{outline:3px solid #23534740;outline-offset:2px}
    .mp-quantity-step:disabled{opacity:.42;cursor:not-allowed}
    .mp-quantity-stepper input{box-sizing:border-box;width:48px;height:34px;padding:0 2px;border:0;border-radius:6px;background:transparent;color:#163832;font:500 14px Inter,Arial,sans-serif;text-align:center;appearance:textfield;-moz-appearance:textfield}
    .mp-quantity-stepper input::-webkit-inner-spin-button,.mp-quantity-stepper input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
    .mp-quantity-stepper input:focus-visible{outline:2px solid #23534740;outline-offset:1px}
    .mp-detail-order .mp-quantity-row>span{color:#74847b;font-size:11px}
    .mp-detail-total{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:6px 0 2px;color:#69756f;font-size:12px}
    .mp-detail-total strong{color:#145746;font-size:20px}
    .mp-detail-actions{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;margin-top:16px}
    .mp-detail-actions .mp-card-action{box-sizing:border-box;width:100%;min-width:0;min-height:46px;height:auto;margin:0;padding:12px 16px;line-height:1.4;white-space:normal}
    .mp-detail-actions .mp-add-cart{border:1px solid #c6ded5;background:#eaf4f0;color:#145746}
    .mp-detail-actions .mp-add-cart:hover{background:#dcefeb}
    .mp-detail-actions .mp-buy{background:#235347;color:#fff}
    .mp-detail-actions .mp-buy:hover{background:#163832}
    .mp-detail-actions .mp-card-action:disabled{opacity:.55;cursor:not-allowed}
    .mp-payment-note{display:block;margin-top:13px;color:#849188;font-size:10px;line-height:1.55;text-align:center}
    .mp-detail-close{position:absolute;top:14px;right:14px;z-index:2;display:grid;width:40px;height:40px;place-items:center;border:1px solid #e3ebe6;border-radius:50%;background:#fff;color:#46564d;font-size:21px;line-height:1;cursor:pointer;box-shadow:0 4px 14px #16383218;transition:background 160ms ease,transform 160ms ease}
    .mp-detail-close:hover{transform:rotate(90deg);background:#edf5f1}
    .mp-detail-close:focus-visible{outline:3px solid #235347;outline-offset:3px}
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
    .mp-app{--mp-deep:#0B2B26;--mp-green:#235347;--mp-ink:#163832;--mp-muted:#56716f;--mp-line:#bfd4d2;min-height:100vh;background:#DAF1DE;color:var(--mp-ink);font-family:Inter,Arial,sans-serif;font-size:14px}.mp-main{max-width:1304px;margin:auto;padding:47px 0 80px}
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
      box-shadow:0 12px 28px #16383224,0 4px 8px #16383212,inset 0 1px 0 #ffffff;
      transform:translateY(-3px);
      transition:transform 240ms ease,box-shadow 240ms ease,border-color 240ms ease;
    }
    @media(hover:hover) and (pointer:fine){
      .mp-demo-banner:hover{
        transform:translateY(-7px);border-color:#91b486;
        box-shadow:0 20px 38px #16383230,0 7px 14px #16383217,inset 0 1px 0 #ffffff;
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
    .mp-card .mp-card-action:focus-visible{outline:3px solid #235347;outline-offset:4px}
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
    .mp-card-image-wrap{height:192px;position:relative;overflow:hidden;border-radius:26px}.mp-card-image{width:100%;height:100%;object-fit:cover;background:#eff2ef}.mp-category-tag{position:absolute;top:12px;left:12px;padding:5px 13px;border-radius:999px;background:#ffe3a5;color:#a45316;font-size:11px;font-weight:600}.mp-category-tag.compost{background:#c7e9c9;color:#2b7533}.mp-demo-tag{position:absolute;top:12px;right:12px;padding:5px 10px;border-radius:999px;background:#ffffffdf;color:#59675d;font-size:9px;font-weight:700;letter-spacing:.08em}.mp-card-body{padding:22px 0 0}.mp-title-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.mp-title-row h2{overflow:hidden;margin:0;color:#202925;font-size:16px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.mp-title-row strong{flex:none;color:var(--mp-deep);font-size:16px;font-weight:700}.mp-meta{display:flex;align-items:center;gap:11px;margin-top:11px;color:#818b86;font-size:12px}.mp-meta span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mp-meta i{font-style:normal;color:#9ca6a1}.mp-updated{margin:20px 0 13px;color:#505c57;font-size:12px;font-weight:600}.mp-card-action{width:100%;height:43px;padding:0 20px;border:0;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:8px;background:#235347;color:#fff;font:500 13px Inter,Arial,sans-serif;cursor:pointer;transition:background .16s}.mp-card-action:hover{background:#163832}.mp-card-action span{font-size:16px}.mp-loading{grid-column:1/-1;min-height:300px;display:grid;place-items:center;color:var(--mp-muted)}.mp-empty{grid-column:1/-1;min-height:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.mp-empty-mark{width:55px;height:55px;margin-bottom:15px;border-radius:18px;display:grid;place-items:center;background:#edf5f1;color:var(--mp-deep);font-size:25px}.mp-empty h2{margin:0 0 8px;color:#163d35;font-size:19px}.mp-empty p{margin:0 0 17px;color:#74807b;font-size:14px}.mp-empty button,.mp-empty a{padding:11px 19px;border:0;border-radius:999px;background:var(--mp-deep);color:#fff;font:500 13px Inter,Arial,sans-serif;text-decoration:none;cursor:pointer}
    @media(max-width:920px){.mp-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}}
    @media(max-width:640px){.mp-main{margin:0 16px;padding:31px 0 52px}.mp-intro{grid-template-columns:minmax(0,1fr);justify-items:start;gap:12px;padding:16px 18px;border-radius:18px}.mp-intro h1{font-size:29px;letter-spacing:-.8px}.mp-intro-copy>p{font-size:14px;line-height:1.65}.mp-product-count{padding:8px 11px;font-size:11px}.mp-categories{gap:8px;margin:29px 0 21px}.mp-categories button{min-width:0;height:36px;padding:0 16px;font-size:12px}.mp-grid{grid-template-columns:1fr;gap:14px}.mp-card{padding:13px;border-radius:22px}.mp-card-image-wrap{height:200px;border-radius:18px}.mp-card-body{padding-top:15px}.mp-title-row h2,.mp-title-row strong{font-size:14px}.mp-meta{font-size:11px}.mp-updated{margin:15px 0 11px}}
  `;
  style.textContent += `.mp-search{max-width:680px;margin:28px 0 0}.mp-search-box{min-height:52px;padding:0 15px;border:1px solid #c7d9d6;border-radius:16px;display:flex;align-items:center;gap:11px;background:#f4f8f7;box-shadow:0 8px 24px #123a2a08}.mp-search-box>span{width:20px;height:20px;flex:none;display:grid;place-items:center;color:#4e7771}.mp-search-box>span svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}.mp-search-box input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#163832;font:400 14px Inter,Arial,sans-serif}.mp-search-box input::placeholder{color:#899894}.mp-search-box button{width:30px;height:30px;border:0;border-radius:50%;background:#e2ece9;color:#48615a;font-size:21px;line-height:1;cursor:pointer}.mp-search-box button[hidden]{display:none}.mp-categories{margin-top:24px}@media(max-width:640px){.mp-search{margin-top:20px}.mp-search-box{min-height:47px;padding:0 12px}.mp-search-box input{font-size:12px}.mp-categories{margin-top:20px}}`;
  style.textContent += `.mp-search-row{display:flex;align-items:center;gap:18px;margin:28px 0 0}.mp-search-row .mp-search{flex:1;min-width:220px;max-width:none;margin:0}.mp-search-row .mp-categories{flex:none;display:flex;flex-wrap:wrap;gap:9px;margin:0}.mp-search-row .mp-categories button{min-width:auto;padding:0 18px}@media(max-width:760px){.mp-search-row{align-items:stretch;flex-direction:column;gap:12px;margin-top:20px}.mp-search-row .mp-search{width:100%;min-width:0}.mp-search-row .mp-categories{gap:8px}.mp-search-row .mp-categories button{height:36px;padding:0 16px;font-size:12px}}`;
  style.textContent += `.mp-intro{position:relative;isolation:isolate;min-height:220px;box-sizing:border-box;overflow:hidden;grid-template-columns:minmax(0,1fr) minmax(190px,280px);gap:26px;padding:31px 36px;border:1px solid #c9ded3;border-radius:26px;background:radial-gradient(ellipse at 82% 15%,#d9eee0 0,transparent 31%),linear-gradient(115deg,#f8fbf7 0%,#edf5ef 60%,#e2f0e6 100%);box-shadow:0 16px 38px #174e3210}.mp-intro:before{position:absolute;z-index:-1;right:-70px;top:-185px;width:420px;height:420px;border:1px solid #a8cdb544;border-radius:50%;content:'';box-shadow:0 0 0 24px #a9cfad13,0 0 0 50px #a9cfad0e}.mp-intro-copy{position:relative;z-index:1;max-width:700px}.mp-intro-kicker{position:relative;display:inline-flex;align-items:center;gap:9px;margin:0 0 14px;padding:7px 10px 7px 8px;border:1px solid #c9dfce;border-radius:999px;background:linear-gradient(110deg,#ffffffed,#f4faf4e8);color:#416b4c;font-size:10px;font-weight:700;letter-spacing:.045em;box-shadow:0 4px 12px #235e3510;transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}.mp-intro-kicker-icon{width:23px;height:23px;flex:none;display:grid;place-items:center;border:1px solid #d4e8d6;border-radius:50%;background:#eaf5e9;color:#39804c;transition:transform .25s ease,background .25s ease}.mp-intro-kicker-icon svg{width:14px;height:14px;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.mp-intro-kicker-copy{white-space:nowrap}.mp-intro-kicker-tag{margin-left:2px;padding:4px 7px;border-radius:999px;background:#e7f2e6;color:#57815d;font-size:8px;font-weight:700;letter-spacing:.04em;white-space:nowrap;transition:background .2s ease,color .2s ease}.mp-intro h1{font-size:clamp(30px,3.3vw,40px);font-weight:650;letter-spacing:-1.5px}.mp-intro-copy>p:last-child{max-width:610px;margin:11px 0 0;color:#5d7064;font-size:15px;line-height:1.65}.mp-intro-visual{position:relative;z-index:1;min-height:150px;display:flex;align-items:flex-end;justify-content:flex-end}.mp-intro-orbit{position:absolute;right:19px;top:50%;width:138px;height:138px;border:1px dashed #82b48b88;border-radius:50%;display:grid;place-items:center;transform:translateY(-55%);animation:mp-orbit-breathe 7s ease-in-out infinite}.mp-intro-orbit:before,.mp-intro-orbit:after{position:absolute;border:1px solid #8dbb9555;border-radius:50%;content:''}.mp-intro-orbit:before{inset:-17px}.mp-intro-orbit:after{inset:-34px}.mp-intro-orbit span{width:62px;height:62px;border:1px solid #b7d5ba;border-radius:20px;display:grid;place-items:center;background:linear-gradient(145deg,#fff,#e0f0e1);box-shadow:0 12px 24px #2863421a;color:#37804d;font-size:35px;transform:rotate(-9deg)}.mp-product-count{position:relative;z-index:2;padding:10px 13px;border-color:#d5e5d8;background:#ffffffed;color:#466d50;box-shadow:0 7px 18px #174e3212}.mp-product-count:before{background:#55a06a;box-shadow:0 0 0 3px #55a06a20}.mp-search-row{margin-top:23px}.mp-search-row .mp-search-box{background:#fff;border-color:#d5e2dc;box-shadow:0 7px 19px #0B2B2608;transition:border-color .18s,box-shadow .18s}.mp-search-row .mp-search-box:focus-within{border-color:#79a985;box-shadow:0 0 0 3px #7cad8930,0 9px 22px #0B2B260b}.mp-search-row .mp-categories button{border:1px solid transparent;transition:background .18s,color .18s,border-color .18s,transform .18s}.mp-search-row .mp-categories button:hover{transform:translateY(-1px);border-color:#c9ddd0}.mp-search-row .mp-categories button.active{background:#1d6845}.mp-grid:not([aria-busy="true"]) .mp-card{animation:mp-card-enter .48s cubic-bezier(.2,.7,.25,1) backwards}.mp-grid:not([aria-busy="true"]) .mp-card:nth-child(3n + 2){animation-delay:65ms}.mp-grid:not([aria-busy="true"]) .mp-card:nth-child(3n){animation-delay:120ms}@keyframes mp-card-enter{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes mp-orbit-breathe{0%,100%{transform:translateY(-55%) scale(1);opacity:.85}50%{transform:translateY(-55%) scale(1.035);opacity:1}}.mp-card{border:1px solid #e0ebe5;box-shadow:0 8px 23px #123a2a10,inset 0 0 0 1px #ffffff90}.mp-empty{min-height:320px;padding:30px 20px;border:1px solid #e0ebe3;border-radius:24px;background:radial-gradient(ellipse at 50% 0,#f0f7f0,transparent 65%),#fbfdfb}.mp-empty-mark{border:1px solid #d9e9db;background:#edf6ee;animation:mp-empty-drift 4s ease-in-out infinite}.mp-empty p{max-width:480px;line-height:1.65}.mp-card-action{background:#1d6845}.mp-card-action:hover{background:#14583a}@keyframes mp-empty-drift{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@media(max-width:920px){.mp-intro{grid-template-columns:minmax(0,1fr) 195px;padding:27px}.mp-intro-visual{min-height:135px}.mp-intro-orbit{right:7px;width:120px;height:120px}.mp-intro-orbit span{width:55px;height:55px}}@media(max-width:760px){.mp-intro{grid-template-columns:minmax(0,1fr);gap:5px;padding:24px 23px 17px}.mp-intro-visual{width:100%;min-height:73px;align-items:center;justify-content:flex-end}.mp-intro-orbit{right:20px;top:50%;width:72px;height:72px;transform:translateY(-50%)}.mp-intro-orbit:before{inset:-10px}.mp-intro-orbit:after{inset:-20px}.mp-intro-orbit span{width:39px;height:39px;border-radius:13px;font-size:23px}.mp-product-count{font-size:10px}.mp-search-row{margin-top:18px}}@media(hover:hover) and (pointer:fine){.mp-intro-kicker:hover{transform:translateY(-1px);border-color:#a9cdb0;box-shadow:0 7px 16px #235e3518}.mp-intro-kicker:hover .mp-intro-kicker-icon{transform:rotate(-10deg) scale(1.06);background:#e0f0df}.mp-intro-kicker:hover .mp-intro-kicker-tag{background:#d9ebd8;color:#386b45}}@media(max-width:640px){.mp-intro{padding:20px 18px 14px;border-radius:20px}.mp-intro h1{font-size:28px}.mp-intro-copy>p:last-child{font-size:13px}.mp-intro-kicker{gap:7px;font-size:9px;padding:6px 8px 6px 6px}.mp-intro-kicker-tag{font-size:7px;padding:4px 6px}.mp-grid{gap:16px}.mp-card{animation-delay:0ms!important}}@media(prefers-reduced-motion:reduce){.mp-intro-orbit,.mp-empty-mark{animation:none}.mp-grid:not([aria-busy="true"]) .mp-card{animation:none}}`;
  style.textContent += `.mp-main{max-width:1480px;box-sizing:border-box;padding-left:clamp(18px,3vw,42px);padding-right:clamp(18px,3vw,42px);padding-top:34px;padding-bottom:60px}@media(min-width:1360px){.mp-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:18px}.mp-card{padding:14px;border-radius:22px}.mp-card-image-wrap{height:154px;border-radius:17px}.mp-card-body{padding-top:15px}.mp-title-row{gap:8px}.mp-title-row h2,.mp-title-row strong{font-size:14px}.mp-meta{gap:7px;font-size:11px}.mp-updated{margin:15px 0 11px;font-size:11px}.mp-card-action{height:39px;padding:0 12px;font-size:12px}}@media(min-width:1100px) and (max-width:1359px){.mp-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}}@media(min-width:761px) and (max-width:1099px){.mp-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}}@media(max-width:760px){.mp-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.mp-card{padding:13px;border-radius:20px}.mp-card-image-wrap{height:145px;border-radius:16px}.mp-card-body{padding-top:13px}.mp-title-row{gap:7px}.mp-title-row h2,.mp-title-row strong{font-size:13px}.mp-meta{gap:7px;font-size:10px}.mp-updated{margin:14px 0 10px;font-size:11px}.mp-card-action{height:39px;padding:0 10px;font-size:12px}}@media(max-width:640px){.mp-main{padding-left:0;padding-right:0;padding-top:24px;padding-bottom:42px}.mp-grid{grid-template-columns:1fr;gap:14px}.mp-card{padding:13px;border-radius:22px}.mp-card-image-wrap{height:200px;border-radius:18px}.mp-card-body{padding-top:15px}.mp-title-row h2,.mp-title-row strong{font-size:14px}.mp-meta{font-size:11px}.mp-updated{margin:15px 0 11px}}`;
  style.textContent += `.mp-search-box input[type="search"]::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none;display:none}`;
  document.head.appendChild(style);
}

function injectMarketplaceExperienceStyles() {
  if (document.getElementById('marketplace-experience-style')) return;
  const style = document.createElement('style');
  style.id = 'marketplace-experience-style';
  style.textContent = `
    .mp-app{--mp-deep:#0B2B26;--mp-green:#235347;--mp-ink:#20352a;--mp-muted:#708075;--mp-line:#e2e8dc;background:#f7f7f0;color:var(--mp-ink)}
    .mp-main{max-width:1360px;padding-top:34px;padding-bottom:76px}
    .mp-intro{min-height:236px;padding:34px 40px;border:0;border-radius:28px;background:radial-gradient(ellipse at 86% 18%,#44754c 0,transparent 34%),linear-gradient(115deg,#123a29 0%,#1c5035 58%,#285f3c 100%);box-shadow:0 18px 40px #183b291f}
    .mp-intro h1{max-width:650px;color:#fff;font-size:clamp(34px,4vw,48px);letter-spacing:-1.8px}
    .mp-intro-copy>p:last-child{max-width:560px;color:#d5e5d5;font-size:15px}
    .mp-intro-kicker{border-color:#d6e8d544;background:#ffffff12;color:#DAF1DE;box-shadow:none}
    .mp-intro-kicker-icon{border-color:#ffffff24;background:#ffffff18;color:#b9e1bd}
    .mp-intro-kicker-tag{background:#ffffff18;color:#DAF1DE}
    .mp-intro-orbit{border-color:#c5e7bb55}
    .mp-intro-orbit:before,.mp-intro-orbit:after{border-color:#c5e7bb30}
    .mp-intro-orbit span{border-color:#eff8e588;background:linear-gradient(145deg,#f2fae8,#d7ebc5);color:#245a35;box-shadow:0 12px 24px #081e1255}
    .mp-product-count{border-color:#e9f2e2;background:#f7f9f0;color:#315a3a}
    .mp-search-row{align-items:center;gap:22px;margin-top:25px}
    .mp-search-row .mp-search-box{min-height:56px;border-color:#e2e6db;border-radius:15px;background:#fff;box-shadow:0 5px 18px #28412c0b}
    .mp-search-row .mp-search-box:focus-within{border-color:#80a66e;box-shadow:0 0 0 3px #80a66e28}
    .mp-search-row .mp-categories button{height:42px;border-color:#e4e8dd;background:#fff;color:#526457}
    .mp-search-row .mp-categories button.active{border-color:#0B2B26;background:#0B2B26;color:#fff}
    .mp-results-head{display:flex;align-items:end;justify-content:space-between;gap:24px;margin:43px 0 19px}
    .mp-results-eyebrow{margin:0 0 8px;color:#6f9064;font-size:10px;font-weight:750;letter-spacing:.14em}
    .mp-results-head h2{margin:0;color:#1b3828;font-size:25px;font-weight:650;letter-spacing:-.7px}
    #mp-result-count{margin:6px 0 0;color:#7b877d;font-size:12px}
    .mp-sort-label{display:flex;align-items:center;gap:10px;color:#68796b;font-size:12px;font-weight:600}
    .mp-sort-label select{min-width:164px;height:42px;padding:0 34px 0 13px;border:1px solid #e0e6db;border-radius:12px;background:#fff;color:#263d2d;font:500 12px Inter,Arial,sans-serif}
    .mp-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:19px}
    .mp-card{padding:12px;border:1px solid #e8ebe2;border-radius:21px;background:#fff;box-shadow:0 6px 19px #283c2d0a}
    .mp-card-image-wrap{height:auto;aspect-ratio:1.48;border-radius:15px;background:#edf1e8}
    .mp-card-body{padding:15px 3px 3px}
    .mp-title-row{align-items:flex-start;gap:10px}
    .mp-title-row h2{color:#24382a;font-size:14px;line-height:1.45;white-space:normal}
    .mp-title-row strong{color:#1d5a37;font-size:14px;white-space:nowrap}
    .mp-meta{gap:8px;margin-top:9px;color:#748176;font-size:11px}
    .mp-updated{margin:13px 0 12px;color:#869087;font-size:10px;font-weight:500}
    .mp-category-tag{background:#f3edcf;color:#786322}
    .mp-category-tag.compost{background:#e2f0d8;color:#397342}
    .mp-card-action{height:42px;border-radius:12px;background:#1d5a37;font-weight:600}
    .mp-card-action:hover{background:#17482e}
    .mp-demo-banner{margin:12px auto 0}
    .mp-empty{border:1px solid #e7ebdf;border-radius:22px;background:#fff}
    @media(max-width:1080px){.mp-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}}
    @media(max-width:760px){.mp-main{padding-top:24px}.mp-intro{min-height:0;padding:26px 24px 18px;border-radius:23px}.mp-intro h1{font-size:34px}.mp-intro-copy>p:last-child{font-size:13px}.mp-search-row{gap:13px}.mp-results-head{align-items:flex-start;margin:33px 0 15px}.mp-results-head h2{font-size:21px}.mp-sort-label{gap:6px}.mp-sort-label select{min-width:130px;height:40px;padding-left:10px}.mp-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mp-card{padding:9px;border-radius:17px}.mp-card-image-wrap{border-radius:12px}.mp-card-body{padding:12px 2px 2px}.mp-title-row{flex-direction:column;gap:2px}.mp-title-row h2,.mp-title-row strong{font-size:12px}.mp-meta{flex-wrap:wrap;font-size:10px}.mp-updated{margin:10px 0;font-size:9px}.mp-card-action{height:39px;font-size:11px}}
    @media(max-width:480px){.mp-main{margin:0 14px}.mp-intro{padding:22px 18px 16px}.mp-intro h1{font-size:29px;letter-spacing:-1px}.mp-intro-kicker-copy{white-space:normal}.mp-intro-kicker-tag{display:none}.mp-results-head{flex-direction:column;align-items:stretch;gap:13px}.mp-sort-label{justify-content:space-between}.mp-sort-label select{flex:1}.mp-grid{grid-template-columns:1fr;gap:13px}.mp-card{padding:12px;border-radius:19px}.mp-card-image-wrap{aspect-ratio:1.8}.mp-title-row{flex-direction:row;align-items:baseline}.mp-title-row h2,.mp-title-row strong{font-size:14px}.mp-meta{font-size:11px}.mp-updated{font-size:10px}}
    @media(prefers-reduced-motion:reduce){.mp-card,.mp-intro-orbit{animation:none!important;transition:none!important}}
  `;
  style.textContent += `
    .mp-app .mp-results-head{position:relative;isolation:isolate;box-sizing:border-box;min-height:128px;align-items:center;gap:24px;margin:34px 0 20px;padding:20px 23px;border:1px solid #cfe0d2;border-radius:22px;overflow:hidden;background:radial-gradient(ellipse at 82% 0,#dcefe0 0,transparent 42%),linear-gradient(115deg,#f8fbf7,#edf5ed 62%,#f7faf5);box-shadow:0 9px 25px #1638320b}
    .mp-app .mp-results-head:after{position:absolute;z-index:-1;right:-52px;top:-102px;width:210px;height:210px;border:1px solid #a9cdaa45;border-radius:50%;box-shadow:0 0 0 18px #a9cdaa12,0 0 0 37px #a9cdaa0a;content:'';pointer-events:none}
    .mp-app .mp-results-copy{position:relative;z-index:1;min-width:0}
    .mp-app .mp-results-eyebrow{display:flex;align-items:center;gap:8px;margin:0 0 8px;color:#477a53;font-size:9px;font-weight:800;letter-spacing:.13em}
    .mp-app .mp-results-eyebrow>span{width:22px;height:22px;display:grid;place-items:center;border:1px solid #d0e3d1;border-radius:50%;background:#e8f3e7}
    .mp-app .mp-results-eyebrow .fi-icon{width:13px;height:13px}
    .mp-app .mp-results-title-row{display:flex;align-items:center;flex-wrap:wrap;gap:10px}
    .mp-app .mp-results-head h2{color:#173d2e;font-size:24px;line-height:1.2;letter-spacing:-.7px}
    .mp-app .mp-result-pill{display:inline-flex;min-height:27px;align-items:center;padding:0 10px;border:1px solid #d1e3d2;border-radius:999px;background:#fff;color:#3d7148;font-size:10px;font-weight:700;white-space:nowrap}
    .mp-app #mp-result-count{margin:0;color:#3d7148;font-size:10px}
    .mp-app .mp-results-help{margin:6px 0 0;color:#718074;font-size:11px;line-height:1.5}
    .mp-app .mp-sort-label{position:relative;z-index:1;flex:none;gap:10px;padding:8px 12px;border:1px solid #d7e4d9;border-radius:14px;background:#ffffffd9;box-shadow:0 4px 13px #16383208;color:#55705d}
    .mp-app .mp-sort-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:11px;background:#eaf4e9;color:#326c45}
    .mp-app .mp-sort-icon .fi-icon{width:17px;height:17px}
    .mp-app .mp-sort-copy{display:grid;gap:3px}
    .mp-app .mp-sort-copy small{color:#819084;font-size:8px;font-weight:800;letter-spacing:.1em}
    .mp-app .mp-sort-label select{min-width:144px;height:24px;padding:0 22px 0 0;border:0;border-radius:0;background-color:transparent;color:#214735;font-size:11px;font-weight:700}
    .mp-location-panel{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:0 0 14px;padding:18px 20px;border:1px solid #d3e3d8;border-radius:18px;background:#f7fbf7}
    .mp-location-panel h2,.mp-map-heading h2{margin:0;color:#174a3b;font-size:16px}
    .mp-location-panel p{margin:5px 0 0;color:#718074;font-size:12px;line-height:1.5}
    .mp-location-controls{display:flex;align-items:flex-end;flex-wrap:wrap;gap:10px}
    .mp-location-controls label{display:grid;gap:5px;color:#607267;font-size:10px;font-weight:700}
    .mp-location-controls select{min-width:100px;height:38px;padding:0 10px;border:1px solid #d3e1d7;border-radius:10px;background:#fff;color:#214735}
    .mp-use-location,.mp-toggle-map{min-height:38px;padding:0 14px;border:0;border-radius:10px;background:#235347;color:#fff;font-size:11px;font-weight:650;cursor:pointer}
    .mp-toggle-map{border:1px solid #c9dbcf;background:#fff;color:#235347}
    .mp-map-panel{margin:0 0 25px;padding:14px;border:1px solid #d9e5dc;border-radius:20px;background:#fff;box-shadow:0 8px 22px #16383209}
    .mp-map-panel[hidden]{display:none}
    .mp-map-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 2px 10px}
    .mp-map-heading span{color:#718074;font-size:11px}
    .mp-store-map{height:350px;overflow:hidden;border-radius:14px;background:#e8efeb}
    @media(max-width:640px){.mp-location-panel{align-items:stretch;flex-direction:column;padding:15px}.mp-location-controls{align-items:flex-end}.mp-location-controls label{flex:1}.mp-location-controls select{width:100%}.mp-use-location{padding:0 10px}.mp-store-map{height:300px}.mp-map-heading{align-items:flex-start;flex-direction:column;gap:4px}}
    @media(max-width:760px){.mp-app .mp-results-head{align-items:flex-start;flex-direction:column;gap:15px;margin:26px 0 16px;padding:18px;border-radius:19px}.mp-app .mp-results-head h2{font-size:21px}.mp-app .mp-sort-label{box-sizing:border-box;width:100%}.mp-app .mp-sort-copy{flex:1;display:flex;align-items:center;justify-content:space-between;gap:12px}.mp-app .mp-sort-label select{min-width:0}}
    @media(max-width:380px){.mp-app .mp-results-title-row{align-items:flex-start;flex-direction:column;gap:7px}.mp-app .mp-results-head h2{font-size:20px}.mp-app .mp-results-help{max-width:260px}}
  `;
  document.head.append(style);
}
