import { icon } from '../../ui/icons.js';
import { loadStylesheet } from '../../utils/stylesheet.js';
import { createCheckout, getShippingRates, refreshOrderPayment } from '../../services/order.js';
import { getWaste } from '../../services/waste.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast, injectToastStyle } from '../../utils/toast.js';
import { bindSharedHeader, dashboardFooter, dashboardHeader } from '../../ui/shell.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import {
  googleMapsDirectionsUrl,
  mountLocationPicker,
  validCoordinates,
} from '../../utils/location-map.js';
import { selectRegionAddress } from '../../utils/region-address.js';
import { formatProductWeight, productWeightGrams } from '../../utils/product-weight.js';
import { translate } from '../../utils/i18n.js';

const REGION_API = 'https://www.emsifa.com/api-wilayah-indonesia/v2';
const CART_KEY = 'foodilee_checkout_cart';
const SELECTED_CART_KEY = 'foodilee_checkout_selected';
const ADDRESS_KEY = 'foodilee_shipping_address';
const IDEMPOTENCY_KEY = 'foodilee_checkout_idempotency_key';
const addressFields = [
  'recipientName',
  'phone',
  'provinceCode',
  'province',
  'cityCode',
  'city',
  'districtCode',
  'district',
  'villageCode',
  'village',
  'postalCode',
  'details',
];
let checkoutItems = [];
let cartEntries = [];
let selectedWasteIds = new Set();
let address = {};
let rates = [];
let selectedRate = null;
let rateRevision = 0;
let rateTimer = null;
let checkoutBusy = false;
let paymentMethod = 'midtrans';
let deliveryMethod = 'courier';
let addressMap = null;

function formatPrice(value) {
  return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
}
function readCart() {
  try {
    const value = JSON.parse(sessionStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(value)
      ? value.filter((item) => item?.wasteId && Number(item.quantity) > 0)
      : [];
  } catch {
    return [];
  }
}
function readSelectedItems(items) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SELECTED_CART_KEY) || 'null');
    if (Array.isArray(saved))
      return saved.length
        ? new Set(saved.filter((id) => items.some((item) => item.wasteId === id)))
        : new Set(items.map((item) => item.wasteId));
    if (!saved || !Array.isArray(saved.selected) || !Array.isArray(saved.known))
      return new Set(items.map((item) => item.wasteId));
    const selected = new Set(
      saved.selected.filter((id) => items.some((item) => item.wasteId === id)),
    );
    items.forEach((item) => {
      if (!saved.known.includes(item.wasteId)) selected.add(item.wasteId);
    });
    return selected;
  } catch {
    return new Set(items.map((item) => item.wasteId));
  }
}
function persistSelection() {
  sessionStorage.setItem(
    SELECTED_CART_KEY,
    JSON.stringify({
      selected: [...selectedWasteIds],
      known: cartEntries.map((item) => item.wasteId || item.id),
    }),
  );
}
function selectedItems() {
  return checkoutItems.filter((item) => selectedWasteIds.has(item.wasteId));
}
function persistCart() {
  sessionStorage.setItem(
    CART_KEY,
    JSON.stringify(
      cartEntries.map((item) => ({ wasteId: item.wasteId || item.id, quantity: item.quantity })),
    ),
  );
  window.dispatchEvent(new Event('foodilee:cart-updated'));
}
function invalidateCheckoutKey() {
  sessionStorage.removeItem(IDEMPOTENCY_KEY);
}
function checkoutKey() {
  let key = sessionStorage.getItem(IDEMPOTENCY_KEY);
  if (!key) {
    key = crypto.randomUUID();
    sessionStorage.setItem(IDEMPOTENCY_KEY, key);
  }
  return key;
}
function savedAddress() {
  try {
    return JSON.parse(localStorage.getItem(ADDRESS_KEY) || '{}');
  } catch {
    return {};
  }
}

