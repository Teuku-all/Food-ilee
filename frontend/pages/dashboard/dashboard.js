import { getWastes, deleteWaste, updateWaste } from '../../services/waste.js';
import { getCurrentUser } from '../../services/user.js';
import { getMyOrders } from '../../services/order.js';
import { removeToken } from '../../utils/storage.js';
import { escapeHtml } from '../../utils/html.js';
import { formatRupiah, renderShell, showToast } from '../../ui/shell.js';
import { icon } from '../../ui/icons.js';
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
  const welcome = user.name || user.username || user.email?.split('@')[0] || 'Pengguna';
  renderShell(
    '',
    `<section class="db-page"><div class="db-heading"><div><p class="db-kicker">RUANG KERJA FOOD ILEE</p><h1>Selamat datang, ${escapeHtml(welcome)}</h1><p>Kelola penawaran dan pantau perjalanan sirkularitas Anda.</p></div><div class="db-heading-actions"><a class="fi-button fi-button-outline" href="#marketplace">Jelajahi Marketplace</a><a class="fi-button" href="#tambah-limbah">+ Tambah Limbah</a></div></div><div class="db-stats"><article class="db-stat db-stat-green"><span class="db-stat-icon">↻</span><p>Total produk</p><strong>${products.length}</strong></article><article class="db-stat"><span class="db-stat-icon accent">${icon('compost')}</span><p>Stok tersedia</p><strong>${stock.toLocaleString('id-ID')} <small>kg</small></strong></article><article class="db-stat"><span class="db-stat-icon mint">${icon('orders')}</span><p>Pesanan berjalan</p><strong>${openOrders}</strong></article></div>${openOrders ? `<a class="db-priority" href="#transaksi"><span class="db-priority-icon">${icon('orders')}</span><span><strong>${openOrders} pesanan sedang berjalan</strong><small>Buka transaksi untuk memantau status pesanan.</small></span><span class="db-priority-arrow">${icon('arrow')}</span></a>` : ""}<section class="db-listing"><div class="db-listing-head"><div><p class="db-kicker">ETALASE SAYA</p><h2>Produk yang Anda tawarkan</h2></div><a class="db-view-all" href="#marketplace">Lihat marketplace <span>↗</span></a></div>${products.length ? `<div class="db-product-grid">${products.slice(0, 6).map(productCard).join('')}</div>` : `<div class="db-empty fi-card"><span>＋</span><h3>Etalase Anda siap dimulai</h3><p>Tambahkan limbah organik pertama dan hubungkan dengan calon pemanfaat.</p><a class="fi-button" href="#tambah-limbah">Tambah penawaran</a></div>`}</section></section>`,
  );
  injectDashboardStyles();
  const overviewIcon = document.querySelector('.db-stat-green .db-stat-icon');
  if (overviewIcon) overviewIcon.innerHTML = icon('recycle');
  bindProductActions(products);
}

function dashboardLoadingSkeleton() {
  return `<section class="db-page" aria-busy="true"><div class="db-heading"><div>${skeleton('145px', '10px')}<div style="height:12px"></div>${skeleton('min(370px, 90vw)', '35px')}<div style="height:9px"></div>${skeleton('min(460px, 90vw)', '14px')}</div><div class="db-heading-actions">${skeleton('145px', '42px', 'pill')}</div></div><div class="db-stats">${Array.from({ length: 3 }, () => `<article class="db-stat">${skeleton('95px', '11px')}<div style="height:15px"></div>${skeleton('65px', '33px')}</article>`).join('')}</div><section class="db-listing"><div class="db-listing-head">${skeleton('190px', '22px')}</div><div class="db-product-grid">${Array.from({ length: 3 }, () => `<article class="db-product fi-card">${skeleton('100%', '145px')}<div class="db-product-body">${skeleton('80px', '18px', 'pill')}<div style="height:12px"></div>${skeleton('70%', '17px')}</div></article>`).join('')}</div></section></section>`;
}

