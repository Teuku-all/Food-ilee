import { getWastes, deleteWaste, updateWaste } from '../../services/waste.js';
import { getCurrentUser } from '../../services/user.js';
import { getMyOrders } from '../../services/order.js';
import { removeToken } from '../../utils/storage.js';
import { escapeHtml } from '../../utils/html.js';
import { formatRupiah, renderShell, showToast } from '../../ui/shell.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { skeleton } from '../../ui/skeleton.js';

export async function renderDashboard() {
  const navigationRevision = getNavigationRevision();
  let userResult;
  let wasteResult;
  let orderResult = { data: [] };
  renderShell('', dashboardLoadingSkeleton());
  injectDashboardStyles();
  try {
    [userResult, wasteResult] = await Promise.all([getCurrentUser(), getWastes({ mine: true })]);
    orderResult = await getMyOrders();
    if (!orderResult.success) throw new Error(orderResult.message || 'Pesanan belum dapat dimuat.');
  } catch {
    if (!isRouteCurrent('#dashboard', navigationRevision)) return;
    renderShell(
      '',
      '<section class="db-error fi-card"><h1>Dashboard belum dapat dimuat</h1><p>Periksa koneksi ke Food Ilee, lalu coba kembali.</p><button class="fi-button" data-retry>Muat ulang</button></section>',
    );
    document.querySelector('[data-retry]').addEventListener('click', renderDashboard);
    return;
  }
  if (!isRouteCurrent('#dashboard', navigationRevision)) return;
  if (!userResult?.success || !userResult.data) {
    removeToken();
    location.hash = '#login';
    return;
  }
  const user = userResult.data;
  const products = Array.isArray(wasteResult?.data) ? wasteResult.data : [];
  const orders = Array.isArray(orderResult?.data) ? orderResult.data : [];
  const stock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const openOrders = orders.filter(
    (order) => !['completed', 'cancelled'].includes(order.status),
  ).length;
  const impact = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const welcome = user.name || user.username || user.email?.split('@')[0] || 'Pengguna';
  const monthCounts = lastMonths(products);
  const chartMax = Math.max(1, ...monthCounts.map((entry) => entry.count));
  renderShell(
    '',
    `<section class="db-page"><div class="db-heading"><div><p class="db-kicker">RUANG KERJA FOOD ILEE</p><h1>Selamat datang, ${escapeHtml(welcome)}</h1><p>Kelola penawaran dan pantau perjalanan sirkularitas Anda.</p></div><div class="db-heading-actions"><a class="fi-button fi-button-outline" href="#marketplace">Jelajahi Marketplace</a><a class="fi-button" href="#tambah-limbah">+ Tambah Limbah</a></div></div><div class="db-stats"><article class="db-stat db-stat-green"><span class="db-stat-icon">↻</span><p>Produk Anda</p><strong>${products.length}</strong><small>Penawaran aktif di marketplace</small></article><article class="db-stat"><span class="db-stat-icon accent">◌</span><p>Stok tersedia</p><strong>${stock.toLocaleString('id-ID')} <small>kg</small></strong><small>Total dari semua produk Anda</small></article><article class="db-stat"><span class="db-stat-icon mint">▤</span><p>Pesanan berjalan</p><strong>${openOrders}</strong><small>Pesanan yang masih diproses</small></article></div><div class="db-overview"><section class="db-chart fi-card"><div class="db-card-heading"><div><h2>Aktivitas penawaran</h2><p>Produk yang Anda unggah dalam enam bulan terakhir</p></div><span class="db-chart-badge">${products.length} total</span></div><div class="db-bars">${monthCounts.map((entry) => `<div class="db-bar-item"><span>${entry.count || ''}</span><i style="--bar:${Math.max(entry.count ? 10 : 3, Math.round((entry.count / chartMax) * 100))}%"></i><small>${entry.label}</small></div>`).join('')}</div></section><aside class="db-tip"><span class="db-tip-icon">✳</span><p class="db-kicker">LANGKAH BERIKUTNYA</p><h2>Temukan pemanfaat baru untuk sisa pangan.</h2><p>Informasi foto, kategori, harga, dan stok yang lengkap membantu calon pembeli mengambil keputusan.</p><a href="#tambah-limbah">Buat penawaran <span>→</span></a></aside></div><section class="db-listing"><div class="db-listing-head"><div><p class="db-kicker">ETALASE SAYA</p><h2>Produk yang Anda tawarkan</h2></div><a class="db-view-all" href="#marketplace">Lihat marketplace <span>↗</span></a></div>${products.length ? `<div class="db-product-grid">${products.slice(0, 6).map(productCard).join('')}</div>` : `<div class="db-empty fi-card"><span>＋</span><h3>Etalase Anda siap dimulai</h3><p>Tambahkan limbah organik pertama dan hubungkan dengan calon pemanfaat.</p><a class="fi-button" href="#tambah-limbah">Tambah penawaran</a></div>`}</section></section>`,
  );
  injectDashboardStyles();
  bindProductActions(products);
}

