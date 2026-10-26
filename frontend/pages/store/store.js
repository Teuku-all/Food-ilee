import { loadStylesheet } from '../../utils/stylesheet.js';
import { translate } from '../../utils/i18n.js';
import { getMyStore, updateMyStore } from '../../services/store.js';
import { deleteWaste, getWastes, updateWaste } from '../../services/waste.js';
import { getMySales, updateOrderStatus } from '../../services/order.js';
import { escapeHtml } from '../../utils/html.js';
import { formatRupiah, renderShell, showToast } from '../../ui/shell.js';
import { renderStoreOverview } from './store-overview.js';
import { icon } from '../../ui/icons.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { skeleton } from '../../ui/skeleton.js';
import { bindRegionAddress } from '../../utils/region-address.js';
import { mountLocationPicker } from '../../utils/location-map.js';
import { cropSquareImage } from '../../utils/image-crop.js';
import {
  addProductWeightField,
  formatProductWeight,
  productWeightGrams,
} from '../../utils/product-weight.js';

const statusNames = {
  pending: 'Menunggu Pembayaran',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

function selectedStoreArea(form) {
  const value = (level) =>
    form.querySelector(`#store-${level}`)?.selectedOptions[0]?.textContent?.trim() || '';
  return { district: value('district'), city: value('city'), province: value('province') };
}

export async function renderStore() {
  loadStylesheet('store-page-style', new URL('../../styles/pages/store.css', import.meta.url));
  const navigationRevision = getNavigationRevision();
  renderShell('', storeLoadingSkeleton());
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
      return;
    }
    const products = Array.isArray(wasteResult.data) ? wasteResult.data : store.products || [];
    const salesAvailable = Boolean(salesResult.success);
    const sales = salesAvailable && Array.isArray(salesResult.data) ? salesResult.data : [];
    const reviews = products.flatMap((product) => product.reviews || []);
    const revenue = sales
      .filter((order) => order.paymentStatus === 'paid')
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
    renderShell(
      '',
      `<section class="st-page"><header class="st-title"><div><p class="st-kicker">RUANG USAHA ANDA</p><h1>Kelola toko</h1><p>Pantau performa dan aktivitas toko Anda.</p></div><div class="st-title-actions"><button class="fi-button fi-button-outline" type="button" data-edit-store>${icon('edit')} Edit toko</button><a class="fi-button" href="#tambah-limbah">${icon('add')} Tambah produk</a></div></header>${renderStoreOverview({ store, products, sales, revenue, salesAvailable, reviewCount: reviews.length })}<section class="st-inventory" aria-labelledby="st-inventory-title"><div class="st-product-heading"><div><p class="st-kicker">PENGELOLAAN</p><h2 id="st-inventory-title">Etalase toko</h2></div><span>${products.length} produk</span></div><section class="st-tabs" role="tablist" aria-label="Konten toko"><button class="active" role="tab" aria-selected="true" data-panel="products">Produk <span>${products.length}</span></button><button role="tab" aria-selected="false" data-panel="orders">Pesanan <span>${sales.length}</span></button><button role="tab" aria-selected="false" data-panel="reviews">Ulasan <span>${reviews.length}</span></button></section><section id="store-panel" class="is-entering" aria-live="polite" aria-atomic="true">${renderProducts(products)}</section></section></section>`,
    );
    document.querySelectorAll('.st-product').forEach((card, index) => {
      const product = products[index];
      if (!product) return;
      const data = card.querySelector('.st-product-data');
      if (!data) return;
      data.querySelector('span').textContent = translate(
        `${Number(product.stock || 0).toLocaleString('id-ID')} unit · ${formatProductWeight(productWeightGrams(product))}/unit`,
      );
      data.querySelector('strong').textContent = translate(`${formatRupiah(product.price)} / unit`);
    });
    bindStorePage(store, products, sales, reviews);
    document
      .querySelectorAll('[data-edit-store]')
      .forEach((button) => button.addEventListener('click', () => editStore(store)));
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
  return `<section class="st-page" aria-busy="true"><div class="st-title"><div>${skeleton('130px', '10px')}<div style="height:10px"></div>${skeleton('260px', '30px')}<div style="height:8px"></div>${skeleton('320px', '13px')}</div><div class="st-title-actions">${skeleton('115px', '40px', 'pill')}${skeleton('145px', '40px', 'pill')}</div></div><section class="st-dashboard" aria-busy="true"><div class="db-overview-grid">${Array.from({ length: 3 }, () => `<article class="db-panel">${skeleton('45%', '16px')}<div style="height:28px"></div>${skeleton('65%', '58px')}<div style="height:22px"></div>${skeleton('85%', '12px')}</article>`).join('')}</div></section><section class="st-tabs">${skeleton('105px', '38px', 'pill')}${skeleton('105px', '38px', 'pill')}${skeleton('105px', '38px', 'pill')}</section><div class="st-products">${Array.from({ length: 2 }, () => `<article class="st-product fi-card">${skeleton('150px', '165px')}<div class="st-product-main">${skeleton('85px', '16px', 'pill')}<div style="height:10px"></div>${skeleton('65%', '18px')}<div style="height:11px"></div>${skeleton('100%', '12px')}${skeleton('80%', '12px')}</div></article>`).join('')}</div></section>`;
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
      const nextStatus = isPickup
        ? order.status === 'processing'
          ? 'completed'
          : ''
        : { processing: 'shipped', shipped: 'completed' }[order.status];
      const action =
        order.status === 'processing'
          ? isPickup
            ? order.paymentMethod === 'cash'
              ? 'Konfirmasi cash & jemput selesai'
              : 'Konfirmasi pesanan dijemput'
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
  const tabs = [...document.querySelectorAll('.st-tabs button')];
  const panel = document.getElementById('store-panel');
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', 'st-tab-products');
  panel.tabIndex = 0;
  tabs.forEach((button) => {
    button.id = `st-tab-${button.dataset.panel}`;
    button.setAttribute('aria-controls', 'store-panel');
    button.tabIndex = button.classList.contains('active') ? 0 : -1;
    // Match native tab behavior for keyboards and assistive technology.
    button.addEventListener('keydown', (event) => {
      const current = tabs.indexOf(button);
      const target = {
        ArrowRight: tabs[(current + 1) % tabs.length],
        ArrowLeft: tabs[(current - 1 + tabs.length) % tabs.length],
        Home: tabs[0],
        End: tabs[tabs.length - 1],
      }[event.key];
      if (!target) return;
      event.preventDefault();
      target.focus();
      target.click();
    });
  });
  tabs.forEach((button) =>
    button.addEventListener('click', () => {
      document.querySelectorAll('.st-tabs button').forEach((item) => {
        item.classList.toggle('active', item === button);
        item.setAttribute('aria-selected', String(item === button));
        item.tabIndex = item === button ? 0 : -1;
      });
      const panel = document.getElementById('store-panel');
      panel.setAttribute('aria-labelledby', button.id);
      panel.classList.remove('is-entering');
      panel.innerHTML = panels[button.dataset.panel];
      requestAnimationFrame(() => panel.classList.add('is-entering'));
      bindPanelActions(products, sales);
    }),
  );
  document.querySelectorAll('[data-store-tab-target]').forEach((link) =>
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const tab = document.querySelector(
        `.st-tabs button[data-panel="${link.dataset.storeTabTarget}"]`,
      );
      if (!tab) return;
      tab.click();
      document.querySelector('.st-tabs')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'start',
      });
    }),
  );
  bindPanelActions(products, sales);
}