export async function renderCheckout() {
  loadStylesheet(
    'checkout-page-style',
    new URL('../../styles/pages/checkout.css', import.meta.url),
  );
  addressMap?.destroy();
  addressMap = null;
  const navigationRevision = getNavigationRevision();
  cartEntries = readCart();
  selectedWasteIds = readSelectedItems(cartEntries);
  checkoutItems = cartEntries.filter((item) => selectedWasteIds.has(item.wasteId));
  address = savedAddress();
  rates = [];
  selectedRate = null;
  checkoutBusy = false;
  paymentMethod = 'midtrans';
  deliveryMethod = 'courier';
  const app = document.getElementById('app');
  app.innerHTML = `<div class="co-app">${dashboardHeader('market')}<main class="co-main"><a class="co-back" href="#cart">&larr; Kembali ke keranjang</a><header class="co-heading"><p>PEMBAYARAN AMAN</p><h1>Pembayaran</h1><span>Lengkapi alamat dan pengiriman untuk produk yang Anda pilih.</span></header><div class="co-layout"><div class="co-left"><section class="co-panel"><div class="co-section-head"><span>01</span><div><h2>Alamat penerima</h2><p>Isi alamat lengkap agar produk sampai di tempat yang tepat.</p></div></div><label class="co-label">Alamat tersimpan<select id="co-saved"><option value="">Pilih alamat tersimpan</option></select></label><form id="co-address" class="co-form" novalidate><div class="co-two"><label class="co-label">Nama penerima<input name="recipientName" autocomplete="name" required maxlength="100"></label><label class="co-label">Nomor telepon<input name="phone" autocomplete="tel" inputmode="tel" required maxlength="20"></label></div><label class="co-label">Provinsi<select id="co-province" required><option value="">Pilih provinsi</option></select></label><label class="co-label">Kabupaten/Kota<select id="co-city" required disabled><option value="">Pilih kabupaten/kota</option></select></label><label class="co-label">Kecamatan<select id="co-district" required disabled><option value="">Pilih kecamatan</option></select></label><label class="co-label">Desa/Kelurahan<select id="co-village" required disabled><option value="">Pilih desa/kelurahan</option></select></label><div class="co-two"><label class="co-label">Kode pos<input name="postalCode" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" required></label><label class="co-label">Detail alamat<input name="details" placeholder="Nama jalan, nomor rumah, RT/RW" required maxlength="240"></label></div><label class="co-label">Catatan untuk kurir (opsional)<input name="notes" maxlength="200"></label><button class="co-save-address" type="button" id="co-save-address">Simpan alamat ini</button><p class="co-error" id="co-address-error" role="alert"></p></form></section><section class="co-panel"><div class="co-section-head"><span>02</span><div><h2>Produk yang akan dibayar</h2><p>Periksa rincian dan jumlah produk yang ingin Anda pesan.</p></div></div><div id="co-items" class="co-items"><div class="co-loading">Memuat produk…</div></div></section><section class="co-panel"><div class="co-section-head"><span>03</span><div><h2>Pengiriman</h2><p>Pilih layanan pengiriman yang sesuai dengan kebutuhan Anda.</p></div></div><div id="co-rates" class="co-rates"><p>Lengkapi alamat dan pilih produk untuk memuat layanan pengiriman.</p></div></section></div><aside class="co-summary"><h2>Ringkasan pembayaran</h2><div class="co-summary-row"><span>Produk dipilih</span><strong id="co-selected-count">0 produk</strong></div><div class="co-summary-row"><span>Subtotal produk</span><strong id="co-subtotal">—</strong></div><div class="co-summary-row"><span>Diskon</span><strong>Rp0</strong></div><div class="co-summary-row"><span>Pengiriman</span><strong id="co-shipping">Pilih layanan</strong></div><div class="co-summary-total"><span>Total</span><strong id="co-total">—</strong></div><button type="button" id="co-pay" disabled>Checkout produk dipilih</button><p id="co-pay-error" class="co-error" role="alert"></p><small>Harga, stok, dan ongkir diperiksa kembali sebelum pesanan dibuat.</small></aside></div></main>${dashboardFooter()}</div>`;
  const paymentOptions = document.createElement('fieldset');
  document.querySelector('.co-back').innerHTML =
    `<span class="co-back-icon" aria-hidden="true">${icon('arrowLeft')}</span><span>Kembali ke keranjang</span>`;
  paymentOptions.className = 'co-payment-choice';
  paymentOptions.innerHTML = `<legend>Metode pembayaran</legend><label><input type="radio" name="payment-method" value="midtrans" checked><span><strong>Bayar online</strong><small>Midtrans · pembayaran di halaman ini</small></span></label><label id="co-cash-option" hidden><input type="radio" name="payment-method" value="cash"><span><strong>Cash ke penjual</strong><small>Bayar langsung kepada penjual saat mengambil pesanan</small></span></label>`;
  document
    .querySelector('.co-summary')
    .insertBefore(paymentOptions, document.getElementById('co-pay'));
  const deliveryOptions = document.createElement('fieldset');
  deliveryOptions.className = 'co-payment-choice co-delivery-choice';
  deliveryOptions.innerHTML = `<legend>Metode pengiriman</legend><label><input type="radio" name="delivery-method" value="courier" checked><span><strong>GoSend atau GrabExpress</strong><small>Tarif dan layanan tersedia berdasarkan alamat tujuan</small></span></label><label><input type="radio" name="delivery-method" value="pickup"><span><strong>Jemput langsung</strong><small>Ambil pesanan di toko penjual tanpa ongkir</small></span></label>`;
  document.getElementById('co-rates').before(deliveryOptions);
  const addressPanel = document.getElementById('co-address').closest('.co-panel');
  addressPanel.id = 'co-address-panel';
  const snapPanel = document.createElement('section');
  snapPanel.id = 'co-snap-panel';
  snapPanel.className = 'co-snap-panel';
  snapPanel.hidden = true;
  snapPanel.innerHTML =
    '<h2>Pembayaran aman melalui Midtrans</h2><p>Selesaikan pembayaran dengan aman melalui Midtrans.</p><div id="co-snap-container"></div><p id="co-snap-status" role="status"></p><a href="#transaksi">Lihat transaksi</a>';
  document.querySelector('.co-layout').after(snapPanel);
  injectToastStyle();
  bindSharedHeader();
  await loadProducts(navigationRevision);
  if (!isRouteCurrent('#checkout', navigationRevision)) return;
  bindAddressForm();
  bindDeliveryOptions();
  await loadRegionOptions(navigationRevision);
  if (!isRouteCurrent('#checkout', navigationRevision)) return;
  bindCheckoutMap();
}

