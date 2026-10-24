import { getWaste } from '../../services/waste.js';
import { escapeHtml } from '../../utils/html.js';
import { bindSharedHeader, dashboardFooter, dashboardHeader } from '../../ui/shell.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { icon } from '../../ui/icons.js';

const CART_KEY = 'foodilee_checkout_cart';
const SELECTED_KEY = 'foodilee_checkout_selected';
let cartItems = [];
let selectedIds = new Set();

function readCart() {
  try {
    const value = JSON.parse(sessionStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => item?.wasteId && Number(item.quantity) > 0) : [];
  } catch { return []; }
}

function readSelection(items) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SELECTED_KEY) || 'null');
    if (!saved || !Array.isArray(saved.selected) || !Array.isArray(saved.known)) {
      return new Set(items.map((item) => item.wasteId));
    }
    const selected = new Set(saved.selected.filter((id) => items.some((item) => item.wasteId === id)));
    items.forEach((item) => { if (!saved.known.includes(item.wasteId)) selected.add(item.wasteId); });
    return selected;
  } catch { return new Set(items.map((item) => item.wasteId)); }
}

function persistCart() {
  sessionStorage.setItem(CART_KEY, JSON.stringify(cartItems.map(({ wasteId, quantity }) => ({ wasteId, quantity }))));
  window.dispatchEvent(new Event('foodilee:cart-updated'));
}

function persistSelection() {
  sessionStorage.setItem(SELECTED_KEY, JSON.stringify({ selected: [...selectedIds], known: cartItems.map((item) => item.wasteId) }));
}

function formatPrice(value) { return `Rp${Number(value || 0).toLocaleString('id-ID')}`; }

export async function renderCart() {
  const revision = getNavigationRevision();
  cartItems = readCart();
  selectedIds = readSelection(cartItems);
  const app = document.getElementById('app');
  app.innerHTML = `<div class="ca-app">${dashboardHeader('market')}<main class="ca-main"><header class="ca-heading"><h1>Keranjang</h1></header><div class="ca-layout"><section class="ca-list-panel"><div class="ca-list-heading"><div><h2>Produk</h2><p id="ca-list-count">Memuat isi keranjang…</p></div><label class="ca-select-all"><input type="checkbox" id="ca-select-all"><span>Pilih semua</span></label></div><div class="ca-table-head"><span>Produk</span><span>Jumlah</span><span>Subtotal</span><span>Aksi</span></div><div id="ca-items" class="ca-items"><div class="ca-loading">Memuat produk…</div></div></section><aside class="ca-summary"><div class="ca-summary-heading"><h2>Ringkasan</h2></div><div class="ca-summary-row"><span>Produk dipilih</span><strong id="ca-selected-count">0 produk</strong></div><div class="ca-summary-row"><span>Subtotal</span><strong id="ca-subtotal">Rp0</strong></div><button id="ca-checkout" type="button" disabled>Lanjut ke pembayaran <span aria-hidden="true">→</span></button></aside></div></main>${dashboardFooter()}</div>`;
  injectCartStyles();
  bindSharedHeader();
  await loadCartProducts(revision);
}

async function loadCartProducts(revision) {
  const root = document.getElementById('ca-items');
  if (!cartItems.length) {
    selectedIds = new Set();
    persistSelection();
    renderCartItems();
    return;
  }
  const results = await Promise.all(cartItems.map(async (entry) => {
    try {
      const result = await getWaste(entry.wasteId);
      if (!result.success || !result.data) return { ...entry, unavailable: true };
      return { ...result.data, wasteId: entry.wasteId, quantity: Math.min(Number(entry.quantity), Number(result.data.stock) || 0) };
    } catch { return { ...entry, unavailable: true }; }
  }));
  if (!isRouteCurrent('#cart', revision)) return;
  cartItems = results;
  selectedIds = new Set(cartItems.filter((item) => !item.unavailable && Number(item.quantity) > 0 && selectedIds.has(item.wasteId)).map((item) => item.wasteId));
  persistCart();
  persistSelection();
  renderCartItems();
}