function bindPanelActions(products, sales) {
  document.querySelectorAll('[data-product-delete]').forEach((button) =>
    button.addEventListener('click', async () => {
      const product = products.find((item) => item.id === button.dataset.productDelete);
      if (!product || !confirm(translate(`Hapus “${product.title}” dari toko?`))) return;
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
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.innerHTML = `<form class="st-dialog-form"><button class="st-dialog-close" type="button" aria-label="Tutup dialog">×</button><p class="st-kicker">ETALASE TOKO</p><h2 id="st-dialog-title">Edit penawaran</h2><label class="fi-label">Nama<input class="fi-input" name="title" value="${escapeHtml(product.title)}" required minlength="3"></label><label class="fi-label">Jumlah (kg)<input class="fi-input" type="number" min="1" name="stock" value="${Number(product.stock)}" required></label><label class="fi-label">Harga per kg<input class="fi-input" type="number" min="0" name="price" value="${Number(product.price)}" required></label><label class="fi-label">Deskripsi<textarea class="fi-input" rows="4" name="description" required>${escapeHtml(product.description || '')}</textarea></label><div><button class="fi-button fi-button-outline" type="button" data-cancel>Batal</button><button class="fi-button" type="submit">Simpan</button></div></form>`;
  document.body.append(dialog);
  addProductWeightField(dialog.querySelector('form'), product);
  dialog.setAttribute('aria-labelledby', 'st-dialog-title');
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.showModal();
  const form = dialog.querySelector('form');
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
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.innerHTML = `<form class="st-dialog-form"><button class="st-dialog-close" type="button" aria-label="Tutup dialog">×</button><p class="st-kicker">PROFIL TOKO</p><h2 id="st-dialog-title">Perbarui informasi toko</h2><label class="fi-label">Nama toko<input class="fi-input" name="name" value="${escapeHtml(store.name || '')}" required minlength="3"></label><label class="fi-label">Lokasi<input class="fi-input" name="location" value="${escapeHtml(store.location || '')}" maxlength="180"></label><h3>Alamat pickup pengiriman</h3><p>Ongkir dihitung dari lokasi pickup ini ke alamat pembeli.</p><section class="st-address-section"><div class="st-address-heading"><span>01</span><div><h3>Alamat pickup</h3><p>Ongkir dihitung dari alamat ini ke lokasi pembeli.</p></div></div><div class="st-address-grid"><label class="fi-label">Nama kontak<input class="fi-input" name="shippingOriginContactName" value="${escapeHtml(store.shippingOriginContactName || '')}" required maxlength="100" placeholder="Nama yang bisa dihubungi"></label><label class="fi-label">Nomor telepon<input class="fi-input" name="shippingOriginContactPhone" value="${escapeHtml(store.shippingOriginContactPhone || '')}" required maxlength="20" inputmode="tel" placeholder="08xxxxxxxxxx"></label></div><div class="st-region-grid"><label class="fi-label">Provinsi<select class="fi-input" id="store-province" required><option value="">Pilih provinsi</option></select></label><label class="fi-label">Kabupaten/Kota<select class="fi-input" id="store-city" required disabled><option value="">Pilih kabupaten/kota</option></select></label><label class="fi-label">Kecamatan<select class="fi-input" id="store-district" required disabled><option value="">Pilih kecamatan</option></select></label><label class="fi-label">Desa/Kelurahan<select class="fi-input" id="store-village" required disabled><option value="">Pilih desa/kelurahan</option></select></label></div><p id="store-region-error" class="st-region-error" role="alert"></p><div class="st-address-grid st-address-detail-grid"><label class="fi-label">Nama jalan, nomor, RT/RW<input class="fi-input" id="store-details" value="${escapeHtml(store.shippingOriginRegion?.details || '')}" required maxlength="240" placeholder="Contoh: Jl. Melati No. 10, RT 02/RW 01"></label><label class="fi-label">Kode pos<input class="fi-input" id="store-postal" value="${escapeHtml(store.shippingOriginPostalCode || '')}" required inputmode="numeric" pattern="[0-9]{5}" maxlength="5" placeholder="12345"></label></div><input type="hidden" name="shippingOriginAddress"><input type="hidden" name="shippingOriginRegion"></section><h3>Rekening penerimaan penjual</h3><p>Nomor rekening hanya untuk pencatatan penyelesaian dana penjual.</p><label class="fi-label">Nama bank<input class="fi-input" name="bankName" value="${escapeHtml(store.bankName || '')}" required maxlength="60"></label><label class="fi-label">Nomor rekening<input class="fi-input" name="bankAccountNumber" value="${escapeHtml(store.bankAccountNumber || '')}" required inputmode="numeric" pattern="[0-9 -]{6,36}" maxlength="36"></label><label class="fi-label">Nama pemilik rekening<input class="fi-input" name="bankAccountHolder" value="${escapeHtml(store.bankAccountHolder || '')}" required maxlength="100"></label><label class="fi-label">Cerita toko<textarea class="fi-input" rows="4" name="description">${escapeHtml(store.description || '')}</textarea></label><label class="fi-label">Foto toko<input class="fi-input" name="image" type="file" accept="image/*"></label><div><button class="fi-button fi-button-outline" type="button" data-cancel>Batal</button><button class="fi-button" type="submit">Simpan perubahan</button></div></form>`;
  document.body.append(dialog);
  dialog.setAttribute('aria-labelledby', 'st-dialog-title');
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.showModal();
  const form = dialog.querySelector('form');
  const photoSection = document.createElement('section');
  photoSection.className = 'st-edit-photo-section';
  photoSection.innerHTML = `<h3>Foto profil toko</h3><p>Foto ini akan tampil pada detail produk dan profil toko.</p><div class="st-edit-photo"><div class="st-crop-frame"><img class="st-current-photo" src="${escapeHtml(store.image || '')}" alt="Foto toko saat ini" ${store.image ? '' : 'hidden'}><img class="st-crop-preview" alt="Pratinjau foto toko" hidden><span class="st-crop-placeholder" ${store.image ? 'hidden' : ''}>${icon('store')}</span><span class="st-crop-loading" hidden>Memuat foto…</span></div><div class="st-edit-photo-controls"><label class="st-upload-button">Pilih foto toko<input name="image" type="file" accept="image/jpeg,image/png,image/webp"></label><small>JPG, PNG, atau WebP · maksimal 4 MB. Geser foto untuk mengatur posisi.</small><label class="st-zoom-label">Perbesar foto<input data-store-crop-zoom type="range" min="1" max="3" step="0.01" value="1" disabled></label></div></div>`;
  photoSection.querySelector('.st-edit-photo-controls small').textContent =
    'Foto otomatis dikompres. Geser foto untuk mengatur posisi.';
  const oldPhotoLabel = form.querySelector('input[name="image"]').closest('label');
  oldPhotoLabel.replaceWith(photoSection);
  const photoInput = photoSection.querySelector('input[name="image"]');
  const currentPhoto = photoSection.querySelector('.st-current-photo');
  const cropPreview = photoSection.querySelector('.st-crop-preview');
  const cropPlaceholder = photoSection.querySelector('.st-crop-placeholder');
  const cropLoading = photoSection.querySelector('.st-crop-loading');
  const cropFrame = photoSection.querySelector('.st-crop-frame');
  const cropZoom = photoSection.querySelector('[data-store-crop-zoom]');
  let cropImage = null;
  let cropObjectUrl = null;
  let cropX = 0.5;
  let cropY = 0.5;
  let dragStart = null;
  let cropLoadRevision = 0;
  const updateCropPreview = () => {
    if (!cropImage || !cropFrame.clientWidth) return;
    const frameWidth = cropFrame.clientWidth;
    const frameHeight = cropFrame.clientHeight;
    const scale =
      Math.max(frameWidth / cropImage.naturalWidth, frameHeight / cropImage.naturalHeight) *
      Number(cropZoom.value);
    const imageWidth = cropImage.naturalWidth * scale;
    const imageHeight = cropImage.naturalHeight * scale;
    cropPreview.style.width = `${imageWidth}px`;
    cropPreview.style.height = `${imageHeight}px`;
    cropPreview.style.left = `${(frameWidth - imageWidth) * cropX}px`;
    cropPreview.style.top = `${(frameHeight - imageHeight) * cropY}px`;
  };
  photoInput.addEventListener('change', () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    const loadRevision = ++cropLoadRevision;
    if (cropObjectUrl) URL.revokeObjectURL(cropObjectUrl);
    cropObjectUrl = null;
    cropImage = null;
    cropPreview.hidden = true;
    currentPhoto.hidden = !store.image;
    cropPlaceholder.hidden = Boolean(store.image);
    cropLoading.hidden = false;
    cropZoom.disabled = true;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      photoInput.value = '';
      cropLoading.hidden = true;
      showToast('Pilih foto JPG, PNG, atau WebP.', 'error');
      return;
    }
    cropObjectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (loadRevision !== cropLoadRevision || !dialog.isConnected) return;
      cropImage = image;
      cropX = 0.5;
      cropY = 0.5;
      cropZoom.value = '1';
      cropZoom.disabled = false;
      cropPreview.src = cropObjectUrl;
      cropPreview.hidden = false;
      cropLoading.hidden = true;
      currentPhoto.hidden = true;
      cropPlaceholder.hidden = true;
      requestAnimationFrame(() => {
        updateCropPreview();
        setTimeout(updateCropPreview, 50);
      });
    };
    image.onerror = () => {
      if (loadRevision !== cropLoadRevision) return;
      cropLoading.hidden = true;
      photoInput.value = '';
      currentPhoto.hidden = !store.image;
      cropPlaceholder.hidden = Boolean(store.image);
      showToast('Foto tidak dapat dibuka. Coba gambar lain.', 'error');
    };
    image.src = cropObjectUrl;
  });
  cropZoom.addEventListener('input', updateCropPreview);
  cropFrame.addEventListener('pointerdown', (event) => {
    if (!cropImage) return;
    dragStart = { x: event.clientX, y: event.clientY, cropX, cropY };
    cropFrame.setPointerCapture(event.pointerId);
  });
  cropFrame.addEventListener('pointermove', (event) => {
    if (!dragStart || !cropImage) return;
    const scale =
      Math.max(
        cropFrame.clientWidth / cropImage.naturalWidth,
        cropFrame.clientHeight / cropImage.naturalHeight,
      ) * Number(cropZoom.value);
    const overflowX = Math.max(0, cropImage.naturalWidth * scale - cropFrame.clientWidth);
    const overflowY = Math.max(0, cropImage.naturalHeight * scale - cropFrame.clientHeight);
    cropX = overflowX
      ? Math.max(0, Math.min(1, dragStart.cropX + (event.clientX - dragStart.x) / overflowX))
      : 0.5;
    cropY = overflowY
      ? Math.max(0, Math.min(1, dragStart.cropY + (event.clientY - dragStart.y) / overflowY))
      : 0.5;
    updateCropPreview();
  });
  cropFrame.addEventListener('pointerup', () => {
    dragStart = null;
  });
  cropFrame.addEventListener('pointercancel', () => {
    dragStart = null;
  });
  dialog.addEventListener('close', () => {
    if (cropObjectUrl) URL.revokeObjectURL(cropObjectUrl);
    dialog.remove();
  });
  const mapSection = document.createElement('div');
  mapSection.innerHTML =
    '<label class="fi-label fi-map-label">Titik lokasi toko <small>Pilih titik pickup pada peta untuk menyesuaikan alamat administratif secara otomatis.</small></label><div id="store-map" class="fi-location-map" role="application" aria-label="Peta pemilih lokasi toko"></div><div class="fi-map-controls"><button type="button" class="fi-button fi-button-outline" id="store-locate">Gunakan lokasi perangkat</button><span id="store-map-status" role="status">Memuat peta…</span></div><input type="hidden" name="latitude"><input type="hidden" name="longitude">';
  form.querySelector('[name="shippingOriginAddress"]').before(mapSection);
  const regionAddress = bindRegionAddress(form, 'store', store.shippingOriginRegion || {});
  const mapStatus = form.querySelector('#store-map-status');
  let pickupLocationChanged = false;
  let pickupContactChanged = false;
  const locationPickerPromise = mountLocationPicker({
    element: form.querySelector('#store-map'),
    latitudeInput: form.elements.latitude,
    longitudeInput: form.elements.longitude,
    status: mapStatus,
    locateButton: form.querySelector('#store-locate'),
    initialLocation: store,
    initialArea: store.shippingOriginRegion,
    allowRegionChange: true,
    onAddressChange: async (names) => {
      pickupLocationChanged = true;
      const resolvedAddress = await regionAddress;
      await resolvedAddress.selectRegion(names);
    },
  }).catch((error) => {
    mapStatus.textContent = error.message;
    return null;
  });
  dialog.addEventListener('close', async () => {
    const picker = await locationPickerPromise;
    picker?.destroy();
  });
  const updateStoreMapArea = async () => {
    try {
      const picker = await locationPickerPromise;
      if (picker)
        await picker.setArea({
          village:
            form.querySelector('#store-village')?.selectedOptions[0]?.textContent?.trim() || '',
          ...selectedStoreArea(form),
        });
    } catch (error) {
      mapStatus.textContent = error.message;
    }
  };
  form.querySelector('#store-district').addEventListener('change', updateStoreMapArea);
  form.querySelector('#store-village').addEventListener('change', updateStoreMapArea);
  for (const level of ['province', 'city']) {
    form.querySelector(`#store-${level}`).addEventListener('change', async () => {
      const picker = await locationPickerPromise;
      picker?.clearArea();
    });
  }
  dialog
    .querySelectorAll('[data-cancel],.st-dialog-close')
    .forEach((button) => button.addEventListener('click', () => dialog.close()));
  const addressSection = form.querySelector('.st-address-section');
  addressSection
    .querySelectorAll('[required]')
    .forEach((field) => field.removeAttribute('required'));
  addressSection.querySelectorAll('select,#store-details,#store-postal').forEach((field) => {
    field.addEventListener('input', () => {
      pickupLocationChanged = true;
    });
    field.addEventListener('change', () => {
      pickupLocationChanged = true;
    });
  });
  addressSection
    .querySelectorAll('[name="shippingOriginContactName"],[name="shippingOriginContactPhone"]')
    .forEach((field) =>
      field.addEventListener('input', () => {
        pickupContactChanged = true;
      }),
    );
  dialog.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      if (!form.elements.latitude.value || !form.elements.longitude.value)
        throw new Error('Pilih titik lokasi pickup toko pada peta.');
      const data = new FormData(form);
      if (pickupLocationChanged) {
        const pickup = (await regionAddress).read();
        data.set('shippingOriginAddress', pickup.address);
        data.set('shippingOriginRegion', JSON.stringify(pickup.region));
      } else if (!pickupContactChanged) {
        [
          'shippingOriginContactName',
          'shippingOriginContactPhone',
          'shippingOriginAddress',
          'shippingOriginPostalCode',
          'shippingOriginRegion',
        ].forEach((field) => data.delete(field));
      } else {
        ['shippingOriginAddress', 'shippingOriginPostalCode', 'shippingOriginRegion'].forEach(
          (field) => data.delete(field),
        );
      }
      const image = photoInput.files?.[0];
      if (!image?.size) data.delete('image');
      else
        data.set(
          'image',
          await cropSquareImage(cropImage, Number(cropZoom.value), cropX, cropY, 'store.jpg'),
        );
      const result = await updateMyStore(data);
      if (!result.success) throw new Error(result.message || 'Informasi toko belum tersimpan.');
      if (image?.size && !result.data?.image)
        throw new Error(
          'Foto toko belum tersimpan di server. Periksa koneksi penyimpanan foto lalu coba lagi.',
        );
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
