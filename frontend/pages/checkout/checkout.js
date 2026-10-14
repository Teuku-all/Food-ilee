import { createCheckout, getShippingRates } from '../../services/order.js';
import { getWaste } from '../../services/waste.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast, injectToastStyle } from '../../utils/toast.js';
import { bindSharedHeader, dashboardFooter, dashboardHeader } from '../../ui/shell.js';

const REGION_API = 'https://www.emsifa.com/api-wilayah-indonesia/v2';
const CART_KEY = 'foodilee_checkout_cart';
const ADDRESS_KEY = 'foodilee_shipping_address';
const IDEMPOTENCY_KEY = 'foodilee_checkout_idempotency_key';
const addressFields = ['recipientName', 'phone', 'provinceCode', 'province', 'cityCode', 'city', 'districtCode', 'district', 'villageCode', 'village', 'postalCode', 'details'];
let checkoutItems = [];
let address = {};
let rates = [];
let selectedRate = null;
let rateRevision = 0;
let rateTimer = null;
let checkoutBusy = false;

function formatPrice(value) { return `Rp${Number(value || 0).toLocaleString('id-ID')}`; }
function readCart() {
  try {
    const value = JSON.parse(sessionStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => item?.wasteId && Number(item.quantity) > 0) : [];
  } catch { return []; }
}
function persistCart() { sessionStorage.setItem(CART_KEY, JSON.stringify(checkoutItems.map(({ wasteId, quantity }) => ({ wasteId, quantity })))); }
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
  checkoutItems = readCart();
  address = savedAddress();
  rates = [];
  selectedRate = null;
  checkoutBusy = false;
  const app = document.getElementById('app');
  app.innerHTML = `<div class="co-app">${dashboardHeader('market')}<main class="co-main"><a class="co-back" href="#marketplace">← Kembali ke marketplace</a><header class="co-heading"><p>PEMBAYARAN AMAN</p><h1>Checkout</h1><span>Periksa alamat, produk, dan pilihan pengiriman Anda.</span></header><div class="co-layout"><div class="co-left"><section class="co-panel"><div class="co-section-head"><span>01</span><div><h2>Alamat penerima</h2><p>Wilayah Indonesia berjenjang. Ongkir dihitung ulang oleh server.</p></div></div><label class="co-label">Alamat tersimpan<select id="co-saved"><option value="">Pilih alamat tersimpan</option></select></label><form id="co-address" class="co-form" novalidate><div class="co-two"><label class="co-label">Nama penerima<input name="recipientName" autocomplete="name" required maxlength="100"></label><label class="co-label">Nomor telepon<input name="phone" autocomplete="tel" inputmode="tel" required maxlength="20"></label></div><label class="co-label">Provinsi<select id="co-province" required><option value="">Pilih provinsi</option></select></label><label class="co-label">Kabupaten/Kota<select id="co-city" required disabled><option value="">Pilih kabupaten/kota</option></select></label><label class="co-label">Kecamatan<select id="co-district" required disabled><option value="">Pilih kecamatan</option></select></label><label class="co-label">Desa/Kelurahan<select id="co-village" required disabled><option value="">Pilih desa/kelurahan</option></select></label><div class="co-two"><label class="co-label">Kode pos<input name="postalCode" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" required></label><label class="co-label">Detail alamat<input name="details" placeholder="Nama jalan, nomor rumah, RT/RW" required maxlength="240"></label></div><label class="co-label">Catatan untuk kurir (opsional)<input name="notes" maxlength="200"></label><button class="co-save-address" type="button" id="co-save-address">Simpan alamat ini</button><p class="co-error" id="co-address-error" role="alert"></p></form></section><section class="co-panel"><div class="co-section-head"><span>02</span><div><h2>Produk</h2><p>Harga dan stok akan diperiksa kembali oleh server.</p></div></div><div id="co-items" class="co-items"><div class="co-loading">Memuat produk…</div></div></section><section class="co-panel"><div class="co-section-head"><span>03</span><div><h2>Pengiriman</h2><p>Pilihan kurir dan tarif aktual dari Biteship.</p></div></div><div id="co-rates" class="co-rates"><p>Lengkapi alamat dan keranjang untuk memuat layanan pengiriman.</p></div></section></div><aside class="co-summary"><h2>Ringkasan pembayaran</h2><div class="co-summary-row"><span>Subtotal produk</span><strong id="co-subtotal">—</strong></div><div class="co-summary-row"><span>Diskon</span><strong>Rp0</strong></div><div class="co-summary-row"><span>Pengiriman</span><strong id="co-shipping">Pilih layanan</strong></div><div class="co-summary-total"><span>Total</span><strong id="co-total">—</strong></div><button type="button" id="co-pay" disabled>Lanjut ke Pembayaran</button><p id="co-pay-error" class="co-error" role="alert"></p><small>Total final dihitung dan diverifikasi kembali oleh backend.</small></aside></div></main>${dashboardFooter()}</div>`;
  injectCheckoutStyles(); injectToastStyle(); bindSharedHeader();
  await loadProducts();
  bindAddressForm();
  await loadRegionOptions();
}

