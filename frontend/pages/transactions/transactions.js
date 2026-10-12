import { createReview, getMyOrders } from '../../services/order.js';
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
      <div class="tx-order-content"><img class="tx-item-image" src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"><div class="tx-item-info"><h2>${escapeHtml(title)}</h2><p>${quantity.toLocaleString('id-ID')} kg <span>×</span> ${formatRupiah(unitPrice)}</p><span class="tx-impact">\u267b Membantu mengurangi ${Math.round(quantity * 0.3)} kg emisi CO\u2082</span></div><div class="tx-total"><span>Total Belanja</span><strong>${formatRupiah(total)}</strong></div></div>
      <footer class="tx-order-actions">${order.status === 'pending' && order.paymentToken ? `<a class="tx-button tx-button-primary" target="_blank" rel="noopener" href="https://app.sandbox.midtrans.com/snap/v2/vtweb/${encodeURIComponent(order.paymentToken)}">Lanjutkan Pembayaran</a>` : ''}${shipped ? `<button class="tx-button tx-button-outline" type="button" data-track="${id}">Lihat Pengiriman</button>` : ''}<button class="tx-button tx-button-outline" type="button" data-detail="${id}">Lihat Detail</button>${completed ? `<button class="tx-button tx-button-primary" type="button" data-review="${id}">Beri Ulasan</button>` : ''}</footer>
    </article>`;
    })
    .join('');

  list
    .querySelectorAll('[data-detail]')
    .forEach((button) => button.addEventListener('click', () => showDetail(button.dataset.detail)));
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
  const dialog = document.createElement('dialog');
  dialog.className = 'tx-detail-dialog';
  dialog.innerHTML = `<section class="tx-detail-card"><button type="button" class="tx-dialog-close" aria-label="Tutup">?</button><p class="tx-dialog-kicker">RINGKASAN PESANAN</p><h2>${escapeHtml(waste.title || 'Produk pangan')}</h2><span class="tx-status tx-status-${STATUS[order.status]?.tone || 'unknown'}">${escapeHtml(status)}</span><img src="${escapeHtml(waste.image || FALLBACK_IMAGE)}" alt="${escapeHtml(waste.title || 'Produk pangan')}"><dl><div><dt>Penjual</dt><dd>${escapeHtml(seller)}</dd></div><div><dt>Tanggal pesanan</dt><dd>${escapeHtml(formatDate(order.createdAt))}</dd></div><div><dt>Jumlah</dt><dd>${Number(order.quantity || 0).toLocaleString('id-ID')} kg</dd></div><div><dt>Total pembayaran</dt><dd>${formatRupiah(order.total)}</dd></div><div><dt>Status pembayaran</dt><dd>${escapeHtml(order.paymentStatus || 'Menunggu pembayaran')}</dd></div></dl>${order.status === 'pending' && order.paymentToken ? `<a class="tx-button tx-button-primary" target="_blank" rel="noopener" href="https://app.sandbox.midtrans.com/snap/v2/vtweb/${encodeURIComponent(order.paymentToken)}">Lanjutkan Pembayaran</a>` : ''}</section>`;
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
  style.textContent = `.tx-detail-dialog{width:min(470px,calc(100% - 24px));max-height:calc(100% - 28px);padding:0;border:0;border-radius:22px;box-shadow:0 25px 85px #091b1460}.tx-detail-dialog::backdrop{background:#102c2480;backdrop-filter:blur(3px)}.tx-detail-card{position:relative;padding:27px}.tx-dialog-kicker{margin:0 0 7px;color:#789083;font-size:9px;font-weight:700;letter-spacing:.13em}.tx-detail-card h2{margin:0 35px 11px 0;color:#164b3c;font-size:22px;line-height:1.25}.tx-detail-card>img{width:100%;height:180px;margin-top:15px;border-radius:14px;object-fit:cover;background:#f1f3f0}.tx-detail-card dl{margin:13px 0 16px}.tx-detail-card dl>div{padding:9px 0;border-bottom:1px solid #edf1ee;display:flex;justify-content:space-between;gap:10px}.tx-detail-card dt{color:#859088;font-size:10px}.tx-detail-card dd{margin:0;color:#35483d;font-size:10px;font-weight:600;text-align:right}.tx-detail-card>.tx-button{width:100%;text-decoration:none}.tx-dialog-close{position:absolute;right:16px;top:16px;width:32px;height:32px;border:0;border-radius:50%;background:#f1f4f1;color:#4c5b52;font-size:20px;cursor:pointer}.tx-review-form{display:flex;flex-direction:column;gap:13px}.tx-review-form h2{margin-bottom:0}.tx-review-product{margin:-6px 0 4px;color:#728077;font-size:12px}.tx-review-form label{display:flex;flex-direction:column;gap:7px;color:#3f584b;font-size:11px;font-weight:600}.tx-review-form select,.tx-review-form textarea{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #e1e9e3;border-radius:11px;background:#fff;color:#34473d;font:400 12px Inter,Arial,sans-serif;outline:none}.tx-review-form textarea{resize:vertical}.tx-review-form>.tx-button{margin-top:3px}`;
  document.head.append(style);
}