function dashboardLoadingSkeleton() {
  return `<section class="db-page" aria-busy="true"><div class="db-heading"><div>${skeleton('145px', '10px')}<div style="height:12px"></div>${skeleton('min(370px, 90vw)', '35px')}<div style="height:9px"></div>${skeleton('min(460px, 90vw)', '14px')}</div><div class="db-heading-actions">${skeleton('175px', '42px', 'pill')}${skeleton('145px', '42px', 'pill')}</div></div><div class="db-stats">${Array.from({ length: 3 }, () => `<article class="db-stat">${skeleton('95px', '11px')}<div style="height:15px"></div>${skeleton('65px', '33px')}<div style="height:12px"></div>${skeleton('150px', '10px')}</article>`).join('')}</div><div class="db-overview"><section class="db-chart fi-card"><div class="db-card-heading"><div>${skeleton('155px', '18px')}<div style="height:8px"></div>${skeleton('220px', '10px')}</div>${skeleton('65px', '24px', 'pill')}</div><div class="db-bars">${Array.from({ length: 6 }, (_, index) => `<div class="db-bar-item">${skeleton('30px', `${30 + (index % 3) * 18}px`)}</div>`).join('')}</div></section><aside class="db-tip">${skeleton('36px', '36px', 'circle')}<div style="height:14px"></div>${skeleton('125px', '10px')}<div style="height:12px"></div>${skeleton('90%', '20px')}${skeleton('90%', '12px')}${skeleton('75%', '12px')}</aside></div><section class="db-listing"><div class="db-listing-head">${skeleton('190px', '22px')}${skeleton('110px', '14px')}</div><div class="db-product-grid">${Array.from({ length: 3 }, () => `<article class="db-product fi-card">${skeleton('100%', '145px')}<div class="db-product-body">${skeleton('80px', '18px', 'pill')}<div style="height:12px"></div>${skeleton('70%', '17px')}<div style="height:15px"></div>${skeleton('100%', '12px')}</div></article>`).join('')}</div></section></section>`;
}

function productCard(product) {
  const category = product.category === 'Kompos' ? 'Kompos' : 'Pakan Ternak';
  return `<article class="db-product fi-card"><img src="${escapeHtml(product.image || '')}" alt="${escapeHtml(product.title)}" loading="lazy"><div class="db-product-body"><span class="db-product-category ${category === 'Kompos' ? 'compost' : ''}">${category}</span><h3>${escapeHtml(product.title || 'Limbah organik')}</h3><div><span>${Number(product.stock || 0).toLocaleString('id-ID')} kg</span><strong>${formatRupiah(product.price)}</strong></div><div class="db-product-actions"><button type="button" data-edit="${escapeHtml(product.id)}">Edit</button><button type="button" data-delete="${escapeHtml(product.id)}">Hapus</button></div></div></article>`;
}

function lastMonths(products) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const label = date.toLocaleDateString('id-ID', { month: 'short' });
    const count = products.filter((product) => {
      const created = new Date(product.createdAt);
      return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth();
    }).length;
    return { label, count };
  });
}

function bindProductActions(products) {
  document.querySelectorAll('[data-delete]').forEach((button) =>
    button.addEventListener('click', async () => {
      const product = products.find((item) => item.id === button.dataset.delete);
      if (!product || !window.confirm(`Hapus penawaran “${product.title}”?`)) return;
      button.disabled = true;
      try {
        const result = await deleteWaste(product.id);
        if (!result.success) throw new Error(result.message || 'Produk belum dapat dihapus.');
        showToast('Penawaran berhasil dihapus.');
        renderDashboard();
      } catch (error) {
        showToast(error.message || 'Produk belum dapat dihapus.', 'error');
        button.disabled = false;
      }
    }),
  );
  document.querySelectorAll('[data-edit]').forEach((button) =>
    button.addEventListener('click', () => {
      const product = products.find((item) => item.id === button.dataset.edit);
      if (!product) return;
      showEditDialog(product);
    }),
  );
}

