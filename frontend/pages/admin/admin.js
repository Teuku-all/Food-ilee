import { loadStylesheet } from '../../utils/stylesheet.js';
import { translate } from '../../utils/i18n.js';
import { getCurrentUser } from '../../services/user.js';
import {
  getAdminAnalytics,
  getAdminUsers,
  getAdminWastes,
  getAdminOrders,
  banAdminUser,
  deleteAdminWaste,
} from '../../services/admin.js';
import { escapeHtml } from '../../utils/html.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { formatRupiah, renderShell, showToast } from '../../ui/shell.js';
import { skeleton } from '../../ui/skeleton.js';
import { icon } from '../../ui/icons.js';
import { formatProductWeight, productWeightGrams } from '../../utils/product-weight.js';

let adminData = { users: [], wastes: [], orders: [] };
let activePanel = 'users';
let adminAnalytics = { totalUsers: 0, totalWastes: 0, totalOrders: 0, totalRevenue: 0 };

export async function renderAdmin() {
  const revision = getNavigationRevision();
  renderShell('', adminDashboardSkeleton());
  injectStyles();
  try {
    const profile = await getCurrentUser();
    if (!isRouteCurrent('#admin', revision)) return;
    if (profile.data?.role !== 'admin') {
      renderShell(
        '',
        '<section class="ad-page"><div class="ad-state fi-card"><h1>Akses admin diperlukan</h1><p>Halaman ini hanya tersedia untuk administrator.</p><a class="fi-button" href="#marketplace">Kembali ke marketplace</a></div></section>',
      );
      return;
    }
    const [analytics, users, wastes, orders] = await Promise.all([
      getAdminAnalytics(),
      getAdminUsers(),
      getAdminWastes(),
      getAdminOrders(),
    ]);
    if (!isRouteCurrent('#admin', revision)) return;
    adminData = {
      users: Array.isArray(users) ? users : [],
      wastes: Array.isArray(wastes) ? wastes : [],
      orders: Array.isArray(orders) ? orders : [],
    };
    adminAnalytics = analytics;
    renderAdminDashboard(adminAnalytics, profile.data, revision);
  } catch (error) {
    if (!isRouteCurrent('#admin', revision)) return;
    renderShell(
      '',
      '<section class="ad-page"><div class="ad-state fi-card"><h1>Panel admin belum dapat dibuka</h1><p>' +
        escapeHtml(error.message || 'Periksa koneksi dan hak akses Anda.') +
        '</p><button class="fi-button" type="button" data-admin-retry>Coba lagi</button></div></section>',
    );
    injectStyles();
    document.querySelector('[data-admin-retry]')?.addEventListener('click', renderAdmin);
  }
}

function adminDashboardSkeleton() {
  return `<section class="ad-page" aria-busy="true"><div class="ad-layout"><aside class="ad-sidebar">${skeleton('130px', '26px')}${skeleton('100%', '220px')}</aside><main class="ad-main"><header class="ad-heading">${skeleton('230px', '32px')}</header><section class="ad-stats">${Array.from({ length: 6 }, () => `<article class="fi-card">${skeleton('95px', '12px')}<div style="height:12px"></div>${skeleton('80px', '27px')}</article>`).join('')}</section><div class="ad-overview-grid"><section class="ad-panel fi-card">${skeleton('180px', '18px')}</section><section class="ad-panel fi-card">${skeleton('160px', '18px')}</section></div>${skeleton('100%', '300px')}</main></div></section>`;
}

function isPendingOrder(order) {
  return order.paymentStatus === 'pending' || order.status === 'pending';
}

function countByMonth(items, year, month) {
  return items.filter((item) => {
    const date = new Date(item.createdAt);
    return (
      !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month
    );
  }).length;
}

