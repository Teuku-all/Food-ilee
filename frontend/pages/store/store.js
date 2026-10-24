import { getMyStore, updateMyStore } from '../../services/store.js';
import { deleteWaste, getWastes, updateWaste } from '../../services/waste.js';
import { getMySales, updateOrderStatus } from '../../services/order.js';
import { escapeHtml } from '../../utils/html.js';
import { formatRupiah, renderShell, showToast } from '../../ui/shell.js';
import { icon } from '../../ui/icons.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { skeleton } from '../../ui/skeleton.js';
import { bindRegionAddress } from '../../utils/region-address.js';

const statusNames = {
  pending: 'Menunggu Pembayaran',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export async function renderStore() {
  const navigationRevision = getNavigationRevision();
  renderShell('', storeLoadingSkeleton());
  injectStoreStyles();
  try {
    const [storeResult, salesResult, wasteResult] = await Promise.all([
      getMyStore(),
      getMySales(),
      getWastes({ mine: true }),
    ]);
    if (!isRouteCurrent('#kelola-toko', navigationRevision)) return;
    if (!storeResult.success) throw new Error(storeResult.message || 'Toko belum dapat dimuat.');
    const store = storeResult.data;
    if (!store) {
      renderShell(
        '',
        `<section class="st-no-store fi-card"><div><p class="st-kicker">MULAI BERJUAL DI FOOD ILEE</p><h1>Buka ruang bagi produk Anda.</h1><p>Buat toko untuk menampilkan penawaran organik dan mulai menjangkau calon pemanfaat.</p><a class="fi-button" href="#buat-toko">Buat toko <span>→</span></a></div><span class="st-store-mark">${icon('store')}</span></section>`,
      );
      injectStoreStyles();
      return;
    }
    const products = Array.isArray(wasteResult.data) ? wasteResult.data : store.products || [];
    const sales = salesResult.success ? salesResult.data || [] : [];
    const reviews = products.flatMap((product) => product.reviews || []);
    const averageRating = reviews.length
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
      : null;
    const revenue = sales
      .filter((order) => order.paymentStatus === 'paid')
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
    renderShell(
      '',
      `<section class="st-page"><div class="st-title"><div><p class="st-kicker">RUANG USAHA ANDA</p><h1>Kelola Toko Anda</h1><p>Pantau produk, ulasan, dan pesanan yang masuk ke etalase.</p></div><div class="st-title-actions"><button class="fi-button fi-button-outline" type="button" data-edit-store>Edit Toko</button><a class="fi-button" href="#tambah-limbah">+ Tambah Produk</a></div></div><section class="st-profile fi-card"><div class="st-store-avatar">${store.image ? `<img src="${escapeHtml(store.image)}" alt="">` : icon('store')}</div><div class="st-store-info"><h2>${escapeHtml(store.name)}</h2><p class="st-store-location">${escapeHtml(store.location || 'Lokasi belum ditambahkan')}</p><p class="st-store-description">${escapeHtml(store.description || 'Tambahkan cerita toko untuk membantu pembeli mengenal penawaran Anda.')}</p><div class="st-pills"><span>${icon('box')} ${products.length} Produk</span><span>${icon('edit')} ${reviews.length} Ulasan</span><span>★ ${averageRating === null ? 'Belum ada rating' : averageRating.toFixed(1)}</span></div></div></section><section class="st-metrics"><article><small>PESANAN</small><strong>${sales.length}</strong><span>Semua status</span></article><article><small>MENUNGGU TINDAKAN</small><strong>${sales.filter((order) => ['pending', 'processing'].includes(order.status)).length}</strong><span>Pesanan aktif</span></article><article><small>PENDAPATAN TERBAYAR</small><strong>${formatRupiah(revenue)}</strong><span>Pesanan terkonfirmasi</span></article></section><section class="st-tabs" role="tablist"><button class="active" data-panel="products">Produk <span>${products.length}</span></button><button data-panel="orders">Pesanan <span>${sales.length}</span></button><button data-panel="reviews">Ulasan <span>${reviews.length}</span></button></section><section id="store-panel">${renderProducts(products)}</section></section>`,
    );
    injectStoreStyles();
    bindStorePage(store, products, sales, reviews);
    document.querySelector('[data-edit-store]').addEventListener('click', () => editStore(store));
  } catch (error) {
    if (!isRouteCurrent('#kelola-toko', navigationRevision)) return;
    renderShell(
      '',
      `<section class="st-error fi-card"><h1>Toko belum dapat dimuat</h1><p>${escapeHtml(error.message || 'Coba muat ulang halaman.')}</p><button class="fi-button" data-retry>Coba lagi</button></section>`,
    );
    document.querySelector('[data-retry]').addEventListener('click', renderStore);
  }
}

function storeLoadingSkeleton() {
  return `<section class="st-page" aria-busy="true"><div class="st-title"><div>${skeleton('130px', '10px')}<div style="height:10px"></div>${skeleton('260px', '30px')}<div style="height:8px"></div>${skeleton('320px', '13px')}</div><div class="st-title-actions">${skeleton('115px', '40px', 'pill')}${skeleton('145px', '40px', 'pill')}</div></div><section class="st-profile fi-card">${skeleton('104px', '104px', 'circle')}<div class="st-store-info">${skeleton('190px', '23px')}<div style="height:8px"></div>${skeleton('125px', '12px')}${skeleton('85%', '12px')}<div style="height:13px"></div>${skeleton('220px', '20px', 'pill')}</div></section><section class="st-metrics">${Array.from({ length: 3 }, () => `<article>${skeleton('95px', '9px')}<div style="height:10px"></div>${skeleton('75px', '26px')}<div style="height:8px"></div>${skeleton('90px', '10px')}</article>`).join('')}</section><section class="st-tabs">${skeleton('105px', '38px', 'pill')}${skeleton('105px', '38px', 'pill')}${skeleton('105px', '38px', 'pill')}</section><div class="st-products">${Array.from({ length: 2 }, () => `<article class="st-product fi-card">${skeleton('150px', '165px')}<div class="st-product-main">${skeleton('85px', '16px', 'pill')}<div style="height:10px"></div>${skeleton('65%', '18px')}<div style="height:11px"></div>${skeleton('100%', '12px')}${skeleton('80%', '12px')}</div></article>`).join('')}</div></section>`;
}

function renderProducts(products) {
  if (!products.length)
    return `<div class="st-empty fi-card"><span>${icon('box')}</span><h2>Belum ada produk</h2><p>Tambahkan penawaran limbah pertama ke etalase toko.</p><a class="fi-button" href="#tambah-limbah">Tambah produk pertama</a></div>`;
  return `<div class="st-products">${products.map((product) => `<article class="st-product fi-card"><img src="${escapeHtml(product.image || '')}" alt="${escapeHtml(product.title)}"><div class="st-product-main"><span class="st-category ${product.category === 'Kompos' ? 'compost' : ''}">${escapeHtml(product.category || 'Organik')}</span><h3>${escapeHtml(product.title)}</h3><p>${escapeHtml(product.description || '')}</p><div class="st-product-data"><span>${Number(product.stock || 0)} kg tersedia</span><strong>${formatRupiah(product.price)} / kg</strong></div><div class="st-product-actions"><button type="button" data-product-edit="${escapeHtml(product.id)}">Edit</button><button type="button" data-product-delete="${escapeHtml(product.id)}">Hapus</button></div></div></article>`).join('')}</div>`;
}

function renderOrders(sales) {
  if (!sales.length)
    return `<div class="st-empty fi-card"><span>${icon('box')}</span><h2>Belum ada pesanan</h2><p>Pesanan calon pembeli akan muncul di sini setelah mereka memesan produk Anda.</p></div>`;
  return `<div class="st-orders">${sales
    .map((order) => {
      const name = order.waste?.title || 'Produk organik';
      const buyer = order.buyer?.name || order.buyer?.email || 'Pembeli Food Ilee';
      const isPickup = order.courier === 'pickup';
      const nextStatus = isPickup ? (order.status === 'processing' ? 'completed' : '') : { processing: 'shipped', shipped: 'completed' }[order.status];
      const action =
        order.status === 'processing'
          ? isPickup
            ? order.paymentMethod === 'cash' ? 'Konfirmasi cash & jemput selesai' : 'Konfirmasi pesanan dijemput'
            : 'Tandai dikirim'
          : order.status === 'shipped'
            ? 'Tandai selesai'
            : '';
      return `<article class="st-order fi-card"><img src="${escapeHtml(order.waste?.image || '')}" alt=""><div class="st-order-main"><div class="st-order-head"><strong>${escapeHtml(name)}</strong><span class="st-order-status status-${escapeHtml(order.status)}">${escapeHtml(statusNames[order.status] || order.status)}</span></div><p>${Number(order.quantity)} kg · ${formatRupiah(order.total)}</p><small>Pembeli ${escapeHtml(buyer)} · ${new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</small></div>${action ? `<button class="fi-button fi-button-outline" data-order-status="${escapeHtml(order.id)}" data-next-status="${nextStatus}">${action}</button>` : ''}</article>`;
    })
    .join('')}</div>`;
}

function renderReviews(reviews) {
  if (!reviews.length)
    return `<div class="st-empty fi-card"><span>${icon('edit')}</span><h2>Belum ada ulasan</h2><p>Ulasan pembeli akan muncul di sini setelah transaksi selesai.</p></div>`;
  return `<div class="st-reviews">${reviews.map((review) => `<article class="st-review fi-card"><div class="st-review-stars">${'★'.repeat(Math.max(0, Math.min(5, Number(review.rating))))}${'☆'.repeat(5 - Math.max(0, Math.min(5, Number(review.rating))))}</div><p>${escapeHtml(review.comment)}</p><small>${new Date(review.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</small></article>`).join('')}</div>`;
}

function bindStorePage(store, products, sales, reviews) {
  const panels = {
    products: renderProducts(products),
    orders: renderOrders(sales),
    reviews: renderReviews(reviews),
  };
  document.querySelectorAll('.st-tabs button').forEach((button) =>
    button.addEventListener('click', () => {
      document
        .querySelectorAll('.st-tabs button')
        .forEach((item) => item.classList.toggle('active', item === button));
      document.getElementById('store-panel').innerHTML = panels[button.dataset.panel];
      bindPanelActions(products, sales);
    }),
  );
  bindPanelActions(products, sales);
}

function bindPanelActions(products, sales) {
  document.querySelectorAll('[data-product-delete]').forEach((button) =>
    button.addEventListener('click', async () => {
      const product = products.find((item) => item.id === button.dataset.productDelete);
      if (!product || !confirm(`Hapus “${product.title}” dari toko?`)) return;
      button.disabled = true;
      try {
        const result = await deleteWaste(product.id);
        if (!result.success) throw new Error(result.message || 'Produk belum dapat dihapus.');
        showToast('Produk berhasil dihapus.');
        renderStore();
      } catch (error) {
        button.disabled = false;
        showToast(error.message || 'Produk belum dapat dihapus.', 'error');
      }
    }),
  );
  document.querySelectorAll('[data-product-edit]').forEach((button) =>
    button.addEventListener('click', () => {
      const product = products.find((item) => item.id === button.dataset.productEdit);
      if (product) editProduct(product);
    }),
  );
  document.querySelectorAll('[data-order-status]').forEach((button) =>
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const result = await updateOrderStatus(
          button.dataset.orderStatus,
          button.dataset.nextStatus,
        );
        if (!result.success) throw new Error(result.message || 'Status pesanan belum diperbarui.');
        showToast('Status pesanan berhasil diperbarui.');
        renderStore();
      } catch (error) {
        button.disabled = false;
        showToast(error.message || 'Status pesanan belum diperbarui.', 'error');
      }
    }),
  );
}

function editProduct(product) {
  const dialog = document.createElement('dialog');
  dialog.className = 'st-dialog';
  dialog.innerHTML = `<form class="st-dialog-form"><button class="st-dialog-close" type="button">×</button><p class="st-kicker">ETALASE TOKO</p><h2>Edit penawaran</h2><label class="fi-label">Nama<input class="fi-input" name="title" value="${escapeHtml(product.title)}" required minlength="3"></label><label class="fi-label">Jumlah (kg)<input class="fi-input" type="number" min="1" name="stock" value="${Number(product.stock)}" required></label><label class="fi-label">Harga per kg<input class="fi-input" type="number" min="0" name="price" value="${Number(product.price)}" required></label><label class="fi-label">Deskripsi<textarea class="fi-input" rows="4" name="description" required>${escapeHtml(product.description || '')}</textarea></label><div><button class="fi-button fi-button-outline" type="button" data-cancel>Batal</button><button class="fi-button" type="submit">Simpan</button></div></form>`;
  document.body.append(dialog);
  dialog.showModal();
  const form = dialog.querySelector('form');
  const regionAddress = bindRegionAddress(form, 'store', store.shippingOriginRegion || {});
  dialog
    .querySelectorAll('[data-cancel],.st-dialog-close')
    .forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const result = await updateWaste(product.id, new FormData(form));
      if (!result.success) throw new Error(result.message || 'Produk belum dapat diperbarui.');
      dialog.close();
      dialog.remove();
      showToast('Produk berhasil diperbarui.');
      renderStore();
    } catch (error) {
      showToast(error.message || 'Produk belum dapat diperbarui.', 'error');
      submit.disabled = false;
    }
  });
}

