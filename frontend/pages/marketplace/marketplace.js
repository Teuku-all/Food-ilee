import { loadStylesheet } from '../../utils/stylesheet.js';
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
import { formatProductWeight, productWeightGrams } from '../../utils/product-weight.js';
import { translate } from '../../utils/i18n.js';

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
  loadStylesheet(
    'marketplace-page-style',
    new URL('../../styles/pages/marketplace.css', import.meta.url),
  );
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
          <div class="mp-results-copy"><p class="mp-results-eyebrow">PILIHAN YANG LEBIH BIJAK</p><div class="mp-results-title-row"><h2>Temukan bahan terbaik</h2><span class="mp-result-pill" id="mp-result-count" aria-live="polite">Memuat pilihan…</span></div><p class="mp-results-help">Bahan organik untuk kebutuhan pakan ternak dan kompos.</p></div>
          <label class="mp-sort-label" for="mp-sort"><span class="mp-sort-icon" aria-hidden="true">${icon('sort')}</span><span class="mp-sort-copy"><small>URUTKAN PRODUK</small><select id="mp-sort"><option value="newest">Terbaru</option><option value="price-low">Harga terendah</option><option value="price-high">Harga tertinggi</option></select></span></label>
        </section>
        <section class="mp-location-panel"><div><h2>Produk dan toko di sekitar</h2><p id="mp-location-status" role="status">Pilih lokasi untuk memfilter produk berdasarkan jarak.</p></div><div class="mp-location-controls"><label for="mp-radius">Jarak pencarian<select id="mp-radius"><option value="3">3 km</option><option value="5">5 km</option><option value="10" selected>10 km</option><option value="25">25 km</option><option value="0">Semua jarak</option></select></label><button type="button" class="mp-use-location" id="mp-use-location">Gunakan lokasi saya</button><button type="button" class="mp-toggle-map" id="mp-toggle-map" aria-expanded="false" aria-controls="mp-map-panel">Lihat peta toko</button></div></section>
        <section class="mp-map-panel" id="mp-map-panel" aria-label="Peta lokasi toko" hidden><div class="mp-map-heading"><h2>Lokasi toko</h2><span id="mp-map-status" role="status">Peta akan dimuat saat dibuka.</span></div><div id="mp-store-map" class="mp-store-map" role="application" aria-label="Peta toko terdekat"></div></section>
        <section class="mp-grid" id="mp-grid" aria-live="polite" aria-busy="true">${marketplaceLoadingSkeleton()}</section>
        <aside class="mp-guidance" aria-label="Mulai berkontribusi"><span class="mp-guidance-icon" aria-hidden="true">${icon('upload')}</span><div><p>JADI BAGIAN DARI SIKLUSNYA</p><h2>Punya bahan organik yang masih bisa dimanfaatkan?</h2><span>Bagikan foto, jumlah, dan lokasi agar orang yang tepat bisa menemukannya.</span></div><a href="#tambah-limbah">Buat penawaran ${icon('arrow')}</a></aside>
      </main>
      ${dashboardFooter()}
    </div>`;
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
    marketplaceStores =
      storesResult.success && Array.isArray(storesResult.data) ? storesResult.data : [];
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
    const savedLocation = JSON.parse(
      localStorage.getItem('foodilee_marketplace_location') || 'null',
    );
    if (validCoordinates(savedLocation?.latitude, savedLocation?.longitude)) {
      marketplaceLocationLabel = 'lokasi terakhir';
      return {
        latitude: Number(savedLocation.latitude),
        longitude: Number(savedLocation.longitude),
      };
    }
  } catch {
    marketplaceLocationLabel = 'Banda Aceh';
  }
  return { latitude: 5.5483, longitude: 95.3238 };
}

function distanceInKm(first, second) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.latitude)) *
      Math.cos(radians(second.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
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
      status.textContent =
        'Perangkat ini tidak mendukung lokasi otomatis. Peta tetap dapat dijelajahi.';
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
  const visibleStores = marketplaceStores.filter(
    (store) =>
      validCoordinates(store.latitude, store.longitude) &&
      (!marketplaceLocation ||
        !marketplaceRadius ||
        distanceInKm(marketplaceLocation, store) <= marketplaceRadius),
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
    leaflet
      .marker(point, {
        icon: leaflet.divIcon({
          className: 'mp-store-map-marker',
          html: `<span>${icon('store')}</span>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -18],
        }),
        title: store.name || 'Toko Food Ilee',
        alt: store.name || 'Lokasi toko',
      })
      .bindPopup(
        `<strong>${escapeHtml(store.name || 'Toko Food Ilee')}</strong><br>${escapeHtml(store.location || 'Lokasi toko')}${distance}`,
      )
      .addTo(marketplaceStoreLayer);
  }
  if (marketplaceLocation) {
    const point = [marketplaceLocation.latitude, marketplaceLocation.longitude];
    points.push(point);
    leaflet
      .circleMarker(point, {
        radius: 7,
        color: '#fff',
        weight: 2,
        fillColor: '#3879cc',
        fillOpacity: 1,
      })
      .bindPopup(`Pusat pencarian: ${escapeHtml(marketplaceLocationLabel)}`)
      .addTo(marketplaceStoreLayer);
  }
  if (points.length > 1) marketplaceMap.fitBounds(points, { padding: [24, 24], maxZoom: 15 });
  else if (points.length === 1) marketplaceMap.setView(points[0], 14);
  else marketplaceMap.setView([5.5483, 95.3238], 14);
  const status = document.getElementById('mp-map-status');
  if (status)
    status.textContent =
      marketplaceStoreLoadError || `${visibleStores.length} toko ditampilkan pada peta.`;
}