function renderAdminActivityChart() {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    return {
      label: date.toLocaleDateString('id-ID', { month: 'short' }),
      products: countByMonth(adminData.wastes, date.getFullYear(), date.getMonth()),
      orders: countByMonth(adminData.orders, date.getFullYear(), date.getMonth()),
    };
  });
  const max = Math.max(1, ...months.flatMap((month) => [month.products, month.orders]));
  const scale = Math.max(4, Math.ceil(max / 4) * 4);
  const top = 14;
  const bottom = 165;
  const chartHeight = bottom - top;
  const step = 54;
  const grid = Array.from({ length: 5 }, (_, index) => {
    const y = top + (chartHeight / 4) * index;
    const value = Math.round((scale * (4 - index)) / 4);
    return `<g class="ad-chart-gridline"><line x1="45" y1="${y}" x2="704" y2="${y}"/><text x="29" y="${y + 4}">${value}</text></g>`;
  }).join('');
  const bars = months
    .map((month, index) => {
      const x = 53 + index * step;
      const productHeight = month.products
        ? Math.max(5, (month.products / scale) * chartHeight)
        : 0;
      const orderHeight = month.orders ? Math.max(5, (month.orders / scale) * chartHeight) : 0;
      return `<g><rect class="ad-chart-bar is-products" x="${x}" y="${bottom - productHeight}" width="13" height="${productHeight}" rx="6"><title>${month.label}: ${month.products} produk baru</title></rect><rect class="ad-chart-bar is-orders" x="${x + 17}" y="${bottom - orderHeight}" width="13" height="${orderHeight}" rx="6"><title>${month.label}: ${month.orders} pesanan</title></rect><text class="ad-chart-month" x="${x + 15}" y="191">${month.label}</text></g>`;
    })
    .join('');
  const productsLastYear = months.reduce((sum, month) => sum + month.products, 0);
  const ordersLastYear = months.reduce((sum, month) => sum + month.orders, 0);
  return `<p class="ad-scroll-hint">Geser grafik untuk melihat bulan lainnya.</p><div class="ad-chart-wrap" tabindex="0" role="img" aria-label="Aktivitas 12 bulan terakhir: ${productsLastYear} produk baru dan ${ordersLastYear} pesanan"><svg class="ad-chart-svg" viewBox="0 0 720 204" preserveAspectRatio="none" aria-hidden="true">${grid}${bars}</svg></div>`;
}

function renderPendingOrders(orders) {
  const pending = orders.filter(isPendingOrder);
  if (!pending.length)
    return `<div class="ad-pending-empty">${icon('shield')}<strong>Tidak ada pesanan tertunda</strong></div>`;
  return pending
    .slice(0, 4)
    .map((order) => {
      const date = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        : 'Tanggal tidak tersedia';
      const title = order.waste?.title || 'Produk organik';
      const buyer = order.buyer?.name || order.buyer?.email || 'Pembeli Food Ilee';
      const label = order.paymentStatus === 'pending' ? 'Menunggu bayar' : 'Pesanan baru';
      return `<button type="button" class="ad-pending-row" data-admin-panel="orders"><span class="ad-pending-icon">${icon('orders')}</span><span class="ad-pending-copy"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(buyer)} · ${escapeHtml(date)}</small></span><span class="ad-pending-status">${label}</span></button>`;
    })
    .join('');
}

