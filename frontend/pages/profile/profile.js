import {
  checkUsernameAvailability,
  getCurrentUser,
  updateCurrentUser,
} from '../../services/user.js';
import { getWastes } from '../../services/waste.js';
import { getMyOrders } from '../../services/order.js';
import { removeToken } from '../../utils/storage.js';
import { escapeHtml } from '../../utils/html.js';
import { formatRupiah, icon, renderShell, showToast } from '../../ui/shell.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { skeleton } from '../../ui/skeleton.js';

export async function renderProfile() {
  const navigationRevision = getNavigationRevision();
  renderShell('', profileLoadingSkeleton());
  injectProfileStyles();
  try {
    const [profileResult, wastesResult, ordersResult] = await Promise.all([
      getCurrentUser(),
      getWastes({ mine: true }),
      getMyOrders(),
    ]);
    if (!isRouteCurrent('#profil', navigationRevision)) return;
    if (!profileResult.success || !profileResult.data)
      throw new Error(profileResult.message || 'Profil tidak dapat dimuat.');
    if (!wastesResult.success || !ordersResult.success)
      throw new Error(
        wastesResult.message || ordersResult.message || 'Aktivitas akun belum dapat dimuat.',
      );
    const user = profileResult.data;
    const products = Array.isArray(wastesResult.data) ? wastesResult.data : [];
    const orders = Array.isArray(ordersResult.data) ? ordersResult.data : [];
    const stock = products.reduce((total, item) => total + Number(item.stock || 0), 0);
    const initials = (user.name || user.username || user.email || 'U').charAt(0).toUpperCase();
    renderShell(
      '',
      `<section class="pr-page"><div class="pr-hero fi-card"><div class="pr-avatar-wrap"><div class="pr-avatar">${user.avatar ? `<img src="${escapeHtml(user.avatar)}" alt="Foto profil ${escapeHtml(user.name || user.email)}">` : `<span>${escapeHtml(initials)}</span>`}</div><button type="button" class="pr-avatar-edit" data-edit-profile aria-label="Edit profil">${icon('edit')}</button></div><div class="pr-identity"><h1>${escapeHtml(user.name || user.username || 'Pengguna Food Ilee')}</h1><p>${escapeHtml(user.bio || 'Bersama membangun ekosistem pangan yang lebih sirkular.')}</p><div class="pr-badges"><span>Anggota sejak ${new Date(user.createdAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>${user.role === 'admin' ? '<span class="verified">Tim Food Ilee</span>' : ''}</div></div><button class="fi-button pr-edit" data-edit-profile>Edit Profil</button></div><section class="pr-impact"><div class="pr-section-title"><div><p class="pr-kicker">AKTIVITAS ANDA</p><h2>Ringkasan sirkular</h2></div><span>Data dari aktivitas akun Food Ilee</span></div><div class="pr-impact-grid"><article class="pr-impact-card"><span class="pr-impact-icon">${icon('recycle')}</span><strong>${products.length}</strong><small>Produk ditawarkan</small></article><article class="pr-impact-card"><span class="pr-impact-icon mint">${icon('leaf')}</span><strong>${stock.toLocaleString('id-ID')}<i> kg</i></strong><small>Total stok tersedia</small></article><article class="pr-impact-card deep"><span class="pr-impact-icon light">${icon('box')}</span><strong>${orders.length}</strong><small>Pesanan dibuat</small></article></div></section><div class="pr-detail-grid"><section><div class="pr-section-title"><div><p class="pr-kicker">AKUN</p><h2>Detail akun</h2></div></div><div class="pr-details fi-card"><div><span class="pr-detail-icon">${icon('mail')}</span><p><small>ALAMAT EMAIL</small><strong>${escapeHtml(user.email)}</strong></p></div><div><span class="pr-detail-icon">${icon('profile')}</span><p><small>NAMA PENGGUNA</small><strong>${escapeHtml(user.username || 'Belum diatur')}</strong></p></div><div><span class="pr-detail-icon">${icon('guide')}</span><p><small>BERGABUNG</small><strong>${new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p></div></div></section><section><div class="pr-section-title"><div><p class="pr-kicker">ETALASE</p><h2>Aktivitas penawaran</h2></div><a href="#kelola-toko">Kelola toko <span>→</span></a></div><div class="pr-products fi-card">${
        products.length
          ? products
              .slice(0, 4)
              .map(
                (item) =>
                  `<a class="pr-product" href="#marketplace"><img src="${escapeHtml(item.image || '')}" alt=""><span><strong>${escapeHtml(item.title)}</strong><small>${Number(item.stock || 0)} kg · ${formatRupiah(item.price)}</small></span><b>${icon('external')}</b></a>`,
              )
              .join('')
          : `<p class="pr-empty">Anda belum menawarkan produk.</p><a class="fi-button" href="#tambah-limbah">Tambahkan limbah</a>`
      }</div></section></div><section class="pr-bottom-actions"><a class="fi-button fi-button-outline" href="#panduan">Jelajahi panduan</a><button class="fi-button pr-logout" type="button">Keluar dari akun</button></section></section>`,
    );
    injectProfileStyles();
    document
      .querySelectorAll('[data-edit-profile]')
      .forEach((button) => button.addEventListener('click', () => openEditProfile(user)));
    document.querySelector('.pr-logout').addEventListener('click', () => {
      removeToken();
      localStorage.removeItem('user');
      location.hash = '#login';
    });
  } catch (error) {
    if (!isRouteCurrent('#profil', navigationRevision)) return;
    renderShell(
      '',
      `<section class="pr-error fi-card"><h1>Profil belum dapat dimuat</h1><p>${escapeHtml(error.message || 'Coba lagi sebentar lagi.')}</p><button class="fi-button" data-retry>Memuat ulang</button></section>`,
    );
    document.querySelector('[data-retry]').addEventListener('click', renderProfile);
  }
}

