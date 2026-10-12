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

let adminData = { users: [], wastes: [], orders: [] };
let activePanel = 'users';
let adminAnalytics = { totalUsers: 0, totalWastes: 0, totalOrders: 0, totalRevenue: 0 };

export async function renderAdmin() {
  const revision = getNavigationRevision();
  renderShell(
    '',
    adminLoadingSkeleton(),
  );
  injectStyles();
  try {
    const profile = await getCurrentUser();
    if (!isRouteCurrent('#admin', revision)) return;
    if (profile.data?.role !== 'admin') {
      renderShell(
        '',
        '<section class="ad-page"><div class="ad-state fi-card"><h1>Akses admin diperlukan</h1><p>Halaman ini hanya tersedia untuk administrator.</p><a class="fi-button" href="#dashboard">Kembali ke dashboard</a></div></section>',
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
    renderAdminView(adminAnalytics, profile.data, revision);
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

function adminLoadingSkeleton() {
  return `<section class="ad-page" aria-busy="true"><header class="ad-heading"><div>${skeleton('120px', '10px')}<div style="height:10px"></div>${skeleton('220px', '30px')}<div style="height:8px"></div>${skeleton('310px', '13px')}</div>${skeleton('130px', '28px', 'pill')}</header><section class="ad-stats">${Array.from({ length: 4 }, () => `<article class="fi-card">${skeleton('90px', '12px')}<div style="height:12px"></div>${skeleton('80px', '27px')}</article>`).join('')}</section><div class="ad-tabs">${skeleton('120px', '38px', 'pill')}${skeleton('100px', '38px', 'pill')}${skeleton('100px', '38px', 'pill')}</div><section class="ad-panel fi-card"><div class="ad-table-wrap"><table><thead><tr><th>${skeleton('80px', '10px')}</th><th>${skeleton('90px', '10px')}</th><th>${skeleton('80px', '10px')}</th><th>${skeleton('70px', '10px')}</th></tr></thead><tbody>${Array.from({ length: 5 }, () => `<tr><td>${skeleton('125px', '13px')}</td><td>${skeleton('180px', '13px')}</td><td>${skeleton('70px', '20px', 'pill')}</td><td>${skeleton('75px', '30px', 'pill')}</td></tr>`).join('')}</tbody></table></div></section></section>`;
}

function renderAdminView(analytics, currentUser, revision) {
  renderShell(
    '',
    '<section class="ad-page"><header class="ad-heading"><div><p class="ad-kicker">PENGELOLAAN PLATFORM</p><h1>Panel Admin</h1><p>Pantau akun, etalase, dan transaksi Food Ilee.</p></div><span class="ad-role">Administrator</span></header><section class="ad-stats"><article class="fi-card"><small>Pengguna</small><strong>' +
      Number(analytics.totalUsers || 0).toLocaleString('id-ID') +
      '</strong></article><article class="fi-card"><small>Produk</small><strong>' +
      Number(analytics.totalWastes || 0).toLocaleString('id-ID') +
      '</strong></article><article class="fi-card"><small>Pesanan</small><strong>' +
      Number(analytics.totalOrders || 0).toLocaleString('id-ID') +
      '</strong></article><article class="fi-card"><small>Omzet dibayar</small><strong>' +
      formatRupiah(analytics.totalRevenue) +
      '</strong></article></section><div class="ad-tabs" role="tablist"><button type="button" data-admin-panel="users" class="' +
      (activePanel === 'users' ? 'active' : '') +
      '">Pengguna (' +
      adminData.users.length +
      ')</button><button type="button" data-admin-panel="wastes" class="' +
      (activePanel === 'wastes' ? 'active' : '') +
      '">Produk (' +
      adminData.wastes.length +
      ')</button><button type="button" data-admin-panel="orders" class="' +
      (activePanel === 'orders' ? 'active' : '') +
      '">Pesanan (' +
      adminData.orders.length +
      ')</button></div><section id="admin-panel" class="ad-panel fi-card">' +
      renderPanel(currentUser) +
      '</section></section>',
  );
  injectStyles();
  document.querySelectorAll('[data-admin-panel]').forEach((button) =>
    button.addEventListener('click', () => {
      activePanel = button.dataset.adminPanel;
      document
        .querySelectorAll('[data-admin-panel]')
        .forEach((tab) => tab.classList.toggle('active', tab === button));
      document.getElementById('admin-panel').innerHTML = renderPanel(currentUser);
      bindAdminActions(currentUser, revision);
    }),
  );
  bindAdminActions(currentUser, revision);
}

function renderPanel(currentUser) {
  if (activePanel === 'users') {
    if (!adminData.users.length) return '<p class="ad-empty">Belum ada akun pengguna.</p>';
    return (
      '<div class="ad-table-wrap"><table><thead><tr><th>Pengguna</th><th>Peran</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
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
      '<div class="ad-table-wrap"><table><thead><tr><th>Produk</th><th>Penjual</th><th>Harga</th><th>Aksi</th></tr></thead><tbody>' +
      adminData.wastes
        .map(
          (waste) =>
            '<tr><td><strong>' +
            escapeHtml(waste.title || 'Produk organik') +
            '</strong><small>' +
            escapeHtml(waste.category || 'Organik') +
            ' · ' +
            Number(waste.stock || 0) +
            ' kg</small></td><td>' +
            escapeHtml(
              waste.store?.name || waste.seller?.name || waste.seller?.email || 'Penjual',
            ) +
            '</td><td>' +
            formatRupiah(waste.price) +
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
    '<div class="ad-table-wrap"><table><thead><tr><th>Produk</th><th>Pembeli</th><th>Status</th><th>Total</th></tr></thead><tbody>' +
    adminData.orders
      .map(
        (order) =>
          '<tr><td><strong>' +
          escapeHtml(order.waste?.title || 'Produk organik') +
          '</strong><small>' +
          Number(order.quantity || 0) +
          ' kg</small></td><td>' +
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
      if (!confirm('Nonaktifkan akun ini?')) return;
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
      if (!confirm('Hapus produk ini dari marketplace?')) return;
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
        renderAdminView(adminAnalytics, currentUser, revision);
      } catch (error) {
        button.disabled = false;
        showToast(error.message || 'Produk belum dapat dihapus.', 'error');
      }
    }),
  );
}

function injectStyles() {
  if (document.getElementById('admin-page-style')) return;
  const style = document.createElement('style');
  style.id = 'admin-page-style';
  style.textContent =
    '.ad-page{max-width:1180px;margin:0 auto;padding:4px 0 30px}.ad-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:24px}.ad-kicker{margin:0 0 7px;color:#49827d;font-size:10px;font-weight:700;letter-spacing:.14em}.ad-heading h1{margin:0;color:var(--fi-deep);font-size:clamp(29px,4vw,38px);letter-spacing:-.04em}.ad-heading p:not(.ad-kicker){margin-top:8px;color:var(--fi-muted);font-size:14px}.ad-role{padding:8px 12px;border-radius:999px;background:#d8eeeb;color:#176d69;font-size:11px;font-weight:600}.ad-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:22px}.ad-stats article{min-width:0;padding:17px;border:1px solid var(--fi-line);border-radius:18px;background:var(--fi-card)}.ad-stats small{display:block;color:var(--fi-muted);font-size:11px}.ad-stats strong{display:block;overflow:hidden;margin-top:8px;color:var(--fi-deep);font-size:clamp(18px,2vw,26px);text-overflow:ellipsis;white-space:nowrap}.ad-tabs{display:flex;gap:7px;margin-bottom:12px;padding:5px;border:1px solid var(--fi-line);border-radius:14px;background:#eaf3f2;overflow:auto}.ad-tabs button{flex:none;min-height:38px;padding:0 15px;border-radius:10px;background:transparent;color:#55716e;font-size:12px;font-weight:600}.ad-tabs button.active{background:#004847;color:#eff9f8}.ad-panel{overflow:hidden;padding:0;border-radius:19px}.ad-table-wrap{width:100%;overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left}th,td{padding:14px 16px;border-bottom:1px solid #dce8e6;white-space:nowrap}th{background:#f2f8f7;color:#56716f;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}td{color:#365856;font-size:12px}td strong,td small{display:block}td strong{color:#173d3c;font-size:12px}td small{margin-top:4px;color:#748c89;font-size:10px}.ad-status{padding:5px 8px;border-radius:999px;background:#e1f0ee;color:#176d69;font-size:10px}.ad-status.banned{background:#fae7e5;color:#a34b43}.ad-action{min-height:32px;padding:0 10px;border:1px solid #bfd4d2;border-radius:999px;background:#fff;font-size:10px;font-weight:600}.ad-action.danger{border-color:#efd4d1;color:#a34b43}.ad-action:disabled{opacity:.5}.ad-empty,.ad-state{min-height:180px;padding:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--fi-muted);text-align:center}.ad-state h1{color:var(--fi-deep);font-size:24px}.ad-state p{max-width:540px;font-size:13px;line-height:1.6}.ad-state .fi-button{margin-top:8px}@media(max-width:760px){.ad-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.ad-heading{align-items:flex-start;flex-direction:column}}@media(max-width:520px){.ad-stats{gap:8px}.ad-stats article{padding:13px}.ad-tabs button{padding:0 12px;font-size:11px}th,td{padding:11px 12px}}';
  document.head.append(style);
}