function renderAdminDashboard(analytics, currentUser, revision) {
  const pendingTotal = adminData.orders.filter(isPendingOrder).length;
  const initials = String(currentUser.name || currentUser.username || 'Admin')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toLocaleUpperCase('id-ID');
  const stats = [
    ['Pengguna terdaftar', Number(analytics.totalUsers || 0), 'profile'],
    ['Toko aktif', Number(analytics.totalStores || 0), 'store'],
    ['Produk tayang', Number(analytics.totalWastes || 0), 'box'],
    ['Total pesanan', Number(analytics.totalOrders || 0), 'orders'],
    ['Transaksi tertunda', pendingTotal, 'bell'],
    ['Omzet dibayar', formatRupiah(analytics.totalRevenue || 0), 'cart'],
  ];
  const tab = (panel, label) =>
    `<button type="button" role="tab" aria-selected="${activePanel === panel}" data-admin-panel="${panel}" class="${activePanel === panel ? 'active' : ''}">${label}</button>`;
  renderShell(
    '',
    `<section class="ad-page"><div class="ad-layout"><aside class="ad-sidebar" aria-label="Navigasi admin">
    <a class="ad-brand" href="#admin"><span class="ad-brand-mark">${icon('leaf')}</span><span>Food Ilee</span></a>
    <nav class="ad-side-nav"><a class="is-current" aria-current="location" href="#admin-overview" data-admin-scroll-target="admin-overview">${icon('home')}<span>Ringkasan</span></a><button type="button" data-admin-panel="users">${icon('profile')}<span>Pengguna</span></button><button type="button" data-admin-panel="wastes">${icon('box')}<span>Produk</span></button><button type="button" data-admin-panel="orders">${icon('orders')}<span>Pesanan</span></button><a href="#admin-chart" data-admin-scroll-target="admin-chart">${icon('guide')}<span>Statistik</span></a></nav>
    <div class="ad-sidebar-profile"><span class="ad-sidebar-avatar">${escapeHtml(initials || 'A')}</span><strong>${escapeHtml(currentUser.name || currentUser.username || 'Administrator')}</strong></div>
  </aside><main class="ad-main">
    <header class="ad-heading"><h1>Dashboard admin</h1></header>
    <section class="ad-stats" aria-label="Statistik utama">${stats.map(([label, value, iconName]) => `<article class="ad-stat"><span class="ad-stat-icon">${icon(iconName)}</span><small>${label}</small><strong>${typeof value === 'number' ? value.toLocaleString('id-ID') : value}</strong></article>`).join('')}</section>
    <section class="ad-overview-grid" id="admin-overview"><section class="ad-panel ad-chart-panel fi-card" id="admin-chart" aria-labelledby="admin-chart-title"><div class="ad-panel-heading"><h2 id="admin-chart-title">Aktivitas 12 bulan</h2><div class="ad-chart-legend"><span><i class="is-products"></i>Produk</span><span><i class="is-orders"></i>Pesanan</span></div></div>${renderAdminActivityChart()}</section><section class="ad-panel ad-pending-panel fi-card" aria-labelledby="admin-pending-title"><div class="ad-panel-heading"><h2 id="admin-pending-title">Pesanan tertunda</h2></div><div class="ad-pending-list">${renderPendingOrders(adminData.orders)}</div><button type="button" class="ad-panel-link" data-admin-panel="orders">Lihat semua pesanan ${icon('arrow')}</button></section></section>
    <section class="ad-management" id="admin-management"><div class="ad-management-heading"><h2>Kelola data</h2></div><div class="ad-toolbar"><label class="ad-search"><span aria-hidden="true">${icon('search')}</span><input id="admin-search" type="search" placeholder="Cari data…" aria-label="Cari pada tabel admin"></label><div class="ad-toolbar-right"><div class="ad-tabs" role="tablist" aria-label="Pilih jenis data">${tab('users', 'Pengguna')}${tab('wastes', 'Produk')}${tab('orders', 'Pesanan')}</div><span id="admin-search-note" role="status" hidden></span></div></div><section id="admin-panel" class="ad-panel fi-card" role="tabpanel">${renderPanel(currentUser)}</section></section>
  </main></div></section>`,
  );
  injectStyles();
  document.querySelectorAll('[data-admin-panel]').forEach((button) =>
    button.addEventListener('click', () => {
      activePanel = button.dataset.adminPanel;
      document.querySelectorAll('.ad-tabs [data-admin-panel]').forEach((item) => {
        const active = item.dataset.adminPanel === activePanel;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
      });
      setAdminSidebarCurrent(
        document.querySelector(`.ad-side-nav [data-admin-panel="${activePanel}"]`),
      );
      document.getElementById('admin-panel').innerHTML = renderPanel(currentUser);
      applyAdminSearch();
      bindAdminActions(currentUser, revision);
      if (!button.closest('.ad-tabs')) {
        document.getElementById('admin-management')?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
          block: 'start',
        });
      }
    }),
  );
  document.querySelectorAll('[data-admin-scroll-target]').forEach((link) =>
    link.addEventListener('click', (event) => {
      event.preventDefault();
      setAdminSidebarCurrent(link);
      document.getElementById(link.dataset.adminScrollTarget)?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'start',
      });
    }),
  );
  document.getElementById('admin-search')?.addEventListener('input', applyAdminSearch);
  applyAdminSearch();
  bindAdminActions(currentUser, revision);
}

// Sidebar destinations and table tabs represent separate navigation states.
function setAdminSidebarCurrent(current) {
  document.querySelectorAll('.ad-side-nav a,.ad-side-nav button').forEach((item) => {
    const active = item === current;
    item.classList.toggle('is-current', active && item.tagName === 'A');
    item.classList.toggle('active', active && item.tagName === 'BUTTON');
    if (active) item.setAttribute('aria-current', 'location');
    else item.removeAttribute('aria-current');
  });
}

function applyAdminSearch() {
  const input = document.getElementById('admin-search');
  const note = document.getElementById('admin-search-note');
  const rows = [...(document.querySelector('#admin-panel tbody')?.rows || [])];
  if (!note) return;
  const query = input?.value.trim().toLocaleLowerCase('id-ID') || '';
  if (!rows.length) {
    note.hidden = true;
    note.textContent = '';
    return;
  }
  let visible = 0;
  rows.forEach((row) => {
    const match = !query || row.textContent.toLocaleLowerCase('id-ID').includes(query);
    row.hidden = !match;
    if (match) visible += 1;
  });
  note.hidden = !query;
  note.textContent = !query
    ? ''
    : visible
      ? `${visible} hasil ditemukan`
      : 'Tidak ada data yang cocok.';
}