async function loadProducts(navigationRevision) {
  const root = document.getElementById('co-items');
  if (!checkoutItems.length) {
    root.innerHTML =
      '<div class="co-empty">Belum ada produk yang dipilih. <a href="#cart">Kembali ke keranjang</a></div>';
    updateSummary();
    return;
  }
  try {
    checkoutItems = await Promise.all(
      checkoutItems.map(async (item) => {
        const result = await getWaste(item.wasteId);
        if (!result.success || !result.data)
          throw new Error(result.message || 'Produk tidak tersedia.');
        return {
          ...result.data,
          wasteId: item.wasteId,
          quantity: Math.min(Number(item.quantity), Number(result.data.stock)),
        };
      }),
    );
    if (!isRouteCurrent('#checkout', navigationRevision)) return;
    checkoutItems = checkoutItems.filter((item) => item.quantity > 0);
    const selectedById = new Map(checkoutItems.map((item) => [item.wasteId, item]));
    cartEntries = cartEntries.map((item) => {
      const refreshed = selectedById.get(item.wasteId);
      return refreshed ? { ...item, quantity: refreshed.quantity } : item;
    });
    renderItems();
    updateSummary();
  } catch (error) {
    if (!isRouteCurrent('#checkout', navigationRevision)) return;
    root.innerHTML = `<p class="co-error">${escapeHtml(error.message || 'Produk belum dapat dimuat.')}</p>`;
  }
}