function injectTransactionsStyle() {
  if (document.getElementById('transactions-style')) return;
  const style = document.createElement('style');
  style.id = 'transactions-style';
  style.textContent = `
    .tx-app{--tx-ink:#173d3c;--tx-deep:#004847;--tx-green:#087b78;--tx-soft:#e5efee;--tx-muted:#56716f;--tx-line:#bfd4d2;min-height:100vh;background:#dce8e6;color:#1c2522;font-family:Inter,Arial,sans-serif;font-size:14px}
    
    
    
    
    .tx-main{max-width:1266px;margin:0 auto;padding:50px 0 0}.tx-intro{display:flex;align-items:flex-end;justify-content:space-between}.tx-eyebrow{margin:0 0 7px;color:#70807b;font-size:11px;font-weight:700;letter-spacing:.12em}.tx-intro h1{margin:0;color:var(--tx-deep);font-size:38px;line-height:1.2;font-weight:600;letter-spacing:-1.5px}.tx-description{max-width:665px;margin:9px 0 0;color:#59635f;font-size:18px;line-height:1.55}.tx-filters{display:flex;align-items:center;gap:9px;margin:48px 0 29px;overflow-x:auto;padding:0 0 2px;scrollbar-width:thin}.tx-filter{flex:none;min-height:37px;padding:0 24px;border:0;border-radius:999px;background:#f0f1ef;color:#46514e;font:500 14px Inter,Arial,sans-serif;transition:background .16s,color .16s}.tx-filter:hover{background:#e5ebe7}.tx-filter.active{background:#005448;color:#fff}.tx-results-note{height:0;overflow:hidden;font-size:12px;color:#84908c}
    .tx-order-list{display:grid;gap:24px}.tx-order-card{min-height:299px;padding:25px 24px 23px;border:1px solid #e4eae7;border-radius:32px;background:#fff;box-shadow:0 12px 36px #153d2d06;display:flex;flex-direction:column}.tx-order-heading{min-height:54px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:18px;border-bottom:1px solid #e8ece9}.tx-order-merchant{display:flex;align-items:center;gap:13px;min-width:0}.tx-merchant-icon{width:19px;flex:none;color:#416950;font-size:21px;text-align:center}.tx-order-merchant>div{display:grid;gap:4px}.tx-order-merchant strong{font-size:14px;font-weight:600;color:#202a26}.tx-order-merchant span{font-size:12px;color:#66706d}.tx-order-merchant i{padding:0 3px;color:#a2aaa6;font-style:normal}.tx-status{flex:none;margin-top:6px;padding:5px 16px;border-radius:999px;font-size:11px;font-weight:600}.tx-status-completed{background:#c9eed8;color:#326c4a}.tx-status-shipped{background:#e1f0ee;color:#206d67}.tx-status-processing{background:#deebfa;color:#315d89}.tx-status-pending{background:#fff0cf;color:#916b20}.tx-status-cancelled{background:#f9e1dd;color:#9b483d}.tx-status-unknown{background:#ecefed;color:#626c68}
    .tx-order-content{flex:1;display:flex;align-items:center;gap:24px;min-height:134px;padding:22px 0}.tx-item-image{width:96px;height:96px;flex:none;object-fit:cover;border-radius:0;background:#f3f5f4}.tx-item-info{flex:1;min-width:0}.tx-item-info h2{margin:0 0 7px;color:#212926;font-size:24px;line-height:1.25;font-weight:500;letter-spacing:-.45px}.tx-item-info p{margin:0 0 8px;color:#5e6864;font-size:16px}.tx-item-info p span{padding:0 3px;color:#87918c}.tx-impact{color:#17604f;font-size:12px;font-weight:600}.tx-total{width:160px;min-height:96px;padding:1px 0 0 24px;border-left:1px solid #e8ecea;display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start;gap:5px}.tx-total span{color:#4b5652;font-size:12px;font-weight:600}.tx-total strong{color:#005448;font-size:24px;line-height:1.2;font-weight:500;white-space:nowrap}.tx-order-actions{display:flex;justify-content:flex-end;align-items:center;gap:11px;padding-top:6px}.tx-button{min-height:42px;padding:0 23px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;gap:9px;font:500 14px Inter,Arial,sans-serif;cursor:pointer;transition:background .15s,color .15s,border-color .15s}.tx-button-primary{border:1px solid #005448;background:#005448;color:#fff}.tx-button-primary:hover{background:#176457;border-color:#176457}.tx-button-outline{border:1px solid #176457;background:#fff;color:#005448}.tx-button-outline:hover{background:#f1f7f4}.tx-button span{font-size:16px}
    .tx-more-wrap{display:flex;justify-content:center;padding:48px 0 70px}.tx-more-wrap[hidden]{display:none}.tx-more-wrap[hidden]{display:none}.tx-more-button{min-width:246px;height:44px;padding:0 22px;border:0;border-radius:999px;background:#f0f1ef;color:#27312d;font:500 14px Inter,Arial,sans-serif;cursor:pointer}.tx-more-button:hover{background:#e6e9e6}.tx-more-button span{padding-left:8px}.tx-state{min-height:280px;padding:58px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.tx-state-icon{width:52px;height:52px;margin-bottom:17px;border-radius:18px;display:grid;place-items:center;background:#edf5f1;color:#005448;font-size:23px}.tx-state h2{margin:0 0 8px;color:#153b34;font-size:20px;font-weight:600}.tx-state p{max-width:430px;margin:0 0 20px;color:#697571;font-size:14px;line-height:1.6}.tx-state .tx-button{text-decoration:none}.tx-loading{height:240px;display:flex;align-items:center;justify-content:center;gap:10px;color:#697571}.tx-loading span{width:17px;height:17px;border:2px solid #d5e3dd;border-top-color:#005448;border-radius:50%;animation:tx-spin .8s linear infinite}@keyframes tx-spin{to{transform:rotate(360deg)}}
    
    @media(max-width:1380px){.tx-main{margin:0 5.5%}}
    @media(max-width:920px){.tx-main{margin:0 28px}}
    @media(max-width:640px){.tx-main{margin:0 17px;padding-top:33px}.tx-intro h1{font-size:30px;letter-spacing:-1px}.tx-description{font-size:15px}.tx-filters{margin:29px 0 17px;gap:7px}.tx-filter{min-height:35px;padding:0 16px;font-size:12px}.tx-order-list{gap:15px}.tx-order-card{min-height:0;padding:17px 15px 15px;border-radius:22px}.tx-order-heading{min-height:49px;padding-bottom:13px}.tx-order-merchant{gap:8px}.tx-order-merchant strong{font-size:13px}.tx-order-merchant span{font-size:10px}.tx-status{padding:5px 9px;font-size:10px}.tx-order-content{position:relative;align-items:flex-start;gap:13px;min-height:0;padding:17px 0 14px}.tx-item-image{width:70px;height:70px;border-radius:8px}.tx-item-info h2{font-size:17px}.tx-item-info p{font-size:13px;margin-bottom:6px}.tx-impact{font-size:10px;line-height:1.4;display:block}.tx-total{width:auto;min-height:auto;flex-basis:100%;padding:10px 0 0;border-left:0;border-top:1px solid #eef0ee;flex-direction:row;align-items:center;justify-content:space-between}.tx-total strong{font-size:18px}.tx-order-content{flex-wrap:wrap}.tx-order-actions{gap:7px;padding-top:7px}.tx-button{min-height:38px;padding:0 13px;font-size:12px}.tx-more-wrap{padding:30px 0 45px}}
  `;
  document.head.appendChild(style);
}
