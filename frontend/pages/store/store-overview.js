import { escapeHtml } from '../../utils/html.js';
import { formatRupiah } from '../../ui/shell.js';
import { icon } from '../../ui/icons.js';

const statusLabels = {
  pending: 'Menunggu pembayaran',
  processing: 'Sedang diproses',
  shipped: 'Dalam pengiriman',
  payment_review: 'Pembayaran ditinjau',
};

function recentSaleCard(order) {
  const id = String(order.id || '').slice(-6).toUpperCase() || '—';
  const productName = order.waste?.title || 'Produk organik';
  const date = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    : 'Tanggal tidak tersedia';
  return `<a class="db-activity-card" href="#store-panel" data-store-tab-target="orders">
    <span class="db-activity-icon">${icon('orders')}</span>
    <span class="db-order-card-copy"><small>Pesanan #${escapeHtml(id)} · ${escapeHtml(date)}</small><strong>${escapeHtml(productName)}</strong><span>${escapeHtml(statusLabels[order.status] || order.status || 'Status belum tersedia')}</span></span>
    <span class="db-order-card-total">${formatRupiah(order.total || 0)}</span>
  </a>`;
}

function focusItem({ done, iconName, title, detail, href, tab, edit = false }) {
  const state = done ? 'Selesai' : 'Perlu perhatian';
  const targetAttrs = tab ? `data-store-tab-target="${tab}"` : '';
  const element = edit ? 'button' : 'a';
  const linkAttrs = edit ? 'type="button" data-edit-store' : `href="${href}" ${targetAttrs}`;
  return `<${element} class="db-focus-item ${done ? 'is-done' : 'is-pending'}" ${linkAttrs}>
    <span class="db-focus-check" aria-hidden="true">${done ? icon('shield') : icon(iconName)}</span>
    <span class="db-focus-copy"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></span>
    <span class="db-focus-state">${state}</span>
  </${element}>`;
}

