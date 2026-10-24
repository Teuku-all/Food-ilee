import { createReview, getMyOrders, getOrder, refreshOrderPayment } from '../../services/order.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast, injectToastStyle } from '../../utils/toast.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { bindSharedHeader, dashboardFooter, dashboardHeader } from '../../ui/shell.js';
import { skeleton } from '../../ui/skeleton.js';
import { icon } from '../../ui/icons.js';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=200&q=60';
const PAGE_SIZE = 5;
const STATUS = {
  pending: { label: 'Menunggu Pembayaran', tone: 'pending' },
  processing: { label: 'Diproses', tone: 'processing' },
  shipped: { label: 'Dikirim', tone: 'shipped' },
  completed: { label: 'Selesai', tone: 'completed' },
  cancelled: { label: 'Dibatalkan', tone: 'cancelled' },
  payment_review: { label: 'Pembayaran terverifikasi · Pesanan ditinjau', tone: 'pending' },
};
const PAYMENT_STATUS = {
  paid: 'Pembayaran berhasil', pending: 'Menunggu pembayaran', cancel: 'Dibatalkan',
  cancelled: 'Dibatalkan', expire: 'Kedaluwarsa', deny: 'Ditolak', failure: 'Gagal',
  challenge: 'Sedang diverifikasi', refund: 'Dana dikembalikan', partial_refund: 'Pengembalian sebagian',
};
const SHIPPING_STATUS = {
  confirmed: 'Dikonfirmasi kurir', allocated: 'Kurir ditugaskan', picking_up: 'Menunggu penjemputan',
  picked: 'Paket dijemput', dropping_off: 'Dalam perjalanan', delivered: 'Terkirim',
  rejected: 'Pengiriman ditolak', cancelled: 'Pengiriman dibatalkan', configuration_missing: 'Menunggu konfigurasi pengiriman',
  creation_requires_review: 'Pengiriman perlu diperiksa',
};

let allOrders = [];
let activeStatus = '';
let visibleCount = PAGE_SIZE;

export async function renderTransactions() {
  const revision = getNavigationRevision();
  const app = document.getElementById('app');
  activeStatus = '';
  visibleCount = PAGE_SIZE;
  app.innerHTML = `
    <div class="tx-app">
${dashboardHeader('orders')}

      <main class="tx-main">
        <div class="tx-filters" role="group" aria-label="Filter status transaksi">
          <button class="tx-filter active" type="button" aria-pressed="true" data-status="">Semua</button>
          <button class="tx-filter" type="button" aria-pressed="false" data-status="pending">Menunggu Pembayaran</button>
          <button class="tx-filter" type="button" aria-pressed="false" data-status="processing">Diproses</button>
          <button class="tx-filter" type="button" aria-pressed="false" data-status="shipped">Dikirim</button>
          <button class="tx-filter" type="button" aria-pressed="false" data-status="completed">Selesai</button>
          <button class="tx-filter" type="button" aria-pressed="false" data-status="cancelled">Dibatalkan</button>
        </div>
        <div class="tx-results-note" id="tx-results-note"></div>
        <section id="tx-order-list" class="tx-order-list" aria-live="polite" aria-busy="true">${transactionsLoadingSkeleton()}</section>
        <div class="tx-more-wrap" id="tx-more-wrap" hidden><button class="tx-more-button" id="tx-more" type="button">Tampilkan Lebih Banyak <span>↓</span></button></div>
      </main>

      ${dashboardFooter()}
    </div>`;

  injectTransactionsStyle();
  injectTransactionDialogStyle();
  injectToastStyle();
  bindSharedHeader();
  bindControls();
  await loadOrders(revision);
}

function transactionsLoadingSkeleton() {
  return Array.from({ length: 3 }, () => `<article class="tx-order-card" aria-hidden="true"><header class="tx-order-heading"><div class="tx-order-merchant"><span class="tx-merchant-icon">${skeleton('38px', '38px', 'circle')}</span><div>${skeleton('145px', '13px')}<div style="height:7px"></div>${skeleton('190px', '10px')}</div></div>${skeleton('110px', '24px', 'pill')}</header><div class="tx-order-content">${skeleton('82px', '82px')}<div class="tx-item-info">${skeleton('170px', '17px')}<div style="height:10px"></div>${skeleton('110px', '12px')}${skeleton('160px', '10px')}</div><div class="tx-total">${skeleton('85px', '10px')}<div style="height:7px"></div>${skeleton('90px', '18px')}</div></div><footer class="tx-order-actions">${skeleton('105px', '34px', 'pill')}${skeleton('95px', '34px', 'pill')}</footer></article>`).join('');
}

function bindControls() {
  document.querySelectorAll('.tx-filter').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tx-filter').forEach((filter) => {
        filter.classList.remove('active');
        filter.setAttribute('aria-pressed', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
      activeStatus = button.dataset.status;
      visibleCount = PAGE_SIZE;
      renderOrders();
    });
  });

  document.getElementById('tx-more').addEventListener('click', () => {
    visibleCount += PAGE_SIZE;
    renderOrders();
  });
}