function productCard(product) {
  const category = product.category === 'Kompos' ? 'Kompos' : 'Pakan Ternak';
  const image = product.image || (category === 'Kompos'
    ? './assets/landing-compost-demo.jpg'
    : './assets/landing-food-demo.jpg');
  return `<article class="db-product fi-card"><img src="${escapeHtml(image)}" alt="${escapeHtml(product.title || 'Limbah organik')}" loading="lazy"><div class="db-product-body"><span class="db-product-category ${category === 'Kompos' ? 'compost' : ''}">${category}</span><h3>${escapeHtml(product.title || 'Limbah organik')}</h3><div class="db-product-meta"><span>${Number(product.stock || 0).toLocaleString('id-ID')} kg tersedia</span><strong>${formatRupiah(product.price)}</strong></div><div class="db-product-actions"><button type="button" data-edit="${escapeHtml(product.id)}">Edit</button><button type="button" data-delete="${escapeHtml(product.id)}">Hapus</button></div></div></article>`;
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
  style.textContent = `.db-page{padding-top:2px}.db-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:26px;margin-bottom:31px}.db-kicker{margin:0 0 8px;color:#688778;font-size:9px;font-weight:700;letter-spacing:.15em}.db-heading h1{margin:0;color:#164637;font-size:38px;font-weight:550;letter-spacing:-1.3px}.db-heading>div:first-child>p:last-child{margin:8px 0 0;color:#6c7772;font-size:14px}.db-heading-actions{display:flex;gap:9px}.db-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.db-stat{min-height:160px;padding:20px 22px;border:1px solid #e9efeb;border-radius:20px;background:#fff;box-shadow:0 8px 28px #123a2a08}.db-stat-green{background:#e7f5eb;border-color:#d9eee0}.db-stat-icon{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:#c7ebd2;color:#21654b;font-size:20px}.db-stat-icon.accent{background:#dff0ed;color:#287c75}.db-stat-icon.mint{background:#cff0e9;color:#347e72}.db-stat>p{margin:13px 0 3px;color:#607068;font-size:12px}.db-stat>strong{display:block;color:#183f32;font-size:29px;font-weight:600;letter-spacing:-.5px}.db-stat>strong small{font-size:15px;font-weight:500}.db-stat>small{color:#839087;font-size:10px}.db-overview{display:grid;grid-template-columns:1.65fr 1fr;gap:16px;margin-top:18px}.db-chart{padding:22px 24px}.db-card-heading{display:flex;align-items:start;justify-content:space-between;gap:12px}.db-card-heading h2,.db-listing-head h2{margin:0;color:#243d32;font-size:16px;font-weight:600}.db-card-heading p{margin:6px 0 0;color:#859089;font-size:11px}.db-chart-badge{padding:7px 10px;border-radius:999px;background:#f2f5f2;color:#62736a;font-size:10px}.db-bars{height:165px;margin-top:15px;padding:0 10px 0;display:flex;align-items:end;justify-content:space-around;gap:19px;border-bottom:1px solid #e8eeea}.db-bar-item{height:100%;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:end;gap:6px}.db-bar-item>span{min-height:12px;color:#849088;font-size:9px}.db-bar-item i{width:min(30px,70%);height:var(--bar);min-height:3px;border-radius:7px 7px 2px 2px;background:linear-gradient(#79b993,#235347);transition:height .35s}.db-bar-item small{padding-bottom:8px;color:#7b8780;font-size:9px}.db-tip{position:relative;min-height:202px;padding:22px 24px;border-radius:20px;overflow:hidden;background:#dcefeb}.db-tip:after{content:'✳';position:absolute;right:18px;bottom:-48px;color:#bdded9;font-size:152px;line-height:1}.db-tip-icon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#fff9;color:#287c75}.db-tip .db-kicker{margin-top:12px;color:#3e7873}.db-tip h2{position:relative;z-index:1;max-width:250px;margin:0 0 8px;color:#153e3c;font-size:18px;line-height:1.25;font-weight:600}.db-tip>p:not(.db-kicker){position:relative;z-index:1;max-width:300px;margin:0;color:#56716f;font-size:11px;line-height:1.6}.db-tip>a{position:relative;z-index:1;display:inline-flex;gap:9px;margin-top:14px;color:#163832;font-size:11px;font-weight:600;text-decoration:none}.db-listing{margin-top:43px}.db-listing-head{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:17px}.db-listing-head h2{font-size:21px}.db-view-all{color:#286651;font-size:11px;font-weight:600;text-decoration:none}.db-view-all span{margin-left:6px}.db-product-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.db-product{overflow:hidden;border-radius:17px}.db-product>img{width:100%;height:150px;display:block;object-fit:cover;background:#f0f2ef}.db-product-body{padding:14px}.db-product-category{display:inline-block;padding:5px 9px;border-radius:999px;background:#fff0d3;color:#a36321;font-size:9px;font-weight:600}.db-product-category.compost{background:#d8f0dc;color:#397347}.db-product h3{overflow:hidden;margin:10px 0;color:#27342d;font-size:14px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.db-product-body>div:nth-of-type(2){display:flex;align-items:center;justify-content:space-between;gap:10px;color:#78847d;font-size:10px}.db-product-body>div:nth-of-type(2) strong{color:#155b49;font-size:12px}.db-product-actions{display:flex;gap:13px;margin-top:11px;padding-top:10px;border-top:1px solid #edf1ee}.db-product-actions button{padding:0;border:0;background:none;color:#326b57;font:500 10px Inter,Arial,sans-serif;cursor:pointer}.db-product-actions button:last-child{color:#aa534a}.db-empty{padding:43px 20px;display:flex;flex-direction:column;align-items:center;text-align:center}.db-empty>span{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:#eaf4ed;color:#1d6b50;font-size:24px}.db-empty h3{margin:16px 0 5px;color:#244638;font-size:17px}.db-empty p{margin:0 0 17px;color:#7c8881;font-size:12px}.db-loading{min-height:400px;display:grid;place-items:center;color:#68766e;font-size:14px}.db-error{padding:42px;text-align:center}.db-error h1{color:#214738}.db-error p{color:#718078}.db-edit-dialog{width:min(540px,calc(100% - 28px));padding:0;border:0;border-radius:23px;box-shadow:0 25px 90px #091b1460}.db-edit-dialog::backdrop{background:#102c2480;backdrop-filter:blur(3px)}.db-edit-card{position:relative;padding:30px;display:flex;flex-direction:column;gap:13px}.db-edit-card h2{margin:0 25px 4px 0;color:#173f32;font-size:22px;line-height:1.25}.db-edit-card label{color:#4e665b;font-size:11px;font-weight:600}.db-edit-card input,.db-edit-card textarea{box-sizing:border-box;margin-top:7px}.db-edit-card textarea{height:auto;padding-top:12px;resize:vertical}.db-close{position:absolute;top:18px;right:18px;width:34px;height:34px;border:0;border-radius:50%;background:#f2f4f1;color:#4d5a53;font-size:21px;cursor:pointer}.db-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}@media(max-width:800px){.db-heading{align-items:flex-start;flex-direction:column}.db-overview{grid-template-columns:1fr}.db-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.db-heading h1{font-size:30px}.db-heading-actions{width:100%;flex-wrap:wrap}.db-heading-actions .fi-button{flex:1;padding:0 10px;font-size:11px}.db-stats{grid-template-columns:1fr;gap:10px}.db-stat{min-height:0;padding:15px 17px}.db-stat>p{margin-top:8px}.db-product-grid{grid-template-columns:1fr}.db-product>img{height:190px}.db-chart{padding:17px}.db-listing-head h2{font-size:18px}.db-edit-card{padding:24px 18px}.db-dialog-actions{flex-direction:column-reverse}.db-dialog-actions .fi-button{width:100%}}`;
  style.textContent += `.db-page:not([aria-busy="true"])>.db-heading{position:relative;min-height:230px;padding:30px 34px;box-sizing:border-box;border:1px solid #2c6648;border-radius:24px;overflow:hidden;background:linear-gradient(90deg,rgba(7,26,18,.94) 0%,rgba(18,53,36,.82) 54%,rgba(29,86,55,.42) 100%),url('./assets/landing-food-demo.jpg') center 48%/cover;color:#fff;box-shadow:0 20px 50px #051F201f}.db-page:not([aria-busy="true"])>.db-heading h1{color:#fff;font-size:clamp(30px,3.4vw,42px)}.db-page:not([aria-busy="true"])>.db-heading .db-kicker{color:#8EB69B}.db-page:not([aria-busy="true"])>.db-heading>div:first-child>p:last-child{color:#e1eee4}.db-heading-actions .fi-button-outline{border-color:#e2f2e766;background:#ffffff12;color:#f4fff5}.db-heading-actions .fi-button-outline:hover{background:#ffffff20}.db-heading-actions .fi-button:not(.fi-button-outline){border:1px solid #8EB69B;background:#8EB69B;color:#0B2B26}.db-heading-actions .fi-button:not(.fi-button-outline):hover{background:#c5f0d0}.db-stats{gap:14px;margin-top:18px}.db-stat{position:relative;min-height:150px;border-color:#dce9df;border-radius:20px;box-shadow:0 10px 28px #123a2a09;transition:transform .2s ease,box-shadow .2s ease}.db-stat:hover{transform:translateY(-3px);box-shadow:0 16px 34px #123a2a12}.db-stat-green{background:linear-gradient(145deg,#f2faf3,#e5f4e8)}.db-stat-icon.accent{background:#e5f0e7;color:#163832}.db-stat-icon.mint{background:#DAF1DE;color:#235347}.db-overview{gap:18px;margin-top:20px}.db-chart{border-radius:20px}.db-chart-badge{background:#eaf4ec;color:#163832}.db-bar-item i{background:linear-gradient(180deg,#8EB69B,#163832)}.db-tip{border:1px solid #d6e8d9;background:linear-gradient(145deg,#DAF1DE,#dcefe0)}.db-tip-icon{color:#163832}.db-tip .db-kicker{color:#235347}.db-tip h2{color:#0B2B26}.db-tip>a{color:#163832}.db-listing{margin-top:38px}.db-listing-head h2{color:#0B2B26}.db-product-grid{gap:16px}.db-product{border-radius:20px;transition:transform .22s ease,box-shadow .22s ease}.db-product:hover{transform:translateY(-4px);box-shadow:0 18px 36px #123a2a14}.db-product>img{height:176px;object-fit:cover}.db-product-body{padding:16px}.db-product-category.compost{background:#e2f1e5;color:#163832}.db-product-body>div:nth-of-type(2) strong{color:#163832}.db-product-actions button{color:#163832}.db-empty{border:1px dashed #bed7c3;border-radius:22px;background:#f7fbf7}.db-error{border-color:#d5e4d9;border-radius:22px;background:#f7fbf7}@media(max-width:800px){.db-page:not([aria-busy="true"])>.db-heading{min-height:215px;padding:26px}.db-heading-actions{flex-wrap:wrap}}@media(max-width:560px){.db-page:not([aria-busy="true"])>.db-heading{min-height:260px;padding:22px 20px;border-radius:20px}.db-heading-actions{display:grid;grid-template-columns:1fr;width:100%}.db-heading-actions .fi-button{width:100%}.db-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.db-stat{min-height:125px;padding:13px 10px;border-radius:16px}.db-stat-icon{width:31px;height:31px}.db-stat>p{font-size:10px}.db-stat>strong{font-size:22px}.db-stat>strong small{font-size:11px}.db-stat>small{font-size:9px;line-height:1.4}.db-overview{margin-top:13px}.db-product>img{height:200px}}`;
  style.textContent += `.db-listing{padding:24px;border:1px solid #dce9df;border-radius:24px;background:linear-gradient(145deg,#fbfdfb,#f6faf6);box-shadow:0 12px 32px #123a2a08}.db-listing-head{align-items:center;margin:0 0 19px;padding:0 0 17px;border-bottom:1px solid #e2ece4}.db-listing-head .db-kicker{margin-bottom:6px;color:#568065}.db-listing-head h2{font-size:20px;letter-spacing:-.35px}.db-view-all{display:inline-flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid #d8e7db;border-radius:11px;background:#fff;color:#163832;transition:background .18s ease,border-color .18s ease,transform .18s ease}.db-view-all:hover{transform:translateY(-1px);border-color:#b9d3be;background:#f2f8f3}.db-view-all span{margin:0}.db-product-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.db-product{border:1px solid #e0e9e1;border-radius:17px;background:#fff;box-shadow:0 4px 14px #0B2B2606}.db-product>img{height:168px;background:#eef4ef}.db-product-body{padding:15px}.db-product-category{padding:5px 9px;background:#eff5ef;color:#49684f;font-size:9px;letter-spacing:.02em}.db-product h3{margin:11px 0 12px;color:#0B2B26;font-size:14px;line-height:1.4}.db-product-meta{min-height:38px;padding:9px 0;border-top:1px solid #edf2ed;display:flex;align-items:center;justify-content:space-between;gap:8px;color:#718074;font-size:10px}.db-product-meta>span{min-width:0}.db-product-meta>strong{flex:none;color:#163832;font-size:12px;font-weight:700}.db-product-actions{display:flex;align-items:center;gap:8px;margin-top:8px;padding-top:11px;border-top:1px solid #edf2ed}.db-product-actions button{min-height:33px;padding:0 11px;border:1px solid #dce9df;border-radius:10px;background:#f8fbf8;color:#163832;font:600 10px Inter,Arial,sans-serif;transition:background .18s ease,border-color .18s ease}.db-product-actions button:hover{border-color:#bfd7c3;background:#edf6ef}.db-product-actions button:last-child{margin-left:auto;border-color:#f0dedd;background:#fff8f7;color:#a34b43}.db-product-actions button:last-child:hover{border-color:#e8c6c2;background:#fff0ee}.db-empty{min-height:230px;justify-content:center;border-color:#c8ddcc;background:#fff}.db-empty p{max-width:410px;line-height:1.6}@media(max-width:800px){.db-listing{padding:20px}.db-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.db-listing{margin-top:28px;padding:16px 13px;border-radius:19px}.db-listing-head{align-items:flex-start;flex-direction:column;gap:11px;margin-bottom:14px;padding-bottom:14px}.db-listing-head h2{font-size:18px}.db-view-all{min-height:34px;padding:7px 10px}.db-product-grid{grid-template-columns:minmax(0,1fr);gap:11px}.db-product{display:grid;grid-template-columns:minmax(95px,34%) minmax(0,1fr);align-items:stretch;border-radius:15px}.db-product>img{width:100%;height:100%;min-height:164px;object-fit:cover}.db-product-body{min-width:0;padding:12px 11px}.db-product h3{font-size:12px;margin:9px 0}.db-product-meta{align-items:flex-start;flex-direction:column;gap:3px;padding:8px 0}.db-product-meta>strong{font-size:11px}.db-product-actions{gap:6px;margin-top:4px;padding-top:8px}.db-product-actions button{min-height:30px;padding:0 8px;font-size:9px}.db-empty{min-height:205px;padding:25px 15px}}`;
  style.textContent += ".db-page:not([aria-busy=\"true\"])>.db-heading{min-height:184px;margin-bottom:20px;padding:26px 30px;border-radius:22px}.db-page:not([aria-busy=\"true\"])>.db-heading>div:first-child{max-width:620px}.db-heading h1{line-height:1.12}.db-heading-actions{flex:none}.db-stats{margin-top:0;gap:12px}.db-stat{min-height:132px;padding:17px 19px}.db-stat>p{margin:10px 0 3px}.db-priority{display:flex;align-items:center;gap:13px;margin-top:16px;padding:15px 18px;border:1px solid #d7e8db;border-radius:17px;background:#fff;color:#163832;text-decoration:none;box-shadow:0 7px 22px #123a2a08;transition:transform .18s ease,border-color .18s ease}.db-priority:hover{transform:translateY(-2px);border-color:#a8c9ae}.db-priority-icon{width:38px;height:38px;flex:none;border-radius:13px;display:grid;place-items:center;background:#e4f1e6;color:#235347}.db-priority-icon .fi-icon{width:19px;height:19px}.db-priority>span:nth-child(2){min-width:0;display:grid;gap:4px}.db-priority strong{font-size:12px}.db-priority small{color:#68786e;font-size:10px;line-height:1.4}.db-priority-arrow{margin-left:auto;color:#568065}.db-priority-arrow .fi-icon{width:18px;height:18px}.db-listing{margin-top:24px}.db-listing-head{margin-bottom:15px}.db-product-grid{gap:12px}.db-product>img{height:158px}@media(max-width:800px){.db-page:not([aria-busy=\"true\"])>.db-heading{min-height:170px;padding:23px}.db-heading-actions{flex-wrap:nowrap}}@media(max-width:560px){.db-page:not([aria-busy=\"true\"])>.db-heading{min-height:0;gap:20px;margin-bottom:14px;padding:20px 17px;border-radius:19px}.db-page:not([aria-busy=\"true\"])>.db-heading h1{font-size:28px}.db-page:not([aria-busy=\"true\"])>.db-heading>div:first-child>p:last-child{font-size:12px;line-height:1.5}.db-heading-actions{display:grid;grid-template-columns:1fr;width:100%}.db-heading-actions .fi-button{width:100%;min-height:40px}.db-stats{grid-template-columns:1fr;gap:7px}.db-stat{min-height:58px;padding:10px 12px;border-radius:14px;display:grid;grid-template-columns:34px minmax(0,1fr) auto;grid-template-rows:auto auto;align-items:center;column-gap:10px}.db-stat-icon{grid-column:1;grid-row:1/3;width:30px;height:30px;border-radius:10px}.db-stat>p{grid-column:2;grid-row:1/3;min-height:0;margin:0;font-size:10px;line-height:1.3}.db-stat>strong{grid-column:3;grid-row:1/3;font-size:20px;white-space:nowrap}.db-stat>strong small{font-size:10px}.db-stat>small{display:none}.db-priority{gap:10px;margin-top:12px;padding:12px}.db-priority-icon{width:34px;height:34px}.db-priority strong{font-size:11px}.db-priority small{font-size:9px}.db-listing{margin-top:20px}}@media(prefers-reduced-motion:reduce){.db-priority{transition:none}}";
  style.textContent += '.db-product-grid{max-width:1120px;margin-right:auto;margin-left:auto;gap:12px}.db-product{width:100%;max-width:360px;justify-self:center}.db-product>img{height:148px}.db-product-body{padding:14px}@media(max-width:800px){.db-product-grid{max-width:none}.db-product{max-width:none}}@media(max-width:560px){.db-product>img{height:150px;min-height:150px}}';
  document.head.append(style);
}
