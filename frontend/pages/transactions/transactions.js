import { loadStylesheet } from '../../utils/stylesheet.js';
import { translate } from '../../utils/i18n.js';
import {
  cancelOrder,
  createReview,
  getMyOrders,
  getOrder,
  refreshOrderPayment,
} from '../../services/order.js';
import { escapeHtml } from '../../utils/html.js';
import { showToast, injectToastStyle } from '../../utils/toast.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { bindSharedHeader, dashboardFooter, dashboardHeader, pageHeading } from '../../ui/shell.js';
import { skeleton } from '../../ui/skeleton.js';
import { icon } from '../../ui/icons.js';
import { formatProductWeight, productWeightGrams } from '../../utils/product-weight.js';
import { googleMapsDirectionsUrl } from '../../utils/location-map.js';

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
  paid: 'Pembayaran berhasil',
  pending: 'Menunggu pembayaran',
  cancel: 'Dibatalkan',
  cancelled: 'Dibatalkan',
  expire: 'Kedaluwarsa',
  deny: 'Ditolak',
  failure: 'Gagal',
  challenge: 'Sedang diverifikasi',
  refund: 'Dana dikembalikan',
  partial_refund: 'Pengembalian sebagian',
};
const SHIPPING_STATUS = {
  confirmed: 'Dikonfirmasi kurir',
  allocated: 'Kurir ditugaskan',
  picking_up: 'Menunggu penjemputan',
  picked: 'Paket dijemput',
  dropping_off: 'Dalam perjalanan',
  delivered: 'Terkirim',
  rejected: 'Pengiriman ditolak',
  cancelled: 'Pengiriman dibatalkan',
  configuration_missing: 'Menunggu konfigurasi pengiriman',
  creation_requires_review: 'Pengiriman perlu diperiksa',
};

let allOrders = [];
let activeStatus = '';
let visibleCount = PAGE_SIZE;

