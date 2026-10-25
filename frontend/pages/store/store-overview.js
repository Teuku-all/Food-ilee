import { escapeHtml } from '../../utils/html.js';
import { formatRupiah } from '../../ui/shell.js';
import { icon } from '../../ui/icons.js';

const statusLabels = {
  pending: 'Menunggu Pembayaran',
  processing: 'Diproses',
  shipped: 'Dikirim',
  payment_review: 'Sedang ditinjau',
};

function recentSaleCard(order) {
  const id = String(order.id || '').slice(-6).toUpperCase() || '—';
  return `<a class="db-activity-card" href="#store-panel" data-store-tab-target="orders"><span class="db-activity-icon">${icon('orders')}</span><strong>Pesanan #${escapeHtml(id)}</strong><small>${escapeHtml(statusLabels[order.status] || order.status || 'Dalam proses')}</small><span class="db-activity-arrow">${icon('arrow')}</span></a>`;
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

  return `<section class="st-dashboard" aria-labelledby="st-dashboard-title">
    <div class="st-dashboard-heading"><div><p class="st-kicker">KILAS TOKO</p><h2 id="st-dashboard-title">Ringkasan toko</h2></div><span>Data dari pengelolaan toko Anda</span></div>
    <div class="db-overview-grid">
      <section class="db-panel db-overall" aria-labelledby="st-overall-title">
        <div class="db-panel-head"><h3 id="st-overall-title">Informasi toko</h3>${icon('recycle')}</div>
        <div class="db-store-identity"><span class="db-store-avatar">${store?.image ? `<img src="${escapeHtml(store.image)}" alt="">` : icon('store')}</span><span><strong>${escapeHtml(store?.name || 'Toko Anda')}</strong><small>${escapeHtml(store?.location || 'Lokasi belum ditambahkan')}</small></span></div>
        <div class="db-overall-lead"><strong>${products.length}</strong><span>produk tersedia<br>di etalase Anda</span></div>
        <div class="db-overall-rule"></div>
        <div class="db-summary-metrics">
          <div><span>${icon('box')}</span><strong>${stock.toLocaleString('id-ID')}</strong><small>Unit tersedia</small></div>
          <div><span>${icon('orders')}</span><strong>${salesAvailable ? activeOrders.length : '—'}</strong><small>Pesanan aktif</small></div>
          <div><span>${icon('edit')}</span><strong>${reviewCount}</strong><small>Ulasan</small></div>
        </div>
      </section>
      <section class="db-panel db-category-panel" aria-labelledby="st-category-title">
        <div class="db-panel-head"><div><h3 id="st-category-title">Komposisi penawaran</h3><p>Produk menurut kategori</p></div>${icon('market')}</div>
        <div class="db-category-chart"><div class="db-category-bar"><span style="width:${feedWidth}%"></span><i style="width:${compostWidth}%"></i></div><div class="db-category-scale"><span>0</span><span>${products.length} produk</span></div></div>
        <div class="db-category-legend"><div><i></i><span>Pakan Ternak</span><strong>${feedCount}</strong></div><div><i></i><span>Kompos</span><strong>${compostCount}</strong></div></div>
        <a href="#store-panel" data-store-tab-target="products" class="db-panel-link">Kelola produk ${icon('arrow')}</a>
      </section>
      <section class="db-panel db-order-panel" aria-labelledby="st-order-title">
        <div class="db-panel-head"><div><h3 id="st-order-title">Status pesanan toko</h3><p>Ringkasan penjualan Anda</p></div>${icon('orders')}</div>
        <div class="db-order-visual"><div class="db-order-ring" style="--db-progress:${orderProgress}%"><span><strong>${salesAvailable ? sales.length : '—'}</strong><small>pesanan</small></span></div><div class="db-order-legend"><div><i></i><span>Selesai</span><strong>${salesAvailable ? completedOrders : '—'}</strong></div><div><i></i><span>Berjalan</span><strong>${salesAvailable ? activeOrders.length : '—'}</strong></div><div><i></i><span>Dibatalkan</span><strong>${salesAvailable ? cancelledOrders : '—'}</strong></div></div></div>
        <p class="st-dashboard-revenue">Pendapatan terbayar <strong>${salesAvailable ? formatRupiah(revenue) : '—'}</strong></p>
        <a href="#store-panel" data-store-tab-target="orders" class="db-panel-link">Lihat pesanan toko ${icon('arrow')}</a>
      </section>
    </div>
    <div class="db-action-grid">
      <section class="db-panel db-quick-panel" aria-labelledby="st-quick-title">
        <div class="db-panel-head"><div><p class="st-kicker">LANGKAH BERIKUTNYA</p><h3 id="st-quick-title">Fokus toko</h3></div>${icon('guide')}</div>
        <div class="db-quick-list">
          <a href="#store-panel" data-store-tab-target="products"><span>${icon('store')}</span><span>Kelola produk<small>Perbarui penawaran di etalase.</small></span>${icon('arrow')}</a>
          <a href="#store-panel" data-store-tab-target="orders"><span>${icon('orders')}</span><span>Pesanan toko<small>Pantau dan proses pesanan masuk.</small></span>${icon('arrow')}</a>
          <a href="#tambah-limbah"><span>${icon('add')}</span><span>Tambah penawaran<small>Bagikan bahan organik yang tersedia.</small></span>${icon('arrow')}</a>
        </div>
      </section>
      <section class="db-activity" aria-labelledby="st-activity-title">
        <div class="db-activity-head"><div><p class="st-kicker">AKTIVITAS TOKO</p><h3 id="st-activity-title">Pesanan dalam proses <span>(${salesAvailable ? activeOrders.length : '—'})</span></h3></div><a href="#store-panel" data-store-tab-target="orders">Lihat semua ${icon('arrow')}</a></div>
        <div class="db-activity-grid">${activeOrders.length ? activeOrders.slice(0, 2).map(recentSaleCard).join('') : `<a class="db-activity-card db-activity-empty" href="#store-panel" data-store-tab-target="orders">${icon('orders')}<strong>${salesAvailable ? 'Belum ada pesanan berjalan' : 'Data pesanan belum tersedia'}</strong><small>${salesAvailable ? 'Pesanan toko baru akan tampil di sini.' : 'Coba muat ulang halaman toko.'}</small></a>`}<a class="db-add-card" href="#tambah-limbah">${icon('add')}<span>Tambah penawaran</span></a></div>
      </section>
    </div>
  </section>`;
}