function profileLoadingSkeleton() {
  return `<section class="pr-page" aria-busy="true"><section class="pr-hero fi-card"><div class="pr-avatar">${skeleton('100%', '100%', 'circle')}</div><div class="pr-identity">${skeleton('150px', '25px')}<div style="height:10px"></div>${skeleton('min(360px, 90%)', '13px')}<div style="height:12px"></div>${skeleton('125px', '22px', 'pill')}</div>${skeleton('130px', '42px', 'pill')}</section><section class="pr-impact"><div class="pr-section-title"><div>${skeleton('90px', '10px')}<div style="height:8px"></div>${skeleton('190px', '22px')}</div></div><div class="pr-impact-grid">${Array.from({ length: 3 }, () => `<article class="pr-impact-card">${skeleton('34px', '34px', 'circle')}<div style="height:13px"></div>${skeleton('68px', '28px')}<div style="height:7px"></div>${skeleton('120px', '10px')}</article>`).join('')}</div></section><div class="pr-detail-grid">${Array.from({ length: 2 }, () => `<section>${skeleton('100px', '20px')}<div style="height:12px"></div><div class="pr-details fi-card">${Array.from({ length: 3 }, () => `<div>${skeleton('25px', '25px', 'circle')}<div style="flex:1">${skeleton('90px', '8px')}<div style="height:5px"></div>${skeleton('65%', '12px')}</div></div>`).join('')}</div></section>`).join('')}</div></section>`;
}

