import { createReview, getMyOrders, getOrder, refreshOrderPayment } from '../../services/order.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast, injectToastStyle } from '../../utils/toast.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { bindSharedHeader, dashboardFooter, dashboardHeader } from '../../ui/shell.js';
import { skeleton } from '../../ui/skeleton.js';

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
        <section class="tx-intro">
          <div><h1>Riwayat Transaksi</h1><p class="tx-description">Pantau perjalanan sirkularitas Anda. Setiap transaksi membantu mengurangi limbah dan mendukung keberlanjutan ekosistem pangan.</p></div>
        </section>
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
    const pending = allOrders.filter((order) => order.paymentStatus === 'pending' && order.paymentMethod !== 'cod').slice(0, 8);
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
      <header class="tx-order-heading"><div class="tx-order-merchant"><span class="tx-merchant-icon">${shipped ? '↗' : '♧'}</span><div><strong>${escapeHtml(seller)}</strong><span>${escapeHtml(formatDate(order.createdAt))} <i>•</i> INV/${escapeHtml(formatInvoiceDate(order.createdAt))}/${escapeHtml(
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
    if (order.paymentMethod !== 'cod') return;
    const paymentLine = list.querySelectorAll('.tx-order-card .tx-item-info .tx-impact')[index * 2];
    if (paymentLine) paymentLine.textContent = `${order.paymentStatus === 'paid' ? 'COD dibayar dan terverifikasi' : 'COD · bayar kepada kurir saat diterima'} · Pengiriman: ${SHIPPING_STATUS[order.shippingStatus] || order.shippingStatus || 'Belum tersedia'}`;
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
  const dialog = document.createElement('dialog');
  dialog.className = 'tx-detail-dialog';
  dialog.innerHTML = `<section class="tx-detail-card"><button type="button" class="tx-dialog-close" aria-label="Tutup">×</button><p class="tx-dialog-kicker">RINGKASAN PESANAN</p><h2>Pesanan ${escapeHtml(String(order.id).slice(-8).toUpperCase())}</h2><span class="tx-status tx-status-${STATUS[order.status]?.tone || 'unknown'}">${escapeHtml(status)}</span><div class="tx-detail-items">${items.map((item) => `<div><img src="${escapeHtml(item.image || FALLBACK_IMAGE)}" alt=""><span><strong>${escapeHtml(item.title || 'Produk pangan')}</strong><small>${Number(item.quantity || 0).toLocaleString('id-ID')} kg × ${formatRupiah(item.unitPrice)}</small></span><b>${formatRupiah(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</b></div>`).join('')}</div><dl><div><dt>Penjual</dt><dd>${escapeHtml(seller)}</dd></div><div><dt>Tanggal pesanan</dt><dd>${escapeHtml(formatDate(order.createdAt))}</dd></div><div><dt>Penerima</dt><dd>${escapeHtml(shippingAddress.recipientName || 'Belum tersedia')}</dd></div><div><dt>Telepon</dt><dd>${escapeHtml(shippingAddress.phone || 'Belum tersedia')}</dd></div><div><dt>Alamat tujuan</dt><dd>${escapeHtml([shippingAddress.details, shippingAddress.village, shippingAddress.district, shippingAddress.city, shippingAddress.province, shippingAddress.postalCode].filter(Boolean).join(', ') || 'Belum tersedia')}</dd></div><div><dt>Subtotal</dt><dd>${formatRupiah(order.subtotal ?? order.total)}</dd></div><div><dt>Diskon</dt><dd>${formatRupiah(order.discount || 0)}</dd></div><div><dt>Ongkir</dt><dd>${order.shippingCost == null ? 'Belum tersedia' : formatRupiah(order.shippingCost)}</dd></div><div><dt>Total pembayaran</dt><dd>${formatRupiah(order.total)}</dd></div><div><dt>Status pembayaran</dt><dd>${escapeHtml(PAYMENT_STATUS[order.paymentStatus] || 'Belum tersedia')}</dd></div><div><dt>Status pesanan</dt><dd>${escapeHtml(status)}</dd></div><div><dt>Status pengiriman</dt><dd>${escapeHtml(SHIPPING_STATUS[order.shippingStatus] || order.shippingStatus || 'Belum tersedia')}</dd></div><div><dt>Kurir</dt><dd>${escapeHtml([order.courier, order.courierServiceName || order.courierService].filter(Boolean).join(' · ') || 'Belum tersedia')}</dd></div><div><dt>Nomor resi</dt><dd>${escapeHtml(order.trackingNumber || 'Belum tersedia')}</dd></div></dl>${order.paymentUrl ? `<a class="tx-button tx-button-primary" href="${escapeHtml(order.paymentUrl)}">Lanjutkan Pembayaran</a>` : ''}${order.trackingUrl ? `<a class="tx-button tx-button-outline" target="_blank" rel="noopener" href="${escapeHtml(order.trackingUrl)}">Lacak paket</a>` : ''}<p class="tx-detail-refresh" aria-live="polite"></p></section>`;
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
    if (latest.paymentStatus === 'pending' && latest.paymentMethod !== 'cod') refreshOrderPayment(id).then((payment) => {
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
  document.head.append(style);
}

function injectTransactionsStyle() {
  if (document.getElementById('transactions-style')) return;
  const style = document.createElement('style');
  style.id = 'transactions-style';
  style.textContent = `
    .tx-app{--tx-ink:#173d3c;--tx-deep:#004847;--tx-green:#087b78;--tx-soft:#e5efee;--tx-muted:#56716f;--tx-line:#bfd4d2;min-height:100vh;background:#dce8e6;color:#1c2522;font-family:Inter,Arial,sans-serif;font-size:14px}
    
    
    
    
    .tx-main{max-width:1266px;margin:0 auto;padding:50px 0 0}.tx-intro{display:flex;align-items:flex-end;justify-content:space-between}.tx-eyebrow{margin:0 0 7px;color:#70807b;font-size:11px;font-weight:700;letter-spacing:.12em}.tx-intro h1{margin:0;color:var(--tx-deep);font-size:38px;line-height:1.2;font-weight:600;letter-spacing:-1.5px}.tx-description{max-width:665px;margin:9px 0 0;color:#59635f;font-size:18px;line-height:1.55}.tx-filters{display:flex;align-items:center;gap:9px;margin:48px 0 29px;overflow-x:auto;padding:0 0 2px;scrollbar-width:thin}.tx-filter{flex:none;min-height:37px;padding:0 24px;border:0;border-radius:999px;background:#f0f1ef;color:#46514e;font:500 14px Inter,Arial,sans-serif;transition:background .16s,color .16s}.tx-filter:hover{background:#e5ebe7}.tx-filter.active{background:#005448;color:#fff}.tx-results-note{height:0;overflow:hidden;font-size:12px;color:#84908c}
    .tx-order-list{display:grid;gap:18px}.tx-order-card{min-height:0;padding:22px 24px 20px;border:1px solid #e4eae7;border-radius:24px;background:#fff;box-shadow:0 8px 24px #153d2d08;display:flex;flex-direction:column}.tx-order-heading{min-height:0;display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:15px;border-bottom:1px solid #e8ece9}.tx-order-merchant{display:flex;align-items:center;gap:13px;min-width:0}.tx-merchant-icon{width:19px;flex:none;color:#416950;font-size:21px;text-align:center}.tx-order-merchant>div{display:grid;gap:4px}.tx-order-merchant strong{font-size:14px;font-weight:600;color:#202a26}.tx-order-merchant span{font-size:12px;color:#66706d}.tx-order-merchant i{padding:0 3px;color:#a2aaa6;font-style:normal}.tx-status{flex:none;margin-top:0;padding:5px 14px;border-radius:999px;font-size:11px;font-weight:600}.tx-status-completed{background:#c9eed8;color:#326c4a}.tx-status-shipped{background:#e1f0ee;color:#206d67}.tx-status-processing{background:#deebfa;color:#315d89}.tx-status-pending{background:#fff0cf;color:#916b20}.tx-status-cancelled{background:#f9e1dd;color:#9b483d}.tx-status-unknown{background:#ecefed;color:#626c68}
    .tx-order-content{flex:1;display:grid;grid-template-columns:88px minmax(0,1fr) 190px;align-items:center;gap:20px;min-height:116px;padding:18px 0}.tx-item-image{width:88px;height:88px;flex:none;object-fit:cover;border-radius:12px;background:#f3f5f4}.tx-item-info{min-width:0}.tx-item-info h2{margin:0 0 7px;color:#212926;font-size:21px;line-height:1.3;font-weight:600;letter-spacing:-.3px}.tx-item-info p{margin:0 0 8px;color:#5e6864;font-size:14px}.tx-item-info p span{padding:0 3px;color:#87918c}.tx-impact{display:block;margin-top:4px;color:#17604f;font-size:12px;font-weight:500;line-height:1.45}.tx-total{width:auto;min-height:88px;padding:2px 0 2px 20px;border-left:1px solid #e8ecea;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:6px}.tx-total span{color:#68736e;font-size:12px;font-weight:500}.tx-total strong{color:#005448;font-size:21px;line-height:1.25;font-weight:600;white-space:nowrap}.tx-order-actions{display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:9px;padding-top:5px}.tx-button{min-height:40px;padding:0 19px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;gap:9px;font:500 13px Inter,Arial,sans-serif;cursor:pointer;transition:background .15s,color .15s,border-color .15s}.tx-button-primary{border:1px solid #005448;background:#005448;color:#fff}.tx-button-primary:hover{background:#176457;border-color:#176457}.tx-button-outline{border:1px solid #176457;background:#fff;color:#005448}.tx-button-outline:hover{background:#f1f7f4}.tx-button span{font-size:16px}
    .tx-more-wrap{display:flex;justify-content:center;padding:48px 0 70px}.tx-more-wrap[hidden]{display:none}.tx-more-wrap[hidden]{display:none}.tx-more-button{min-width:246px;height:44px;padding:0 22px;border:0;border-radius:999px;background:#f0f1ef;color:#27312d;font:500 14px Inter,Arial,sans-serif;cursor:pointer}.tx-more-button:hover{background:#e6e9e6}.tx-more-button span{padding-left:8px}.tx-state{min-height:280px;padding:58px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.tx-state-icon{width:52px;height:52px;margin-bottom:17px;border-radius:18px;display:grid;place-items:center;background:#edf5f1;color:#005448;font-size:23px}.tx-state h2{margin:0 0 8px;color:#153b34;font-size:20px;font-weight:600}.tx-state p{max-width:430px;margin:0 0 20px;color:#697571;font-size:14px;line-height:1.6}.tx-state .tx-button{text-decoration:none}.tx-loading{height:240px;display:flex;align-items:center;justify-content:center;gap:10px;color:#697571}.tx-loading span{width:17px;height:17px;border:2px solid #d5e3dd;border-top-color:#005448;border-radius:50%;animation:tx-spin .8s linear infinite}@keyframes tx-spin{to{transform:rotate(360deg)}}
    
    @media(max-width:1380px){.tx-main{margin:0 5.5%}}
    @media(max-width:920px){.tx-main{margin:0 28px}}
    @media(max-width:920px){.tx-order-content{grid-template-columns:76px minmax(0,1fr) 160px;gap:16px}.tx-item-image{width:76px;height:76px}.tx-item-info h2{font-size:19px}.tx-total strong{font-size:18px}.tx-button{padding:0 15px}}
    @media(max-width:640px){.tx-main{margin:0 17px;padding-top:33px}.tx-intro h1{font-size:30px;letter-spacing:-1px}.tx-description{font-size:15px}.tx-filters{margin:29px 0 17px;gap:7px}.tx-filter{min-height:35px;padding:0 16px;font-size:12px}.tx-order-list{gap:15px}.tx-order-card{min-height:0;padding:17px 15px 15px;border-radius:22px}.tx-order-heading{min-height:0;padding-bottom:13px}.tx-order-merchant{gap:8px}.tx-order-merchant strong{font-size:13px}.tx-order-merchant span{font-size:10px}.tx-status{padding:5px 9px;font-size:10px}.tx-order-content{position:relative;display:flex;align-items:flex-start;gap:13px;min-height:0;padding:17px 0 14px;flex-wrap:wrap}.tx-item-image{width:70px;height:70px;border-radius:8px}.tx-item-info{flex:1}.tx-item-info h2{font-size:17px}.tx-item-info p{font-size:13px;margin-bottom:6px}.tx-impact{font-size:10px;line-height:1.4;display:block}.tx-total{width:auto;min-height:auto;flex-basis:100%;padding:10px 0 0;border-left:0;border-top:1px solid #eef0ee;flex-direction:row;align-items:center;justify-content:space-between}.tx-total strong{font-size:18px}.tx-order-actions{gap:7px;padding-top:7px}.tx-button{min-height:38px;padding:0 13px;font-size:12px}.tx-more-wrap{padding:30px 0 45px}}
  `;
  document.head.appendChild(style);
}
