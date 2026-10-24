import { createCheckout, getShippingRates, refreshOrderPayment } from '../../services/order.js';
import { getWaste } from '../../services/waste.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast, injectToastStyle } from '../../utils/toast.js';
import { bindSharedHeader, dashboardFooter, dashboardHeader } from '../../ui/shell.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';

const REGION_API = 'https://www.emsifa.com/api-wilayah-indonesia/v2';
const CART_KEY = 'foodilee_checkout_cart';
const SELECTED_CART_KEY = 'foodilee_checkout_selected';
const ADDRESS_KEY = 'foodilee_shipping_address';
const IDEMPOTENCY_KEY = 'foodilee_checkout_idempotency_key';
const addressFields = ['recipientName', 'phone', 'provinceCode', 'province', 'cityCode', 'city', 'districtCode', 'district', 'villageCode', 'village', 'postalCode', 'details'];
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

function formatPrice(value) { return `Rp${Number(value || 0).toLocaleString('id-ID')}`; }
function readCart() {
  try {
    const value = JSON.parse(sessionStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => item?.wasteId && Number(item.quantity) > 0) : [];
  } catch { return []; }
}
function readSelectedItems(items) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SELECTED_CART_KEY) || 'null');
    if (Array.isArray(saved)) return saved.length ? new Set(saved.filter((id) => items.some((item) => item.wasteId === id))) : new Set(items.map((item) => item.wasteId));
    if (!saved || !Array.isArray(saved.selected) || !Array.isArray(saved.known)) return new Set(items.map((item) => item.wasteId));
    const selected = new Set(saved.selected.filter((id) => items.some((item) => item.wasteId === id)));
    items.forEach((item) => { if (!saved.known.includes(item.wasteId)) selected.add(item.wasteId); });
    return selected;
  } catch { return new Set(items.map((item) => item.wasteId)); }
}
function persistSelection() {
  sessionStorage.setItem(SELECTED_CART_KEY, JSON.stringify({
    selected: [...selectedWasteIds],
    known: cartEntries.map((item) => item.wasteId || item.id),
  }));
}
function selectedItems() {
  return checkoutItems.filter((item) => selectedWasteIds.has(item.wasteId));
}
function persistCart() {
  sessionStorage.setItem(CART_KEY, JSON.stringify(cartEntries.map((item) => ({ wasteId: item.wasteId || item.id, quantity: item.quantity }))));
  window.dispatchEvent(new Event('foodilee:cart-updated'));
}
function invalidateCheckoutKey() { sessionStorage.removeItem(IDEMPOTENCY_KEY); }
function checkoutKey() {
  let key = sessionStorage.getItem(IDEMPOTENCY_KEY);
  if (!key) {
    key = crypto.randomUUID();
    sessionStorage.setItem(IDEMPOTENCY_KEY, key);
  }
  return key;
}
function savedAddress() {
  try { return JSON.parse(localStorage.getItem(ADDRESS_KEY) || '{}'); } catch { return {}; }
}