async function loadOrders(revision) {
  const list = document.getElementById('tx-order-list');
  if (list) {
    list.setAttribute('aria-busy', 'true');
    list.innerHTML = transactionsLoadingSkeleton();
  }
  try {
    const result = await getMyOrders();
    if (!isRouteCurrent('#transaksi', revision)) return;
    if (!result.success) throw new Error(result.message || 'Gagal memuat transaksi.');
    document.getElementById('tx-order-list')?.removeAttribute('aria-busy');
    allOrders = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
    const pending = allOrders.filter((order) => order.paymentStatus === 'pending' && order.paymentMethod === 'midtrans').slice(0, 8);
    const refreshed = await Promise.allSettled(pending.map((order) => refreshOrderPayment(order.id)));
    refreshed.forEach((entry) => {
      if (entry.status !== 'fulfilled' || !entry.value?.success) return;
      const index = allOrders.findIndex((order) => order.id === entry.value.data.id);
      if (index >= 0) allOrders[index] = entry.value.data;
    });
    if (!isRouteCurrent('#transaksi', revision)) return;
    renderOrders();
  } catch (error) {
    if (!isRouteCurrent('#transaksi', revision)) return;
    const list = document.getElementById('tx-order-list');
    if (list) {
      list.removeAttribute('aria-busy');
      list.innerHTML = `<div class="tx-state"><div class="tx-state-icon">!</div><h2>Transaksi belum dapat dimuat</h2><p>${escapeHtml(error.message || 'Periksa koneksi Anda dan pastikan server berjalan.')}</p><button class="tx-button tx-button-outline" id="tx-retry" type="button">Coba lagi</button></div>`;
    }
    document
      .getElementById('tx-retry')
      ?.addEventListener('click', () => loadOrders(getNavigationRevision()));
  }
}

function formatRupiah(value) {
  return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Tanggal tidak tersedia'
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatInvoiceDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '--------'
    : date.toISOString().slice(0, 10).replaceAll('-', '');
}

function renderOrders() {
  const list = document.getElementById('tx-order-list');
  if (!list) return;
  const filtered = activeStatus
    ? allOrders.filter((order) => order.status === activeStatus)
    : allOrders;
  const visible = filtered.slice(0, visibleCount);
  const note = document.getElementById('tx-results-note');
  note.textContent = filtered.length
    ? `${filtered.length} ${filtered.length === 1 ? 'transaksi' : 'transaksi'}`
    : '';
  const moreWrap = document.getElementById('tx-more-wrap');
  moreWrap.hidden = visible.length >= filtered.length;

  if (!filtered.length) {
    list.innerHTML = `<div class="tx-state"><div class="tx-state-icon">${activeStatus ? '⌕' : '↗'}</div><h2>${activeStatus ? 'Tidak ada transaksi di status ini' : 'Belum ada transaksi'}</h2><p>${activeStatus ? 'Coba pilih status lain untuk melihat riwayat pesanan.' : 'Pesanan Anda akan tampil di sini setelah berbelanja di marketplace.'}</p>${activeStatus ? '' : '<a class="tx-button tx-button-primary" href="#marketplace">Jelajahi Marketplace <span>→</span></a>'}</div>`;
    return;
  }

  list.innerHTML = visible
    .map((order) => {
      const waste = order.waste || {};
      const status = STATUS[order.status] || {
        label: order.status || 'Status belum tersedia',
        tone: 'unknown',
      };
      const seller =
        waste.store?.name || waste.seller?.name || waste.seller?.email || 'Penjual Food Ilee';
      const id = escapeHtml(order.id);
      const title = waste.title || 'Produk pangan';
      const quantity = Number(order.quantity || 0);
      const total = Number(order.total || 0);
      const unitPrice = quantity > 0 ? total / quantity : 0;
      const completed = order.status === 'completed';
      const shipped = order.status === 'shipped';
      const image = waste.image || FALLBACK_IMAGE;

      return `<article class="tx-order-card">
      <header class="tx-order-heading"><div class="tx-order-merchant"><span class="tx-merchant-icon">${icon(shipped ? 'external' : 'leaf')}</span><div><strong>${escapeHtml(seller)}</strong><span>${escapeHtml(formatDate(order.createdAt))} <i>•</i> INV/${escapeHtml(formatInvoiceDate(order.createdAt))}/${escapeHtml(
        String(order.id || '')
          .slice(-4)
          .toUpperCase(),
      )}</span></div></div><span class="tx-status tx-status-${status.tone}">${escapeHtml(status.label)}</span></header>
      <div class="tx-order-content"><img class="tx-item-image" src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"><div class="tx-item-info"><h2>${escapeHtml(title)}</h2><p>${quantity.toLocaleString('id-ID')} kg <span>×</span> ${formatRupiah(unitPrice)}</p><span class="tx-impact">${escapeHtml(PAYMENT_STATUS[order.paymentStatus] || 'Status pembayaran belum tersedia')} · Pengiriman: ${escapeHtml(SHIPPING_STATUS[order.shippingStatus] || order.shippingStatus || 'Belum tersedia')}</span><span class="tx-impact">\u267b Membantu mengurangi ${Math.round(quantity * 0.3)} kg emisi CO\u2082</span></div><div class="tx-total"><span>Total Belanja</span><strong>${formatRupiah(total)}</strong></div></div>
      <footer class="tx-order-actions">${order.paymentStatus === 'pending' && order.paymentMethod !== 'cod' && order.snapToken ? `<button class="tx-button tx-button-primary" type="button" data-pay-snap="${id}">Lanjutkan Pembayaran</button>` : ''}${order.paymentStatus === 'pending' && order.paymentMethod !== 'cod' ? `<button class="tx-button tx-button-outline" type="button" data-payment-status="${id}">Periksa Pembayaran</button>` : ''}${shipped && order.trackingUrl ? `<a class="tx-button tx-button-outline" target="_blank" rel="noopener" href="${escapeHtml(order.trackingUrl)}">Lacak Paket</a>` : ''}<button class="tx-button tx-button-outline" type="button" data-detail="${id}">Lihat Detail</button>${completed ? `<button class="tx-button tx-button-primary" type="button" data-review="${id}">Beri Ulasan</button>` : ''}</footer>
    </article>`;
    })
    .join('');

  visible.forEach((order, index) => {
    if (!['cash', 'cod'].includes(order.paymentMethod) && order.courier !== 'pickup') return;
    const paymentLine = list.querySelectorAll('.tx-order-card .tx-item-info .tx-impact')[index * 2];
    const paymentText = order.paymentMethod === 'cash'
      ? order.paymentStatus === 'paid' ? 'Cash diterima penjual' : 'Bayar cash langsung ke penjual saat jemput'
      : order.paymentMethod === 'cod'
        ? order.paymentStatus === 'paid' ? 'COD dibayar dan terverifikasi' : 'COD · bayar kepada kurir saat diterima'
        : PAYMENT_STATUS[order.paymentStatus] || 'Status pembayaran belum tersedia';
    const deliveryText = order.courier === 'pickup'
      ? 'Jemput langsung di toko'
      : SHIPPING_STATUS[order.shippingStatus] || order.shippingStatus || 'Belum tersedia';
    if (paymentLine) paymentLine.textContent = `${paymentText} · Pengiriman: ${deliveryText}`;
    if (order.paymentMethod === 'cash') {
      list.querySelectorAll('[data-payment-status]').forEach((button) => {
        if (button.dataset.paymentStatus === order.id) button.remove();
      });
    }
  });

  list
    .querySelectorAll('[data-detail]')
    .forEach((button) => button.addEventListener('click', () => showDetail(button.dataset.detail)));
  list.querySelectorAll('[data-pay-snap]').forEach((button) => button.addEventListener('click', () => {
    const order = allOrders.find((item) => item.id === button.dataset.paySnap);
    if (order) openSnapPayment(order);
  }));
  list.querySelectorAll('[data-payment-status]').forEach((button) => button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Memeriksa…';
    try {
      const result = await refreshOrderPayment(button.dataset.paymentStatus);
      if (!result.success) throw new Error(result.message || 'Status belum dapat diperiksa.');
      const index = allOrders.findIndex((item) => item.id === button.dataset.paymentStatus);
      if (index >= 0) allOrders[index] = result.data;
      renderOrders();
      showToast(result.data?.paymentStatus === 'paid' ? 'Pembayaran terverifikasi.' : 'Pembayaran masih menunggu konfirmasi.');
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Periksa Pembayaran';
      showToast(error.message || 'Status pembayaran belum dapat diperiksa.', 'error');
    }
  }));
  list
    .querySelectorAll('[data-review]')
    .forEach((button) =>
      button.addEventListener('click', () => reviewOrder(button.dataset.review)),
    );
  list
    .querySelectorAll('[data-track]')
    .forEach((button) =>
      button.addEventListener('click', () => showToast('Pesanan Anda sedang dalam perjalanan.')),
    );
}