function showEditDialog(product) {
  const dialog = document.createElement('dialog');
  dialog.className = 'db-edit-dialog';
  dialog.innerHTML = `<form method="dialog" class="db-edit-card"><button class="db-close" aria-label="Tutup">×</button><p class="db-kicker">PERBARUI PENAWARAN</p><h2>Edit ${escapeHtml(product.title)}</h2><label>Nama produk<input class="fi-input" name="title" value="${escapeHtml(product.title)}" required minlength="3"></label><label>Jumlah stok (kg)<input class="fi-input" name="stock" type="number" min="1" value="${Number(product.stock)}" required></label><label>Harga per kg<input class="fi-input" name="price" type="number" min="0" value="${Number(product.price)}" required></label><label>Deskripsi<textarea class="fi-input" name="description" rows="4" required>${escapeHtml(product.description || '')}</textarea></label><div class="db-dialog-actions"><button class="fi-button fi-button-outline" value="cancel">Batal</button><button class="fi-button" type="submit" value="save">Simpan perubahan</button></div></form>`;
  document.body.append(dialog);
  dialog.showModal();
  dialog.addEventListener('close', async () => {
    if (dialog.returnValue !== 'save') {
      dialog.remove();
      return;
    }
    const form = dialog.querySelector('form');
    const data = new FormData(form);
    data.set('stock', String(Number(data.get('stock'))));
    data.set('price', String(Number(data.get('price'))));
    try {
      const result = await updateWaste(product.id, data);
      if (!result.success) throw new Error(result.message || 'Perubahan belum tersimpan.');
      showToast('Penawaran diperbarui.');
      renderDashboard();
    } catch (error) {
      showToast(error.message || 'Perubahan belum tersimpan.', 'error');
    } finally {
      dialog.remove();
    }
  });
}