export async function renderCheckout() {
  const navigationRevision = getNavigationRevision();
  cartEntries = readCart();
  selectedWasteIds = readSelectedItems(cartEntries);
  checkoutItems = cartEntries.filter((item) => selectedWasteIds.has(item.wasteId));
  address = savedAddress();
  rates = [];
  selectedRate = null;
  checkoutBusy = false;
  paymentMethod = 'midtrans';
  const app = document.getElementById('app');
  app.innerHTML = `<div class="co-app">${dashboardHeader('market')}<main class="co-main"><a class="co-back" href="#cart">&larr; Kembali ke keranjang</a><header class="co-heading"><p>PEMBAYARAN AMAN</p><h1>Pembayaran</h1><span>Lengkapi alamat dan pengiriman untuk produk yang Anda pilih.</span></header><div class="co-layout"><div class="co-left"><section class="co-panel"><div class="co-section-head"><span>01</span><div><h2>Alamat penerima</h2><p>Wilayah Indonesia berjenjang. Ongkir dihitung ulang oleh server.</p></div></div><label class="co-label">Alamat tersimpan<select id="co-saved"><option value="">Pilih alamat tersimpan</option></select></label><form id="co-address" class="co-form" novalidate><div class="co-two"><label class="co-label">Nama penerima<input name="recipientName" autocomplete="name" required maxlength="100"></label><label class="co-label">Nomor telepon<input name="phone" autocomplete="tel" inputmode="tel" required maxlength="20"></label></div><label class="co-label">Provinsi<select id="co-province" required><option value="">Pilih provinsi</option></select></label><label class="co-label">Kabupaten/Kota<select id="co-city" required disabled><option value="">Pilih kabupaten/kota</option></select></label><label class="co-label">Kecamatan<select id="co-district" required disabled><option value="">Pilih kecamatan</option></select></label><label class="co-label">Desa/Kelurahan<select id="co-village" required disabled><option value="">Pilih desa/kelurahan</option></select></label><div class="co-two"><label class="co-label">Kode pos<input name="postalCode" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" required></label><label class="co-label">Detail alamat<input name="details" placeholder="Nama jalan, nomor rumah, RT/RW" required maxlength="240"></label></div><label class="co-label">Catatan untuk kurir (opsional)<input name="notes" maxlength="200"></label><button class="co-save-address" type="button" id="co-save-address">Simpan alamat ini</button><p class="co-error" id="co-address-error" role="alert"></p></form></section><section class="co-panel"><div class="co-section-head"><span>02</span><div><h2>Produk yang akan dibayar</h2><p>Rincian dan jumlah produk terpilih. Harga serta stok diperiksa kembali oleh server.</p></div></div><div id="co-items" class="co-items"><div class="co-loading">Memuat produk…</div></div></section><section class="co-panel"><div class="co-section-head"><span>03</span><div><h2>Pengiriman</h2><p>Pilihan kurir dan tarif aktual dari Biteship untuk produk terpilih.</p></div></div><div id="co-rates" class="co-rates"><p>Lengkapi alamat dan pilih produk untuk memuat layanan pengiriman.</p></div></section></div><aside class="co-summary"><h2>Ringkasan pembayaran</h2><div class="co-summary-row"><span>Produk dipilih</span><strong id="co-selected-count">0 produk</strong></div><div class="co-summary-row"><span>Subtotal produk</span><strong id="co-subtotal">—</strong></div><div class="co-summary-row"><span>Diskon</span><strong>Rp0</strong></div><div class="co-summary-row"><span>Pengiriman</span><strong id="co-shipping">Pilih layanan</strong></div><div class="co-summary-total"><span>Total</span><strong id="co-total">—</strong></div><button type="button" id="co-pay" disabled>Checkout produk dipilih</button><p id="co-pay-error" class="co-error" role="alert"></p><small>Total final dihitung dan diverifikasi kembali oleh backend.</small></aside></div></main>${dashboardFooter()}</div>`;
  const paymentOptions = document.createElement('fieldset');
  paymentOptions.className = 'co-payment-choice';
  paymentOptions.innerHTML = `<legend>Metode pembayaran</legend><label><input type="radio" name="payment-method" value="midtrans" checked><span><strong>Bayar online</strong><small>Midtrans · pembayaran di halaman ini</small></span></label><label><input type="radio" name="payment-method" value="cod"><span><strong>Bayar di tempat</strong><small>COD · bayar kepada kurir saat pesanan tiba</small></span></label>`;
  document.querySelector('.co-summary').insertBefore(paymentOptions, document.getElementById('co-pay'));
  const snapPanel = document.createElement('section');
  snapPanel.className = 'co-snap-panel'; snapPanel.hidden = true;
  snapPanel.innerHTML = '<h2>Pembayaran aman melalui Midtrans</h2><p>Kamu tetap berada di halaman Food Ilee. Status pembayaran dikonfirmasi oleh server.</p><div id="co-snap-container"></div><p id="co-snap-status" role="status"></p><a href="#transaksi">Lihat transaksi</a>';
  document.querySelector('.co-layout').after(snapPanel);
  injectCheckoutStyles(); injectToastStyle(); bindSharedHeader();
  await loadProducts(navigationRevision);
  if (!isRouteCurrent('#checkout', navigationRevision)) return;
  bindAddressForm();
  await loadRegionOptions(navigationRevision);
}