function renderItems() {
  const root = document.getElementById('co-items');
  if (!checkoutItems.length) {
    root.innerHTML =
      '<div class="co-empty">Belum ada produk yang dipilih. <a href="#cart">Kembali ke keranjang</a></div>';
    return;
  }
  root.innerHTML = checkoutItems
    .map(
      (item) =>
        `<article class="co-item"><img src="${escapeHtml(item.image || '')}" alt="${escapeHtml(item.title)}"><div class="co-item-copy"><strong>${escapeHtml(item.title)}</strong><span>${formatPrice(item.price)} / kg · ${item.quantity} kg</span></div><strong class="co-item-total">${formatPrice(Number(item.price) * item.quantity)}</strong></article>`,
    )
    .join('');
  root.querySelectorAll('.co-item').forEach((row, index) => {
    const item = checkoutItems[index];
    const description = row.querySelector('.co-item-copy>span');
    if (description)
      description.textContent = translate(
        `${formatPrice(item.price)} / unit · ${item.quantity} unit · ${formatProductWeight(productWeightGrams(item))}/unit`,
      );
  });
}

function readAddress() {
  const form = document.getElementById('co-address');
  const data = Object.fromEntries(new FormData(form).entries());
  const get = (id) => document.getElementById(id);
  return {
    ...data,
    provinceCode: get('co-province').value,
    province: get('co-province').selectedOptions[0]?.textContent || '',
    cityCode: get('co-city').value,
    city: get('co-city').selectedOptions[0]?.textContent || '',
    districtCode: get('co-district').value,
    district: get('co-district').selectedOptions[0]?.textContent || '',
    villageCode: get('co-village').value,
    village: get('co-village').selectedOptions[0]?.textContent || '',
    latitude: form.elements.latitude?.value ? Number(form.elements.latitude.value) : null,
    longitude: form.elements.longitude?.value ? Number(form.elements.longitude.value) : null,
  };
}

function bindCheckoutMap() {
  const form = document.getElementById('co-address');
  const section = document.createElement('div');
  section.innerHTML =
    '<label class="co-label fi-map-label">Titik lokasi alamat <small>Pilih atau geser titik di peta untuk menyesuaikan wilayah alamat secara otomatis.</small></label><div id="co-map" class="fi-location-map" role="application" aria-label="Peta pemilih lokasi alamat penerima"></div><div class="fi-map-controls"><button type="button" class="fi-button fi-button-outline" id="co-locate">Gunakan lokasi perangkat</button><span id="co-map-status" role="status">Memuat peta…</span></div><input type="hidden" name="latitude"><input type="hidden" name="longitude">';
  document.getElementById('co-save-address').before(section);
  const saved = savedAddress();
  const status = form.querySelector('#co-map-status');
  mountLocationPicker({
    element: form.querySelector('#co-map'),
    latitudeInput: form.elements.latitude,
    longitudeInput: form.elements.longitude,
    status,
    locateButton: form.querySelector('#co-locate'),
    initialLocation: saved,
    allowRegionChange: true,
    onAddressChange: async (names) => {
      await selectRegionAddress(form, 'co', names, '[name="postalCode"]');
      address = readAddress();
      invalidateCheckoutKey();
      updateSummary();
      loadRates();
    },
    onChange: (latitude, longitude) => {
      if (latitude === null || longitude === null) return;
      address = readAddress();
      invalidateCheckoutKey();
      updateSummary();
      loadRates();
    },
  })
    .then((picker) => {
      addressMap = picker;
    })
    .catch((error) => {
      status.textContent = error.message;
    });
}

function bindAddressForm() {
  const form = document.getElementById('co-address');
  const saved = savedAddress();
  const addressSelect = document.getElementById('co-saved');
  if (saved.recipientName) {
    const option = document.createElement('option');
    option.value = 'saved';
    option.textContent = `${saved.recipientName} — ${saved.city || ''}`;
    addressSelect.append(option);
    addressSelect.value = 'saved';
  }
  addressSelect.addEventListener('change', () => {
    if (addressSelect.value) applyAddress(saved);
  });
  form.addEventListener('input', () => {
    invalidateCheckoutKey();
    address = readAddress();
    updateSummary();
    loadRates();
  });
  form.addEventListener('change', () => {
    invalidateCheckoutKey();
    address = readAddress();
    updateSummary();
    loadRates();
  });
  document.getElementById('co-save-address').addEventListener('click', () => {
    address = readAddress();
    const error = validateForm();
    if (error) {
      document.getElementById('co-address-error').textContent = error;
      return;
    }
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
    showToast('Alamat tersimpan di perangkat ini.');
  });
  document.getElementById('co-pay').addEventListener('click', submitCheckout);
  document.querySelectorAll('input[name="payment-method"]').forEach((radio) =>
    radio.addEventListener('change', () => {
      paymentMethod = radio.value;
      invalidateCheckoutKey();
      loadRates();
    }),
  );
}