export async function renderTransactions() {
  loadStylesheet(
    'transactions-page-style',
    new URL('../../styles/pages/transactions.css', import.meta.url),
  );
  const revision = getNavigationRevision();
  const app = document.getElementById('app');
  activeStatus = '';
  visibleCount = PAGE_SIZE;
  app.innerHTML = `
    <div class="tx-app">
${dashboardHeader('orders')}

      <main class="tx-main">
        ${pageHeading({ title: 'Transaksi', eyebrow: 'AKTIVITAS ANDA', description: 'Pantau setiap pesanan, dari pembayaran hingga diterima.', symbol: 'orders' })}
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

  injectToastStyle();
  bindSharedHeader();
  bindControls();
  await loadOrders(revision);
}

function transactionsLoadingSkeleton() {
  return Array.from(
    { length: 3 },
    () =>
      `<article class="tx-order-card" aria-hidden="true"><header class="tx-order-heading"><div class="tx-order-merchant"><span class="tx-merchant-icon">${skeleton('38px', '38px', 'circle')}</span><div>${skeleton('145px', '13px')}<div style="height:7px"></div>${skeleton('190px', '10px')}</div></div>${skeleton('110px', '24px', 'pill')}</header><div class="tx-order-content">${skeleton('82px', '82px')}<div class="tx-item-info">${skeleton('170px', '17px')}<div style="height:10px"></div>${skeleton('110px', '12px')}${skeleton('160px', '10px')}</div><div class="tx-total">${skeleton('85px', '10px')}<div style="height:7px"></div>${skeleton('90px', '18px')}</div></div><footer class="tx-order-actions">${skeleton('105px', '34px', 'pill')}${skeleton('95px', '34px', 'pill')}</footer></article>`,
  ).join('');
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
    const pending = allOrders
      .filter((order) => order.paymentStatus === 'pending' && order.paymentMethod === 'midtrans')
      .slice(0, 8);
    const refreshed = await Promise.allSettled(
      pending.map((order) => refreshOrderPayment(order.id)),
    );
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
  note.textContent = filtered.length ? `${filtered.length} transaksi` : '';
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
      <footer class="tx-order-actions">${order.paymentStatus === 'pending' && order.paymentMethod !== 'cod' && order.snapToken ? `<button class="tx-button tx-button-primary" type="button" data-pay-snap="${id}">Lanjutkan Pembayaran</button>` : ''}${order.paymentStatus === 'pending' && order.paymentMethod !== 'cod' ? `<button class="tx-button tx-button-outline" type="button" data-payment-status="${id}">Periksa Pembayaran</button>` : ''}${order.status === 'pending' && order.paymentStatus === 'pending' && order.paymentMethod === 'midtrans' ? `<button class="tx-button tx-button-outline" type="button" data-cancel-order="${id}">Batalkan Pesanan</button>` : ''}${shipped && order.trackingUrl ? `<a class="tx-button tx-button-outline" target="_blank" rel="noopener" href="${escapeHtml(order.trackingUrl)}">Lacak Paket</a>` : ''}<button class="tx-button tx-button-outline" type="button" data-detail="${id}">Lihat Detail</button>${completed ? `<button class="tx-button tx-button-primary" type="button" data-review="${id}">Beri Ulasan</button>` : ''}</footer>
    </article>`;
    })
    .join('');

  visible.forEach((order, index) => {
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const weightGrams = orderItems.length
      ? orderItems.reduce(
          (sum, item) => sum + Number(item.quantity || 0) * productWeightGrams(item),
          0,
        )
      : Number(order.quantity || 0) * productWeightGrams(order.waste);
    const card = list.querySelectorAll('.tx-order-card')[index];
    const quantityText = card?.querySelector('.tx-item-info p');
    if (quantityText)
      quantityText.textContent = translate(
        `${Number(order.quantity || 0).toLocaleString('id-ID')} unit × ${formatRupiah(orderItems[0]?.unitPrice ?? (Number(order.quantity) ? Number(order.total) / Number(order.quantity) : order.total))}`,
      );
    const impact = card?.querySelectorAll('.tx-item-info .tx-impact')[1];
    if (impact)
      impact.textContent = translate(
        `♻ Membantu mengurangi ${Math.round((weightGrams / 1000) * 0.3)} kg emisi CO₂`,
      );
    if (!['cash', 'cod'].includes(order.paymentMethod) && order.courier !== 'pickup') return;
    const paymentLine = list.querySelectorAll('.tx-order-card .tx-item-info .tx-impact')[index * 2];
    const paymentText =
      order.paymentMethod === 'cash'
        ? order.paymentStatus === 'paid'
          ? 'Cash diterima penjual'
          : 'Bayar cash langsung ke penjual saat jemput'
        : order.paymentMethod === 'cod'
          ? order.paymentStatus === 'paid'
            ? 'COD dibayar dan terverifikasi'
            : 'COD · bayar kepada kurir saat diterima'
          : PAYMENT_STATUS[order.paymentStatus] || 'Status pembayaran belum tersedia';
    const deliveryText =
      order.courier === 'pickup'
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
  list.querySelectorAll('[data-pay-snap]').forEach((button) =>
    button.addEventListener('click', () => {
      const order = allOrders.find((item) => item.id === button.dataset.paySnap);
      if (order) openSnapPayment(order);
    }),
  );
  list.querySelectorAll('[data-payment-status]').forEach((button) =>
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Memeriksa…';
      try {
        const result = await refreshOrderPayment(button.dataset.paymentStatus);
        if (!result.success) throw new Error(result.message || 'Status belum dapat diperiksa.');
        const index = allOrders.findIndex((item) => item.id === button.dataset.paymentStatus);
        if (index >= 0) allOrders[index] = result.data;
        renderOrders();
        showToast(
          result.data?.paymentStatus === 'paid'
            ? 'Pembayaran terverifikasi.'
            : 'Pembayaran masih menunggu konfirmasi.',
        );
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Periksa Pembayaran';
        showToast(error.message || 'Status pembayaran belum dapat diperiksa.', 'error');
      }
    }),
  );
  list.querySelectorAll('[data-cancel-order]').forEach((button) =>
    button.addEventListener('click', async () => {
      const orderId = button.dataset.cancelOrder;
      if (
        !window.confirm(
          translate(
            'Batalkan pesanan ini? Pesanan yang sudah dibayar tidak dapat dibatalkan lewat fitur ini.',
          ),
        )
      )
        return;
      const revision = getNavigationRevision();
      button.disabled = true;
      button.textContent = 'Membatalkan…';
      try {
        const result = await cancelOrder(orderId);
        if (!result.success) throw new Error(result.message || 'Pesanan belum dapat dibatalkan.');
        if (!isRouteCurrent('#transaksi', revision)) return;
        const index = allOrders.findIndex((item) => item.id === orderId);
        if (index >= 0) allOrders[index] = result.data;
        renderOrders();
        showToast('Pesanan berhasil dibatalkan.');
      } catch (error) {
        if (!isRouteCurrent('#transaksi', revision)) return;
        showToast(error.message || 'Pesanan belum dapat dibatalkan.', 'error');
        await loadOrders(revision);
      }
    }),
  );
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
  const items =
    Array.isArray(order.items) && order.items.length
      ? order.items
      : [
          {
            title: waste.title,
            image: waste.image,
            quantity: order.quantity,
            unitPrice: Number(order.quantity)
              ? Number(order.total) / Number(order.quantity)
              : order.total,
            weightPerUnitGrams: productWeightGrams(waste),
          },
        ];
  const shippingAddress = order.shippingAddress || {};
  const pickupAddress = order.sellerShippingOrigin || {};
  const pickupRegion = pickupAddress.region || {};
  const isPickup = order.courier === 'pickup';
  const dialog = document.createElement('dialog');
  dialog.className = 'tx-detail-dialog';
  dialog.setAttribute('aria-labelledby', 'tx-dialog-title');
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.innerHTML = `<section class="tx-detail-card"><button type="button" class="tx-dialog-close" aria-label="Tutup">×</button><p class="tx-dialog-kicker">RINGKASAN PESANAN</p><h2 id="tx-dialog-title">Pesanan ${escapeHtml(String(order.id).slice(-8).toUpperCase())}</h2><span class="tx-status tx-status-${STATUS[order.status]?.tone || 'unknown'}">${escapeHtml(status)}</span><div class="tx-detail-items">${items.map((item) => `<div><img src="${escapeHtml(item.image || FALLBACK_IMAGE)}" alt=""><span><strong>${escapeHtml(item.title || 'Produk pangan')}</strong><small>${Number(item.quantity || 0).toLocaleString('id-ID')} kg × ${formatRupiah(item.unitPrice)}</small></span><b>${formatRupiah(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</b></div>`).join('')}</div><dl><div><dt>Penjual</dt><dd>${escapeHtml(seller)}</dd></div><div><dt>Tanggal pesanan</dt><dd>${escapeHtml(formatDate(order.createdAt))}</dd></div><div><dt>Penerima</dt><dd>${escapeHtml(shippingAddress.recipientName || 'Belum tersedia')}</dd></div><div><dt>Telepon</dt><dd>${escapeHtml(shippingAddress.phone || 'Belum tersedia')}</dd></div><div><dt>Alamat tujuan</dt><dd>${escapeHtml([shippingAddress.details, shippingAddress.village, shippingAddress.district, shippingAddress.city, shippingAddress.province, shippingAddress.postalCode].filter(Boolean).join(', ') || 'Belum tersedia')}</dd></div><div><dt>Subtotal</dt><dd>${formatRupiah(order.subtotal ?? order.total)}</dd></div><div><dt>Diskon</dt><dd>${formatRupiah(order.discount || 0)}</dd></div><div><dt>Ongkir</dt><dd>${order.shippingCost == null ? 'Belum tersedia' : formatRupiah(order.shippingCost)}</dd></div><div><dt>Total pembayaran</dt><dd>${formatRupiah(order.total)}</dd></div><div><dt>Status pembayaran</dt><dd>${escapeHtml(PAYMENT_STATUS[order.paymentStatus] || 'Belum tersedia')}</dd></div><div><dt>Status pesanan</dt><dd>${escapeHtml(status)}</dd></div><div><dt>Status pengiriman</dt><dd>${escapeHtml(SHIPPING_STATUS[order.shippingStatus] || order.shippingStatus || 'Belum tersedia')}</dd></div><div><dt>Kurir</dt><dd>${escapeHtml([order.courier, order.courierServiceName || order.courierService].filter(Boolean).join(' · ') || 'Belum tersedia')}</dd></div><div><dt>Nomor resi</dt><dd>${escapeHtml(order.trackingNumber || 'Belum tersedia')}</dd></div></dl>${order.paymentUrl ? `<a class="tx-button tx-button-primary" href="${escapeHtml(order.paymentUrl)}">Lanjutkan Pembayaran</a>` : ''}${order.trackingUrl ? `<a class="tx-button tx-button-outline" target="_blank" rel="noopener" href="${escapeHtml(order.trackingUrl)}">Lacak paket</a>` : ''}<p class="tx-detail-refresh" aria-live="polite"></p></section>`;
  dialog.querySelectorAll('.tx-detail-items>div').forEach((row, index) => {
    const item = items[index];
    const detail = row.querySelector('small');
    if (detail)
      detail.textContent = translate(
        `${Number(item.quantity || 0).toLocaleString('id-ID')} unit · ${formatProductWeight(productWeightGrams(item))}/unit × ${formatRupiah(item.unitPrice)}/unit`,
      );
  });
  if (isPickup) {
    const rows = [...dialog.querySelectorAll('dl div')];
    const setRow = (label, value) => {
      const row = rows.find((item) => item.querySelector('dt')?.textContent === label);
      if (row?.querySelector('dd')) row.querySelector('dd').textContent = value;
    };
    const addressText = [
      pickupAddress.address,
      pickupRegion.village,
      pickupRegion.district,
      pickupRegion.city,
      pickupRegion.province,
      pickupAddress.postalCode,
    ]
      .filter(Boolean)
      .join(', ');
    setRow('Penerima', pickupAddress.contactName || 'Kontak toko');
    setRow('Telepon', pickupAddress.contactPhone || 'Hubungi penjual melalui chat');
    setRow('Alamat tujuan', addressText || 'Hubungi penjual untuk detail lokasi jemput');
    setRow('Ongkir', 'Jemput langsung · Rp0');
    setRow(
      'Status pengiriman',
      order.status === 'completed' ? 'Sudah dijemput' : 'Menunggu dijemput di toko',
    );
    setRow('Kurir', 'Jemput langsung');
    const directionsUrl = googleMapsDirectionsUrl(pickupAddress.latitude, pickupAddress.longitude);
    if (directionsUrl) {
      const directionsLink = document.createElement('a');
      directionsLink.className = 'tx-button tx-button-outline';
      directionsLink.href = directionsUrl;
      directionsLink.target = '_blank';
      directionsLink.rel = 'noopener';
      directionsLink.textContent = translate('Buka petunjuk arah di Google Maps');
      dialog.querySelector('.tx-detail-refresh').before(directionsLink);
    }
    if (order.paymentMethod === 'cash') {
      setRow(
        'Status pembayaran',
        order.paymentStatus === 'paid'
          ? 'Cash diterima langsung oleh penjual'
          : 'Bayar cash langsung kepada penjual saat jemput',
      );
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
      const feeLabel = document.createElement('dt');
      feeLabel.textContent = 'Biaya layanan COD';
      const feeValue = document.createElement('dd');
      feeValue.textContent = `${formatRupiah(order.codFee)} · dipotong dari pencairan penjual`;
      feeRow.append(feeLabel, feeValue);
      dialog.querySelector('dl')?.append(feeRow);
    }
    const paymentRow = [...dialog.querySelectorAll('dl div')].find(
      (row) => row.querySelector('dt')?.textContent === 'Status pembayaran',
    );
    const value = paymentRow?.querySelector('dd');
    if (value)
      value.textContent =
        order.paymentStatus === 'paid'
          ? 'COD dibayar ke kurir dan terverifikasi'
          : 'COD · bayar ke kurir saat pesanan diterima';
  }
  getOrder(id)
    .then((result) => {
      if (!dialog.isConnected || !result.success) return;
      const latest = result.data;
      const detail = dialog.querySelector('.tx-detail-card');
      const old = allOrders.findIndex((item) => item.id === id);
      if (old >= 0) allOrders[old] = latest;
      if (latest.paymentStatus === 'pending' && latest.paymentMethod === 'midtrans')
        refreshOrderPayment(id)
          .then((payment) => {
            if (!dialog.isConnected || !payment.success) return;
            const index = allOrders.findIndex((item) => item.id === id);
            if (index >= 0) allOrders[index] = payment.data;
            detail.querySelector('.tx-detail-refresh').textContent =
              payment.data.paymentStatus === 'paid'
                ? 'Pembayaran terverifikasi oleh server.'
                : 'Pembayaran masih menunggu konfirmasi.';
          })
          .catch(() => {
            detail.querySelector('.tx-detail-refresh').textContent =
              'Status pembayaran belum dapat diperiksa.';
          });
    })
    .catch(() => {});
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
  dialog.setAttribute('aria-labelledby', 'tx-dialog-title');
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.innerHTML = `<form class="tx-detail-card tx-review-form"><button type="button" class="tx-dialog-close" aria-label="Tutup">&times;</button><p class="tx-dialog-kicker">CERITAKAN PENGALAMAN ANDA</p><h2 id="tx-dialog-title">Beri ulasan</h2><p class="tx-review-product">${escapeHtml(order.waste?.title || 'Produk Food Ilee')}</p><label>Rating<div class="tx-rating-input"><select name="rating" required><option value="5">5 / 5 &mdash; Sangat puas</option><option value="4">4 / 5 &mdash; Puas</option><option value="3">3 / 5 &mdash; Cukup</option><option value="2">2 / 5 &mdash; Kurang puas</option><option value="1">1 / 5 &mdash; Tidak puas</option></select></div></label><label>Ulasan<textarea name="comment" rows="4" minlength="3" placeholder="Bagikan pengalaman transaksi Anda&hellip;" required></textarea></label><button class="tx-button tx-button-primary" type="submit">Kirim ulasan</button></form>`;
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