async function loadProducts() {
  const root = document.getElementById('co-items');
  if (!checkoutItems.length) {
    root.innerHTML = '<div class="co-empty">Keranjang checkout kosong. <a href="#marketplace">Pilih produk</a></div>';
    return;
  }
  try {
    checkoutItems = await Promise.all(checkoutItems.map(async (item) => {
      const result = await getWaste(item.wasteId);
      if (!result.success || !result.data) throw new Error(result.message || 'Produk tidak tersedia.');
      return { ...result.data, quantity: Math.min(Number(item.quantity), Number(result.data.stock)) };
    }));
    checkoutItems = checkoutItems.filter((item) => item.quantity > 0);
    persistCart(); renderItems(); updateSummary();
  } catch (error) {
    root.innerHTML = `<p class="co-error">${escapeHtml(error.message || 'Produk belum dapat dimuat.')}</p>`;
  }
}

function renderItems() {
  const root = document.getElementById('co-items');
  root.innerHTML = checkoutItems.map((item, index) => `<article class="co-item"><img src="${escapeHtml(item.image || '')}" alt="${escapeHtml(item.title)}"><div class="co-item-copy"><strong>${escapeHtml(item.title)}</strong><span>${formatPrice(item.price)} / kg</span><span>Subtotal ${formatPrice(Number(item.price) * item.quantity)}</span></div><div class="co-quantity"><button type="button" data-qty="${index}" data-delta="-1" aria-label="Kurangi ${escapeHtml(item.title)}">−</button><span>${item.quantity} kg</span><button type="button" data-qty="${index}" data-delta="1" aria-label="Tambah ${escapeHtml(item.title)}" ${item.quantity >= item.stock ? 'disabled' : ''}>+</button><button class="co-remove" type="button" data-remove="${index}">Hapus</button></div></article>`).join('') || '<div class="co-empty">Keranjang checkout kosong. <a href="#marketplace">Pilih produk</a></div>';
  root.querySelectorAll('[data-qty]').forEach((button) => button.addEventListener('click', () => {
    const item = checkoutItems[Number(button.dataset.qty)];
    item.quantity = Math.max(1, Math.min(item.stock, item.quantity + Number(button.dataset.delta)));
    invalidateCheckoutKey();
    persistCart(); renderItems(); updateSummary(); loadRates();
  }));
  root.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => {
    checkoutItems.splice(Number(button.dataset.remove), 1); invalidateCheckoutKey(); persistCart(); renderItems(); updateSummary(); loadRates();
  }));
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
async function loadRegionOptions() {
  try {
    const provinces = await fetchRegions('provinces');
    setOptions(document.getElementById('co-province'), provinces, 'Pilih provinsi');
    const saved = savedAddress();
    if (saved.provinceCode) {
      document.getElementById('co-province').value = saved.provinceCode;
      await cascade('province', saved);
      address = readAddress();
      loadRates();
    }
  } catch (error) {
    document.getElementById('co-address-error').textContent = error.message;
  }
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
    catch (error) { document.getElementById('co-address-error').textContent = error.message; }
    address = readAddress(); loadRates();
  }));
  document.getElementById('co-village').addEventListener('change', () => {
    const selected = document.getElementById('co-village').selectedOptions[0];
    if (selected?.dataset.postalCode) document.querySelector('#co-address [name="postalCode"]').value = selected.dataset.postalCode;
    address = readAddress(); loadRates();
  });
}

async function cascade(level, saved) {
  const city = document.getElementById('co-city');
  setOptions(city, await fetchRegions('regencies', saved.provinceCode), 'Pilih kabupaten/kota');
  city.value = saved.cityCode || '';
  if (!city.value) return;
  const district = document.getElementById('co-district');
  setOptions(district, await fetchRegions('districts', saved.cityCode), 'Pilih kecamatan');
  district.value = saved.districtCode || '';
  if (!district.value) return;
  const village = document.getElementById('co-village');
  setOptions(village, await fetchRegions('villages', saved.districtCode), 'Pilih desa/kelurahan');
  village.value = saved.villageCode || '';
  const form = document.getElementById('co-address');
  for (const key of ['recipientName', 'phone', 'postalCode', 'details', 'notes']) if (form.elements[key]) form.elements[key].value = saved[key] || '';
  address = readAddress();
}