async function loadProducts(navigationRevision) {
  const root = document.getElementById('co-items');
  if (!checkoutItems.length) {
    root.innerHTML = '<div class="co-empty">Belum ada produk yang dipilih. <a href="#cart">Kembali ke keranjang</a></div>';
    updateSummary();
    return;
  }
  try {
    checkoutItems = await Promise.all(checkoutItems.map(async (item) => {
      const result = await getWaste(item.wasteId);
      if (!result.success || !result.data) throw new Error(result.message || 'Produk tidak tersedia.');
      return { ...result.data, wasteId: item.wasteId, quantity: Math.min(Number(item.quantity), Number(result.data.stock)) };
    }));
    if (!isRouteCurrent('#checkout', navigationRevision)) return;
    checkoutItems = checkoutItems.filter((item) => item.quantity > 0);
    const selectedById = new Map(checkoutItems.map((item) => [item.wasteId, item]));
    cartEntries = cartEntries.map((item) => {
      const refreshed = selectedById.get(item.wasteId);
      return refreshed ? { ...item, quantity: refreshed.quantity } : item;
    });
    renderItems(); updateSummary();
  } catch (error) {
    if (!isRouteCurrent('#checkout', navigationRevision)) return;
    root.innerHTML = `<p class="co-error">${escapeHtml(error.message || 'Produk belum dapat dimuat.')}</p>`;
  }
}

function renderItems() {
  const root = document.getElementById('co-items');
  if (!checkoutItems.length) {
    root.innerHTML = '<div class="co-empty">Belum ada produk yang dipilih. <a href="#cart">Kembali ke keranjang</a></div>';
    return;
  }
  root.innerHTML = checkoutItems.map((item) => `<article class="co-item"><img src="${escapeHtml(item.image || '')}" alt="${escapeHtml(item.title)}"><div class="co-item-copy"><strong>${escapeHtml(item.title)}</strong><span>${formatPrice(item.price)} / kg · ${item.quantity} kg</span></div><strong class="co-item-total">${formatPrice(Number(item.price) * item.quantity)}</strong></article>`).join('');
}

function readAddress() {
  const form = document.getElementById('co-address');
  const data = Object.fromEntries(new FormData(form).entries());
  const get = (id) => document.getElementById(id);
  return {
    ...data,
    provinceCode: get('co-province').value, province: get('co-province').selectedOptions[0]?.textContent || '',
    cityCode: get('co-city').value, city: get('co-city').selectedOptions[0]?.textContent || '',
    districtCode: get('co-district').value, district: get('co-district').selectedOptions[0]?.textContent || '',
    villageCode: get('co-village').value, village: get('co-village').selectedOptions[0]?.textContent || '',
  };
}

function bindAddressForm() {
  const form = document.getElementById('co-address');
  const saved = savedAddress();
  const addressSelect = document.getElementById('co-saved');
  if (saved.recipientName) {
    const option = document.createElement('option'); option.value = 'saved'; option.textContent = `${saved.recipientName} — ${saved.city || ''}`; addressSelect.append(option);
    addressSelect.value = 'saved';
  }
  addressSelect.addEventListener('change', () => { if (addressSelect.value) applyAddress(saved); });
  form.addEventListener('input', () => { invalidateCheckoutKey(); address = readAddress(); updateSummary(); loadRates(); });
  form.addEventListener('change', () => { invalidateCheckoutKey(); address = readAddress(); updateSummary(); loadRates(); });
  document.getElementById('co-save-address').addEventListener('click', () => {
    address = readAddress();
    const error = validateForm();
    if (error) { document.getElementById('co-address-error').textContent = error; return; }
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
    showToast('Alamat tersimpan di perangkat ini.');
  });
  document.getElementById('co-pay').addEventListener('click', submitCheckout);
  document.querySelectorAll('input[name="payment-method"]').forEach((radio) => radio.addEventListener('change', () => {
    paymentMethod = radio.value;
    invalidateCheckoutKey();
    loadRates();
  }));
}