function editStore(store) {
  const dialog = document.createElement('dialog');
  dialog.className = 'st-dialog';
  dialog.innerHTML = `<form class="st-dialog-form"><button class="st-dialog-close" type="button">×</button><p class="st-kicker">PROFIL TOKO</p><h2>Perbarui informasi toko</h2><label class="fi-label">Nama toko<input class="fi-input" name="name" value="${escapeHtml(store.name || '')}" required minlength="3"></label><label class="fi-label">Lokasi<input class="fi-input" name="location" value="${escapeHtml(store.location || '')}" maxlength="180"></label><h3>Alamat pickup pengiriman</h3><p>Ongkir dihitung dari lokasi pickup ini ke alamat pembeli.</p><section class="st-address-section"><div class="st-address-heading"><span>01</span><div><h3>Alamat pickup</h3><p>Ongkir dihitung dari alamat ini ke lokasi pembeli.</p></div></div><div class="st-address-grid"><label class="fi-label">Nama kontak<input class="fi-input" name="shippingOriginContactName" value="${escapeHtml(store.shippingOriginContactName || '')}" required maxlength="100" placeholder="Nama yang bisa dihubungi"></label><label class="fi-label">Nomor telepon<input class="fi-input" name="shippingOriginContactPhone" value="${escapeHtml(store.shippingOriginContactPhone || '')}" required maxlength="20" inputmode="tel" placeholder="08xxxxxxxxxx"></label></div><div class="st-region-grid"><label class="fi-label">Provinsi<select class="fi-input" id="store-province" required><option value="">Pilih provinsi</option></select></label><label class="fi-label">Kabupaten/Kota<select class="fi-input" id="store-city" required disabled><option value="">Pilih kabupaten/kota</option></select></label><label class="fi-label">Kecamatan<select class="fi-input" id="store-district" required disabled><option value="">Pilih kecamatan</option></select></label><label class="fi-label">Desa/Kelurahan<select class="fi-input" id="store-village" required disabled><option value="">Pilih desa/kelurahan</option></select></label></div><p id="store-region-error" class="st-region-error" role="alert"></p><div class="st-address-grid st-address-detail-grid"><label class="fi-label">Nama jalan, nomor, RT/RW<input class="fi-input" id="store-details" value="${escapeHtml(store.shippingOriginRegion?.details || '')}" required maxlength="240" placeholder="Contoh: Jl. Melati No. 10, RT 02/RW 01"></label><label class="fi-label">Kode pos<input class="fi-input" id="store-postal" value="${escapeHtml(store.shippingOriginPostalCode || '')}" required inputmode="numeric" pattern="[0-9]{5}" maxlength="5" placeholder="12345"></label></div><input type="hidden" name="shippingOriginAddress"><input type="hidden" name="shippingOriginRegion"></section><h3>Rekening penerimaan penjual</h3><p>Nomor rekening hanya untuk pencatatan penyelesaian dana penjual.</p><label class="fi-label">Nama bank<input class="fi-input" name="bankName" value="${escapeHtml(store.bankName || '')}" required maxlength="60"></label><label class="fi-label">Nomor rekening<input class="fi-input" name="bankAccountNumber" value="${escapeHtml(store.bankAccountNumber || '')}" required inputmode="numeric" pattern="[0-9 -]{6,36}" maxlength="36"></label><label class="fi-label">Nama pemilik rekening<input class="fi-input" name="bankAccountHolder" value="${escapeHtml(store.bankAccountHolder || '')}" required maxlength="100"></label><label class="fi-label">Cerita toko<textarea class="fi-input" rows="4" name="description">${escapeHtml(store.description || '')}</textarea></label><label class="fi-label">Foto toko<input class="fi-input" name="image" type="file" accept="image/*"></label><div><button class="fi-button fi-button-outline" type="button" data-cancel>Batal</button><button class="fi-button" type="submit">Simpan perubahan</button></div></form>`;
  document.body.append(dialog);
  dialog.showModal();
  const form = dialog.querySelector('form');
  const regionAddress = bindRegionAddress(form, 'store', store.shippingOriginRegion || {});
  dialog
    .querySelectorAll('[data-cancel],.st-dialog-close')
    .forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const pickup = (await regionAddress).read();
      const data = new FormData(form);
      data.set('shippingOriginAddress', pickup.address);
      data.set('shippingOriginRegion', JSON.stringify(pickup.region));
      const result = await updateMyStore(data);
      if (!result.success) throw new Error(result.message || 'Informasi toko belum tersimpan.');
      dialog.close();
      dialog.remove();
      showToast('Informasi toko diperbarui.');
      renderStore();
    } catch (error) {
      showToast(error.message || 'Informasi toko belum tersimpan.', 'error');
      submit.disabled = false;
    }
  });
}

