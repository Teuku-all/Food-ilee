import { loadStylesheet } from '../../utils/stylesheet.js';
import { getWaste } from '../../services/waste.js';
import { escapeHtml } from '../../utils/html.js';
import { bindSharedHeader, dashboardFooter, dashboardHeader } from '../../ui/shell.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { icon } from '../../ui/icons.js';
import { formatProductWeight, productWeightGrams } from '../../utils/product-weight.js';
import { translate } from '../../utils/i18n.js';

const CART_KEY = 'foodilee_checkout_cart';
const SELECTED_KEY = 'foodilee_checkout_selected';
let cartItems = [];
let selectedIds = new Set();

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

function readSelection(items) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SELECTED_KEY) || 'null');
    if (!saved || !Array.isArray(saved.selected) || !Array.isArray(saved.known)) {
      return new Set(items.map((item) => item.wasteId));
    }
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

function persistCart() {
  sessionStorage.setItem(
    CART_KEY,
    JSON.stringify(cartItems.map(({ wasteId, quantity }) => ({ wasteId, quantity }))),
  );
  window.dispatchEvent(new Event('foodilee:cart-updated'));
}

function persistSelection() {
  sessionStorage.setItem(
    SELECTED_KEY,
    JSON.stringify({ selected: [...selectedIds], known: cartItems.map((item) => item.wasteId) }),
  );
}

function formatPrice(value) {
  return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
}

export async function renderCart() {
  loadStylesheet('cart-page-style', new URL('../../styles/pages/cart.css', import.meta.url));
  const revision = getNavigationRevision();
  cartItems = readCart();
  selectedIds = readSelection(cartItems);
  const app = document.getElementById('app');
  app.innerHTML = `<div class="ca-app">${dashboardHeader('market')}<main class="ca-main"><header class="ca-heading"><p>PILIHAN ANDA</p><h1>Keranjang</h1><span>Periksa jumlah dan pilih produk sebelum melanjutkan pembayaran.</span></header><div class="ca-layout"><section class="ca-list-panel"><div class="ca-list-heading"><div><h2>Produk</h2><p id="ca-list-count">Memuat isi keranjang…</p></div><label class="ca-select-all"><input type="checkbox" id="ca-select-all" disabled><span>Pilih semua</span></label></div><div class="ca-table-head"><span>Produk</span><span>Jumlah</span><span>Subtotal</span><span>Aksi</span></div><div id="ca-items" class="ca-items" aria-live="polite"><div class="ca-loading">Memuat produk…</div></div></section><aside class="ca-summary"><div class="ca-summary-heading"><h2>Ringkasan</h2></div><div class="ca-summary-row"><span>Produk dipilih</span><strong id="ca-selected-count">0 produk</strong></div><div class="ca-summary-row"><span>Subtotal</span><strong id="ca-subtotal" aria-live="polite">Rp0</strong></div><button id="ca-checkout" type="button" disabled>Lanjut ke pembayaran <span aria-hidden="true">→</span></button></aside></div></main>${dashboardFooter()}</div>`;
  bindSharedHeader();
  bindCartControls();
  await loadCartProducts(revision);
}

function isCartItemAvailable(item) {
  return !item.unavailable && Number(item.stock) > 0 && Number(item.quantity) > 0;
}