async function fetchRegions(resource, parent) {
  const url = parent ? `${REGION_API}/${resource}/${encodeURIComponent(parent)}.json` : `${REGION_API}/provinces.json`;
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
  ['province', 'city', 'district'].forEach((level) => document.getElementById(`co-${level}`).addEventListener('change', async () => {
    const parent = document.getElementById(`co-${level}`).value;
    invalidateCheckoutKey();
    const next = { province: 'city', city: 'district', district: 'village' }[level];
    const resource = { city: 'regencies', district: 'districts', village: 'villages' }[next];
    const select = document.getElementById(`co-${next}`);
    setOptions(select, [], `Pilih ${next === 'city' ? 'kabupaten/kota' : next === 'district' ? 'kecamatan' : 'desa/kelurahan'}`);
    select.disabled = true;
    const descendantIds = level === 'province' ? ['co-district', 'co-village'] : level === 'city' ? ['co-village'] : [];
    for (const descendantId of descendantIds) {
      const descendant = document.getElementById(descendantId);
      descendant.replaceChildren(new Option(descendantId === 'co-district' ? 'Pilih kecamatan' : 'Pilih desa/kelurahan', ''));
      descendant.disabled = true;
    }
    address = readAddress(); loadRates();
    if (!parent) return;
    try { setOptions(select, await fetchRegions(resource, parent), 'Pilih ' + (next === 'city' ? 'kabupaten/kota' : next === 'district' ? 'kecamatan' : 'desa/kelurahan')); }
    catch (error) {
      if (!isRouteCurrent('#checkout', navigationRevision)) return;
      document.getElementById('co-address-error').textContent = error.message;
    }
    if (!isRouteCurrent('#checkout', navigationRevision)) return;
    address = readAddress(); loadRates();
  }));
  document.getElementById('co-village').addEventListener('change', () => {
    const selected = document.getElementById('co-village').selectedOptions[0];
    if (selected?.dataset.postalCode) document.querySelector('#co-address [name="postalCode"]').value = selected.dataset.postalCode;
    address = readAddress(); loadRates();
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
  for (const key of ['recipientName', 'phone', 'postalCode', 'details', 'notes']) if (form.elements[key]) form.elements[key].value = saved[key] || '';
  address = readAddress();
}

function applyAddress(value) {
  const form = document.getElementById('co-address');
  for (const key of ['recipientName', 'phone', 'postalCode', 'details', 'notes']) if (form.elements[key]) form.elements[key].value = value[key] || '';
  document.getElementById('co-province').value = value.provinceCode || '';
  const navigationRevision = getNavigationRevision();
  cascade('province', value, navigationRevision).then(() => {
    if (!isRouteCurrent('#checkout', navigationRevision)) return;
    address = readAddress(); loadRates();
  });
}

function validateForm() {
  const form = document.getElementById('co-address');
  if (!form.checkValidity()) return 'Lengkapi alamat penerima terlebih dahulu.';
  const current = readAddress();
  if (addressFields.some((key) => !String(current[key] || '').trim())) return 'Pilih semua wilayah hingga desa/kelurahan dan lengkapi detail alamat.';
  if (!/^\d{5}$/.test(current.postalCode)) return 'Kode pos harus terdiri dari 5 angka.';
  return '';
}

function updateSummary() {
  const chosenItems = selectedItems();
  const subtotal = chosenItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  document.getElementById('co-selected-count').textContent = `${chosenItems.length} ${chosenItems.length === 1 ? 'produk' : 'produk'}`;
  document.getElementById('co-subtotal').textContent = formatPrice(subtotal);
  document.getElementById('co-shipping').textContent = selectedRate ? `${formatPrice(selectedRate.price)}${paymentMethod === 'cod' && selectedRate.cashOnDeliveryFee ? ` · COD ${formatPrice(selectedRate.cashOnDeliveryFee)} dipotong dari pencairan penjual` : ''}` : 'Pilih layanan';
  document.getElementById('co-total').textContent = formatPrice(subtotal + Number(selectedRate?.price || 0));
  const valid = !validateForm() && chosenItems.length > 0 && selectedRate && !checkoutBusy;
  const payButton = document.getElementById('co-pay');
  payButton.disabled = !valid;
  payButton.textContent = paymentMethod === 'cod' ? 'Buat Pesanan COD' : 'Lanjut Bayar di Halaman Ini';
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
  selectedRate = null; rates = []; updateSummary();
  const root = document.getElementById('co-rates');
  if (!root) return;
  const error = validateForm();
  const chosenItems = selectedItems();
  if (error || !chosenItems.length) { root.innerHTML = `<p>${escapeHtml(error || 'Centang minimal satu produk untuk melihat tarif.')}</p>`; return; }
  root.innerHTML = '<div class="co-loading">Mengambil tarif kurir…</div>';
  try {
    const result = await getShippingRates(chosenItems.map((item) => ({ wasteId: item.id, quantity: item.quantity })), readAddress(), paymentMethod);
    if (revision !== rateRevision || !isRouteCurrent('#checkout', navigationRevision)) return;
    if (!result.success) throw new Error(result.message || 'Tarif pengiriman belum tersedia.');
    rates = (result.data || []).filter((rate) => paymentMethod !== 'cod' || rate.supportsCod);
    if (!rates.length) { root.innerHTML = `<p class="co-error">${paymentMethod === 'cod' ? 'Tidak ada layanan COD untuk alamat ini. Pilih Midtrans atau kurir lain.' : 'Tidak ada layanan pengiriman yang tersedia untuk alamat ini.'}</p>`; return; }
    root.innerHTML = rates.map((rate, index) => `<label class="co-rate"><input type="radio" name="co-rate" value="${index}"><span><strong>${escapeHtml(rate.courierName)} · ${escapeHtml(rate.serviceName)}</strong><small>${escapeHtml(rate.duration || 'Estimasi belum tersedia')}${paymentMethod === 'cod' && rate.cashOnDeliveryFee ? ` · Biaya COD ${formatPrice(rate.cashOnDeliveryFee)} (dipotong dari pencairan penjual)` : ''}</small></span><b>${formatPrice(rate.price)}</b></label>`).join('');
    root.querySelectorAll('input').forEach((radio) => radio.addEventListener('change', () => {
      selectedRate = rates[Number(radio.value)]; updateSummary();
    }));
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
  if (validation) { document.getElementById('co-address-error').textContent = validation; return; }
  checkoutBusy = true; updateSummary();
  const button = document.getElementById('co-pay'); button.textContent = 'Menyiapkan pembayaran…';
  const errorNode = document.getElementById('co-pay-error'); errorNode.textContent = '';
  try {
    const current = readAddress();
    const result = await createCheckout(
      chosenItems.map((item) => ({ wasteId: item.id, quantity: item.quantity })),
      current, selectedRate.company, selectedRate.courierType, checkoutKey(), paymentMethod,
    );
    if (!result.success || !result.data) throw new Error(result.message || 'Transaksi belum dapat dibuat.');
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(current));
    const purchasedIds = new Set(chosenItems.map((item) => item.wasteId));
    checkoutItems = checkoutItems.filter((item) => !purchasedIds.has(item.wasteId));
    selectedWasteIds = new Set([...selectedWasteIds].filter((id) => !purchasedIds.has(id)));
    persistCart(); persistSelection();
    window.dispatchEvent(new Event('foodilee:cart-updated'));
    sessionStorage.removeItem(IDEMPOTENCY_KEY);
    if (paymentMethod === 'cod') {
      const needsReview = ['configuration_missing', 'creation_requires_review'].includes(result.data.shippingStatus)
        || !result.data.biteshipOrderId
        || result.data.biteshipOrderId.startsWith('creating:');
      showToast(needsReview
        ? 'Pesanan tercatat, tetapi pengiriman belum terkonfirmasi. Periksa detail transaksi atau hubungi penjual.'
        : 'Pesanan COD dibuat. Pembayaran dilakukan kepada kurir saat pesanan tiba.', needsReview ? 'error' : 'success');
      location.hash = '#transaksi';
      return;
    }
    if (!result.data.snapToken || !result.data.snapClientKey || !result.data.snapJsUrl)
      throw new Error('Pesanan sudah dibuat, tetapi konfigurasi Snap belum lengkap. Buka transaksi untuk melanjutkan.');
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
        statusNode.textContent = latest.data.paymentStatus === 'paid'
          ? 'Pembayaran berhasil diverifikasi. Pesanan sedang diproses.'
          : `Status backend: ${latest.data.paymentStatus === 'pending' ? 'menunggu pembayaran' : latest.data.paymentStatus}.`;
      } catch {
        statusNode.textContent = 'Pembayaran diterima oleh Snap. Konfirmasi server belum tersedia; periksa kembali di halaman transaksi.';
      }
    };
    window.snap.embed(result.data.snapToken, {
      embedId: 'co-snap-container', language: 'id',
      onSuccess: () => verifyAndShow('Memverifikasi pembayaran…'),
      onPending: () => verifyAndShow('Pembayaran menunggu penyelesaian…'),
      onError: () => verifyAndShow('Pembayaran belum berhasil. Periksa status melalui transaksi.'),
      onClose: () => verifyAndShow('Pembayaran belum selesai. Pesanan tersimpan di transaksi.'),
    });
  } catch (error) {
    errorNode.textContent = error.message || 'Transaksi belum dapat dibuat.';
    checkoutBusy = false;
    if (selectedItems().length) { button.textContent = 'Lanjut Bayar di Halaman Ini'; updateSummary(); }
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
    script.onerror = () => reject(new Error('Snap Midtrans gagal dimuat. Pesanan sudah dibuat; lanjutkan dari halaman transaksi.'));
    document.head.append(script);
  });
}