function injectStoreStyles() {
  if (document.getElementById('store-page-style')) return;
  const style = document.createElement('style');
  style.id = 'store-page-style';
  style.textContent = `
    .st-page{max-width:none;margin:0 clamp(17px,1.35vw,24px);padding:4px 0 30px}
    .st-loading,.st-error,.st-no-store,.st-empty{min-height:250px;padding:32px;border:1px solid var(--fi-line);border-radius:24px;background:var(--fi-card);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
    .st-loading{color:var(--fi-muted)}
    .st-error h1,.st-no-store h1,.st-empty h2{margin:0 0 10px;color:var(--fi-deep);font-size:clamp(22px,3vw,32px);letter-spacing:-.04em}
    .st-error p,.st-no-store p,.st-empty p{max-width:560px;margin:0 0 20px;color:var(--fi-muted);font-size:14px;line-height:1.7}
    .st-no-store{min-height:380px;position:relative;overflow:hidden;align-items:flex-start;padding:clamp(28px,6vw,70px);text-align:left;background:radial-gradient(circle at 88% 22%,#85c7bf55,transparent 27%),linear-gradient(135deg,#eaf5f3,#d7e9e7)}
    .st-no-store>div{position:relative;z-index:1;max-width:580px}
    .st-kicker{margin:0 0 8px;color:#49827d;font-size:10px;font-weight:700;letter-spacing:.14em}
    .st-no-store h1{max-width:460px;font-size:clamp(30px,5vw,48px);line-height:1.08}
    .st-no-store p{max-width:460px}
    .st-store-mark{position:absolute;right:7%;top:50%;width:180px;height:180px;border:1px solid #4d969040;border-radius:50%;display:grid;place-items:center;color:#235347;font-size:90px;transform:translateY(-50%)}
    .st-title{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:25px}
    .st-title h1{margin:0;color:#163832;font-size:clamp(28px,4vw,38px);font-weight:600;letter-spacing:-.045em}
    .st-title>div:first-child>p:last-child{margin:8px 0 0;color:var(--fi-muted);font-size:14px;line-height:1.6}
    .st-title-actions{display:flex;flex-wrap:wrap;gap:10px}
    .st-profile{display:grid;grid-template-columns:104px minmax(0,1fr);align-items:center;gap:22px;padding:24px}
    .st-store-avatar{width:104px;height:104px;border-radius:23px;overflow:hidden;display:grid;place-items:center;background:linear-gradient(145deg,#c7e5e2,#e8f4f2);color:var(--fi-deep);font-size:42px}
    .st-store-avatar img{width:100%;height:100%;object-fit:cover}
    .st-store-info h2{margin:0;color:#163832;font-size:22px;letter-spacing:-.03em}
    .st-store-location{margin:6px 0;color:#49827d;font-size:12px}
    .st-store-description{max-width:760px;color:var(--fi-muted);font-size:13px;line-height:1.65}
    .st-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
    .st-pills span{padding:7px 11px;border:1px solid #c8dddb;border-radius:999px;background:#f4faf9;color:#315e5b;font-size:11px;font-weight:600}
    .st-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:18px 0 25px}
    .st-metrics article{min-width:0;min-height:120px;padding:19px;border:1px solid var(--fi-line);border-radius:19px;background:var(--fi-card);box-shadow:0 8px 24px #003f4008}
    .st-metrics small,.st-metrics span{display:block;color:var(--fi-muted);font-size:10px;letter-spacing:.06em}
    .st-metrics strong{display:block;overflow:hidden;margin:9px 0 4px;color:var(--fi-deep);font-size:clamp(21px,3vw,29px);text-overflow:ellipsis;white-space:nowrap}
    .st-metrics span{font-size:11px;letter-spacing:0}
    .st-tabs{display:flex;gap:8px;margin:0 0 15px;padding:5px;border:1px solid var(--fi-line);border-radius:15px;background:#eaf3f2;overflow-x:auto}
    .st-tabs button{flex:none;min-height:39px;padding:0 17px;border-radius:11px;background:transparent;color:#55716e;font-size:12px;font-weight:600}
    .st-tabs button.active{background:#0B2B26;color:#eff9f8;box-shadow:0 4px 12px #0B2B2624}
    .st-tabs button span{margin-left:4px;opacity:.72}
    .st-products{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
    .st-product{min-width:0;overflow:hidden;display:grid;grid-template-columns:145px minmax(0,1fr);padding:10px}
    .st-product>img{width:145px;height:100%;min-height:180px;border-radius:15px;object-fit:cover;background:#DAF1DE}
    .st-product-main{min-width:0;padding:9px 12px;display:flex;flex-direction:column;align-items:flex-start}
    .st-category{padding:5px 9px;border-radius:999px;background:#d8eeeb;color:#116b67;font-size:9px;font-weight:700}
    .st-category.compost{background:#e2efe4;color:#42744f}
    .st-product-main h3{width:100%;overflow:hidden;margin:10px 0 5px;color:#163832;font-size:16px;text-overflow:ellipsis;white-space:nowrap}
    .st-product-main>p{display:-webkit-box;overflow:hidden;color:var(--fi-muted);font-size:11px;line-height:1.55;-webkit-box-orient:vertical;-webkit-line-clamp:2}
    .st-product-data{width:100%;display:flex;flex-wrap:wrap;justify-content:space-between;gap:7px;margin:13px 0;color:var(--fi-muted);font-size:10px}
    .st-product-data strong{color:var(--fi-deep);font-size:11px}
    .st-product-actions{display:flex;gap:7px;margin-top:auto}
    .st-product-actions button{min-height:34px;padding:0 12px;border:1px solid var(--fi-line);border-radius:999px;background:#f6fbfa;color:#315e5b;font-size:10px;font-weight:600}
    .st-product-actions button:last-child{border-color:#efd4d1;background:#fff7f6;color:#a34b43}
    .st-empty{grid-column:1/-1;min-height:220px;padding:28px}
    .st-empty>span{width:48px;height:48px;margin-bottom:13px;border-radius:16px;display:grid;place-items:center;background:#d8eeeb;color:var(--fi-deep);font-size:23px}
    .st-orders{display:grid;gap:11px}
    .st-order{min-width:0;padding:13px;display:grid;grid-template-columns:64px minmax(0,1fr) auto;align-items:center;gap:14px}
    .st-order>img{width:64px;height:64px;border-radius:13px;object-fit:cover;background:#DAF1DE}
    .st-order-main{min-width:0}
    .st-order-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
    .st-order-head strong{overflow:hidden;color:#163832;font-size:13px;text-overflow:ellipsis}
    .st-order-status{padding:5px 8px;border-radius:999px;background:#e5efee;color:#426b68;font-size:9px}
    .st-order-status.status-processing,.st-order-status.status-shipped{background:#d9eeeb;color:#08716d}
    .st-order-status.status-completed{background:#e3efe5;color:#46734e}
    .st-order-status.status-cancelled{background:#f8e8e6;color:#a34b43}
    .st-order-main>p{margin:6px 0 3px;color:#315e5b;font-size:11px;font-weight:600}
    .st-order-main>small{color:var(--fi-muted);font-size:10px}
    .st-review{padding:18px}
    .st-review-stars{margin-bottom:9px;color:#14827c;font-size:16px;letter-spacing:.1em}
    .st-review p{margin-bottom:8px;color:#31504e;font-size:13px;line-height:1.65}
    .st-review small{color:var(--fi-muted);font-size:10px}
    .st-dialog{width:min(520px,calc(100% - 28px));max-height:min(90vh,760px);margin:auto;padding:0;border:1px solid var(--fi-line);border-radius:22px;background:#edf6f5;color:var(--fi-ink);box-shadow:0 24px 80px #003f4040}
    .st-dialog::backdrop{background:#002f30a6;backdrop-filter:blur(4px)}
    .st-dialog-form{position:relative;padding:27px}
    .st-dialog-form h2{margin:0 35px 19px 0;color:var(--fi-deep);font-size:23px}
    .st-dialog-form label{margin-bottom:14px}
    .st-dialog-form textarea{height:auto;padding-top:12px;resize:vertical}
    .st-dialog-form>div:last-child{display:flex;justify-content:flex-end;gap:9px;margin-top:19px}
    .st-dialog-close{position:absolute;top:17px;right:18px;width:34px;height:34px;border-radius:50%;background:#dceae8;color:#315e5b;font-size:22px}
    @media(max-width:900px){.st-page{padding-top:0}.st-title{align-items:flex-start;flex-direction:column}.st-title-actions{width:100%}.st-profile{grid-template-columns:84px minmax(0,1fr);gap:16px;padding:19px}.st-store-avatar{width:84px;height:84px;border-radius:19px}.st-products{grid-template-columns:1fr}}
    @media(max-width:620px){.st-page{margin:0 17px}.st-no-store{min-height:330px;padding:25px}.st-store-mark{right:-40px;top:auto;bottom:-55px;width:150px;height:150px;font-size:70px;transform:none;opacity:.45}.st-title{gap:15px;margin-bottom:18px}.st-title-actions{display:grid;grid-template-columns:1fr 1fr}.st-title-actions .fi-button{padding:0 10px;font-size:11px}.st-profile{grid-template-columns:1fr;padding:17px}.st-profile .st-store-avatar{width:74px;height:74px}.st-store-info h2{font-size:19px}.st-metrics{grid-template-columns:1fr;gap:9px;margin:12px 0 20px}.st-metrics article{min-height:0;padding:14px 16px}.st-metrics strong{margin:5px 0;font-size:23px}.st-tabs{gap:4px}.st-tabs button{min-height:36px;padding:0 12px;font-size:11px}.st-product{grid-template-columns:95px minmax(0,1fr);padding:8px}.st-product>img{width:95px;min-height:155px}.st-product-main{padding:6px 8px}.st-product-main h3{font-size:14px}.st-product-data{flex-direction:column;margin:9px 0}.st-product-actions button{min-height:32px;padding:0 10px}.st-order{grid-template-columns:52px minmax(0,1fr);gap:10px;padding:11px}.st-order>img{width:52px;height:52px}.st-order>.fi-button{grid-column:1/-1;width:100%}.st-dialog-form{padding:23px 18px}.st-dialog-form>div:last-child{flex-direction:column-reverse}.st-dialog-form>div:last-child .fi-button{width:100%}}
    @media(prefers-reduced-motion:reduce){.st-product-actions button{transition:none}}
  `;
  style.textContent += `.st-dialog{width:min(640px,calc(100% - 24px));max-height:min(92vh,820px);overflow:auto}.st-dialog-form{padding:28px}.st-address-section{margin:0 0 20px;padding:17px;border:1px solid #d6e5e0;border-radius:18px;background:linear-gradient(145deg,#f7fbf9,#eff7f3)}.st-address-heading{display:flex;gap:11px;align-items:flex-start;margin:0 0 16px}.st-address-heading>span{flex:none;width:29px;height:29px;border-radius:9px;display:grid;place-items:center;background:#dcefe8;color:#235347;font-size:10px;font-weight:800}.st-address-heading h3{margin:1px 0 4px;color:#17473e;font-size:14px}.st-address-heading p{margin:0;color:#7b8b83;font-size:11px;line-height:1.5}.st-address-grid,.st-region-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px}.st-address-detail-grid{grid-template-columns:minmax(0,1.5fr) minmax(100px,.65fr)}.st-address-section .fi-label{display:block;min-width:0;margin-bottom:11px;color:#526a60;font-size:11px;font-weight:650}.st-address-section .fi-input{box-sizing:border-box;width:100%;min-height:43px;margin-top:7px;padding:0 11px;border:1px solid #d4e1db;border-radius:11px;background:#fff;color:#26483c;font-size:12px;outline:none;transition:border-color .16s,box-shadow .16s}.st-address-section .fi-input:focus{border-color:#54977d;box-shadow:0 0 0 3px #54977d20}.st-address-section select.fi-input{padding-right:32px;cursor:pointer}.st-address-section select:disabled{background:#edf2ef;color:#a1aca6;cursor:not-allowed}.st-region-error{margin:0 0 9px;color:#a54e43;font-size:11px;line-height:1.5}.st-region-error:empty{display:none}@media(max-width:520px){.st-dialog-form{padding:22px 16px}.st-address-section{padding:14px}.st-address-grid,.st-region-grid,.st-address-detail-grid{grid-template-columns:1fr;gap:0}}`;
  style.textContent += `.st-dialog{border:1px solid #cbdcd4;border-radius:24px;background:#f8fbf9;color:#1d3d35;box-shadow:0 28px 90px #063b3038;scrollbar-color:#b8d0c5 transparent}.st-dialog-form{padding:30px}.st-dialog-form .st-kicker{width:max-content;margin:0 44px 9px 0;padding:6px 10px;border:1px solid #d2e8dc;border-radius:999px;background:#eaf5ee;color:#39745d;font-size:10px;font-weight:750;letter-spacing:.11em}.st-dialog-form h2{margin:0 42px 22px 0;color:#17483b;font-size:25px;line-height:1.25;letter-spacing:-.035em}.st-dialog-form>h3{margin:23px 0 5px;padding-top:18px;border-top:1px solid #dce8e1;color:#214e40;font-size:15px;line-height:1.35}.st-dialog-form>p:not(.st-kicker){margin:0 0 13px;color:#74847c;font-size:12px;line-height:1.55}.st-dialog-form>label.fi-label{display:block;margin:0 0 15px;color:#435e52;font-size:12px;font-weight:650}.st-dialog-form>.fi-label .fi-input{box-sizing:border-box;width:100%;min-height:46px;margin-top:7px;padding:0 13px;border:1px solid #d4e1d9;border-radius:12px;background:#fff;color:#233f34;font:500 13px Inter,Arial,sans-serif;outline:none;transition:border-color .18s,box-shadow .18s,background .18s}.st-dialog-form>.fi-label .fi-input:hover{border-color:#b7d0c2}.st-dialog-form>.fi-label .fi-input:focus{border-color:#4e9875;background:#fff;box-shadow:0 0 0 4px #4e98751c}.st-dialog-form textarea.fi-input{min-height:100px;padding:12px 13px;line-height:1.55;resize:vertical}.st-dialog-form input[type=file].fi-input{height:auto;min-height:46px;padding:9px 11px}.st-dialog-close{top:18px;right:18px;width:38px;height:38px;border:1px solid #d5e5dc;background:#fff;color:#456b59;box-shadow:0 3px 10px #153c2c0d;transition:transform .18s,background .18s,color .18s}.st-dialog-close:hover{transform:rotate(90deg);background:#eaf5ee;color:#17483b}.st-dialog-form>div:last-child{position:sticky;bottom:-30px;margin:24px -30px -30px;padding:15px 30px 20px;border-top:1px solid #e1ebe5;background:#f8fbf9eF;backdrop-filter:blur(10px)}.st-dialog-form>div:last-child .fi-button{min-width:112px;min-height:43px;border-radius:12px;font-weight:650}.st-dialog-form>div:last-child .fi-button-outline{border:1px solid #ccdcd2;background:#fff;color:#3b5e4e}@media(max-width:620px){.st-dialog{width:calc(100% - 20px);max-height:94vh;border-radius:20px}.st-dialog-form{padding:24px 18px}.st-dialog-form h2{font-size:22px}.st-dialog-form>div:last-child{bottom:-24px;margin:20px -18px -24px;padding:12px 18px 16px}.st-dialog-form>div:last-child .fi-button{min-height:44px}.st-dialog-close{top:14px;right:14px;width:35px;height:35px}}
`;  document.head.append(style);
}