function injectDashboardStyles() {
  if (document.getElementById('dashboard-new-style')) return;
  const style = document.createElement('style');
  style.id = 'dashboard-new-style';
  style.textContent = `.db-page{padding-top:2px}.db-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:26px;margin-bottom:31px}.db-kicker{margin:0 0 8px;color:#688778;font-size:9px;font-weight:700;letter-spacing:.15em}.db-heading h1{margin:0;color:#164637;font-size:38px;font-weight:550;letter-spacing:-1.3px}.db-heading>div:first-child>p:last-child{margin:8px 0 0;color:#6c7772;font-size:14px}.db-heading-actions{display:flex;gap:9px}.db-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.db-stat{min-height:160px;padding:20px 22px;border:1px solid #e9efeb;border-radius:20px;background:#fff;box-shadow:0 8px 28px #123a2a08}.db-stat-green{background:#e7f5eb;border-color:#d9eee0}.db-stat-icon{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:#c7ebd2;color:#21654b;font-size:20px}.db-stat-icon.accent{background:#dff0ed;color:#287c75}.db-stat-icon.mint{background:#cff0e9;color:#347e72}.db-stat>p{margin:13px 0 3px;color:#607068;font-size:12px}.db-stat>strong{display:block;color:#183f32;font-size:29px;font-weight:600;letter-spacing:-.5px}.db-stat>strong small{font-size:15px;font-weight:500}.db-stat>small{color:#839087;font-size:10px}.db-overview{display:grid;grid-template-columns:1.65fr 1fr;gap:16px;margin-top:18px}.db-chart{padding:22px 24px}.db-card-heading{display:flex;align-items:start;justify-content:space-between;gap:12px}.db-card-heading h2,.db-listing-head h2{margin:0;color:#243d32;font-size:16px;font-weight:600}.db-card-heading p{margin:6px 0 0;color:#859089;font-size:11px}.db-chart-badge{padding:7px 10px;border-radius:999px;background:#f2f5f2;color:#62736a;font-size:10px}.db-bars{height:165px;margin-top:15px;padding:0 10px 0;display:flex;align-items:end;justify-content:space-around;gap:19px;border-bottom:1px solid #e8eeea}.db-bar-item{height:100%;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:end;gap:6px}.db-bar-item>span{min-height:12px;color:#849088;font-size:9px}.db-bar-item i{width:min(30px,70%);height:var(--bar);min-height:3px;border-radius:7px 7px 2px 2px;background:linear-gradient(#79b993,#176457);transition:height .35s}.db-bar-item small{padding-bottom:8px;color:#7b8780;font-size:9px}.db-tip{position:relative;min-height:202px;padding:22px 24px;border-radius:20px;overflow:hidden;background:#dcefeb}.db-tip:after{content:'✳';position:absolute;right:18px;bottom:-48px;color:#bdded9;font-size:152px;line-height:1}.db-tip-icon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#fff9;color:#287c75}.db-tip .db-kicker{margin-top:12px;color:#3e7873}.db-tip h2{position:relative;z-index:1;max-width:250px;margin:0 0 8px;color:#153e3c;font-size:18px;line-height:1.25;font-weight:600}.db-tip>p:not(.db-kicker){position:relative;z-index:1;max-width:300px;margin:0;color:#56716f;font-size:11px;line-height:1.6}.db-tip>a{position:relative;z-index:1;display:inline-flex;gap:9px;margin-top:14px;color:#075653;font-size:11px;font-weight:600;text-decoration:none}.db-listing{margin-top:43px}.db-listing-head{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:17px}.db-listing-head h2{font-size:21px}.db-view-all{color:#286651;font-size:11px;font-weight:600;text-decoration:none}.db-view-all span{margin-left:6px}.db-product-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.db-product{overflow:hidden;border-radius:17px}.db-product>img{width:100%;height:150px;display:block;object-fit:cover;background:#f0f2ef}.db-product-body{padding:14px}.db-product-category{display:inline-block;padding:5px 9px;border-radius:999px;background:#fff0d3;color:#a36321;font-size:9px;font-weight:600}.db-product-category.compost{background:#d8f0dc;color:#397347}.db-product h3{overflow:hidden;margin:10px 0;color:#27342d;font-size:14px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.db-product-body>div:nth-of-type(2){display:flex;align-items:center;justify-content:space-between;gap:10px;color:#78847d;font-size:10px}.db-product-body>div:nth-of-type(2) strong{color:#155b49;font-size:12px}.db-product-actions{display:flex;gap:13px;margin-top:11px;padding-top:10px;border-top:1px solid #edf1ee}.db-product-actions button{padding:0;border:0;background:none;color:#326b57;font:500 10px Inter,Arial,sans-serif;cursor:pointer}.db-product-actions button:last-child{color:#aa534a}.db-empty{padding:43px 20px;display:flex;flex-direction:column;align-items:center;text-align:center}.db-empty>span{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:#eaf4ed;color:#1d6b50;font-size:24px}.db-empty h3{margin:16px 0 5px;color:#244638;font-size:17px}.db-empty p{margin:0 0 17px;color:#7c8881;font-size:12px}.db-loading{min-height:400px;display:grid;place-items:center;color:#68766e;font-size:14px}.db-error{padding:42px;text-align:center}.db-error h1{color:#214738}.db-error p{color:#718078}.db-edit-dialog{width:min(540px,calc(100% - 28px));padding:0;border:0;border-radius:23px;box-shadow:0 25px 90px #091b1460}.db-edit-dialog::backdrop{background:#102c2480;backdrop-filter:blur(3px)}.db-edit-card{position:relative;padding:30px;display:flex;flex-direction:column;gap:13px}.db-edit-card h2{margin:0 25px 4px 0;color:#173f32;font-size:22px;line-height:1.25}.db-edit-card label{color:#4e665b;font-size:11px;font-weight:600}.db-edit-card input,.db-edit-card textarea{box-sizing:border-box;margin-top:7px}.db-edit-card textarea{height:auto;padding-top:12px;resize:vertical}.db-close{position:absolute;top:18px;right:18px;width:34px;height:34px;border:0;border-radius:50%;background:#f2f4f1;color:#4d5a53;font-size:21px;cursor:pointer}.db-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}@media(max-width:800px){.db-heading{align-items:flex-start;flex-direction:column}.db-overview{grid-template-columns:1fr}.db-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.db-heading h1{font-size:30px}.db-heading-actions{width:100%;flex-wrap:wrap}.db-heading-actions .fi-button{flex:1;padding:0 10px;font-size:11px}.db-stats{grid-template-columns:1fr;gap:10px}.db-stat{min-height:0;padding:15px 17px}.db-stat>p{margin-top:8px}.db-product-grid{grid-template-columns:1fr}.db-product>img{height:190px}.db-chart{padding:17px}.db-listing-head h2{font-size:18px}.db-edit-card{padding:24px 18px}.db-dialog-actions{flex-direction:column-reverse}.db-dialog-actions .fi-button{width:100%}}`;
  document.head.append(style);
}