function injectCheckoutStyles() {
  if (document.getElementById('checkout-style')) return;
  const style = document.createElement('style'); style.id = 'checkout-style';
  style.textContent = `.co-app{min-height:100vh;background:#DAF1DE;color:#163832;font-family:Inter,Arial,sans-serif}.co-main{max-width:1200px;margin:auto;padding:38px 24px 76px}.co-back{color:#235347;text-decoration:none;font-size:13px}.co-heading{margin:25px 0}.co-heading p{font-size:10px;letter-spacing:.14em;color:#77837e;font-weight:700}.co-heading h1{margin:4px 0;color:#0B2B26;font-size:36px}.co-heading span{color:#65736d}.co-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;align-items:start;gap:22px}.co-left{display:grid;gap:16px}.co-panel,.co-summary{background:#fff;border-radius:22px;padding:23px;box-shadow:0 10px 30px #16383208}.co-section-head{display:flex;gap:13px;align-items:flex-start;margin-bottom:20px}.co-section-head>span{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#e5f2ed;color:#235347;font-size:12px;font-weight:700}.co-section-head h2,.co-summary h2{margin:0 0 4px;font-size:18px;color:#174a3b}.co-section-head p{margin:0;color:#76827c;font-size:12px;line-height:1.5}.co-label{display:grid;gap:7px;margin:12px 0;color:#42584e;font-size:12px;font-weight:600}.co-label input,.co-label select{width:100%;height:42px;padding:0 12px;border:1px solid #dfe9e2;border-radius:10px;background:white;color:#253b31;font:400 13px Inter,Arial,sans-serif;box-sizing:border-box}.co-label select:disabled{background:#f4f6f4;color:#8c9790}.co-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.co-save-address,.co-retry{border:0;background:transparent;color:#146354;padding:8px 0;font-weight:600;cursor:pointer}.co-error{color:#a34338;font-size:12px;line-height:1.5}.co-items{display:grid;gap:13px}.co-item{display:flex;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid #edf1ee}.co-item img{width:72px;height:72px;border-radius:11px;background:#f0f3ef;object-fit:cover}.co-item-copy{display:grid;gap:5px;flex:1}.co-item-copy strong{font-size:14px}.co-item-copy span{color:#6e7a73;font-size:12px}.co-quantity{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.co-quantity button{width:29px;height:29px;border:1px solid #dce6df;border-radius:8px;background:#fff;color:#175c4c;cursor:pointer}.co-quantity button:disabled{opacity:.4}.co-quantity span{font-size:12px;white-space:nowrap}.co-quantity .co-remove{width:auto;border:0;color:#9b5144;font-size:11px}.co-empty,.co-rates>p{color:#77837c;font-size:13px;line-height:1.6}.co-empty a{color:#166453}.co-loading{padding:14px 0;color:#718078;font-size:13px}.co-rate{display:flex;gap:12px;align-items:center;padding:14px;border:1px solid #e3ece5;border-radius:13px;margin:9px 0;cursor:pointer}.co-rate:has(input:checked){border-color:#167362;background:#f3faf7}.co-rate input{accent-color:#146354}.co-rate span{display:grid;gap:5px;flex:1}.co-rate strong{font-size:13px}.co-rate small{font-size:11px;color:#7b8780}.co-rate b{font-size:13px;color:#12604e;white-space:nowrap}.co-summary{position:sticky;top:20px}.co-summary h2{margin-bottom:20px}.co-summary-row,.co-summary-total{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid #edf1ee;font-size:13px;color:#6b7770}.co-summary-row strong{color:#31473b;font-weight:600}.co-summary-total{align-items:center;padding:20px 0;color:#1b4234;font-weight:700}.co-summary-total strong{font-size:21px;color:#163832}.co-summary>button{width:100%;height:48px;border:0;border-radius:999px;background:#163832;color:white;font:600 14px Inter,Arial,sans-serif;cursor:pointer}.co-summary>button:disabled{background:#a7b9b1;cursor:not-allowed}.co-summary>small{display:block;margin-top:12px;color:#829087;line-height:1.5}.co-summary>.co-error{min-height:16px}.co-detail-link{color:#235347}@media(max-width:850px){.co-layout{grid-template-columns:1fr}.co-summary{position:static;order:-1}.co-main{padding:28px 18px 50px}}@media(max-width:560px){.co-heading h1{font-size:30px}.co-panel,.co-summary{padding:18px;border-radius:17px}.co-two{grid-template-columns:1fr;gap:0}.co-item{align-items:flex-start;flex-wrap:wrap}.co-item-copy{min-width:calc(100% - 90px)}.co-quantity{width:100%;justify-content:flex-start;padding-left:84px}}`;
  style.textContent += `
    .co-main{max-width:1240px;padding:36px 28px 80px}
    .co-back{width:max-content;min-height:40px;box-sizing:border-box;padding:0 15px 0 11px;border:1px solid #bdd5c8;border-radius:999px;display:inline-flex;align-items:center;gap:9px;background:linear-gradient(135deg,#f8fcf9,#eaf5ef);color:#17604d;font-size:12px;font-weight:700;box-shadow:0 4px 12px #1638320c;transition:transform 180ms ease,box-shadow 180ms ease,border-color 180ms ease}
    .co-back::before{content:'←';width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#dcefe3;color:#17604d;font-size:15px;transition:transform 180ms ease}
    .co-back:hover{transform:translateY(-2px);border-color:#8fb8a0;box-shadow:0 8px 18px #16383216}
    .co-back:hover::before{transform:translateX(-2px)}
    .co-heading{margin:23px 0 24px;padding:0 0 22px;border-bottom:1px solid #bfcec5}
    .co-heading p{width:max-content;margin:0 0 11px;padding:7px 11px;border:1px solid #c7e0ce;border-radius:999px;display:flex;align-items:center;gap:7px;background:#DAF1DE;color:#356d4b;font-size:9px;letter-spacing:.12em}
    .co-heading p::before{content:'';width:7px;height:7px;border-radius:50%;background:#42915c;box-shadow:0 0 0 3px #42915c20}
    .co-heading h1{margin:0;color:#104b3e;font-size:clamp(32px,4vw,42px);line-height:1.12;letter-spacing:-1.4px}
    .co-heading span{display:block;margin-top:9px;color:#61746a;font-size:14px;line-height:1.6}
    .co-layout{grid-template-columns:minmax(0,1fr) 340px;gap:30px}
    .co-left{gap:18px}
    .co-panel,.co-summary{border:1px solid #c6d6cc;border-radius:20px;box-shadow:0 8px 22px #1638320b,0 1px 2px #1638320a}
    .co-panel{padding:25px}
    .co-items{gap:0}
    .co-select-all{min-height:44px;margin:-4px 0 5px;padding:0 2px 10px;border-bottom:1px solid #dce7df;display:flex;align-items:center;justify-content:space-between;gap:12px}
    .co-select-all label{display:flex;align-items:center;gap:10px;color:#315746;font-size:12px;font-weight:700;cursor:pointer}
    .co-select-all small{color:#78877e;font-size:11px}
    .co-select-all input,.co-item-check input{width:18px;height:18px;margin:0;accent-color:#235347;cursor:pointer}
    .co-item{min-width:0;gap:14px;padding:16px 2px;border-bottom:1px solid #dce5de;transition:background 160ms ease}
    .co-item:last-child{border-bottom:0;padding-bottom:2px}
    .co-item.is-selected{background:linear-gradient(90deg,#f4faf6,transparent 78%)}
    .co-item-check{width:20px;flex:none;display:grid;place-items:center;cursor:pointer}
    .co-item img{flex:none;border:1px solid #dce6df}
    .co-item-copy{min-width:0;align-self:center}
    .co-item-copy strong{line-height:1.4}
    .co-quantity{flex:none}
    .co-section-head{padding-bottom:16px;border-bottom:1px solid #dce7df}
    .co-section-head>span{flex:none;border:1px solid #c8dfd0;background:#DAF1DE}
    .co-label{line-height:1.4}
    .co-label input,.co-label select{border-color:#cad9cf;transition:border-color 160ms ease,box-shadow 160ms ease}
    .co-label input:focus,.co-label select:focus{outline:0;border-color:#398364;box-shadow:0 0 0 3px #39836420}
    .co-summary{padding:24px;position:sticky;top:96px}
    .co-summary h2{padding-bottom:16px;border-bottom:1px solid #dce7df;line-height:1.35}
    .co-summary-row,.co-summary-total{border-color:#dce5de}
    .co-rate{border-color:#cbdad0;transition:border-color 160ms ease,box-shadow 160ms ease,background 160ms ease}
    .co-rate:hover{border-color:#7eaf91;box-shadow:0 4px 12px #1638320c}
    .co-rate:has(input:checked){border-color:#167362;box-shadow:inset 0 0 0 1px #16736230}
    #co-pay{transition:transform 160ms ease,box-shadow 160ms ease,background 160ms ease}
    #co-pay:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 8px 16px #16383228}
    @media(max-width:850px){.co-layout{gap:18px}.co-summary{top:auto;border-bottom:2px solid #afc6b7}}
    @media(max-width:700px){.co-item{display:grid;grid-template-columns:20px 64px minmax(0,1fr);align-items:start;gap:10px}.co-item img{width:64px;height:64px}.co-item-copy{min-width:0}.co-quantity{grid-column:2/-1;width:auto;justify-content:flex-start;padding-left:0}}
    @media(max-width:560px){.co-main{padding:24px 15px 52px}.co-heading{margin:20px 0;padding-bottom:18px}.co-heading h1{font-size:32px}.co-heading span{font-size:13px}.co-panel,.co-summary{padding:18px;border-radius:17px}.co-section-head{padding-bottom:14px}.co-layout{gap:14px}.co-select-all small{font-size:10px}.co-item{padding:14px 0}.co-quantity{gap:7px}.co-quantity button{width:31px;height:31px}}
    @media(prefers-reduced-motion:reduce){.co-back,.co-back::before,.co-rate,#co-pay{transition:none}}
    .co-payment-choice{margin:18px 0;padding:13px;border:1px solid #dce7df;border-radius:13px;display:grid;gap:9px}
    .co-payment-choice legend{padding:0 5px;color:#315746;font-size:12px;font-weight:700}
    .co-payment-choice label{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #e0e9e3;border-radius:10px;cursor:pointer}
    .co-payment-choice input{accent-color:#235347}
    .co-payment-choice span{display:grid;gap:3px}
    .co-payment-choice strong{color:#244b3b;font-size:12px}
    .co-payment-choice small{color:#78877e;font-size:10px}
    .co-snap-panel{margin:24px auto 0;padding:24px;border:1px solid #c6d6cc;border-radius:20px;background:#fff;box-shadow:0 8px 22px #1638320b}
    .co-snap-panel[hidden]{display:none}
    .co-snap-panel h2{margin:0;color:#174a3b;font-size:20px}
    .co-snap-panel p{color:#61746a;font-size:13px;line-height:1.6}
    #co-snap-container{min-height:560px;width:100%}
    #co-snap-status{font-weight:600}
    @media(max-width:560px){.co-snap-panel{padding:16px}#co-snap-container{min-height:570px}}
  `;
  document.head.append(style);
}