function renderCartItems() {
  const root = document.getElementById('ca-items');
  const countNode = document.getElementById('ca-list-count');
  if (!cartItems.length) {
    countNode.textContent = 'Belum ada produk di keranjang';
    root.innerHTML = `<div class="ca-empty"><span>${icon('cart')}</span><strong>Keranjang Anda masih kosong</strong><p>Temukan produk yang ingin dimanfaatkan dari marketplace.</p><a href="#marketplace">Jelajahi marketplace</a></div>`;
    updateCartSummary();
    bindCartActions();
    return;
  }
  countNode.textContent = `${cartItems.length} produk dalam keranjang`;
  root.innerHTML = cartItems.map((item, index) => {
    const selected = selectedIds.has(item.wasteId) && !item.unavailable;
    return `<article class="ca-item${selected ? ' is-selected' : ''}${item.unavailable ? ' is-unavailable' : ''}"><label class="ca-check"><input type="checkbox" data-select="${index}" ${selected ? 'checked' : ''} ${item.unavailable ? 'disabled' : ''} aria-label="Pilih ${escapeHtml(item.title || 'produk')} untuk checkout"><span></span></label><img class="ca-product-image" src="${escapeHtml(item.image || '/assets/foodilee-login-hero.png')}" alt="${escapeHtml(item.title || 'Produk')}"><div class="ca-product"><strong>${escapeHtml(item.title || 'Produk tidak tersedia')}</strong><span>${item.unavailable ? 'Informasi produk tidak dapat dimuat' : `${formatPrice(item.price)} / kg`}</span>${item.unavailable ? '<small>Hapus produk ini dari keranjang untuk melanjutkan.</small>' : ''}</div><div class="ca-quantity"><button type="button" data-delta="-1" data-index="${index}" aria-label="Kurangi jumlah" ${item.unavailable || item.quantity <= 1 ? 'disabled' : ''}>−</button><span>${Number(item.quantity || 0)} kg</span><button type="button" data-delta="1" data-index="${index}" aria-label="Tambah jumlah" ${item.unavailable || item.quantity >= Number(item.stock) ? 'disabled' : ''}>+</button></div><strong class="ca-item-total">${item.unavailable ? '—' : formatPrice(Number(item.price) * Number(item.quantity))}</strong><button class="ca-remove" type="button" data-remove="${index}" aria-label="Hapus ${escapeHtml(item.title || 'produk')} dari keranjang">${trashIcon()}</button></article>`;
  }).join('');
  const selectAll = document.getElementById('ca-select-all');
  const availableItems = cartItems.filter((item) => !item.unavailable && Number(item.quantity) > 0);
  selectAll.checked = availableItems.length > 0 && availableItems.every((item) => selectedIds.has(item.wasteId));
  selectAll.indeterminate = selectedIds.size > 0 && !selectAll.checked;
  bindCartActions();
  updateCartSummary();
}

function bindCartActions() {
  document.getElementById('ca-select-all')?.addEventListener('change', (event) => {
    selectedIds = event.currentTarget.checked
      ? new Set(cartItems.filter((item) => !item.unavailable && Number(item.quantity) > 0).map((item) => item.wasteId))
      : new Set();
    persistSelection(); renderCartItems();
  });
  document.querySelectorAll('[data-select]').forEach((input) => input.addEventListener('change', () => {
    const item = cartItems[Number(input.dataset.select)];
    if (input.checked) selectedIds.add(item.wasteId);
    else selectedIds.delete(item.wasteId);
    persistSelection(); renderCartItems();
  }));
  document.querySelectorAll('[data-delta]').forEach((button) => button.addEventListener('click', () => {
    const item = cartItems[Number(button.dataset.index)];
    item.quantity = Math.max(1, Math.min(Number(item.stock), Number(item.quantity) + Number(button.dataset.delta)));
    persistCart(); renderCartItems();
  }));
  document.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => {
    const [removed] = cartItems.splice(Number(button.dataset.remove), 1);
    selectedIds.delete(removed?.wasteId);
    persistCart(); persistSelection(); renderCartItems();
  }));
  document.getElementById('ca-checkout')?.addEventListener('click', () => {
    if (!selectedIds.size) return;
    persistSelection();
    location.hash = '#checkout';
  });
}