async function loadCartProducts(revision) {
  if (!cartItems.length) {
    selectedIds = new Set();
    persistSelection();
    renderCartItems();
    return;
  }
  const results = await Promise.all(
    cartItems.map(async (entry) => {
      try {
        const result = await getWaste(entry.wasteId);
        if (!result.success || !result.data) return { ...entry, unavailable: true };
        return {
          ...result.data,
          wasteId: entry.wasteId,
          quantity: Math.min(Number(entry.quantity), Number(result.data.stock) || 0),
        };
      } catch {
        return { ...entry, unavailable: true };
      }
    }),
  );
  if (!isRouteCurrent('#cart', revision)) return;
  cartItems = results;
  selectedIds = new Set(
    cartItems
      .filter((item) => isCartItemAvailable(item) && selectedIds.has(item.wasteId))
      .map((item) => item.wasteId),
  );
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
  root.innerHTML = cartItems
    .map((item, index) => {
      const available = isCartItemAvailable(item);
      const selected = selectedIds.has(item.wasteId) && available;
      const description = item.unavailable
        ? 'Informasi produk tidak dapat dimuat'
        : !available
          ? 'Stok produk habis'
          : `${formatPrice(item.price)} / unit \u00b7 ${formatProductWeight(productWeightGrams(item))}/unit`;
      return `
        <article class="ca-item${selected ? ' is-selected' : ''}${!available ? ' is-unavailable' : ''}">
          <label class="ca-check"><input type="checkbox" data-select="${index}" ${selected ? 'checked' : ''} ${!available ? 'disabled' : ''} aria-label="Pilih ${escapeHtml(item.title || 'produk')} untuk checkout"><span></span></label>
          <img class="ca-product-image" src="${escapeHtml(item.image || '/assets/foodilee-login-hero.png')}" alt="${escapeHtml(item.title || 'Produk')}">
          <div class="ca-product"><strong>${escapeHtml(item.title || 'Produk tidak tersedia')}</strong><span>${escapeHtml(translate(description))}</span>${!available ? '<small>Hapus produk ini atau lanjutkan dengan produk lainnya.</small>' : ''}</div>
          <div class="ca-quantity">
            <button type="button" data-delta="-1" data-index="${index}" aria-label="Kurangi jumlah" ${!available || item.quantity <= 1 ? 'disabled' : ''}>&minus;</button>
            <span>${translate(`${Number(item.quantity || 0)} unit`)}</span>
            <button type="button" data-delta="1" data-index="${index}" aria-label="Tambah jumlah" ${!available || item.quantity >= Number(item.stock) ? 'disabled' : ''}>+</button>
          </div>
          <strong class="ca-item-total">${!available ? '&mdash;' : formatPrice(Number(item.price) * Number(item.quantity))}</strong>
          <button class="ca-remove" type="button" data-remove="${index}" aria-label="Hapus ${escapeHtml(item.title || 'produk')} dari keranjang">${icon('trash')}</button>
        </article>`;
    })
    .join('');
  bindCartActions();
  updateCartSummary();
}

// These controls survive row updates, so bind them only once per page render.
function bindCartControls() {
  document.getElementById('ca-select-all')?.addEventListener('change', (event) => {
    selectedIds = event.currentTarget.checked
      ? new Set(cartItems.filter((item) => isCartItemAvailable(item)).map((item) => item.wasteId))
      : new Set();
    persistSelection();
    renderCartItems();
  });
  document.getElementById('ca-checkout')?.addEventListener('click', () => {
    if (!selectedIds.size) return;
    persistSelection();
    location.hash = '#checkout';
  });
}

function bindCartActions() {
  document.querySelectorAll('[data-select]').forEach((input) =>
    input.addEventListener('change', () => {
      const item = cartItems[Number(input.dataset.select)];
      if (input.checked) selectedIds.add(item.wasteId);
      else selectedIds.delete(item.wasteId);
      persistSelection();
      renderCartItems();
    }),
  );
  document.querySelectorAll('[data-delta]').forEach((button) =>
    button.addEventListener('click', () => {
      const item = cartItems[Number(button.dataset.index)];
      item.quantity = Math.max(
        1,
        Math.min(Number(item.stock), Number(item.quantity) + Number(button.dataset.delta)),
      );
      persistCart();
      renderCartItems();
    }),
  );
  document.querySelectorAll('[data-remove]').forEach((button) =>
    button.addEventListener('click', () => {
      const [removed] = cartItems.splice(Number(button.dataset.remove), 1);
      selectedIds.delete(removed?.wasteId);
      persistCart();
      persistSelection();
      renderCartItems();
    }),
  );
}

function updateCartSummary() {
  const selected = cartItems.filter(
    (item) => selectedIds.has(item.wasteId) && isCartItemAvailable(item),
  );
  const available = cartItems.filter((item) => isCartItemAvailable(item));
  const selectAll = document.getElementById('ca-select-all');
  selectAll.disabled = available.length === 0;
  selectAll.checked = available.length > 0 && selected.length === available.length;
  selectAll.indeterminate = selected.length > 0 && !selectAll.checked;
  document.getElementById('ca-selected-count').textContent = `${selected.length} produk`;
  document.getElementById('ca-subtotal').textContent = formatPrice(
    selected.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
  );
  document.getElementById('ca-checkout').disabled = selected.length === 0;
}
