import { loadStylesheet } from '../../utils/stylesheet.js';
import { escapeHtml } from '../../utils/html.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { renderShell, showToast } from '../../ui/shell.js';
import { getNotifications, markNotificationRead } from '../../services/notification.js';
import { skeleton } from '../../ui/skeleton.js';

export async function renderNotifications() {
  const revision = getNavigationRevision();
  renderShell('', notificationsLoadingSkeleton());
  applyNotificationsShellLayout();
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
    applyNotificationsShellLayout();
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
    applyNotificationsShellLayout();
    injectStyles();
    document
      .querySelector('[data-retry-notifications]')
      ?.addEventListener('click', renderNotifications);
  }
}

function applyNotificationsShellLayout() {
  document.querySelector('.fi-app')?.classList.add('nt-shell');
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
  loadStylesheet(
    'notifications-page-style',
    new URL('../../styles/pages/notifications.css', import.meta.url),
  );
}