function applyAddress(value) {
  const form = document.getElementById('co-address');
  for (const key of ['recipientName', 'phone', 'postalCode', 'details', 'notes']) if (form.elements[key]) form.elements[key].value = value[key] || '';
  document.getElementById('co-province').value = value.provinceCode || '';
  cascade('province', value).then(() => { address = readAddress(); loadRates(); });
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
  const subtotal = checkoutItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  document.getElementById('co-subtotal').textContent = formatPrice(subtotal);
  document.getElementById('co-shipping').textContent = selectedRate ? formatPrice(selectedRate.price) : 'Pilih layanan';
  document.getElementById('co-total').textContent = formatPrice(subtotal + Number(selectedRate?.price || 0));
  const valid = !validateForm() && checkoutItems.length > 0 && selectedRate && !checkoutBusy;
  document.getElementById('co-pay').disabled = !valid;
}

async function loadRates() {
  clearTimeout(rateTimer);
  const revision = ++rateRevision;
  selectedRate = null;
  updateSummary();
  rateTimer = setTimeout(() => loadRatesNow(revision), 350);
}

async function loadRatesNow(revision) {
  selectedRate = null; rates = []; updateSummary();
  const root = document.getElementById('co-rates');
  if (!root) return;
  const error = validateForm();
  if (error || !checkoutItems.length) { root.innerHTML = `<p>${escapeHtml(error || 'Tambahkan produk untuk melihat tarif.')}</p>`; return; }
  root.innerHTML = '<div class="co-loading">Mengambil tarif kurir…</div>';
  try {
    const result = await getShippingRates(checkoutItems.map((item) => ({ wasteId: item.id, quantity: item.quantity })), readAddress());
    if (revision !== rateRevision) return;
    if (!result.success) throw new Error(result.message || 'Tarif pengiriman belum tersedia.');
    rates = result.data || [];
    if (!rates.length) { root.innerHTML = '<p class="co-error">Tidak ada layanan pengiriman yang tersedia untuk alamat ini.</p>'; return; }
    root.innerHTML = rates.map((rate, index) => `<label class="co-rate"><input type="radio" name="co-rate" value="${index}"><span><strong>${escapeHtml(rate.courierName)} · ${escapeHtml(rate.serviceName)}</strong><small>${escapeHtml(rate.duration || 'Estimasi belum tersedia')}</small></span><b>${formatPrice(rate.price)}</b></label>`).join('');
    root.querySelectorAll('input').forEach((radio) => radio.addEventListener('change', () => {
      selectedRate = rates[Number(radio.value)]; updateSummary();
    }));
  } catch (error) {
    if (revision !== rateRevision) return;
    root.innerHTML = `<p class="co-error">${escapeHtml(error.message || 'Ongkir gagal dimuat.')}</p><button type="button" class="co-retry" id="co-retry-rate">Coba lagi</button>`;
    document.getElementById('co-retry-rate')?.addEventListener('click', loadRates);
  }
}

async function submitCheckout() {
  if (checkoutBusy || !selectedRate) return;
  const validation = validateForm();
  if (validation) { document.getElementById('co-address-error').textContent = validation; return; }
  checkoutBusy = true; updateSummary();
  const button = document.getElementById('co-pay'); button.textContent = 'Menyiapkan pembayaran…';
  const errorNode = document.getElementById('co-pay-error'); errorNode.textContent = '';
  try {
    const current = readAddress();
    const result = await createCheckout(
      checkoutItems.map((item) => ({ wasteId: item.id, quantity: item.quantity })),
      current, selectedRate.company, selectedRate.courierType, checkoutKey(),
    );
    if (!result.success || !result.data?.paymentUrl) throw new Error(result.message || 'Transaksi belum dapat dibuat.');
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(current));
    sessionStorage.removeItem(CART_KEY);
    sessionStorage.removeItem(IDEMPOTENCY_KEY);
    window.location.assign(result.data.paymentUrl);
  } catch (error) {
    errorNode.textContent = error.message || 'Transaksi belum dapat dibuat.';
    checkoutBusy = false; button.textContent = 'Lanjut ke Pembayaran'; updateSummary();
  }
}