function bindDeliveryOptions() {
  const addressPanel = document.getElementById('co-address-panel');
  const cashOption = document.getElementById('co-cash-option');
  document.querySelectorAll('input[name="delivery-method"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      deliveryMethod = radio.value;
      const isPickup = deliveryMethod === 'pickup';
      addressPanel.hidden = isPickup;
      addressPanel.querySelectorAll('input, select, button').forEach((control) => {
        control.disabled = isPickup;
      });
      if (!isPickup) {
        const province = document.getElementById('co-province');
        const city = document.getElementById('co-city');
        const district = document.getElementById('co-district');
        const village = document.getElementById('co-village');
        province.disabled = false;
        city.disabled = !province.value;
        district.disabled = !city.value;
        village.disabled = !district.value;
      }
      cashOption.hidden = !isPickup;
      cashOption.style.display = isPickup ? '' : 'none';
      if (!isPickup && paymentMethod === 'cash') {
        paymentMethod = 'midtrans';
        document.querySelector('input[name="payment-method"][value="midtrans"]').checked = true;
      }
      invalidateCheckoutKey();
      loadRates();
    });
  });
  document.querySelectorAll('input[name="payment-method"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked && radio.value === 'cash' && deliveryMethod !== 'pickup') {
        radio.checked = false;
        document.querySelector('input[name="payment-method"][value="midtrans"]').checked = true;
        paymentMethod = 'midtrans';
        return;
      }
      if (radio.checked) paymentMethod = radio.value;
    });
  });
}

async function fetchRegions(resource, parent) {
  const url = parent
    ? `${REGION_API}/${resource}/${encodeURIComponent(parent)}.json`
    : `${REGION_API}/provinces.json`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Data wilayah belum dapat dimuat. Coba lagi.');
  const result = await response.json();
  return result.data;
}
function setOptions(select, data, placeholder) {
  select.replaceChildren(new Option(placeholder, ''));
  for (const area of data) {
    const option = new Option(area.name, area.id);
    if (area.postal_code) option.dataset.postalCode = area.postal_code;
    select.add(option);
  }
  select.disabled = false;
}
async function loadRegionOptions(navigationRevision = getNavigationRevision()) {
  try {
    const provinces = await fetchRegions('provinces');
    if (!isRouteCurrent('#checkout', navigationRevision)) return;
    setOptions(document.getElementById('co-province'), provinces, 'Pilih provinsi');
    const saved = savedAddress();
    if (saved.provinceCode) {
      document.getElementById('co-province').value = saved.provinceCode;
      await cascade('province', saved, navigationRevision);
      if (!isRouteCurrent('#checkout', navigationRevision)) return;
      address = readAddress();
      loadRates();
    }
  } catch (error) {
    if (!isRouteCurrent('#checkout', navigationRevision)) return;
    document.getElementById('co-address-error').textContent = error.message;
  }
  if (!isRouteCurrent('#checkout', navigationRevision)) return;
  ['province', 'city', 'district'].forEach((level) =>
    document.getElementById(`co-${level}`).addEventListener('change', async () => {
      const parent = document.getElementById(`co-${level}`).value;
      invalidateCheckoutKey();
      const next = { province: 'city', city: 'district', district: 'village' }[level];
      const resource = { city: 'regencies', district: 'districts', village: 'villages' }[next];
      const select = document.getElementById(`co-${next}`);
      setOptions(
        select,
        [],
        `Pilih ${next === 'city' ? 'kabupaten/kota' : next === 'district' ? 'kecamatan' : 'desa/kelurahan'}`,
      );
      select.disabled = true;
      const descendantIds =
        level === 'province'
          ? ['co-district', 'co-village']
          : level === 'city'
            ? ['co-village']
            : [];
      for (const descendantId of descendantIds) {
        const descendant = document.getElementById(descendantId);
        descendant.replaceChildren(
          new Option(
            descendantId === 'co-district' ? 'Pilih kecamatan' : 'Pilih desa/kelurahan',
            '',
          ),
        );
        descendant.disabled = true;
      }
      address = readAddress();
      loadRates();
      if (!parent) return;
      try {
        setOptions(
          select,
          await fetchRegions(resource, parent),
          'Pilih ' +
            (next === 'city'
              ? 'kabupaten/kota'
              : next === 'district'
                ? 'kecamatan'
                : 'desa/kelurahan'),
        );
      } catch (error) {
        if (!isRouteCurrent('#checkout', navigationRevision)) return;
        document.getElementById('co-address-error').textContent = error.message;
      }
      if (!isRouteCurrent('#checkout', navigationRevision)) return;
      address = readAddress();
      loadRates();
    }),
  );
  document.getElementById('co-village').addEventListener('change', () => {
    const selected = document.getElementById('co-village').selectedOptions[0];
    if (selected?.dataset.postalCode)
      document.querySelector('#co-address [name="postalCode"]').value = selected.dataset.postalCode;
    address = readAddress();
    loadRates();
  });
}

