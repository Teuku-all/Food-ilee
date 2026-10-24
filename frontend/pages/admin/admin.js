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
      '</strong></article></section><div class="ad-toolbar"><label class="ad-search"><span aria-hidden="true">⌕</span><input id="admin-search" type="search" placeholder="Cari di data ini…" aria-label="Cari pada tabel admin"></label><div class="ad-toolbar-right"><div class="ad-tabs" role="tablist"><button type="button" data-admin-panel="users" class="' +
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
      ')</button></div><span id="admin-search-note" role="status">Menampilkan semua data</span></div></div><section id="admin-panel" class="ad-panel fi-card">' +
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
      applyAdminSearch();
      bindAdminActions(currentUser, revision);
    }),
  );
  document.getElementById('admin-search')?.addEventListener('input', applyAdminSearch);
  applyAdminSearch();
  bindAdminActions(currentUser, revision);
}

function applyAdminSearch() {
  const input = document.getElementById('admin-search');
  const note = document.getElementById('admin-search-note');
  const rows = [...(document.querySelector('#admin-panel tbody')?.rows || [])];
  if (!note) return;
  const query = input?.value.trim().toLocaleLowerCase('id-ID') || '';
  if (!rows.length) {
    note.textContent = 'Belum ada data untuk ditampilkan.';
    return;
  }
  let visible = 0;
  rows.forEach((row) => {
    const match = !query || row.textContent.toLocaleLowerCase('id-ID').includes(query);
    row.hidden = !match;
    if (match) visible += 1;
  });
  note.textContent = visible
    ? `${visible} dari ${rows.length} baris ditampilkan`
    : 'Tidak ada data yang cocok.';
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
    '.ad-page{max-width:1180px;margin:0 auto;padding:4px 0 30px}.ad-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:24px}.ad-kicker{margin:0 0 7px;color:#49827d;font-size:10px;font-weight:700;letter-spacing:.14em}.ad-heading h1{margin:0;color:var(--fi-deep);font-size:clamp(29px,4vw,38px);letter-spacing:-.04em}.ad-heading p:not(.ad-kicker){margin-top:8px;color:var(--fi-muted);font-size:14px}.ad-role{padding:8px 12px;border-radius:999px;background:#d8eeeb;color:#176d69;font-size:11px;font-weight:600}.ad-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:22px}.ad-stats article{min-width:0;padding:17px;border:1px solid var(--fi-line);border-radius:18px;background:var(--fi-card)}.ad-stats small{display:block;color:var(--fi-muted);font-size:11px}.ad-stats strong{display:block;overflow:hidden;margin-top:8px;color:var(--fi-deep);font-size:clamp(18px,2vw,26px);text-overflow:ellipsis;white-space:nowrap}.ad-tabs{display:flex;gap:7px;margin-bottom:12px;padding:5px;border:1px solid var(--fi-line);border-radius:14px;background:#eaf3f2;overflow:auto}.ad-tabs button{flex:none;min-height:38px;padding:0 15px;border-radius:10px;background:transparent;color:#55716e;font-size:12px;font-weight:600}.ad-tabs button.active{background:#0B2B26;color:#eff9f8}.ad-panel{overflow:hidden;padding:0;border-radius:19px}.ad-table-wrap{width:100%;overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left}th,td{padding:14px 16px;border-bottom:1px solid #DAF1DE;white-space:nowrap}th{background:#f2f8f7;color:#56716f;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}td{color:#365856;font-size:12px}td strong,td small{display:block}td strong{color:#163832;font-size:12px}td small{margin-top:4px;color:#748c89;font-size:10px}.ad-status{padding:5px 8px;border-radius:999px;background:#e1f0ee;color:#176d69;font-size:10px}.ad-status.banned{background:#fae7e5;color:#a34b43}.ad-action{min-height:32px;padding:0 10px;border:1px solid #bfd4d2;border-radius:999px;background:#fff;font-size:10px;font-weight:600}.ad-action.danger{border-color:#efd4d1;color:#a34b43}.ad-action:disabled{opacity:.5}.ad-empty,.ad-state{min-height:180px;padding:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--fi-muted);text-align:center}.ad-state h1{color:var(--fi-deep);font-size:24px}.ad-state p{max-width:540px;font-size:13px;line-height:1.6}.ad-state .fi-button{margin-top:8px}@media(max-width:760px){.ad-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.ad-heading{align-items:flex-start;flex-direction:column}}@media(max-width:520px){.ad-stats{gap:8px}.ad-stats article{padding:13px}.ad-tabs button{padding:0 12px;font-size:11px}th,td{padding:11px 12px}}';
  style.textContent += `.ad-heading{position:relative;isolation:isolate;box-sizing:border-box;min-height:176px;align-items:center;overflow:hidden;margin-bottom:20px;padding:28px 32px;border:1px solid #cfe1d2;border-radius:24px;background:radial-gradient(ellipse at 88% 18%,#d9eee0 0,transparent 34%),linear-gradient(115deg,#f8fbf7,#edf5ef 65%,#e4f1e8);box-shadow:0 12px 30px #174e320c}.ad-heading:before{position:absolute;z-index:-1;right:-50px;top:-142px;width:320px;height:320px;border:1px solid #a8cdb544;border-radius:50%;content:'';box-shadow:0 0 0 22px #a9cfad14,0 0 0 45px #a9cfad10}.ad-heading>div{position:relative;z-index:1}.ad-kicker{display:inline-flex;margin:0 0 10px;padding:6px 10px;border:1px solid #cfe1d2;border-radius:999px;background:#ffffffad;color:#557b61}.ad-heading h1{font-size:clamp(30px,3.5vw,40px);font-weight:620;letter-spacing:-1.3px}.ad-heading p:not(.ad-kicker){margin:9px 0 0;color:#607369;line-height:1.6}.ad-role{position:relative;z-index:1;padding:9px 13px;border:1px solid #d0e3d4;background:#ffffffc9;color:#39734d}.ad-stats{gap:14px;margin-bottom:25px}.ad-stats article{position:relative;overflow:hidden;padding:19px 20px;border-color:#d7e5d9;border-radius:18px;background:linear-gradient(145deg,#fff,#f8fbf8);box-shadow:0 7px 20px #0B2B2608;transition:transform .18s ease,box-shadow .18s ease}.ad-stats article:hover{transform:translateY(-2px);box-shadow:0 12px 24px #0B2B2610}.ad-stats article:after{position:absolute;top:18px;right:18px;width:9px;height:9px;border-radius:50%;background:#78ae83;box-shadow:0 0 0 5px #78ae831a;content:''}.ad-stats article:nth-child(2):after{background:#63a59a;box-shadow:0 0 0 5px #63a59a1a}.ad-stats article:nth-child(3):after{background:#7e9dc0;box-shadow:0 0 0 5px #7e9dc01a}.ad-stats article:nth-child(4):after{background:#d3a653;box-shadow:0 0 0 5px #d3a6531a}.ad-stats small{font-size:11px;font-weight:600;letter-spacing:.02em}.ad-stats strong{margin-top:10px;font-size:clamp(21px,2.2vw,28px);letter-spacing:-.4px}.ad-tabs{width:max-content;max-width:100%;box-sizing:border-box;gap:5px;margin:0 0 10px;padding:5px;border-color:#d8e5dc;border-radius:13px;background:#edf4ee}.ad-tabs button{min-height:39px;padding:0 17px;border-radius:9px;transition:background .16s,color .16s,box-shadow .16s}.ad-tabs button.active{background:#163832;box-shadow:0 3px 8px #16383222}.ad-tabs button:focus-visible,.ad-search input:focus-visible,.ad-action:focus-visible{outline:3px solid #7bb88a;outline-offset:2px}.ad-tools{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 12px}.ad-search{display:flex;align-items:center;gap:9px;width:min(390px,100%);height:41px;box-sizing:border-box;padding:0 13px;border:1px solid #dce8df;border-radius:12px;background:#fff;color:#66806c}.ad-search>span{font-size:20px;line-height:1}.ad-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#0B2B26;font:400 12px Inter,Arial,sans-serif}.ad-search input::placeholder{color:#98a79b}.ad-tools>[role=status]{color:#77877a;font-size:10px}.ad-panel{border-color:#e0e9e2;border-radius:18px;box-shadow:0 8px 24px #0B2B2608}.ad-table-wrap table{width:100%;border-collapse:collapse;text-align:left}.ad-table-wrap th,.ad-table-wrap td{padding:13px 16px;border-bottom:1px solid #edf2ed;white-space:nowrap}.ad-table-wrap th{position:sticky;top:0;z-index:1;background:#f5f9f5;color:#718476;font-size:9px;letter-spacing:.09em}.ad-table-wrap td{color:#53675a;font-size:11px}.ad-table-wrap td strong{color:#263f2d;font-size:12px}.ad-table-wrap td small{color:#829084;font-size:10px}.ad-table-wrap tbody tr{transition:background .14s ease}.ad-table-wrap tbody tr:nth-child(even){background:#fbfdfb}.ad-table-wrap tbody tr:hover{background:#f0f7f1}.ad-table-wrap tbody tr[hidden]{display:none}.ad-status{padding:5px 9px;background:#e8f4e9;color:#39734d;font-weight:600}.ad-action{min-height:34px;padding:0 12px;border-color:#d6e4d8;color:#436a4d;cursor:pointer;transition:background .15s,border-color .15s}.ad-action:hover:not(:disabled){border-color:#8db696;background:#f1f8f2}.ad-action.danger{background:#fffafa}.ad-empty{min-height:150px;color:#77877a;font-size:12px}@media(max-width:760px){.ad-heading{min-height:155px;padding:24px}.ad-stats{gap:10px}.ad-tools{align-items:flex-start;flex-direction:column}.ad-search{width:100%}.ad-tools>[role=status]{align-self:flex-end}.ad-tabs{width:100%}}@media(max-width:520px){.ad-page{padding-top:0}.ad-heading{min-height:145px;padding:20px;border-radius:20px}.ad-heading:before{right:-190px;top:-160px}.ad-heading h1{font-size:30px}.ad-role{padding:7px 10px;font-size:10px}.ad-stats article{padding:14px}.ad-stats article:after{top:14px;right:14px}.ad-stats small{max-width:calc(100% - 18px);font-size:10px}.ad-tabs button{padding:0 12px}th,td{padding:11px 12px}}`;
  style.textContent += `.ad-toolbar{display:flex;align-items:center;gap:14px;margin:0 0 12px}.ad-search{flex:1;width:auto;max-width:none}.ad-toolbar-right{min-width:0;display:flex;align-items:center;gap:11px}.ad-tabs{flex:none;width:auto;max-width:100%;margin:0}.ad-toolbar-right>[role=status]{color:#77877a;font-size:10px;white-space:nowrap}@media(max-width:760px){.ad-toolbar{align-items:stretch;flex-direction:column;gap:9px}.ad-search{width:100%}.ad-toolbar-right{justify-content:space-between}.ad-tabs{flex:1}.ad-toolbar-right>[role=status]{white-space:normal;text-align:right}}@media(max-width:520px){.ad-toolbar-right{align-items:flex-start;flex-direction:column}.ad-tabs{width:100%;flex:auto}.ad-toolbar-right>[role=status]{align-self:flex-end}}`;
  style.textContent += `.ad-page{max-width:1380px;margin-inline:auto}`;
  document.head.append(style);
}