export function renderStoreOverview({ store, products, sales, revenue, salesAvailable, reviewCount = 0 }) {
  const stock = products.reduce((sum, product) => sum + Math.max(0, Number(product.stock) || 0), 0);
  const feedCount = products.filter((product) => product.category !== 'Kompos').length;
  const compostCount = products.length - feedCount;
  const completedOrders = sales.filter((order) => order.status === 'completed').length;
  const cancelledOrders = sales.filter((order) => order.status === 'cancelled').length;
  const activeOrders = sales.filter((order) => !['completed', 'cancelled'].includes(order.status));
  const orderProgress = sales.length ? Math.round((completedOrders / sales.length) * 100) : 0;
  const feedWidth = products.length ? Math.round((feedCount / products.length) * 100) : 0;
  const compostWidth = products.length ? Math.round((compostCount / products.length) * 100) : 0;
  const storeDescription = String(store?.description || '').trim();
  const profileReady = Boolean(storeDescription && store?.location);
  const productReady = products.length > 0;
  const ordersReady = salesAvailable && activeOrders.length === 0;
  const checklistDone = Number(profileReady) + Number(productReady) + Number(ordersReady);
  const ordersDetail = !salesAvailable
    ? 'Data pesanan belum dapat dimuat.'
    : activeOrders.length
      ? `${activeOrders.length} pesanan menunggu tindak lanjut.`
      : 'Tidak ada pesanan yang perlu diproses.';

  return `<section class="st-dashboard" aria-labelledby="st-dashboard-title">
    <div class="st-dashboard-heading"><div><p class="st-kicker">RINGKASAN TOKO</p><h2 id="st-dashboard-title">Kondisi tokomu hari ini</h2></div><span>Ringkasan berdasarkan data toko dan transaksi.</span></div>
    <div class="db-overview-grid">
      <section class="db-panel db-overall" aria-labelledby="st-overall-title">
        <div class="db-panel-head"><div><p class="db-card-eyebrow">TOKO AKTIF</p><h3 id="st-overall-title">Informasi toko</h3></div>${icon('store')}</div>
        <div class="db-store-identity"><span class="db-store-avatar">${store?.image ? `<img src="${escapeHtml(store.image)}" alt="">` : icon('store')}</span><span><strong>${escapeHtml(store?.name || 'Toko Anda')}</strong><small>${escapeHtml(store?.location || 'Lokasi belum ditambahkan')}</small></span></div>
        ${storeDescription ? `<p class="db-store-description">${escapeHtml(storeDescription)}</p>` : '<p class="db-store-description is-empty">Tambahkan cerita toko agar pembeli mengenal usaha Anda.</p>'}
        <div class="db-overall-rule"></div>
        <div class="db-summary-metrics">
          <div><span>${icon('box')}</span><strong>${products.length}</strong><small>Produk tayang</small></div>
          <div><span>${icon('orders')}</span><strong>${salesAvailable ? activeOrders.length : '—'}</strong><small>Pesanan aktif</small></div>
          <div><span>${icon('edit')}</span><strong>${reviewCount}</strong><small>Total ulasan</small></div>
        </div>
      </section>
      <section class="db-panel db-category-panel" aria-labelledby="st-category-title">
        <div class="db-panel-head"><div><p class="db-card-eyebrow">ETALASE</p><h3 id="st-category-title">Produk per kategori</h3><p>Rincian dari ${products.length} produk yang tayang</p></div>${icon('market')}</div>
        ${products.length ? `<div class="db-category-chart"><div class="db-category-bar" role="img" aria-label="${feedCount} produk pakan ternak dan ${compostCount} produk kompos"><span style="width:${feedWidth}%"></span><i style="width:${compostWidth}%"></i></div><div class="db-category-scale"><span>0 produk</span><span>${products.length} produk</span></div></div>` : `<div class="db-category-empty">${icon('box')}<span>Produk yang ditambahkan akan tampil dalam ringkasan kategori ini.</span></div>`}
        <div class="db-category-legend"><div><i></i><span>Pakan ternak & lainnya</span><strong>${feedCount}</strong></div><div><i></i><span>Kompos</span><strong>${compostCount}</strong></div></div>
        <a href="#store-panel" data-store-tab-target="products" class="db-panel-link">Buka etalase ${icon('arrow')}</a>
      </section>
      <section class="db-panel db-order-panel" aria-labelledby="st-order-title">
        <div class="db-panel-head"><div><p class="db-card-eyebrow">TRANSAKSI</p><h3 id="st-order-title">Status pesanan</h3><p>${salesAvailable ? `${sales.length} pesanan tercatat` : 'Data pesanan tidak tersedia'}</p></div>${icon('orders')}</div>
        <div class="db-order-visual"><div class="db-order-ring" style="--db-progress:${orderProgress}%" role="img" aria-label="${salesAvailable ? `${orderProgress}% pesanan selesai` : 'Status pesanan tidak tersedia'}"><span><strong>${salesAvailable ? `${orderProgress}%` : '—'}</strong><small>selesai</small></span></div><div class="db-order-legend"><div><i></i><span>Selesai</span><strong>${salesAvailable ? completedOrders : '—'}</strong></div><div><i></i><span>Berjalan</span><strong>${salesAvailable ? activeOrders.length : '—'}</strong></div><div><i></i><span>Dibatalkan</span><strong>${salesAvailable ? cancelledOrders : '—'}</strong></div></div></div>
        <p class="st-dashboard-revenue"><span>Pendapatan dibayar</span><strong>${salesAvailable ? formatRupiah(revenue) : '—'}</strong></p>
        <a href="#store-panel" data-store-tab-target="orders" class="db-panel-link">Lihat semua pesanan ${icon('arrow')}</a>
      </section>
    </div>
    <div class="db-action-grid">
      <section class="db-panel db-quick-panel" aria-labelledby="st-quick-title">
        <div class="db-panel-head"><div><p class="db-card-eyebrow">CHECKLIST</p><h3 id="st-quick-title">Kesiapan toko</h3></div><span class="db-checklist-count">${checklistDone} / 3 selesai</span></div>
        <div class="db-focus-list">
          ${focusItem({ done: profileReady, iconName: 'edit', title: 'Lengkapi profil', detail: profileReady ? 'Lokasi dan cerita toko sudah terisi.' : 'Isi lokasi dan cerita toko.', edit: true })}
          ${focusItem({ done: productReady, iconName: 'add', title: productReady ? 'Etalase sudah terisi' : 'Tambahkan produk pertama', detail: productReady ? `${products.length} produk tersedia untuk pembeli.` : 'Produk akan muncul di etalase toko.', href: productReady ? '#store-panel' : '#tambah-limbah', tab: productReady ? 'products' : undefined })}
          ${focusItem({ done: salesAvailable && activeOrders.length === 0, iconName: 'orders', title: activeOrders.length ? `Proses ${activeOrders.length} pesanan` : 'Pantau pesanan', detail: ordersDetail, href: '#store-panel', tab: 'orders' })}
        </div>
      </section>
      <section class="db-activity" aria-labelledby="st-activity-title">
        <div class="db-activity-head"><div><p class="db-card-eyebrow">PESANAN TERBARU</p><h3 id="st-activity-title">Perlu ditindaklanjuti <span>(${salesAvailable ? activeOrders.length : '—'})</span></h3></div><a href="#store-panel" data-store-tab-target="orders">Semua pesanan ${icon('arrow')}</a></div>
        <div class="db-activity-grid">${activeOrders.length ? activeOrders.slice(0, 2).map(recentSaleCard).join('') : `<div class="db-activity-card db-activity-empty">${icon('orders')}<strong>${salesAvailable ? 'Tidak ada pesanan yang perlu ditindaklanjuti' : 'Data pesanan belum tersedia'}</strong><small>${salesAvailable ? 'Pesanan aktif akan muncul di sini.' : 'Coba muat ulang halaman untuk melihat pesanan.'}</small></div>`}<a class="db-add-card" href="#tambah-limbah">${icon('add')}<span>Tambah produk</span><small>Lengkapi pilihan etalase</small></a></div>
      </section>
    </div>
  </section>`;
}