async function cascade(level, saved, navigationRevision = getNavigationRevision()) {
  const city = document.getElementById('co-city');
  const cities = await fetchRegions('regencies', saved.provinceCode);
  if (!isRouteCurrent('#checkout', navigationRevision) || !city?.isConnected) return;
  setOptions(city, cities, 'Pilih kabupaten/kota');
  city.value = saved.cityCode || '';
  if (!city.value) return;
  const district = document.getElementById('co-district');
  const districts = await fetchRegions('districts', saved.cityCode);
  if (!isRouteCurrent('#checkout', navigationRevision) || !district?.isConnected) return;
  setOptions(district, districts, 'Pilih kecamatan');
  district.value = saved.districtCode || '';
  if (!district.value) return;
  const village = document.getElementById('co-village');
  const villages = await fetchRegions('villages', saved.districtCode);
  if (!isRouteCurrent('#checkout', navigationRevision) || !village?.isConnected) return;
  setOptions(village, villages, 'Pilih desa/kelurahan');
  village.value = saved.villageCode || '';
  const form = document.getElementById('co-address');
  for (const key of ['recipientName', 'phone', 'postalCode', 'details', 'notes'])
    if (form.elements[key]) form.elements[key].value = saved[key] || '';
  address = readAddress();
}

function applyAddress(value) {
  const form = document.getElementById('co-address');
  for (const key of ['recipientName', 'phone', 'postalCode', 'details', 'notes'])
    if (form.elements[key]) form.elements[key].value = value[key] || '';
  document.getElementById('co-province').value = value.provinceCode || '';
  if (validCoordinates(value.latitude, value.longitude))
    addressMap?.setLocation(value.latitude, value.longitude);
  else addressMap?.clearLocation();
  const navigationRevision = getNavigationRevision();
  cascade('province', value, navigationRevision).then(() => {
    if (!isRouteCurrent('#checkout', navigationRevision)) return;
    address = readAddress();
    loadRates();
  });
}

function validateForm() {
  if (deliveryMethod === 'pickup') return '';
  const form = document.getElementById('co-address');
  if (!form.checkValidity()) return 'Lengkapi alamat penerima terlebih dahulu.';
  const current = readAddress();
  if (addressFields.some((key) => !String(current[key] || '').trim()))
    return 'Pilih semua wilayah hingga desa/kelurahan dan lengkapi detail alamat.';
  if (!/^\d{5}$/.test(current.postalCode)) return 'Kode pos harus terdiri dari 5 angka.';
  if (!validCoordinates(current.latitude, current.longitude))
    return 'Pilih titik lokasi alamat penerima pada peta.';
  return '';
}