function showDetail(id) {
  const order = allOrders.find((item) => item.id === id);
  if (!order) return;
  const waste = order.waste || {};
  const status = STATUS[order.status]?.label || order.status || 'Status belum tersedia';
  const seller =
    waste.store?.name || waste.seller?.name || waste.seller?.email || 'Penjual Food Ilee';
  const items = Array.isArray(order.items) && order.items.length ? order.items : [{ title: waste.title, image: waste.image, quantity: order.quantity, unitPrice: Number(order.quantity) ? Number(order.total) / Number(order.quantity) : order.total }];
  const shippingAddress = order.shippingAddress || {};
  const pickupAddress = order.sellerShippingOrigin || {};
  const pickupRegion = pickupAddress.region || {};
  const isPickup = order.courier === 'pickup';
  const dialog = document.createElement('dialog');
  dialog.className = 'tx-detail-dialog';
  dialog.innerHTML = `<section class="tx-detail-card"><button type="button" class="tx-dialog-close" aria-label="Tutup">×</button><p class="tx-dialog-kicker">RINGKASAN PESANAN</p><h2>Pesanan ${escapeHtml(String(order.id).slice(-8).toUpperCase())}</h2><span class="tx-status tx-status-${STATUS[order.status]?.tone || 'unknown'}">${escapeHtml(status)}</span><div class="tx-detail-items">${items.map((item) => `<div><img src="${escapeHtml(item.image || FALLBACK_IMAGE)}" alt=""><span><strong>${escapeHtml(item.title || 'Produk pangan')}</strong><small>${Number(item.quantity || 0).toLocaleString('id-ID')} kg × ${formatRupiah(item.unitPrice)}</small></span><b>${formatRupiah(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</b></div>`).join('')}</div><dl><div><dt>Penjual</dt><dd>${escapeHtml(seller)}</dd></div><div><dt>Tanggal pesanan</dt><dd>${escapeHtml(formatDate(order.createdAt))}</dd></div><div><dt>Penerima</dt><dd>${escapeHtml(shippingAddress.recipientName || 'Belum tersedia')}</dd></div><div><dt>Telepon</dt><dd>${escapeHtml(shippingAddress.phone || 'Belum tersedia')}</dd></div><div><dt>Alamat tujuan</dt><dd>${escapeHtml([shippingAddress.details, shippingAddress.village, shippingAddress.district, shippingAddress.city, shippingAddress.province, shippingAddress.postalCode].filter(Boolean).join(', ') || 'Belum tersedia')}</dd></div><div><dt>Subtotal</dt><dd>${formatRupiah(order.subtotal ?? order.total)}</dd></div><div><dt>Diskon</dt><dd>${formatRupiah(order.discount || 0)}</dd></div><div><dt>Ongkir</dt><dd>${order.shippingCost == null ? 'Belum tersedia' : formatRupiah(order.shippingCost)}</dd></div><div><dt>Total pembayaran</dt><dd>${formatRupiah(order.total)}</dd></div><div><dt>Status pembayaran</dt><dd>${escapeHtml(PAYMENT_STATUS[order.paymentStatus] || 'Belum tersedia')}</dd></div><div><dt>Status pesanan</dt><dd>${escapeHtml(status)}</dd></div><div><dt>Status pengiriman</dt><dd>${escapeHtml(SHIPPING_STATUS[order.shippingStatus] || order.shippingStatus || 'Belum tersedia')}</dd></div><div><dt>Kurir</dt><dd>${escapeHtml([order.courier, order.courierServiceName || order.courierService].filter(Boolean).join(' · ') || 'Belum tersedia')}</dd></div><div><dt>Nomor resi</dt><dd>${escapeHtml(order.trackingNumber || 'Belum tersedia')}</dd></div></dl>${order.paymentUrl ? `<a class="tx-button tx-button-primary" href="${escapeHtml(order.paymentUrl)}">Lanjutkan Pembayaran</a>` : ''}${order.trackingUrl ? `<a class="tx-button tx-button-outline" target="_blank" rel="noopener" href="${escapeHtml(order.trackingUrl)}">Lacak paket</a>` : ''}<p class="tx-detail-refresh" aria-live="polite"></p></section>`;
  if (isPickup) {
    const rows = [...dialog.querySelectorAll('dl div')];
    const setRow = (label, value) => {
      const row = rows.find((item) => item.querySelector('dt')?.textContent === label);
      if (row?.querySelector('dd')) row.querySelector('dd').textContent = value;
    };
    const addressText = [
      pickupAddress.address, pickupRegion.village, pickupRegion.district,
      pickupRegion.city, pickupRegion.province, pickupAddress.postalCode,
    ].filter(Boolean).join(', ');
    setRow('Penerima', pickupAddress.contactName || 'Kontak toko');
    setRow('Telepon', pickupAddress.contactPhone || 'Hubungi penjual melalui chat');
    setRow('Alamat tujuan', addressText || 'Hubungi penjual untuk detail lokasi jemput');
    setRow('Ongkir', 'Jemput langsung · Rp0');
    setRow('Status pengiriman', order.status === 'completed' ? 'Sudah dijemput' : 'Menunggu dijemput di toko');
    setRow('Kurir', 'Jemput langsung');
    if (order.paymentMethod === 'cash') {
      setRow('Status pembayaran', order.paymentStatus === 'paid'
        ? 'Cash diterima langsung oleh penjual'
        : 'Bayar cash langsung kepada penjual saat jemput');
    }
  }
  document.body.append(dialog);
  dialog.showModal();
  const paymentLink = dialog.querySelector('a[href*="/snap/v2/vtweb/"]');
  paymentLink?.addEventListener('click', (event) => {
    event.preventDefault();
    openSnapPayment(order);
  });
  if (order.paymentMethod === 'cod') {
    if (Number(order.codFee) > 0) {
      const feeRow = document.createElement('div');
      const feeLabel = document.createElement('dt'); feeLabel.textContent = 'Biaya layanan COD';
      const feeValue = document.createElement('dd'); feeValue.textContent = `${formatRupiah(order.codFee)} · dipotong dari pencairan penjual`;
      feeRow.append(feeLabel, feeValue);
      dialog.querySelector('dl')?.append(feeRow);
    }
    const paymentRow = [...dialog.querySelectorAll('dl div')].find((row) => row.querySelector('dt')?.textContent === 'Status pembayaran');
    const value = paymentRow?.querySelector('dd');
    if (value) value.textContent = order.paymentStatus === 'paid'
      ? 'COD dibayar ke kurir dan terverifikasi'
      : 'COD · bayar ke kurir saat pesanan diterima';
  }
  getOrder(id).then((result) => {
    if (!dialog.isConnected || !result.success) return;
    const latest = result.data;
    const detail = dialog.querySelector('.tx-detail-card');
    const old = allOrders.findIndex((item) => item.id === id);
    if (old >= 0) allOrders[old] = latest;
    if (latest.paymentStatus === 'pending' && latest.paymentMethod === 'midtrans') refreshOrderPayment(id).then((payment) => {
      if (!dialog.isConnected || !payment.success) return;
      const index = allOrders.findIndex((item) => item.id === id);
      if (index >= 0) allOrders[index] = payment.data;
      detail.querySelector('.tx-detail-refresh').textContent = payment.data.paymentStatus === 'paid' ? 'Pembayaran terverifikasi oleh server.' : 'Pembayaran masih menunggu konfirmasi backend.';
    }).catch(() => { detail.querySelector('.tx-detail-refresh').textContent = 'Status pembayaran belum dapat diperiksa.'; });
  }).catch(() => {});
  dialog.querySelector('.tx-dialog-close').addEventListener('click', () => {
    dialog.close();
    dialog.remove();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
      dialog.remove();
    }
  });
}

async function openSnapPayment(order) {
  if (!order.snapToken || !order.snapClientKey || !order.snapJsUrl) {
    showToast('Informasi pembayaran belum lengkap. Muat ulang transaksi.', 'error');
    return;
  }
  try {
    if (!window.snap) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = order.snapJsUrl;
        script.dataset.clientKey = order.snapClientKey;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Snap Midtrans gagal dimuat.'));
        document.head.append(script);
      });
    }
    const verify = async (message) => {
      try {
        const result = await refreshOrderPayment(order.id);
        if (!result.success) throw new Error(result.message || 'Status belum dapat diperiksa.');
        const index = allOrders.findIndex((item) => item.id === order.id);
        if (index >= 0) allOrders[index] = result.data;
        renderOrders();
        showToast(result.data.paymentStatus === 'paid' ? 'Pembayaran terverifikasi.' : message);
      } catch (error) {
        showToast(error.message || 'Status pembayaran belum dapat diperiksa.', 'error');
      }
    };
    window.snap.pay(order.snapToken, {
      language: 'id',
      onSuccess: () => verify('Pembayaran sedang diverifikasi server.'),
      onPending: () => verify('Pembayaran masih menunggu konfirmasi.'),
      onError: () => verify('Pembayaran belum berhasil.'),
      onClose: () => verify('Pembayaran belum selesai. Pesanan tetap tersimpan.'),
    });
  } catch (error) {
    showToast(error.message || 'Halaman pembayaran belum dapat dimuat.', 'error');
  }
}