function injectCheckoutStyles() {
  if (document.getElementById('checkout-style')) return;
  const style = document.createElement('style'); style.id = 'checkout-style';
  style.textContent = `.co-app{min-height:100vh;background:#dce8e6;color:#173d3c;font-family:Inter,Arial,sans-serif}.co-main{max-width:1200px;margin:auto;padding:38px 24px 76px}.co-back{color:#176457;text-decoration:none;font-size:13px}.co-heading{margin:25px 0}.co-heading p{font-size:10px;letter-spacing:.14em;color:#77837e;font-weight:700}.co-heading h1{margin:4px 0;color:#004847;font-size:36px}.co-heading span{color:#65736d}.co-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;align-items:start;gap:22px}.co-left{display:grid;gap:16px}.co-panel,.co-summary{background:#fff;border-radius:22px;padding:23px;box-shadow:0 10px 30px #173d3c08}.co-section-head{display:flex;gap:13px;align-items:flex-start;margin-bottom:20px}.co-section-head>span{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#e5f2ed;color:#176457;font-size:12px;font-weight:700}.co-section-head h2,.co-summary h2{margin:0 0 4px;font-size:18px;color:#174a3b}.co-section-head p{margin:0;color:#76827c;font-size:12px;line-height:1.5}.co-label{display:grid;gap:7px;margin:12px 0;color:#42584e;font-size:12px;font-weight:600}.co-label input,.co-label select{width:100%;height:42px;padding:0 12px;border:1px solid #dfe9e2;border-radius:10px;background:white;color:#253b31;font:400 13px Inter,Arial,sans-serif;box-sizing:border-box}.co-label select:disabled{background:#f4f6f4;color:#8c9790}.co-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.co-save-address,.co-retry{border:0;background:transparent;color:#146354;padding:8px 0;font-weight:600;cursor:pointer}.co-error{color:#a34338;font-size:12px;line-height:1.5}.co-items{display:grid;gap:13px}.co-item{display:flex;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid #edf1ee}.co-item img{width:72px;height:72px;border-radius:11px;background:#f0f3ef;object-fit:cover}.co-item-copy{display:grid;gap:5px;flex:1}.co-item-copy strong{font-size:14px}.co-item-copy span{color:#6e7a73;font-size:12px}.co-quantity{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.co-quantity button{width:29px;height:29px;border:1px solid #dce6df;border-radius:8px;background:#fff;color:#175c4c;cursor:pointer}.co-quantity button:disabled{opacity:.4}.co-quantity span{font-size:12px;white-space:nowrap}.co-quantity .co-remove{width:auto;border:0;color:#9b5144;font-size:11px}.co-empty,.co-rates>p{color:#77837c;font-size:13px;line-height:1.6}.co-empty a{color:#166453}.co-loading{padding:14px 0;color:#718078;font-size:13px}.co-rate{display:flex;gap:12px;align-items:center;padding:14px;border:1px solid #e3ece5;border-radius:13px;margin:9px 0;cursor:pointer}.co-rate:has(input:checked){border-color:#167362;background:#f3faf7}.co-rate input{accent-color:#146354}.co-rate span{display:grid;gap:5px;flex:1}.co-rate strong{font-size:13px}.co-rate small{font-size:11px;color:#7b8780}.co-rate b{font-size:13px;color:#12604e;white-space:nowrap}.co-summary{position:sticky;top:20px}.co-summary h2{margin-bottom:20px}.co-summary-row,.co-summary-total{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid #edf1ee;font-size:13px;color:#6b7770}.co-summary-row strong{color:#31473b;font-weight:600}.co-summary-total{align-items:center;padding:20px 0;color:#1b4234;font-weight:700}.co-summary-total strong{font-size:21px;color:#005448}.co-summary>button{width:100%;height:48px;border:0;border-radius:999px;background:#005448;color:white;font:600 14px Inter,Arial,sans-serif;cursor:pointer}.co-summary>button:disabled{background:#a7b9b1;cursor:not-allowed}.co-summary>small{display:block;margin-top:12px;color:#829087;line-height:1.5}.co-summary>.co-error{min-height:16px}.co-detail-link{color:#176457}@media(max-width:850px){.co-layout{grid-template-columns:1fr}.co-summary{position:static;order:-1}.co-main{padding:28px 18px 50px}}@media(max-width:560px){.co-heading h1{font-size:30px}.co-panel,.co-summary{padding:18px;border-radius:17px}.co-two{grid-template-columns:1fr;gap:0}.co-item{align-items:flex-start;flex-wrap:wrap}.co-item-copy{min-width:calc(100% - 90px)}.co-quantity{width:100%;justify-content:flex-start;padding-left:84px}}`;
  document.head.append(style);
}