function updateSummary() {
  const chosenItems = selectedItems();
  const subtotal = chosenItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );
  document.getElementById('co-selected-count').textContent =
    `${chosenItems.length} ${chosenItems.length === 1 ? 'produk' : 'produk'}`;
  document.getElementById('co-subtotal').textContent = formatPrice(subtotal);
  document.getElementById('co-shipping').textContent = selectedRate
    ? deliveryMethod === 'pickup'
      ? 'Jemput langsung · Rp0'
      : formatPrice(selectedRate.price)
    : 'Pilih layanan';
  document.getElementById('co-total').textContent = formatPrice(
    subtotal + Number(selectedRate?.price || 0),
  );
  const valid = !validateForm() && chosenItems.length > 0 && selectedRate && !checkoutBusy;
  const payButton = document.getElementById('co-pay');
  payButton.disabled = !valid;
  payButton.textContent =
    paymentMethod === 'cash'
      ? 'Buat Pesanan · Bayar Cash ke Penjual'
      : 'Lanjut Bayar di Halaman Ini';
}

async function loadRates() {
  clearTimeout(rateTimer);
  const revision = ++rateRevision;
  selectedRate = null;
  updateSummary();
  const navigationRevision = getNavigationRevision();
  rateTimer = setTimeout(() => loadRatesNow(revision, navigationRevision), 350);
}

async function loadRatesNow(revision, navigationRevision = getNavigationRevision()) {
  if (!isRouteCurrent('#checkout', navigationRevision)) return;
  selectedRate = null;
  rates = [];
  updateSummary();
  const root = document.getElementById('co-rates');
  if (!root) return;
  const error = validateForm();
  const chosenItems = selectedItems();
  if (error || !chosenItems.length) {
    root.innerHTML = `<p>${escapeHtml(error || 'Centang minimal satu produk untuk melihat tarif.')}</p>`;
    return;
  }
  root.innerHTML = `<div class="co-loading">${deliveryMethod === 'pickup' ? 'Memuat lokasi toko…' : 'Mengambil tarif kurir…'}</div>`;
  try {
    const result = await getShippingRates(
      chosenItems.map((item) => ({ wasteId: item.id, quantity: item.quantity })),
      deliveryMethod === 'pickup' ? null : readAddress(),
      paymentMethod,
      deliveryMethod,
    );
    if (revision !== rateRevision || !isRouteCurrent('#checkout', navigationRevision)) return;
    if (!result.success) throw new Error(result.message || 'Tarif pengiriman belum tersedia.');
    rates = result.data || [];
    if (!rates.length) {
      root.innerHTML =
        '<p class="co-error">Tidak ada layanan pengiriman yang tersedia untuk alamat ini.</p>';
      return;
    }
    root.innerHTML = rates
      .map((rate, index) => {
        const pickup = rate.pickupAddress;
        const region = pickup?.region || {};
        const pickupText = [
          pickup?.address,
          region.village,
          region.district,
          region.city,
          region.province,
          pickup?.postalCode,
        ]
          .filter(Boolean)
          .join(', ');
        const description =
          deliveryMethod === 'pickup'
            ? `${pickupText} · Kontak: ${pickup?.contactName || ''} ${pickup?.contactPhone || ''}`
            : `${escapeHtml(rate.duration || 'Estimasi belum tersedia')}`;
        const directionsUrl =
          deliveryMethod === 'pickup'
            ? googleMapsDirectionsUrl(pickup?.latitude, pickup?.longitude)
            : '';
        return `<div class="co-rate-option"><label class="co-rate"><input type="radio" name="co-rate" value="${index}"><span><strong>${escapeHtml(rate.courierName)} · ${escapeHtml(rate.serviceName)}</strong><small>${escapeHtml(description)}</small></span><b>${formatPrice(rate.price)}</b></label>${directionsUrl ? `<a class="co-pickup-map-link" href="${directionsUrl}" target="_blank" rel="noopener">${translate('Buka petunjuk arah di Google Maps')}</a>` : ''}</div>`;
      })
      .join('');
    root.querySelectorAll('input').forEach((radio) =>
      radio.addEventListener('change', () => {
        selectedRate = rates[Number(radio.value)];
        updateSummary();
      }),
    );
  } catch (error) {
    if (revision !== rateRevision || !isRouteCurrent('#checkout', navigationRevision)) return;
    root.innerHTML = `<p class="co-error">${escapeHtml(error.message || 'Ongkir gagal dimuat.')}</p><button type="button" class="co-retry" id="co-retry-rate">Coba lagi</button>`;
    document.getElementById('co-retry-rate')?.addEventListener('click', loadRates);
  }
}