function renderPanel(currentUser) {
  if (activePanel === 'users') {
    if (!adminData.users.length) return '<p class="ad-empty">Belum ada akun pengguna.</p>';
    return (
      '<p class="ad-scroll-hint">Geser tabel untuk melihat seluruh kolom.</p><div class="ad-table-wrap" tabindex="0" role="region" aria-label="Tabel data admin, geser untuk melihat kolom lainnya"><table><thead><tr><th>Pengguna</th><th>Peran</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
      adminData.users
        .map(
          (user) =>
            '<tr><td><strong>' +
            escapeHtml(user.name || user.username || 'Pengguna') +
            '</strong><small>' +
            escapeHtml(user.email || '') +
            '</small></td><td>' +
            escapeHtml(user.role || 'user') +
            '</td><td><span class="ad-status ' +
            (user.isBanned ? 'banned' : '') +
            '">' +
            (user.isBanned ? 'Dinonaktifkan' : 'Aktif') +
            '</span></td><td>' +
            (user.role === 'admin' || user.id === currentUser.id || user.isBanned
              ? '—'
              : '<button type="button" class="ad-action danger" data-admin-ban="' +
                escapeHtml(user.id) +
                '">Nonaktifkan</button>') +
            '</td></tr>',
        )
        .join('') +
      '</tbody></table></div>'
    );
  }
  if (activePanel === 'wastes') {
    if (!adminData.wastes.length) return '<p class="ad-empty">Belum ada produk.</p>';
    return (
      '<p class="ad-scroll-hint">Geser tabel untuk melihat seluruh kolom.</p><div class="ad-table-wrap" tabindex="0" role="region" aria-label="Tabel data admin, geser untuk melihat kolom lainnya"><table><thead><tr><th>Produk</th><th>Penjual</th><th>Harga</th><th>Aksi</th></tr></thead><tbody>' +
      adminData.wastes
        .map(
          (waste) =>
            '<tr><td><strong>' +
            escapeHtml(waste.title || 'Produk organik') +
            '</strong><small>' +
            escapeHtml(waste.category || 'Organik') +
            ' · ' +
            Number(waste.stock || 0) +
            ' ' +
            translate(`unit · ${formatProductWeight(productWeightGrams(waste))}/unit`) +
            '</small></td><td>' +
            escapeHtml(
              waste.store?.name || waste.seller?.name || waste.seller?.email || 'Penjual',
            ) +
            '</td><td>' +
            translate(`${formatRupiah(waste.price)} / unit`) +
            '</td><td><button type="button" class="ad-action danger" data-admin-delete="' +
            escapeHtml(waste.id) +
            '">Hapus</button></td></tr>',
        )
        .join('') +
      '</tbody></table></div>'
    );
  }
  if (!adminData.orders.length) return '<p class="ad-empty">Belum ada transaksi.</p>';
  return (
    '<p class="ad-scroll-hint">Geser tabel untuk melihat seluruh kolom.</p><div class="ad-table-wrap" tabindex="0" role="region" aria-label="Tabel data admin, geser untuk melihat kolom lainnya"><table><thead><tr><th>Produk</th><th>Pembeli</th><th>Status</th><th>Total</th></tr></thead><tbody>' +
    adminData.orders
      .map(
        (order) =>
          '<tr><td><strong>' +
          escapeHtml(order.waste?.title || 'Produk organik') +
          '</strong><small>' +
          Number(order.quantity || 0) +
          ' unit</small></td><td>' +
          escapeHtml(order.buyer?.name || order.buyer?.email || 'Pembeli') +
          '</td><td><span class="ad-status">' +
          escapeHtml(order.status || 'pending') +
          '</span></td><td>' +
          formatRupiah(order.total) +
          '</td></tr>',
      )
      .join('') +
    '</tbody></table></div>'
  );
}

function bindAdminActions(currentUser, revision) {
  document.querySelectorAll('[data-admin-ban]').forEach((button) =>
    button.addEventListener('click', async () => {
      if (!confirm(translate('Nonaktifkan akun ini?'))) return;
      button.disabled = true;
      try {
        await banAdminUser(button.dataset.adminBan);
        if (!isRouteCurrent('#admin', revision)) return;
        showToast('Akun pengguna dinonaktifkan.');
        renderAdmin();
      } catch (error) {
        button.disabled = false;
        showToast(error.message || 'Akun belum dapat dinonaktifkan.', 'error');
      }
    }),
  );
  document.querySelectorAll('[data-admin-delete]').forEach((button) =>
    button.addEventListener('click', async () => {
      if (!confirm(translate('Hapus produk ini dari marketplace?'))) return;
      button.disabled = true;
      try {
        await deleteAdminWaste(button.dataset.adminDelete);
        if (!isRouteCurrent('#admin', revision)) return;
        showToast('Produk berhasil dihapus.');
        adminData.wastes = adminData.wastes.filter(
          (waste) => waste.id !== button.dataset.adminDelete,
        );
        adminAnalytics.totalWastes = adminData.wastes.length;
        activePanel = 'wastes';
        renderAdminDashboard(adminAnalytics, currentUser, revision);
      } catch (error) {
        button.disabled = false;
        showToast(error.message || 'Produk belum dapat dihapus.', 'error');
      }
    }),
  );
}

function injectStyles() {
  loadStylesheet('admin-page-style', new URL('../../styles/pages/admin.css', import.meta.url));
}