function reviewOrder(id) {
  const order = allOrders.find((item) => item.id === id);
  if (!order) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'tx-detail-dialog';
  dialog.innerHTML = `<form class="tx-detail-card tx-review-form"><button type="button" class="tx-dialog-close" aria-label="Tutup">?</button><p class="tx-dialog-kicker">CERITAKAN PENGALAMAN ANDA</p><h2>Beri ulasan</h2><p class="tx-review-product">${escapeHtml(order.waste?.title || 'Produk Food Ilee')}</p><label>Rating<div class="tx-rating-input"><select name="rating" required><option value="5">5 ? Sangat puas</option><option value="4">4 ? Puas</option><option value="3">3 ? Cukup</option><option value="2">2 ? Kurang puas</option><option value="1">1 ? Tidak puas</option></select></div></label><label>Ulasan<textarea name="comment" rows="4" minlength="3" placeholder="Bagikan pengalaman transaksi Anda?" required></textarea></label><button class="tx-button tx-button-primary" type="submit">Kirim ulasan</button></form>`;
  document.body.append(dialog);
  dialog.showModal();
  dialog.querySelector('.tx-dialog-close').addEventListener('click', () => {
    dialog.close();
    dialog.remove();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
      dialog.remove();
    }
  });
  dialog.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[type="submit"]');
    button.disabled = true;
    const data = new FormData(event.currentTarget);
    try {
      const result = await createReview(
        order.wasteId || order.waste?.id,
        Number(data.get('rating')),
        String(data.get('comment')).trim(),
      );
      if (!result.success) throw new Error(result.message || 'Ulasan belum terkirim.');
      dialog.close();
      dialog.remove();
      showToast('Terima kasih, ulasan Anda berhasil dikirim.');
    } catch (error) {
      showToast(error.message || 'Ulasan belum terkirim.', 'error');
      button.disabled = false;
    }
  });
}