async function submitCheckout() {
  if (checkoutBusy || !selectedRate) return;
  const chosenItems = selectedItems();
  if (!chosenItems.length) return;
  const validation = validateForm();
  if (validation) {
    document.getElementById('co-address-error').textContent = validation;
    return;
  }
  checkoutBusy = true;
  updateSummary();
  const button = document.getElementById('co-pay');
  button.textContent = 'Menyiapkan pembayaran…';
  const errorNode = document.getElementById('co-pay-error');
  errorNode.textContent = '';
  try {
    const current = readAddress();
    const result = await createCheckout(
      chosenItems.map((item) => ({ wasteId: item.id, quantity: item.quantity })),
      current,
      selectedRate.company,
      selectedRate.courierType,
      checkoutKey(),
      paymentMethod,
      deliveryMethod,
    );
    if (!result.success || !result.data)
      throw new Error(result.message || 'Transaksi belum dapat dibuat.');
    if (deliveryMethod === 'courier') localStorage.setItem(ADDRESS_KEY, JSON.stringify(current));
    const purchasedIds = new Set(chosenItems.map((item) => item.wasteId));
    checkoutItems = checkoutItems.filter((item) => !purchasedIds.has(item.wasteId));
    selectedWasteIds = new Set([...selectedWasteIds].filter((id) => !purchasedIds.has(id)));
    persistCart();
    persistSelection();
    window.dispatchEvent(new Event('foodilee:cart-updated'));
    sessionStorage.removeItem(IDEMPOTENCY_KEY);
    if (paymentMethod === 'cash') {
      showToast(
        'Pesanan jemput langsung dibuat. Bayar cash kepada penjual saat mengambil pesanan.',
      );
      location.hash = '#transaksi';
      return;
    }
    if (!result.data.snapToken || !result.data.snapClientKey || !result.data.snapJsUrl)
      throw new Error(
        'Pesanan sudah dibuat, tetapi konfigurasi Snap belum lengkap. Buka transaksi untuk melanjutkan.',
      );
    button.disabled = true;
    button.textContent = 'Pesanan dibuat';
    const snapPanel = document.getElementById('co-snap-panel');
    snapPanel.hidden = false;
    snapPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await loadSnapScript(result.data.snapJsUrl, result.data.snapClientKey);
    const verifyAndShow = async (message) => {
      const statusNode = document.getElementById('co-snap-status');
      statusNode.textContent = message;
      try {
        const latest = await refreshOrderPayment(result.data.id);
        if (!latest.success) throw new Error(latest.message);
        statusNode.textContent =
          latest.data.paymentStatus === 'paid'
            ? 'Pembayaran berhasil diverifikasi. Pesanan sedang diproses.'
            : `Status backend: ${latest.data.paymentStatus === 'pending' ? 'menunggu pembayaran' : latest.data.paymentStatus}.`;
      } catch {
        statusNode.textContent =
          'Pembayaran diterima oleh Snap. Konfirmasi server belum tersedia; periksa kembali di halaman transaksi.';
      }
    };
    window.snap.embed(result.data.snapToken, {
      embedId: 'co-snap-container',
      language: 'id',
      onSuccess: () => verifyAndShow('Memverifikasi pembayaran…'),
      onPending: () => verifyAndShow('Pembayaran menunggu penyelesaian…'),
      onError: () => verifyAndShow('Pembayaran belum berhasil. Periksa status melalui transaksi.'),
      onClose: () => verifyAndShow('Pembayaran belum selesai. Pesanan tersimpan di transaksi.'),
    });
  } catch (error) {
    errorNode.textContent = error.message || 'Transaksi belum dapat dibuat.';
    checkoutBusy = false;
    if (selectedItems().length) {
      button.textContent = 'Lanjut Bayar di Halaman Ini';
      updateSummary();
    }
  }
}

function loadSnapScript(src, clientKey) {
  if (window.snap) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.dataset.clientKey = clientKey;
    script.dataset.foodileeSnap = 'true';
    script.onload = resolve;
    script.onerror = () =>
      reject(
        new Error(
          'Snap Midtrans gagal dimuat. Pesanan sudah dibuat; lanjutkan dari halaman transaksi.',
        ),
      );
    document.head.append(script);
  });
}