function updateCartSummary() {
  const selected = cartItems.filter((item) => selectedIds.has(item.wasteId) && !item.unavailable);
  document.getElementById('ca-selected-count').textContent = `${selected.length} ${selected.length === 1 ? 'produk' : 'produk'}`;
  document.getElementById('ca-subtotal').textContent = formatPrice(selected.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0));
  document.getElementById('ca-checkout').disabled = selected.length === 0;
}

function trashIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3"/></svg>';
}

function injectCartStyles() {
  if (document.getElementById('cart-page-style')) return;
  const style = document.createElement('style');
  style.id = 'cart-page-style';
  style.textContent = `
    .ca-app{min-height:100vh;background:#DAF1DE;color:#163832;font-family:Inter,Arial,sans-serif}
    .ca-main{max-width:1240px;margin:auto;padding:30px 28px 68px}
    .ca-heading{margin:0 0 20px;padding-bottom:16px;border-bottom:1px solid #bfcec5}
    .ca-heading h1{margin:0;color:#104b3e;font-size:clamp(28px,3.5vw,36px);line-height:1.12;letter-spacing:-1px}
    .ca-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;align-items:start;gap:22px}
    .ca-list-panel,.ca-summary{border:1px solid #c4d5ca;border-radius:20px;background:#fff;box-shadow:0 10px 28px #1638320b}
    .ca-list-panel{min-width:0;padding:20px 22px}
    .ca-list-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:13px}
    .ca-list-heading h2,.ca-summary h2{margin:0;color:#174a3b;font-size:18px}
    .ca-list-heading p{margin:5px 0 0;color:#718078;font-size:12px}
    .ca-select-all{display:flex;align-items:center;gap:8px;color:#315746;font-size:12px;font-weight:650;white-space:nowrap;cursor:pointer}
    .ca-select-all input,.ca-check input{width:18px;height:18px;margin:0;accent-color:#235347;cursor:pointer}
    .ca-table-head,.ca-item{display:grid;grid-template-columns:minmax(180px,1fr) 120px 130px 28px 28px;align-items:center;gap:14px}
    .ca-table-head{min-height:40px;padding:0 8px;border-top:1px solid #cbd8d0;border-bottom:1px solid #cbd8d0;color:#68786f;font-size:10px;font-weight:700;letter-spacing:.03em}
    .ca-table-head span:first-child{grid-column:1}
    .ca-table-head span:nth-child(2){grid-column:2;text-align:center}
    .ca-table-head span:nth-child(3){grid-column:3;text-align:right}
    .ca-table-head span:nth-child(4){grid-column:5;text-align:center}
    .ca-item{min-height:94px;padding:13px 8px;border-bottom:1px solid #d5dfd8;transition:background 160ms ease}
    .ca-item:last-child{border-bottom:0}
    .ca-item.is-selected{background:linear-gradient(90deg,#f3faf5,transparent 90%)}
    .ca-item.is-unavailable{opacity:.65}
    .ca-check{grid-column:1;grid-row:1;position:relative;z-index:1;width:18px;align-self:center}
    .ca-product-image{grid-column:1;grid-row:1;width:64px;height:64px;margin-left:30px;border:1px solid #dce5de;border-radius:12px;object-fit:cover;background:#f1f5f2}
    .ca-product{grid-column:1;grid-row:1;min-width:0;margin-left:108px;display:grid;gap:5px}
    .ca-product strong{overflow:hidden;color:#243b31;font-size:13px;text-overflow:ellipsis;white-space:nowrap}
    .ca-product span,.ca-product small{color:#77847d;font-size:11px;line-height:1.45}
    .ca-quantity{grid-column:2;display:flex;align-items:center;justify-content:center;gap:6px}
    .ca-quantity button{width:27px;height:27px;border:1px solid #cad9cf;border-radius:8px;background:#fff;color:#175c4c;font-size:15px;cursor:pointer}
    .ca-quantity button:disabled{opacity:.4;cursor:not-allowed}
    .ca-quantity span{min-width:46px;color:#394c41;font-size:11px;text-align:center;white-space:nowrap}
    .ca-item-total{grid-column:3;color:#243b31;font-size:13px;text-align:right;white-space:nowrap}
    .ca-remove{grid-column:5;width:28px;height:28px;padding:5px;border:0;border-radius:8px;display:grid;place-items:center;background:transparent;color:#75837a;cursor:pointer;transition:color 160ms ease,background 160ms ease}
    .ca-remove:hover{background:#fcefed;color:#a34538}
    .ca-remove svg{width:16px;height:16px}
    .ca-summary{position:sticky;top:94px;padding:20px}
    .ca-summary-heading{padding-bottom:13px;border-bottom:1px solid #d8e2db}
    .ca-summary-row{display:flex;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid #e1e9e3;color:#64736a;font-size:12px}
    .ca-summary-row strong{color:#243b31;font-size:12px}
    .ca-summary>button{width:100%;min-height:46px;padding:0 14px;border:0;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:10px;background:#07594b;color:#fff;font:650 12px Inter,Arial,sans-serif;cursor:pointer;transition:transform 160ms ease,box-shadow 160ms ease,background 160ms ease}
    .ca-summary>button:not(:disabled):hover{transform:translateY(-1px);background:#064c41;box-shadow:0 8px 18px #07594b28}
    .ca-summary>button:disabled{background:#aebdb4;cursor:not-allowed}
    .ca-empty{min-height:250px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
    .ca-empty>span{width:48px;height:48px;margin-bottom:12px;border-radius:15px;display:grid;place-items:center;background:#DAF1DE;font-size:23px}
    .ca-empty strong{color:#24483a;font-size:14px}
    .ca-empty p{margin:7px 0 14px;color:#78857d;font-size:12px}
    .ca-empty a{padding:10px 15px;border-radius:999px;background:#07594b;color:white;font-size:11px;text-decoration:none}
    .ca-loading{padding:30px;color:#718078;font-size:12px;text-align:center}
    @media(max-width:900px){.ca-layout{grid-template-columns:minmax(0,1fr) 260px;gap:14px}.ca-list-panel{padding:18px}.ca-table-head,.ca-item{grid-template-columns:minmax(150px,1fr) 112px 105px 24px 26px;gap:8px}.ca-product{margin-left:98px}.ca-product-image{margin-left:26px}.ca-summary{padding:18px}}
    @media(max-width:700px){.ca-main{padding:26px 16px 54px}.ca-layout{grid-template-columns:1fr}.ca-summary{position:static;order:-1}.ca-list-panel{padding:17px 14px}.ca-table-head{display:none}.ca-item{grid-template-columns:20px 64px minmax(0,1fr) 28px;gap:10px;padding:14px 2px}.ca-check{grid-column:1;grid-row:1}.ca-product-image{grid-column:2;grid-row:1;width:64px;height:64px;margin:0}.ca-product{grid-column:3;grid-row:1;margin:0}.ca-quantity{grid-column:2/4;grid-row:2;justify-content:flex-start}.ca-item-total{grid-column:2/4;grid-row:3;justify-self:start;margin:0;font-size:12px}.ca-remove{grid-column:4;grid-row:1;align-self:start}.ca-quantity{position:relative}.ca-item-total{align-self:center}.ca-heading{margin:0 0 16px}.ca-heading h1{font-size:32px}.ca-list-heading h2{font-size:16px}}
    @media(max-width:390px){.ca-list-heading{align-items:flex-start;flex-direction:column;gap:10px}.ca-item{grid-template-columns:18px 54px minmax(0,1fr) 26px;gap:8px}.ca-product-image{width:54px;height:54px}.ca-quantity{grid-column:2/3;grid-row:2}.ca-item-total{grid-column:3;grid-row:2;justify-self:start;margin:0;font-size:12px}.ca-remove{grid-column:4}.ca-product strong{font-size:12px}}
    @media(prefers-reduced-motion:reduce){.ca-item,.ca-remove,.ca-summary>button{transition:none}}
  `;
  document.head.append(style);
}