function injectTransactionDialogStyle() {
  if (document.getElementById('tx-dialog-style')) return;
  const style = document.createElement('style');
  style.id = 'tx-dialog-style';
  style.textContent = `.tx-detail-dialog{width:min(470px,calc(100% - 24px));max-height:calc(100% - 28px);padding:0;border:0;border-radius:22px;box-shadow:0 25px 85px #091b1460}.tx-detail-dialog::backdrop{background:#102c2480;backdrop-filter:blur(3px)}.tx-detail-card{position:relative;padding:27px}.tx-dialog-kicker{margin:0 0 7px;color:#789083;font-size:9px;font-weight:700;letter-spacing:.13em}.tx-detail-card h2{margin:0 35px 11px 0;color:#164b3c;font-size:22px;line-height:1.25}.tx-detail-card dl{margin:13px 0 16px}.tx-detail-card dl>div{padding:9px 0;border-bottom:1px solid #edf1ee;display:flex;justify-content:space-between;gap:10px}.tx-detail-card dt{color:#859088;font-size:10px}.tx-detail-card dd{margin:0;color:#35483d;font-size:10px;font-weight:600;text-align:right}.tx-detail-card>.tx-button{width:100%;text-decoration:none}.tx-detail-items{display:grid;gap:10px;margin:15px 0}.tx-detail-items>div{display:flex;align-items:center;gap:10px;padding:9px;border:1px solid #edf1ee;border-radius:12px}.tx-detail-items img{width:46px;height:46px;border-radius:8px;object-fit:cover;background:#f3f5f4}.tx-detail-items span{flex:1;display:grid;gap:4px}.tx-detail-items strong,.tx-detail-items b{font-size:11px;color:#35483d}.tx-detail-items small{font-size:10px;color:#829087}.tx-dialog-close{position:absolute;right:16px;top:16px;width:32px;height:32px;border:0;border-radius:50%;background:#f1f4f1;color:#4c5b52;font-size:20px;cursor:pointer}.tx-review-form{display:flex;flex-direction:column;gap:13px}.tx-review-form h2{margin-bottom:0}.tx-review-product{margin:-6px 0 4px;color:#728077;font-size:12px}.tx-review-form label{display:flex;flex-direction:column;gap:7px;color:#3f584b;font-size:11px;font-weight:600}.tx-review-form select,.tx-review-form textarea{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #e1e9e3;border-radius:11px;background:#fff;color:#34473d;font:400 12px Inter,Arial,sans-serif;outline:none}.tx-review-form textarea{resize:vertical}.tx-review-form>.tx-button{margin-top:3px}`;
  style.textContent += `.tx-detail-dialog{width:min(590px,calc(100% - 28px));max-height:min(820px,calc(100dvh - 28px));overflow:hidden;border:1px solid #d8e6db;border-radius:24px;background:#f7faf7;box-shadow:0 28px 90px #051F2040}.tx-detail-dialog[open]{animation:tx-detail-pop .24s cubic-bezier(.2,.8,.25,1) both}.tx-detail-dialog::backdrop{background:#051F2080;backdrop-filter:blur(4px)}@keyframes tx-detail-pop{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}.tx-detail-card{box-sizing:border-box;max-height:min(792px,calc(100dvh - 30px));overflow-y:auto;padding:28px 30px 26px;scrollbar-width:thin;scrollbar-color:#b9d1bf transparent}.tx-dialog-kicker{color:#558065;font-size:9px;letter-spacing:.15em}.tx-detail-card h2{margin:0 44px 10px 0;color:#0B2B26;font-size:24px;letter-spacing:-.45px}.tx-detail-card>.tx-status{display:inline-flex;align-items:center;margin:0 0 4px;padding:6px 11px;font-size:10px}.tx-detail-items{gap:8px;margin:16px 0;padding:12px;border:1px solid #dce9df;border-radius:17px;background:#edf5ef}.tx-detail-items>div{min-width:0;padding:10px;border-color:#e4ece5;border-radius:12px;background:#fff}.tx-detail-items img{width:52px;height:52px;border-radius:10px}.tx-detail-items span{min-width:0}.tx-detail-items strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#0B2B26;font-size:12px}.tx-detail-items small{color:#76867a;font-size:10px}.tx-detail-items b{flex:none;color:#163832;font-size:11px}.tx-detail-card dl{margin:14px 0 18px;padding:4px 14px;border:1px solid #dfe9e1;border-radius:16px;background:#fff}.tx-detail-card dl>div{display:grid;grid-template-columns:minmax(105px,.7fr) minmax(0,1.3fr);align-items:start;gap:12px;padding:10px 0;border-color:#edf2ed}.tx-detail-card dt{color:#7b897e;font-size:10px;line-height:1.5}.tx-detail-card dd{overflow-wrap:anywhere;color:#344b3b;font-size:10px;line-height:1.5}.tx-detail-card dl>div:nth-child(9){margin:0 -14px;padding:13px 14px;border-top:1px solid #dfe9e1;background:#f3f8f3}.tx-detail-card dl>div:nth-child(9) dt,.tx-detail-card dl>div:nth-child(9) dd{color:#163832;font-size:11px;font-weight:700}.tx-detail-card>.tx-button{min-height:44px;margin:5px 0 0;border-radius:12px}.tx-detail-card>.tx-button+.tx-button{margin-top:8px}.tx-dialog-close{top:17px;right:18px;width:36px;height:36px;border:1px solid #dfe9e1;background:#fff;color:#526558;transition:background .16s ease,transform .16s ease}.tx-dialog-close:hover{transform:rotate(90deg);background:#edf5ef}.tx-review-form{background:#fff}.tx-review-form .tx-dialog-kicker{margin-top:0}.tx-review-form select,.tx-review-form textarea{border-color:#d9e6dc;border-radius:12px}.tx-review-form select:focus,.tx-review-form textarea:focus{border-color:#70a87c;box-shadow:0 0 0 3px #8EB69B33}.tx-detail-refresh{margin:10px 0 0;color:#718174;font-size:10px;line-height:1.5}@media(max-width:600px){.tx-detail-dialog{width:calc(100% - 18px);max-height:calc(100dvh - 18px);border-radius:20px}.tx-detail-card{max-height:calc(100dvh - 28px);padding:23px 17px 20px}.tx-detail-card h2{font-size:21px}.tx-detail-items{padding:8px;margin:13px 0}.tx-detail-items>div{gap:8px;padding:8px}.tx-detail-items img{width:44px;height:44px}.tx-detail-items b{font-size:10px}.tx-detail-card dl{padding:3px 11px}.tx-detail-card dl>div{grid-template-columns:minmax(82px,.65fr) minmax(0,1.35fr);gap:8px;padding:9px 0}.tx-detail-card dl>div:nth-child(9){margin:0 -11px;padding:11px}.tx-dialog-close{top:13px;right:13px;width:33px;height:33px}}@media(prefers-reduced-motion:reduce){.tx-detail-dialog[open]{animation:none}.tx-dialog-close{transition:none}}`;
  document.head.append(style);
}

