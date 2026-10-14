import { getWastes } from '../../services/waste.js';
import { getCurrentUser } from '../../services/user.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast, injectToastStyle } from '../../utils/toast.js';
import { createOrder } from '../../services/order.js';
import { bindSharedHeader, dashboardFooter, dashboardHeader } from '../../ui/shell.js';
import { startChat } from '../../services/chat.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { skeleton } from '../../ui/skeleton.js';

let marketplaceProducts = [];
let activeCategory = 'Semua';
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
];

export async function renderMarketplace() {
  const revision = getNavigationRevision();
  const app = document.getElementById('app');
  activeCategory = 'Semua';
  currentMarketplaceUserId = '';
  app.innerHTML = `
    <div class="mp-app">
      ${dashboardHeader('market')}
      <main class="mp-main">
        <section class="mp-intro"><div><p class="mp-eyebrow">TEMUKAN NILAI BARU DARI SISA PANGAN</p><h1>Marketplace Limbah Organik</h1><p>Temukan limbah organik terbaik untuk pakan ternak dan bahan kompos dari sumber terpercaya di sekitar Anda.</p></div><div class="mp-product-count" id="mp-product-count"></div></section>
        <div class="mp-categories" role="group" aria-label="Kategori produk"><button type="button" class="active" aria-pressed="true" data-category="Semua">Semua</button><button type="button" aria-pressed="false" data-category="Pakan Ternak">Pakan Ternak</button><button type="button" aria-pressed="false" data-category="Kompos">Kompos</button></div>
        <div class="mp-demo-banner" id="mp-demo-banner" hidden>Ini data contoh untuk pratinjau. Produk ini belum benar-benar ditawarkan dan belum bisa dipesan.</div>
        <section class="mp-grid" id="mp-grid" aria-live="polite" aria-busy="true">${marketplaceLoadingSkeleton()}</section>
      </main>
      ${dashboardFooter()}
    </div>`;
  injectMarketplaceStyle();
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

function renderProducts() {
  const grid = document.getElementById('mp-grid');
  if (!grid) return;
  const products =
    activeCategory === 'Semua'
      ? marketplaceProducts
      : marketplaceProducts.filter((product) => categoryFor(product) === activeCategory);
  document.getElementById('mp-product-count').textContent =
    `${products.length} ${products.length === 1 ? 'produk tersedia' : 'produk tersedia'}`;
  if (!products.length) {
    grid.innerHTML = `<div class="mp-empty"><div class="mp-empty-mark">♧</div><h2>${marketplaceProducts.length ? 'Belum ada produk di kategori ini' : 'Belum ada produk tersedia'}</h2><p>${marketplaceProducts.length ? 'Pilih kategori lain untuk menjelajahi produk.' : 'Produk limbah pangan yang tersedia akan muncul di sini.'}</p>${marketplaceProducts.length ? '' : '<a href="#tambah-limbah">Mulai tambahkan limbah <span>→</span></a>'}</div>`;
    return;
  }
  grid.innerHTML = products
    .map((product) => {
      const category = categoryFor(product);
      const seller =
        product.store?.name || product.seller?.name || product.seller?.email || 'Penjual Food Ilee';
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
  const seller = product.store?.name || product.seller?.name || 'Penjual Food Ilee';
  dialog.innerHTML = `<form class="mp-detail-card"><button type="button" class="mp-detail-close" aria-label="Tutup">×</button><img src="${escapeHtml(product.image || '')}" alt="${escapeHtml(product.title)}"><div class="mp-detail-copy"><span class="mp-category-tag ${categoryFor(product) === 'Kompos' ? 'compost' : ''}">${escapeHtml(categoryFor(product))}</span><h2>${escapeHtml(product.title)}</h2><p>${escapeHtml(product.description || 'Bahan organik yang tersedia untuk dimanfaatkan kembali.')}</p>${product.isDemo ? '<p class="mp-demo-detail-note">Produk contoh ini belum dapat di-chat atau dipesan.</p>' : ''}<div class="mp-detail-facts"><span><small>PENJUAL</small><strong>${escapeHtml(seller)}</strong></span><span><small>LOKASI</small><strong>${escapeHtml(product.location || 'Hubungi penjual untuk detail lokasi')}</strong></span></div><button class="mp-card-action mp-chat" type="button" ${product.isDemo || !product.seller?.id || product.seller.id === currentMarketplaceUserId ? 'disabled' : ''}>Chat penjual</button><div class="mp-detail-order"><label for="mp-quantity">Jumlah (kg)</label><div><input id="mp-quantity" type="number" min="1" max="${Math.max(1, Number(product.stock) || 1)}" value="1"><span>tersedia ${Number(product.stock || 0)} kg</span></div></div><div class="mp-detail-total"><span>Total pesanan</span><strong id="mp-order-total">${formatPrice(product.price)}</strong></div><button class="mp-card-action mp-buy" type="submit" ${product.isDemo || Number(product.stock) < 1 ? 'disabled' : ''}>Buat Pesanan <span>&rarr;</span></button><small class="mp-payment-note">Pembayaran dilanjutkan melalui halaman pembayaran aman.</small></div></form>`;
  injectMarketplaceDetailStyles();
  document.body.append(dialog);
  dialog.showModal();
  const quantity = dialog.querySelector('#mp-quantity');
  const total = dialog.querySelector('#mp-order-total');
  quantity.addEventListener('input', () => {
    total.textContent = formatPrice(
      Number(product.price || 0) * Math.max(1, Number(quantity.value) || 1),
    );
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
    button.disabled = true;
    button.textContent = 'Menyiapkan pesanan?';
    try {
      const result = await createOrder(product.id, qty);
      if (!result.success) throw new Error(result.message || 'Pesanan belum dapat dibuat.');
      if (result.data?.paymentUrl) {
        location.assign(result.data.paymentUrl);
        return;
      }
      showToast('Pesanan dibuat. Lanjutkan pembayaran dari riwayat transaksi.');
      dialog.close();
      dialog.remove();
      location.hash = '#transaksi';
    } catch (error) {
      showToast(error.message || 'Pesanan belum dapat dibuat.', 'error');
      button.disabled = false;
      button.innerHTML = 'Buat Pesanan <span>&rarr;</span>';
    }
  });
}

function injectMarketplaceDetailStyles() {
  if (document.getElementById('marketplace-detail-style')) return;
  const style = document.createElement('style');
  style.id = 'marketplace-detail-style';
  style.textContent = `.mp-detail-dialog{position:fixed;inset:0;margin:auto;width:min(820px,calc(100vw - 24px));height:fit-content;max-height:calc(100vh - 28px);padding:0;border:0;border-radius:24px;box-shadow:0 25px 90px #091b1460}.mp-detail-dialog::backdrop{background:#102c2480;backdrop-filter:blur(3px)}.mp-detail-card{position:relative;display:grid;grid-template-columns:.9fr 1.1fr;gap:25px;padding:22px}.mp-detail-card>img{width:100%;height:100%;min-height:420px;max-height:500px;border-radius:18px;object-fit:cover;background:#f0f3ef}.mp-detail-copy{padding:18px 12px 13px 0}.mp-detail-copy>.mp-category-tag{position:static;display:inline-block}.mp-detail-copy h2{margin:14px 0 8px;color:#174a3b;font-size:25px}.mp-detail-copy>p{color:#69766f;font-size:12px;line-height:1.75}.mp-detail-copy>.mp-demo-detail-note{padding:10px 12px;border:1px solid #e5e9cf;border-radius:11px;background:#f5f7e9;color:#68734b;font-size:11px}.mp-detail-facts{margin:21px 0;display:grid;grid-template-columns:1fr 1fr;gap:10px}.mp-detail-facts>span{min-width:0;padding:11px;border:1px solid #e9efea;border-radius:13px;display:flex;flex-direction:column;gap:6px}.mp-detail-facts small{color:#96a098;font-size:8px;letter-spacing:.1em}.mp-detail-facts strong{overflow:hidden;color:#42544a;font-size:10px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.mp-chat{margin:-8px 0 14px;background:#eef7f5;color:#075653;border:1px solid #c8e0dc}.mp-chat:hover{background:#dcefeb}.mp-chat:disabled{opacity:.55;cursor:not-allowed}.mp-detail-order{padding:14px 0;border-top:1px solid #edf1ee}.mp-detail-order>label{display:block;margin-bottom:8px;color:#375748;font-size:11px;font-weight:600}.mp-detail-order>div{display:flex;align-items:center;gap:12px}.mp-detail-order input{width:100px;height:38px;padding:0 10px;border:1px solid #e0e9e2;border-radius:10px;font:500 13px Inter,Arial,sans-serif}.mp-detail-order span{color:#829087;font-size:10px}.mp-detail-total{display:flex;align-items:center;justify-content:space-between;margin:5px 0 13px;color:#69756f;font-size:11px}.mp-detail-total strong{color:#145746;font-size:18px}.mp-buy{height:44px}.mp-payment-note{display:block;margin-top:10px;color:#8b968f;font-size:9px;text-align:center}.mp-detail-close{position:absolute;top:13px;right:13px;z-index:2;width:32px;height:32px;border:0;border-radius:50%;background:#fff;color:#46564d;font-size:20px;cursor:pointer;box-shadow:0 3px 12px #0002}@media(max-width:620px){.mp-detail-card{grid-template-columns:1fr;gap:12px;padding:13px}.mp-detail-card>img{min-height:0;height:190px}.mp-detail-copy{padding:6px}.mp-detail-copy h2{font-size:21px}.mp-detail-facts{margin:12px 0}.mp-detail-dialog{border-radius:19px}}`;
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
    .mp-app{--mp-deep:#004847;--mp-green:#087b78;--mp-ink:#173d3c;--mp-muted:#56716f;--mp-line:#bfd4d2;min-height:100vh;background:#dce8e6;color:var(--mp-ink);font-family:Inter,Arial,sans-serif;font-size:14px}.mp-main{max-width:1304px;margin:auto;padding:47px 0 80px}.mp-intro{display:flex;align-items:flex-end;justify-content:space-between;gap:20px}.mp-eyebrow{margin:0 0 7px;color:#77837e;font-size:11px;font-weight:700;letter-spacing:.12em}.mp-intro h1{margin:0;color:var(--mp-deep);font-size:38px;line-height:1.2;font-weight:600;letter-spacing:-1.4px}.mp-intro p:not(.mp-eyebrow){max-width:710px;margin:9px 0 0;color:#59635f;font-size:18px;line-height:1.55}.mp-product-count{padding-bottom:4px;color:#70807a;font-size:13px}.mp-demo-banner{margin:0 0 20px;padding:12px 16px;border:1px solid #d8e4cf;border-radius:13px;background:#f0f5e8;color:#63744d;font-size:12px;line-height:1.5}.mp-categories{display:flex;gap:14px;margin:48px 0 32px}.mp-categories button{min-width:110px;height:40px;padding:0 25px;border:0;border-radius:999px;background:#f0f1ef;color:#45504c;font:500 14px Inter,Arial,sans-serif;cursor:pointer}.mp-categories button.active{background:var(--mp-deep);color:white}.mp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}.mp-card{padding:20px;border-radius:28px;background:#edf6f5;box-shadow:0 12px 38px #123a2a0b;transition:transform .18s,box-shadow .18s}.mp-card:hover{transform:translateY(-3px);box-shadow:0 17px 45px #123a2a13}.mp-card-image-wrap{height:192px;position:relative;overflow:hidden;border-radius:26px}.mp-card-image{width:100%;height:100%;object-fit:cover;background:#eff2ef}.mp-category-tag{position:absolute;top:12px;left:12px;padding:5px 13px;border-radius:999px;background:#ffe3a5;color:#a45316;font-size:11px;font-weight:600}.mp-category-tag.compost{background:#c7e9c9;color:#2b7533}.mp-demo-tag{position:absolute;top:12px;right:12px;padding:5px 10px;border-radius:999px;background:#ffffffdf;color:#59675d;font-size:9px;font-weight:700;letter-spacing:.08em}.mp-card-body{padding:22px 0 0}.mp-title-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.mp-title-row h2{overflow:hidden;margin:0;color:#202925;font-size:16px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.mp-title-row strong{flex:none;color:var(--mp-deep);font-size:16px;font-weight:700}.mp-meta{display:flex;align-items:center;gap:11px;margin-top:11px;color:#818b86;font-size:12px}.mp-meta span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mp-meta i{font-style:normal;color:#9ca6a1}.mp-updated{margin:20px 0 13px;color:#505c57;font-size:12px;font-weight:600}.mp-card-action{width:100%;height:43px;padding:0 20px;border:0;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:8px;background:#176457;color:#fff;font:500 13px Inter,Arial,sans-serif;cursor:pointer;transition:background .16s}.mp-card-action:hover{background:#005448}.mp-card-action span{font-size:16px}.mp-loading{grid-column:1/-1;min-height:300px;display:grid;place-items:center;color:var(--mp-muted)}.mp-empty{grid-column:1/-1;min-height:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.mp-empty-mark{width:55px;height:55px;margin-bottom:15px;border-radius:18px;display:grid;place-items:center;background:#edf5f1;color:var(--mp-deep);font-size:25px}.mp-empty h2{margin:0 0 8px;color:#163d35;font-size:19px}.mp-empty p{margin:0 0 17px;color:#74807b;font-size:14px}.mp-empty button,.mp-empty a{padding:11px 19px;border:0;border-radius:999px;background:var(--mp-deep);color:#fff;font:500 13px Inter,Arial,sans-serif;text-decoration:none;cursor:pointer}
    @media(max-width:1380px){.mp-main{margin:0 5%}}@media(max-width:920px){.mp-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}}@media(max-width:640px){.mp-main{margin:0 16px;padding:31px 0 52px}.mp-intro h1{font-size:29px;letter-spacing:-.8px}.mp-intro p:not(.mp-eyebrow){font-size:15px}.mp-product-count{display:none}.mp-categories{gap:8px;margin:29px 0 21px}.mp-categories button{min-width:0;height:36px;padding:0 16px;font-size:12px}.mp-grid{grid-template-columns:1fr;gap:14px}.mp-card{padding:13px;border-radius:22px}.mp-card-image-wrap{height:200px;border-radius:18px}.mp-card-body{padding-top:15px}.mp-title-row h2,.mp-title-row strong{font-size:14px}.mp-meta{font-size:11px}.mp-updated{margin:15px 0 11px}}
  `;
  document.head.appendChild(style);
}