function openEditProfile(user) {
  const dialog = document.createElement('dialog');
  dialog.className = 'pr-dialog';
  dialog.innerHTML = `<form class="pr-dialog-card"><button class="pr-dialog-close" type="button" aria-label="Tutup">×</button><p class="pr-kicker">AKUN FOOD ILEE</p><h2>Perbarui profil Anda</h2><label class="fi-label">Nama lengkap<input class="fi-input" name="name" value="${escapeHtml(user.name || '')}" required minlength="3"></label><label class="fi-label">Nama pengguna<input class="fi-input" name="username" value="${escapeHtml(user.username || '')}" required minlength="3" maxlength="30" autocomplete="username" aria-describedby="pr-username-status"><small class="pr-username-status" id="pr-username-status" role="status" aria-live="polite"></small></label><label class="fi-label">Tentang Anda<textarea class="fi-input" name="bio" rows="3" maxlength="240">${escapeHtml(user.bio || '')}</textarea></label><label class="fi-label">Foto profil<input class="fi-input" name="avatar" type="file" accept="image/*"></label><div class="pr-dialog-actions"><button class="fi-button fi-button-outline" type="button" data-cancel>Batal</button><button class="fi-button" type="submit">Simpan profil</button></div></form>`;
  document.body.append(dialog);
  dialog.showModal();
  dialog.querySelector('.pr-dialog-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  const form = dialog.querySelector('form');
  const usernameInput = form.elements.username;
  const usernameStatus = dialog.querySelector('#pr-username-status');
  const submitButton = form.querySelector('[type="submit"]');
  const originalUsername = String(user.username || '').trim().toLowerCase();
  let usernameCheckRevision = 0;
  let usernameCheckTimer;
  const setUsernameStatus = (state, message) => {
    usernameStatus.textContent = message;
    usernameStatus.dataset.state = state;
    usernameInput.setAttribute('aria-invalid', String(state === 'unavailable' || state === 'invalid'));
  };
  const checkEditedUsername = async (username, revision) => {
    try {
      const result = await checkUsernameAvailability(username);
      if (
        revision !== usernameCheckRevision ||
        !dialog.isConnected ||
        usernameInput.value.trim().toLowerCase() !== username
      )
        return;
      if (result.success && result.data?.available) {
        setUsernameStatus('available', 'Username tersedia.');
        submitButton.disabled = false;
      } else {
        setUsernameStatus('unavailable', 'Username tidak tersedia. Coba username lain.');
        submitButton.disabled = true;
      }
    } catch (error) {
      if (revision !== usernameCheckRevision || !dialog.isConnected) return;
      setUsernameStatus('error', error.message || 'Ketersediaan username belum dapat diperiksa.');
      submitButton.disabled = true;
    }
  };
  usernameInput.addEventListener('input', () => {
    const username = usernameInput.value.trim().toLowerCase();
    const revision = ++usernameCheckRevision;
    clearTimeout(usernameCheckTimer);
    if (username === originalUsername) {
      setUsernameStatus('', '');
      submitButton.disabled = false;
      return;
    }
    if (username.length < 3 || username.length > 30) {
      setUsernameStatus('invalid', username.length < 3 ? 'Username minimal 3 karakter.' : 'Username maksimal 30 karakter.');
      submitButton.disabled = true;
      return;
    }
    setUsernameStatus('checking', 'Memeriksa ketersediaan username…');
    submitButton.disabled = true;
    usernameCheckTimer = setTimeout(() => checkEditedUsername(username, revision), 350);
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim().toLowerCase();
    if (username !== originalUsername) {
      const revision = ++usernameCheckRevision;
      clearTimeout(usernameCheckTimer);
      setUsernameStatus('checking', 'Memeriksa ketersediaan username…');
      submitButton.disabled = true;
      try {
        const result = await checkUsernameAvailability(username);
        if (revision !== usernameCheckRevision || !dialog.isConnected) return;
        if (!result.success || !result.data?.available) {
          setUsernameStatus('unavailable', 'Username tidak tersedia. Coba username lain.');
          submitButton.disabled = true;
          return;
        }
        setUsernameStatus('available', 'Username tersedia.');
      } catch (error) {
        if (revision !== usernameCheckRevision) return;
        setUsernameStatus('error', error.message || 'Ketersediaan username belum dapat diperiksa.');
        submitButton.disabled = false;
        return;
      }
    }
    const formData = new FormData(form);
    formData.set('username', username);
    const avatar = formData.get('avatar');
    if (!avatar?.size) formData.delete('avatar');
    const button = submitButton;
    button.disabled = true;
    button.textContent = 'Menyimpan…';
    try {
      const result = await updateCurrentUser(formData);
      if (!result.success) throw new Error(result.message || 'Profil belum tersimpan.');
      dialog.close();
      dialog.remove();
      showToast('Profil berhasil diperbarui.');
      renderProfile();
    } catch (error) {
      if (/username tidak tersedia/i.test(error.message || ''))
        setUsernameStatus('unavailable', error.message);
      showToast(error.message || 'Profil belum tersimpan.', 'error');
      button.disabled = false;
      button.textContent = 'Simpan profil';
    }
  });
}

function injectProfileStyles() {
  if (document.getElementById('profile-style')) return;
  const style = document.createElement('style');
  style.id = 'profile-style';
  style.textContent = `.pr-page{padding:3px 0 22px}.pr-hero{min-height:175px;padding:28px 35px;display:grid;grid-template-columns:126px 1fr auto;align-items:center;gap:26px;border-radius:28px;box-shadow:0 12px 35px #123a2a0c}.pr-avatar-wrap{position:relative}.pr-avatar{width:126px;height:126px;border-radius:15px;overflow:hidden;display:grid;place-items:center;background:linear-gradient(145deg,#d4f0dd,#b5dec7);color:#145740;font-size:42px;font-weight:600}.pr-avatar img{width:100%;height:100%;object-fit:cover}.pr-avatar-edit{position:absolute;right:-6px;bottom:-6px;width:33px;height:33px;border:2px solid white;border-radius:50%;background:#176457;color:white;font-size:16px;cursor:pointer}.pr-identity h1{margin:0;color:#202925;font-size:29px;font-weight:550;letter-spacing:-.6px}.pr-identity>p{margin:8px 0 13px;color:#65716b;font-size:13px;line-height:1.55}.pr-badges{display:flex;flex-wrap:wrap;gap:8px}.pr-badges span{padding:6px 10px;border-radius:999px;background:#d3f0dd;color:#45755b;font-size:10px;font-weight:500}.pr-badges span.verified{background:#145d50;color:#fff}.pr-edit{min-width:135px}.pr-impact{margin-top:37px}.pr-section-title{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:14px}.pr-section-title h2{margin:0;color:#215344;font-size:20px;font-weight:500}.pr-section-title>span,.pr-section-title>a{color:#87928b;font-size:10px;text-decoration:none}.pr-section-title>a{color:#286651;font-weight:600}.pr-section-title>a span{margin-left:5px}.pr-kicker{margin:0 0 5px;color:#799285;font-size:9px;font-weight:700;letter-spacing:.13em}.pr-impact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.pr-impact-card{min-height:130px;padding:19px 22px;border:1px solid #e8eeea;border-radius:20px;background:white;box-shadow:0 8px 26px #123a2a08}.pr-impact-icon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#c9ecd4;color:#367351;font-size:19px}.pr-impact-icon.mint{background:#c9f1e8;color:#398475}.pr-impact-icon.light{background:#ffffff24;color:#e4f2eb}.pr-impact-card>strong{display:block;margin:11px 0 1px;color:#155444;font-size:28px;font-weight:550;letter-spacing:-.4px}.pr-impact-card>strong i{font-size:14px;font-style:normal}.pr-impact-card>small{color:#78847d;font-size:9px;letter-spacing:.04em;text-transform:uppercase}.pr-impact-card.deep{border-color:#225e52;background:#225e52}.pr-impact-card.deep>strong,.pr-impact-card.deep>small{color:#d2eee0}.pr-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:35px;margin-top:40px}.pr-details{overflow:hidden;border-radius:18px}.pr-details>div{min-height:60px;padding:12px 18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #eff2ef}.pr-details>div:last-child{border:0}.pr-detail-icon{width:25px;color:#77847c;text-align:center;font-size:16px}.pr-details p{min-width:0;margin:0;display:flex;flex-direction:column;gap:4px}.pr-details small{color:#87938c;font-size:8px;font-weight:600;letter-spacing:.08em}.pr-details strong{overflow:hidden;color:#47544d;font-size:11px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.pr-products{min-height:178px;padding:8px 17px;border-radius:18px}.pr-product{min-height:49px;display:flex;align-items:center;gap:11px;border-bottom:1px solid #eff2ef;color:inherit;text-decoration:none}.pr-product:last-child{border:0}.pr-product img{width:39px;height:39px;border-radius:9px;object-fit:cover;background:#f0f3f0}.pr-product span{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}.pr-product strong{overflow:hidden;color:#34453b;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.pr-product small{color:#819087;font-size:9px}.pr-product>b{color:#5d816e;font-size:14px}.pr-empty{margin:22px 0;color:#78867e;font-size:11px;text-align:center}.pr-bottom-actions{margin-top:30px;padding-top:20px;border-top:1px solid #ebefec;display:flex;gap:10px}.pr-logout{border:1px solid #f4d9d6;background:#fff0ef;color:#ad4942}.pr-loading,.pr-error{min-height:320px;display:grid;place-content:center;gap:10px;text-align:center;color:#718078}.pr-error{padding:35px}.pr-error h1{margin:0;color:#204839;font-size:23px}.pr-error p{font-size:13px}.pr-error .fi-button{justify-self:center}.pr-dialog{width:min(520px,calc(100% - 26px));padding:0;border:0;border-radius:23px;box-shadow:0 25px 90px #091b1460}.pr-dialog::backdrop{background:#102c2480;backdrop-filter:blur(3px)}.pr-dialog-card{position:relative;padding:31px;display:flex;flex-direction:column;gap:14px}.pr-dialog-card h2{margin:0 0 3px;color:#173f32;font-size:23px}.pr-dialog-card textarea{box-sizing:border-box;height:auto;padding-top:11px;resize:vertical}.pr-dialog-close{position:absolute;top:18px;right:18px;width:34px;height:34px;border:0;border-radius:50%;background:#f1f4f1;color:#4f5a54;font-size:21px;cursor:pointer}.pr-dialog-actions{margin-top:7px;display:flex;justify-content:flex-end;gap:9px}@media(max-width:760px){.pr-detail-grid{grid-template-columns:1fr;gap:25px}.pr-section-title>span{display:none}}@media(max-width:540px){.pr-hero{padding:20px;grid-template-columns:72px 1fr;gap:15px;border-radius:22px}.pr-avatar{width:72px;height:72px;border-radius:13px;font-size:28px}.pr-avatar-edit{width:27px;height:27px}.pr-identity h1{font-size:20px}.pr-identity>p{font-size:11px}.pr-identity .pr-badges span{padding:5px 8px;font-size:9px}.pr-edit{grid-column:1/-1;width:100%;min-height:39px}.pr-impact{margin-top:27px}.pr-section-title{align-items:flex-start}.pr-section-title h2{font-size:18px}.pr-impact-grid{grid-template-columns:1fr;gap:9px}.pr-impact-card{min-height:0;padding:14px;position:relative}.pr-impact-card>strong{margin:0;position:absolute;right:15px;top:18px;font-size:23px}.pr-impact-card>small{display:block;margin-top:6px}.pr-detail-grid{margin-top:30px}.pr-details>div{padding:11px 13px}.pr-bottom-actions{flex-direction:column}.pr-bottom-actions .fi-button{width:100%}.pr-dialog-card{padding:25px 19px}.pr-dialog-actions{flex-direction:column-reverse}.pr-dialog-actions .fi-button{width:100%}}`;
  style.textContent += `.pr-username-status{min-height:13px;color:#708078;font-size:10px;font-weight:400}.pr-username-status[data-state="available"]{color:#24754e}.pr-username-status[data-state="unavailable"],.pr-username-status[data-state="invalid"],.pr-username-status[data-state="error"]{color:#b44740}.pr-username-status[data-state="checking"]{color:#73847a}`;
  document.head.append(style);
}