function marketplaceLoadingSkeleton() {
  return Array.from(
    { length: 6 },
    () =>
      `<article class="mp-card" aria-hidden="true"><div class="mp-card-image-wrap">${skeleton('100%', '205px')}</div><div class="mp-card-body">${skeleton('75px', '18px', 'pill')}<div style="height:12px"></div>${skeleton('70%', '18px')}<div style="height:12px"></div>${skeleton('80%', '11px')}<div style="height:14px"></div>${skeleton('100%', '39px', 'pill')}</div></article>`,
  ).join('');
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
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
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
  return (
    product.store || marketplaceStores.find((store) => store.ownerId === product.seller?.id) || null
  );
}

function sellerDisplayName(product) {
  return storeForProduct(product)?.name || 'Toko Food Ilee';
}

function isOwnMarketplaceProduct(product) {
  if (!currentMarketplaceUserId || product.isDemo) return false;
  return (
    product.seller?.id === currentMarketplaceUserId ||
    storeForProduct(product)?.ownerId === currentMarketplaceUserId
  );
}

function renderProducts() {
  const grid = document.getElementById('mp-grid');
  if (!grid) return;
  const otherSellerProducts = marketplaceProducts.filter(
    (product) => !isOwnMarketplaceProduct(product),
  );
  const nearbyProducts =
    marketplaceLocation && marketplaceRadius
      ? otherSellerProducts.filter((product) => {
          const store = storeForProduct(product);
          return (
            validCoordinates(store?.latitude, store?.longitude) &&
            distanceInKm(marketplaceLocation, store) <= marketplaceRadius
          );
        })
      : otherSellerProducts;
  const categoryProducts =
    activeCategory === 'Semua'
      ? nearbyProducts
      : nearbyProducts.filter((product) => categoryFor(product) === activeCategory);
  const products = (
    activeSearch
      ? categoryProducts.filter((product) =>
          [
            product.title,
            product.description,
            product.location,
            storeForProduct(product)?.name,
            product.category,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('id-ID')
            .includes(activeSearch),
        )
      : categoryProducts
  ).slice();
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
    const hasFilters =
      activeCategory !== 'Semua' ||
      activeSearch ||
      Boolean(marketplaceLocation && marketplaceRadius);
    const noNearbyProducts = Boolean(
      marketplaceLocation && marketplaceRadius && !nearbyProducts.length,
    );
    const onlyOwnProducts = !otherSellerProducts.length && marketplaceProducts.length > 0;
    grid.innerHTML = `<div class="mp-empty"><div class="mp-empty-mark" aria-hidden="true">${icon(hasFilters ? 'search' : noNearbyProducts ? 'pin' : 'package')}</div><h2>${onlyOwnProducts ? 'Belum ada produk dari penjual lain' : noNearbyProducts ? 'Belum ada produk di sekitar' : hasFilters ? 'Produk tidak ditemukan' : otherSellerProducts.length ? 'Belum ada produk di kategori ini' : 'Belum ada produk tersedia'}</h2><p>${onlyOwnProducts ? 'Produk dari toko Anda tidak ditampilkan di marketplace. Penjual lain akan muncul di sini saat tersedia.' : noNearbyProducts ? 'Perluas jarak pencarian atau pilih semua lokasi untuk melihat produk lainnya.' : hasFilters ? 'Coba kata kunci lain atau ubah kategori pencarian.' : otherSellerProducts.length ? 'Pilih kategori lain untuk menjelajahi produk.' : 'Produk limbah pangan yang tersedia akan muncul di sini.'}</p>${!hasFilters && !marketplaceProducts.length ? '<a href="#tambah-limbah">Mulai tambahkan limbah <span>→</span></a>' : ''}</div>`;
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
      const distance =
        marketplaceLocation && validCoordinates(store?.latitude, store?.longitude)
          ? `${distanceInKm(marketplaceLocation, store).toFixed(1)} km`
          : '';
      return `<article class="mp-card"><div class="mp-card-image-wrap"><img class="mp-card-image" src="${escapeHtml(product.image || './assets/landing-food-demo.jpg')}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.onerror=null;this.src='./assets/landing-food-demo.jpg'"><span class="mp-category-tag ${category === 'Kompos' ? 'compost' : ''}">${category}</span>${product.isDemo ? '<span class="mp-demo-tag">CONTOH</span>' : ''}</div><div class="mp-card-body"><div class="mp-title-row"><h2>${escapeHtml(product.title || 'Limbah Organik')}</h2><strong>${formatPrice(product.price)}</strong></div><div class="mp-meta"><span>${icon('box')} ${Number(product.stock || 0).toLocaleString('id-ID')} kg</span><i>&#8226;</i><span>${icon('pin')} ${distance ? `${escapeHtml(distance)} · ` : ''}${escapeHtml(product.location || seller)}</span></div><p class="mp-updated">${relativeAge}</p><button class="mp-card-action" type="button" data-product-id="${escapeHtml(product.id)}">Lihat Detail <span>&rarr;</span></button></div></article>`;
    })
    .join('');
  grid.querySelectorAll('.mp-card').forEach((card, index) => {
    const product = products[index];
    const stock = card.querySelector('.mp-meta span');
    const price = card.querySelector('.mp-title-row strong');
    if (stock && product)
      stock.innerHTML = `${icon('box')} ${translate(`${Number(product.stock || 0).toLocaleString('id-ID')} unit · ${formatProductWeight(productWeightGrams(product))}/unit`)}`;
    if (price && product) price.textContent = translate(`${formatPrice(product.price)} / unit`);
  });
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
  dialog.setAttribute('aria-labelledby', 'mp-detail-title');
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  const seller = sellerDisplayName(product);
  const store = storeForProduct(product);
  const storePhoto = store?.image
    ? `<img src="${escapeHtml(store.image)}" alt="Foto profil ${escapeHtml(seller)}">`
    : `<span class="mp-store-photo-placeholder" role="img" aria-label="Foto profil toko belum tersedia">${icon('store')}</span>`;
  dialog.innerHTML = `<form class="mp-detail-card"><button type="button" class="mp-detail-close" aria-label="Tutup">×</button><img src="${escapeHtml(product.image || './assets/landing-food-demo.jpg')}" alt="${escapeHtml(product.title)}"><div class="mp-detail-copy"><span class="mp-category-tag ${categoryFor(product) === 'Kompos' ? 'compost' : ''}">${escapeHtml(categoryFor(product))}</span><h2 id="mp-detail-title">${escapeHtml(product.title)}</h2><p>${escapeHtml(product.description || 'Bahan organik yang tersedia untuk dimanfaatkan kembali.')}</p>${product.isDemo ? '<p class="mp-demo-detail-note">Produk contoh ini belum dapat di-chat atau dipesan.</p>' : ''}<div class="mp-detail-facts"><span><small>PENJUAL</small><span class="mp-detail-seller"><span class="mp-detail-seller-photo">${storePhoto}</span><strong>${escapeHtml(seller)}</strong></span></span><span><small>LOKASI</small><strong>${escapeHtml(product.location || 'Hubungi penjual untuk detail lokasi')}</strong></span></div><button class="mp-card-action mp-chat" type="button" ${product.isDemo || !product.seller?.id || product.seller.id === currentMarketplaceUserId ? 'disabled' : ''}>Chat penjual</button><div class="mp-detail-order"><label for="mp-quantity">Jumlah (kg)</label><div class="mp-quantity-row"><div class="mp-quantity-stepper"><button class="mp-quantity-step" type="button" data-step="-1" aria-label="Kurangi jumlah">−</button><input id="mp-quantity" type="number" min="1" max="${Math.max(1, Number(product.stock) || 1)}" step="1" value="1" inputmode="numeric"><button class="mp-quantity-step" type="button" data-step="1" aria-label="Tambah jumlah">+</button></div><span>tersedia ${Number(product.stock || 0)} kg</span></div></div><div class="mp-detail-total"><span>Subtotal produk</span><strong id="mp-order-total">${formatPrice(product.price)}</strong></div><div class="mp-detail-actions"><button class="mp-card-action mp-add-cart" type="button" ${product.isDemo || Number(product.stock) < 1 ? 'disabled' : ''}>Tambah ke keranjang</button><button class="mp-card-action mp-buy" type="submit" ${product.isDemo || Number(product.stock) < 1 ? 'disabled' : ''}>Lihat keranjang <span>&rarr;</span></button></div><small class="mp-payment-note">Periksa produk pilihan Anda di keranjang sebelum membayar.</small></div></form>`;
  dialog.querySelector('.mp-detail-order label').textContent = translate('Jumlah unit');
  dialog.querySelector('.mp-quantity-row>span').textContent = translate(
    `tersedia ${Number(product.stock || 0).toLocaleString('id-ID')} unit · ${formatProductWeight(productWeightGrams(product))}/unit`,
  );
  document.body.append(dialog);
  dialog.showModal();
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const openingAnimation = dialog.animate(
      [
        { opacity: 0, transform: 'translateY(8px) scale(.99)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ],
      { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' },
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
      showToast('Masukkan jumlah stok yang tersedia.', 'error');
      return;
    }
    let cart = [];
    try {
      cart = JSON.parse(sessionStorage.getItem('foodilee_checkout_cart') || '[]');
    } catch {
      cart = [];
    }
    const existing = cart.find((item) => item.wasteId === product.id);
    if (existing)
      existing.quantity = Math.min(Number(product.stock), Number(existing.quantity) + qty);
    else cart.push({ wasteId: product.id, quantity: qty });
    sessionStorage.setItem('foodilee_checkout_cart', JSON.stringify(cart));
    let selection = { selected: [], known: [] };
    try {
      const savedSelection = JSON.parse(
        sessionStorage.getItem('foodilee_checkout_selected') || 'null',
      );
      if (Array.isArray(savedSelection?.selected) && Array.isArray(savedSelection?.known))
        selection = savedSelection;
    } catch {
      /* Pilihan awal keranjang akan dibuat saat dibuka. */
    }
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
    try {
      cart = JSON.parse(sessionStorage.getItem('foodilee_checkout_cart') || '[]');
    } catch {
      cart = [];
    }
    const existing = cart.find((item) => item.wasteId === product.id);
    if (existing)
      existing.quantity = Math.min(Number(product.stock), Number(existing.quantity) + qty);
    else cart.push({ wasteId: product.id, quantity: qty });
    sessionStorage.setItem('foodilee_checkout_cart', JSON.stringify(cart));
    let selection = { selected: [], known: [] };
    try {
      const savedSelection = JSON.parse(
        sessionStorage.getItem('foodilee_checkout_selected') || 'null',
      );
      if (Array.isArray(savedSelection?.selected) && Array.isArray(savedSelection?.known))
        selection = savedSelection;
    } catch {
      /* Pilihan awal keranjang akan dibuat saat dibuka. */
    }
    selection.selected = [...new Set([...selection.selected, product.id])];
    selection.known = cart.map((item) => item.wasteId);
    sessionStorage.setItem('foodilee_checkout_selected', JSON.stringify(selection));
    window.dispatchEvent(new Event('foodilee:cart-updated'));
    dialog.close();
    dialog.remove();
    location.hash = '#cart';
  });
}

function formatPrice(price) {
  return `Rp${Number(price || 0).toLocaleString('id-ID')}`;
}
