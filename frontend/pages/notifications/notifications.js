import { escapeHtml } from '../../utils/html.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { renderShell, showToast } from '../../ui/shell.js';
import { getNotifications, markNotificationRead } from '../../services/notification.js';
import { skeleton } from '../../ui/skeleton.js';

export async function renderNotifications() {
  const revision = getNavigationRevision();
  renderShell(
    '',
    notificationsLoadingSkeleton(),
  );
  injectStyles();
  try {
    const result = await getNotifications();
    if (!isRouteCurrent('#notifikasi', revision)) return;
    const items = Array.isArray(result) ? result : [];
    const unread = items.filter((item) => !item.isRead).length;
    const content = items.length
      ? items.map(notificationCard).join('')
      : '<div class="nt-state fi-card"><span class="nt-empty-icon">✓</span><h2>Anda sudah mendapatkan kabar terbaru</h2><p>Notifikasi baru akan muncul di halaman ini.</p></div>';
    renderShell(
      '',
      '<section class="nt-page"><header class="nt-heading"><div><p class="nt-kicker">PEMBARUAN AKUN</p><h1>Notifikasi</h1><p>Informasi pesanan dan aktivitas penting akun Anda.</p></div><span class="nt-count">' +
        unread +
        ' belum dibaca</span></header><div class="nt-list">' +
        content +
        '</div></section>',
    );
    injectStyles();
    document.querySelectorAll('[data-read-notification]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await markNotificationRead(button.dataset.readNotification);
          if (!isRouteCurrent('#notifikasi', revision)) return;
          showToast('Notifikasi ditandai sudah dibaca.');
          renderNotifications();
        } catch (error) {
          button.disabled = false;
          showToast(error.message || 'Notifikasi belum dapat diperbarui.', 'error');
        }
      });
    });
  } catch (error) {
    if (!isRouteCurrent('#notifikasi', revision)) return;
    renderShell(
      '',
      '<section class="nt-page"><header class="nt-heading"><div><p class="nt-kicker">PEMBARUAN AKUN</p><h1>Notifikasi</h1></div></header><div class="nt-state fi-card"><h2>Notifikasi belum dapat dimuat</h2><p>' +
        escapeHtml(error.message || 'Periksa koneksi ke server.') +
        '</p><button class="fi-button" type="button" data-retry-notifications>Coba lagi</button></div></section>',
    );
    injectStyles();
    document
      .querySelector('[data-retry-notifications]')
      ?.addEventListener('click', renderNotifications);
  }
}

function notificationsLoadingSkeleton() {
  return `<section class="nt-page" aria-busy="true"><header class="nt-heading"><div>${skeleton('125px', '10px')}<div style="height:9px"></div>${skeleton('190px', '30px')}<div style="height:8px"></div>${skeleton('250px', '13px')}</div>${skeleton('95px', '28px', 'pill')}</header><div class="nt-list">${Array.from({ length: 4 }, () => `<article class="nt-item fi-card">${skeleton('36px', '36px', 'circle')}<div>${skeleton('55%', '14px')}<div style="height:8px"></div>${skeleton('90%', '12px')}<div style="height:6px"></div>${skeleton('75px', '10px')}</div>${skeleton('105px', '34px', 'pill')}</article>`).join('')}</div></section>`;
}

function notificationCard(item) {
  const date = new Date(item.createdAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    '<article class="nt-item fi-card' +
    (item.isRead ? '' : ' unread') +
    '"><span class="nt-mark">' +
    (item.isRead ? '✓' : '•') +
    '</span><div><h2>' +
    escapeHtml(item.title || 'Pembaruan Food Ilee') +
    '</h2><p>' +
    escapeHtml(item.message || '') +
    '</p><time>' +
    escapeHtml(dateLabel) +
    '</time></div>' +
    (item.isRead
      ? ''
      : '<button type="button" data-read-notification="' +
        escapeHtml(item.id) +
        '">Tandai dibaca</button>') +
    '</article>'
  );
}

function injectStyles() {
  if (document.getElementById('notifications-page-style')) return;
  const style = document.createElement('style');
  style.id = 'notifications-page-style';
  style.textContent =
    '.nt-page{max-width:980px;margin:0 auto;padding:4px 0 30px}.nt-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:25px}.nt-kicker{margin:0 0 7px;color:#49827d;font-size:10px;font-weight:700;letter-spacing:.14em}.nt-heading h1{margin:0;color:var(--fi-deep);font-size:clamp(29px,4vw,38px);letter-spacing:-.04em}.nt-heading p:not(.nt-kicker){margin-top:8px;color:var(--fi-muted);font-size:14px}.nt-count{padding:8px 12px;border-radius:999px;background:#d8eeeb;color:#176d69;font-size:11px;font-weight:600}.nt-list{display:grid;gap:11px}.nt-item{display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:14px;padding:17px}.nt-item.unread{border-color:#a7cdca;background:#f2f9f8}.nt-mark,.nt-empty-icon{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#d8eeeb;color:#087b78;font-size:18px;font-weight:700}.nt-item h2{margin:0 0 4px;color:#173d3c;font-size:14px}.nt-item p{margin:0 0 7px;color:#56716f;font-size:12px;line-height:1.55}.nt-item time{color:#829592;font-size:10px}.nt-item button{min-height:36px;padding:0 12px;border:1px solid #bfd4d2;border-radius:999px;background:#fff;color:#176d69;font-size:10px;font-weight:600}.nt-item button:disabled{opacity:.6}.nt-state{min-height:230px;padding:28px;border:1px solid var(--fi-line);border-radius:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:var(--fi-card);color:var(--fi-muted);text-align:center}.nt-state h2{color:var(--fi-deep);font-size:19px}.nt-state p{font-size:13px;line-height:1.6}.nt-empty-icon{margin-bottom:5px}.nt-state .fi-button{margin-top:8px}@media(max-width:600px){.nt-heading{align-items:flex-start;flex-direction:column}.nt-item{grid-template-columns:34px minmax(0,1fr);gap:10px;padding:13px}.nt-mark{width:32px;height:32px}.nt-item button{grid-column:2;justify-self:start}.nt-item p{font-size:11px}}';
  document.head.append(style);
}