function injectTransactionsStyle() {
  if (document.getElementById('transactions-style')) return;
  const style = document.createElement('style');
  style.id = 'transactions-style';
  style.textContent = `
    .tx-app{--tx-ink:#163832;--tx-deep:#0B2B26;--tx-green:#235347;--tx-soft:#e5efee;--tx-muted:#56716f;--tx-line:#bfd4d2;min-height:100vh;background:#DAF1DE;color:#1c2522;font-family:Inter,Arial,sans-serif;font-size:14px}
    
    
    
    
    .tx-main{max-width:1266px;margin:0 auto;padding:50px 0 64px}.tx-intro{position:relative;isolation:isolate;box-sizing:border-box;min-height:238px;display:flex;align-items:center;justify-content:space-between;overflow:hidden;padding:36px 48px;border:1px solid #c8ddd4;border-radius:28px;background:radial-gradient(ellipse at 88% 18%,#d7eee0 0,transparent 34%),linear-gradient(115deg,#f7fbf7 0%,#edf5ef 58%,#e4f1e8 100%);box-shadow:0 16px 40px #174e3210}.tx-intro::before{position:absolute;z-index:-1;right:-80px;top:-190px;width:450px;height:450px;border:1px solid #a8cdb544;border-radius:50%;content:''}.tx-intro-copy{position:relative;z-index:2;max-width:680px}.tx-eyebrow{display:inline-flex;align-items:center;gap:8px;margin:0 0 13px;padding:7px 12px;border:1px solid #cde1d1;border-radius:999px;background:#ffffffa6;color:#527760;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.tx-eyebrow i{width:7px;height:7px;border-radius:50%;background:#5e9d68;box-shadow:0 0 0 3px #5e9d6820}.tx-intro h1{margin:0;color:var(--tx-deep);font-size:42px;line-height:1.15;font-weight:650;letter-spacing:-1.7px}.tx-description{max-width:665px;margin:12px 0 0;color:#596b60;font-size:16px;line-height:1.65}.tx-intro-art{position:absolute;inset:0 0 0 auto;width:39%;min-width:290px;overflow:hidden;pointer-events:none}.tx-art-orbit{position:absolute;display:block;border:1px solid #85b89a55;border-radius:50%}.tx-art-orbit-one{width:240px;height:240px;right:78px;top:50%;transform:translateY(-50%);box-shadow:0 0 0 20px #a9cfad16,0 0 0 42px #a9cfad12}.tx-art-orbit-two{width:148px;height:148px;right:124px;top:50%;transform:translateY(-50%);border-style:dashed;border-color:#73a98775}.tx-art-leaf{position:absolute;right:160px;top:50%;display:grid;width:78px;height:78px;place-items:center;border:1px solid #a9cdb0;border-radius:25px;background:linear-gradient(145deg,#fff,#dceede);box-shadow:0 14px 28px #28634220;color:#38784d;font-size:42px;transform:translateY(-50%) rotate(-10deg)}.tx-art-chip{position:absolute;display:flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid #d5e5d8;border-radius:12px;background:#ffffffdf;box-shadow:0 8px 20px #174e3212;color:#50715a;font-size:10px;font-weight:600;white-space:nowrap}.tx-art-chip-top{top:45px;right:22px}.tx-art-chip-bottom{right:25px;bottom:39px}.tx-art-chip-bottom b{color:#368653;font-size:15px}.tx-filters{display:flex;align-items:center;gap:9px;margin:34px 0 25px;overflow-x:auto;padding:0 0 2px;scrollbar-width:thin}.tx-filter{flex:none;min-height:37px;padding:0 24px;border:0;border-radius:999px;background:#f0f1ef;color:#46514e;font:500 14px Inter,Arial,sans-serif;transition:background .16s,color .16s}.tx-filter:hover{background:#e5ebe7}.tx-filter.active{background:#163832;color:#fff}.tx-results-note{height:0;overflow:hidden;font-size:12px;color:#84908c}
    .tx-order-list{display:grid;gap:18px}.tx-order-card{min-height:0;padding:22px 24px 20px;border:1px solid #e4eae7;border-radius:24px;background:#fff;box-shadow:0 8px 24px #153d2d08;display:flex;flex-direction:column}.tx-order-heading{min-height:0;display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:15px;border-bottom:1px solid #e8ece9}.tx-order-merchant{display:flex;align-items:center;gap:13px;min-width:0}.tx-merchant-icon{width:19px;flex:none;color:#416950;font-size:21px;text-align:center}.tx-order-merchant>div{display:grid;gap:4px}.tx-order-merchant strong{font-size:14px;font-weight:600;color:#202a26}.tx-order-merchant span{font-size:12px;color:#66706d}.tx-order-merchant i{padding:0 3px;color:#a2aaa6;font-style:normal}.tx-status{flex:none;margin-top:0;padding:5px 14px;border-radius:999px;font-size:11px;font-weight:600}.tx-status-completed{background:#c9eed8;color:#326c4a}.tx-status-shipped{background:#e1f0ee;color:#206d67}.tx-status-processing{background:#deebfa;color:#315d89}.tx-status-pending{background:#fff0cf;color:#916b20}.tx-status-cancelled{background:#f9e1dd;color:#9b483d}.tx-status-unknown{background:#ecefed;color:#626c68}
    .tx-order-content{flex:1;display:grid;grid-template-columns:88px minmax(0,1fr) 190px;align-items:center;gap:20px;min-height:116px;padding:18px 0}.tx-item-image{width:88px;height:88px;flex:none;object-fit:cover;border-radius:12px;background:#f3f5f4}.tx-item-info{min-width:0}.tx-item-info h2{margin:0 0 7px;color:#212926;font-size:21px;line-height:1.3;font-weight:600;letter-spacing:-.3px}.tx-item-info p{margin:0 0 8px;color:#5e6864;font-size:14px}.tx-item-info p span{padding:0 3px;color:#87918c}.tx-impact{display:block;margin-top:4px;color:#17604f;font-size:12px;font-weight:500;line-height:1.45}.tx-total{width:auto;min-height:88px;padding:2px 0 2px 20px;border-left:1px solid #e8ecea;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:6px}.tx-total span{color:#68736e;font-size:12px;font-weight:500}.tx-total strong{color:#163832;font-size:21px;line-height:1.25;font-weight:600;white-space:nowrap}.tx-order-actions{display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:9px;padding-top:5px}.tx-button{min-height:40px;padding:0 19px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;gap:9px;font:500 13px Inter,Arial,sans-serif;cursor:pointer;transition:background .15s,color .15s,border-color .15s}.tx-button-primary{border:1px solid #163832;background:#163832;color:#fff}.tx-button-primary:hover{background:#235347;border-color:#235347}.tx-button-outline{border:1px solid #235347;background:#fff;color:#163832}.tx-button-outline:hover{background:#f1f7f4}.tx-button span{font-size:16px}
    .tx-more-wrap{display:flex;justify-content:center;padding:48px 0 0}.tx-more-wrap[hidden]{display:none}.tx-more-wrap[hidden]{display:none}.tx-more-button{min-width:246px;height:44px;padding:0 22px;border:0;border-radius:999px;background:#f0f1ef;color:#27312d;font:500 14px Inter,Arial,sans-serif;cursor:pointer}.tx-more-button:hover{background:#e6e9e6}.tx-more-button span{padding-left:8px}.tx-state{min-height:280px;padding:58px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.tx-state-icon{width:52px;height:52px;margin-bottom:17px;border-radius:18px;display:grid;place-items:center;background:#edf5f1;color:#163832;font-size:23px}.tx-state h2{margin:0 0 8px;color:#153b34;font-size:20px;font-weight:600}.tx-state p{max-width:430px;margin:0 0 20px;color:#697571;font-size:14px;line-height:1.6}.tx-state .tx-button{text-decoration:none}.tx-loading{height:240px;display:flex;align-items:center;justify-content:center;gap:10px;color:#697571}.tx-loading span{width:17px;height:17px;border:2px solid #d5e3dd;border-top-color:#163832;border-radius:50%;animation:tx-spin .8s linear infinite}@keyframes tx-spin{to{transform:rotate(360deg)}}
    
    @media(max-width:1380px){.tx-main{margin:0 5.5%}}
    @media(max-width:920px){.tx-main{margin:0 28px}}
    @media(max-width:920px){.tx-order-content{grid-template-columns:76px minmax(0,1fr) 160px;gap:16px}.tx-item-image{width:76px;height:76px}.tx-item-info h2{font-size:19px}.tx-total strong{font-size:18px}.tx-button{padding:0 15px}}
    @media(max-width:920px){.tx-intro{min-height:220px;padding:32px 34px}.tx-intro-copy{max-width:62%}.tx-intro h1{font-size:36px}.tx-description{font-size:15px}.tx-intro-art{width:37%;min-width:230px}.tx-art-orbit-one{right:35px;width:200px;height:200px}.tx-art-orbit-two{right:61px;width:148px;height:148px}.tx-art-leaf{right:96px;width:66px;height:66px;font-size:36px}.tx-art-chip-top{right:10px}.tx-art-chip-bottom{right:12px}}
    @media(max-width:640px){.tx-main{margin:0 17px;padding:33px 0 44px}.tx-intro{min-height:0;display:block;padding:24px 22px 126px;border-radius:23px}.tx-intro-copy{max-width:none}.tx-eyebrow{margin-bottom:11px}.tx-intro h1{font-size:30px;letter-spacing:-1px}.tx-description{max-width:500px;margin-top:9px;font-size:14px;line-height:1.55}.tx-intro-art{inset:auto 0 0;width:100%;height:132px;min-width:0}.tx-art-orbit-one{right:50%;top:88px;width:150px;height:150px;transform:translate(50%,-50%)}.tx-art-orbit-two{right:50%;top:88px;width:104px;height:104px;transform:translate(50%,-50%)}.tx-art-leaf{right:calc(50% - 27px);top:88px;width:54px;height:54px;border-radius:18px;font-size:29px}.tx-art-chip-top{top:17px;right:14px;padding:7px 9px;font-size:9px}.tx-art-chip-bottom{right:auto;bottom:14px;left:14px;padding:7px 9px;font-size:9px}.tx-filters{margin:25px 0 17px;gap:7px}.tx-filter{min-height:35px;padding:0 16px;font-size:12px}.tx-order-list{gap:15px}.tx-order-card{min-height:0;padding:17px 15px 15px;border-radius:22px}.tx-order-heading{min-height:0;padding-bottom:13px}.tx-order-merchant{gap:8px}.tx-order-merchant strong{font-size:13px}.tx-order-merchant span{font-size:10px}.tx-status{padding:5px 9px;font-size:10px}.tx-order-content{position:relative;display:flex;align-items:flex-start;gap:13px;min-height:0;padding:17px 0 14px;flex-wrap:wrap}.tx-item-image{width:70px;height:70px;border-radius:8px}.tx-item-info{flex:1}.tx-item-info h2{font-size:17px}.tx-item-info p{font-size:13px;margin-bottom:6px}.tx-impact{font-size:10px;line-height:1.4;display:block}.tx-total{width:auto;min-height:auto;flex-basis:100%;padding:10px 0 0;border-left:0;border-top:1px solid #eef0ee;flex-direction:row;align-items:center;justify-content:space-between}.tx-total strong{font-size:18px}.tx-order-actions{gap:7px;padding-top:7px}.tx-button{min-height:38px;padding:0 13px;font-size:12px}.tx-more-wrap{padding:30px 0 0}}
  `;
  style.textContent += `.tx-main{max-width:1400px;padding-top:22px;padding-bottom:56px}.tx-filters{margin-top:16px}@media(max-width:1380px){.tx-main{margin:0 4%}}@media(max-width:920px){.tx-main{margin:0 22px;padding-top:18px}}@media(max-width:640px){.tx-main{margin:0 16px;padding-top:14px;padding-bottom:38px}.tx-filters{margin-top:10px}}`;
  style.textContent += '.tx-app{display:flex;flex-direction:column}.tx-main{flex:1 0 auto}';
  document.head.appendChild(style);
}
