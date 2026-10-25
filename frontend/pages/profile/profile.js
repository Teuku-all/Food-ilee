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
import { cropSquareImage } from '../../utils/image-crop.js';
import { bindRegionAddress } from '../../utils/region-address.js';
import { mountLocationPicker, validCoordinates } from '../../utils/location-map.js';

const SHIPPING_ADDRESS_KEY = 'foodilee_shipping_address';

function savedShippingAddress() {
  try {
    const address = JSON.parse(localStorage.getItem(SHIPPING_ADDRESS_KEY) || 'null');
    return address && typeof address === 'object' && !Array.isArray(address) ? address : {};
  } catch {
    return {};
  }
}

function renderShippingAddress(address) {
  const hasAddress = Boolean(address.recipientName || address.details);
  const region = [address.village, address.district, address.city, address.province].filter(Boolean).join(', ');
  return `<section class="pr-address-card fi-card"><div><p class="pr-kicker">PENGIRIMAN</p><h2>Alamat tersimpan</h2><p class="pr-address-summary">${hasAddress
    ? `${escapeHtml(address.recipientName || '')}${address.phone ? ` · ${escapeHtml(address.phone)}` : ''}<br>${escapeHtml(address.details || '')}${region ? `<br>${escapeHtml(region)}` : ''}${address.postalCode ? `<br>Kode pos ${escapeHtml(address.postalCode)}` : ''}`
    : 'Belum ada alamat tersimpan. Tambahkan alamat agar lebih cepat saat checkout.'}</p></div><button class="fi-button fi-button-outline" type="button" data-edit-address>${hasAddress ? 'Ubah alamat' : 'Tambah alamat'}</button></section>`;
}

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
    renderShell(
      '',
      `<section class="pr-page"><div class="pr-hero fi-card"><div class="pr-avatar-wrap"><div class="pr-avatar">${user.avatar ? `<img src="${escapeHtml(user.avatar)}" alt="Foto profil ${escapeHtml(user.name || user.email)}">` : `<svg class="pr-avatar-placeholder" role="img" aria-label="Foto profil bawaan" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49" fill="#d4f0dd"/><circle cx="50" cy="37" r="17" fill="#5c9275"/><path d="M18 88c2-20 15-31 32-31s30 11 32 31" fill="#5c9275"/></svg>`}</div><button type="button" class="pr-avatar-edit" data-edit-profile aria-label="Edit profil">${icon('edit')}</button></div><div class="pr-identity"><h1>${escapeHtml(user.name || user.username || 'Pengguna Food Ilee')}</h1><p>${escapeHtml(user.bio || 'Bersama membangun ekosistem pangan yang lebih sirkular.')}</p><div class="pr-badges"><span>Anggota sejak ${new Date(user.createdAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>${user.role === 'admin' ? '<span class="verified">Tim Food Ilee</span>' : ''}</div></div><button class="fi-button pr-edit" data-edit-profile>Edit Profil</button></div><section class="pr-impact"><div class="pr-section-title"><div><p class="pr-kicker">AKTIVITAS ANDA</p><h2>Ringkasan sirkular</h2></div><span>Data dari aktivitas akun Food Ilee</span></div><div class="pr-impact-grid"><article class="pr-impact-card"><span class="pr-impact-icon">${icon('recycle')}</span><strong>${products.length}</strong><small>Produk ditawarkan</small></article><article class="pr-impact-card"><span class="pr-impact-icon mint">${icon('leaf')}</span><strong>${stock.toLocaleString('id-ID')}<i> kg</i></strong><small>Total stok tersedia</small></article><article class="pr-impact-card deep"><span class="pr-impact-icon light">${icon('box')}</span><strong>${orders.length}</strong><small>Pesanan dibuat</small></article></div></section><div class="pr-detail-grid"><section><div class="pr-section-title"><div><p class="pr-kicker">AKUN</p><h2>Detail akun</h2></div></div><div class="pr-details fi-card"><div><span class="pr-detail-icon">${icon('mail')}</span><p><small>ALAMAT EMAIL</small><strong>${escapeHtml(user.email)}</strong></p></div><div><span class="pr-detail-icon">${icon('profile')}</span><p><small>NAMA PENGGUNA</small><strong>${escapeHtml(user.username || 'Belum diatur')}</strong></p></div><div><span class="pr-detail-icon">${icon('guide')}</span><p><small>BERGABUNG</small><strong>${new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p></div></div></section><section><div class="pr-section-title"><div><p class="pr-kicker">ETALASE</p><h2>Aktivitas penawaran</h2></div><a href="#kelola-toko">Kelola toko <span>→</span></a></div><div class="pr-products fi-card">${
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
    document.querySelector('.pr-bottom-actions').insertAdjacentHTML('beforebegin', renderShippingAddress(savedShippingAddress()));
    document.querySelector('[data-edit-address]').addEventListener('click', () => openEditAddress(savedShippingAddress()));
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

function openEditAddress(saved) {
  const dialog = document.createElement('dialog');
  dialog.className = 'pr-dialog pr-address-dialog';
  dialog.innerHTML = `<form class="pr-dialog-card pr-address-form"><button class="pr-dialog-close" type="button" aria-label="Tutup">×</button><p class="pr-kicker">PENGIRIMAN</p><h2>${saved.recipientName ? 'Ubah alamat' : 'Tambah alamat'}</h2><p class="pr-dialog-intro">Alamat tersimpan di perangkat ini dan akan digunakan saat checkout.</p><div class="pr-address-fields"><label class="fi-label">Nama penerima<input class="fi-input" name="recipientName" value="${escapeHtml(saved.recipientName || '')}" required maxlength="100" autocomplete="name"></label><label class="fi-label">Nomor telepon<input class="fi-input" name="phone" value="${escapeHtml(saved.phone || '')}" required maxlength="20" inputmode="tel" autocomplete="tel"></label><label class="fi-label">Provinsi<select class="fi-input" id="profile-address-province" required><option value="">Pilih provinsi</option></select></label><label class="fi-label">Kabupaten/Kota<select class="fi-input" id="profile-address-city" required disabled><option value="">Pilih kabupaten/kota</option></select></label><label class="fi-label">Kecamatan<select class="fi-input" id="profile-address-district" required disabled><option value="">Pilih kecamatan</option></select></label><label class="fi-label">Desa/Kelurahan<select class="fi-input" id="profile-address-village" required disabled><option value="">Pilih desa/kelurahan</option></select></label><label class="fi-label">Nama jalan, nomor, RT/RW<input class="fi-input" id="profile-address-details" value="${escapeHtml(saved.details || '')}" required maxlength="240" placeholder="Contoh: Jl. Melati No. 10, RT 02/RW 01"></label><label class="fi-label">Kode pos<input class="fi-input" id="profile-address-postal" name="postalCode" value="${escapeHtml(saved.postalCode || '')}" required inputmode="numeric" pattern="[0-9]{5}" maxlength="5"></label><label class="fi-label pr-address-notes">Catatan untuk kurir (opsional)<input class="fi-input" name="notes" value="${escapeHtml(saved.notes || '')}" maxlength="200"></label></div><p class="pr-address-map-label">Titik lokasi penerima <small>Peta akan mengikuti kecamatan yang dipilih. Tandai lokasi yang sesuai alamat.</small></p><div id="profile-address-map" class="fi-location-map" role="application" aria-label="Peta alamat penerima"></div><div class="fi-map-controls"><button type="button" class="fi-button fi-button-outline" id="profile-address-locate">Gunakan lokasi perangkat</button><span id="profile-address-map-status" role="status">Pilih kecamatan untuk memuat peta.</span></div><input type="hidden" name="latitude"><input type="hidden" name="longitude"><p class="pr-address-error" role="alert"></p><div class="pr-dialog-actions"><button class="fi-button fi-button-outline" type="button" data-cancel>Batal</button><button class="fi-button" type="submit">Simpan alamat</button></div></form>`;
  document.body.append(dialog);
  dialog.showModal();
  const form = dialog.querySelector('form');
  const mapStatus = dialog.querySelector('#profile-address-map-status');
  const regionAddressPromise = bindRegionAddress(form, 'profile-address', saved);
  const mapPickerPromise = mountLocationPicker({
    element: dialog.querySelector('#profile-address-map'),
    latitudeInput: form.elements.latitude,
    longitudeInput: form.elements.longitude,
    status: mapStatus,
    locateButton: dialog.querySelector('#profile-address-locate'),
    initialLocation: saved,
    initialArea: saved,
    requireArea: true,
  }).catch((error) => {
    mapStatus.textContent = error.message;
    return null;
  });
  const regionName = (level) => form.querySelector(`#profile-address-${level}`)?.selectedOptions[0]?.textContent?.trim() || '';
  const updateAddressMapArea = async () => {
    try {
      const picker = await mapPickerPromise;
      if (picker) await picker.setArea({
        village: regionName('village'),
        district: regionName('district'),
        city: regionName('city'),
        province: regionName('province'),
      });
    } catch (error) {
      mapStatus.textContent = error.message;
    }
  };
  form.querySelector('#profile-address-district').addEventListener('change', updateAddressMapArea);
  form.querySelector('#profile-address-village').addEventListener('change', updateAddressMapArea);
  for (const level of ['province', 'city']) {
    form.querySelector(`#profile-address-${level}`).addEventListener('change', async () => {
      const picker = await mapPickerPromise;
      picker?.clearArea();
    });
  }
  const closeDialog = () => dialog.close();
  dialog.querySelectorAll('[data-cancel],.pr-dialog-close')
    .forEach((button) => button.addEventListener('click', closeDialog));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener('close', async () => {
    const picker = await mapPickerPromise;
    picker?.destroy();
    dialog.remove();
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    const errorNode = form.querySelector('.pr-address-error');
    errorNode.textContent = '';
    submit.disabled = true;
    try {
      const region = (await regionAddressPromise).read();
      const picker = await mapPickerPromise;
      if (!picker) throw new Error('Peta belum dapat dimuat. Periksa koneksi lalu coba lagi.');
      const latitudeValue = form.elements.latitude.value;
      const longitudeValue = form.elements.longitude.value;
      if (!validCoordinates(latitudeValue, longitudeValue))
        throw new Error('Pilih titik lokasi penerima pada peta.');
      const latitude = Number(latitudeValue);
      const longitude = Number(longitudeValue);
      const address = {
        recipientName: form.elements.recipientName.value.trim(),
        phone: form.elements.phone.value.trim(),
        ...region.region,
        address: region.address,
        postalCode: region.postalCode,
        details: form.querySelector('#profile-address-details').value.trim(),
        notes: form.elements.notes.value.trim(),
        latitude,
        longitude,
      };
      localStorage.setItem(SHIPPING_ADDRESS_KEY, JSON.stringify(address));
      document.querySelector('.pr-address-card').outerHTML = renderShippingAddress(address);
      document.querySelector('[data-edit-address]').addEventListener('click', () => openEditAddress(address));
      closeDialog();
      showToast('Alamat berhasil disimpan dan siap digunakan saat checkout.');
    } catch (error) {
      errorNode.textContent = error.message || 'Alamat belum dapat disimpan.';
      submit.disabled = false;
    }
  });
}

function openEditProfile(user) {
  const dialog = document.createElement('dialog');
  dialog.className = 'pr-dialog';
  dialog.innerHTML = `<form class="pr-dialog-card"><button class="pr-dialog-close" type="button" aria-label="Tutup">×</button><p class="pr-kicker">AKUN FOOD ILEE</p><h2>Edit profil</h2><p class="pr-dialog-intro">Perbarui informasi dan foto yang tampil di akun Anda.</p><div class="pr-edit-grid"><div class="pr-edit-photo"><div class="pr-crop-frame"><img class="pr-current-avatar" data-current-avatar src="${escapeHtml(user.avatar || '')}" alt="Foto profil saat ini" ${user.avatar ? '' : 'hidden'}><img class="pr-crop-preview" data-crop-preview alt="Pratinjau foto yang akan diunggah" hidden><svg class="pr-crop-placeholder" data-crop-placeholder role="img" aria-label="Foto profil bawaan" viewBox="0 0 100 100" ${user.avatar ? 'hidden' : ''}><circle cx="50" cy="50" r="49" fill="#d4f0dd"/><circle cx="50" cy="37" r="17" fill="#5c9275"/><path d="M18 88c2-20 15-31 32-31s30 11 32 31" fill="#5c9275"/></svg><span class="pr-crop-loading" data-crop-loading hidden>Memuat foto…</span></div><label class="pr-upload-button">Pilih foto<input name="avatar" type="file" accept="image/jpeg,image/png,image/webp"></label><small class="pr-crop-hint">Geser foto untuk mengatur posisi. Hasil akan dipotong persegi 1:1.</small><label class="pr-zoom-label">Perbesar foto<input data-crop-zoom type="range" min="1" max="3" step="0.01" value="1" disabled></label></div><div class="pr-edit-fields"><label class="fi-label">Nama lengkap<input class="fi-input" name="name" value="${escapeHtml(user.name || '')}" required minlength="3"></label><label class="fi-label">Nama pengguna<input class="fi-input" name="username" value="${escapeHtml(user.username || '')}" required minlength="3" maxlength="30" autocomplete="username" aria-describedby="pr-username-status"><small class="pr-username-status" id="pr-username-status" role="status" aria-live="polite"></small></label><label class="fi-label">Tentang Anda<textarea class="fi-input" name="bio" rows="4" maxlength="240">${escapeHtml(user.bio || '')}</textarea></label></div></div><div class="pr-dialog-actions"><button class="fi-button fi-button-outline" type="button" data-cancel>Batal</button><button class="fi-button" type="submit">Simpan perubahan</button></div></form>`;
  document.body.append(dialog);
  dialog.showModal();
  dialog.querySelector('.pr-dialog-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  const form = dialog.querySelector('form');
  const avatarInput = form.elements.avatar;
  const cropPreview = dialog.querySelector('[data-crop-preview]');
  const currentAvatar = dialog.querySelector('[data-current-avatar]');
  const cropLoading = dialog.querySelector('[data-crop-loading]');
  const cropFrame = dialog.querySelector('.pr-crop-frame');
  const cropZoom = dialog.querySelector('[data-crop-zoom]');
  let cropImage = null;
  let cropObjectUrl = null;
  let cropX = 0.5;
  let cropY = 0.5;
  let dragStart = null;
  let cropLoadRevision = 0;
  const updateCropPreview = () => {
    if (!cropImage || !cropFrame.clientWidth) return;
    const frameWidth = cropFrame.clientWidth;
    const frameHeight = cropFrame.clientHeight;
    const scale = Math.max(frameWidth / cropImage.naturalWidth, frameHeight / cropImage.naturalHeight) * Number(cropZoom.value);
    const imageWidth = cropImage.naturalWidth * scale;
    const imageHeight = cropImage.naturalHeight * scale;
    cropPreview.style.width = `${imageWidth}px`;
    cropPreview.style.height = `${imageHeight}px`;
    cropPreview.style.left = `${(frameWidth - imageWidth) * cropX}px`;
    cropPreview.style.top = `${(frameHeight - imageHeight) * cropY}px`;
    cropPreview.style.display = 'block';
  };
  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files?.[0];
    if (!file) return;
    const loadRevision = ++cropLoadRevision;
    if (cropObjectUrl) URL.revokeObjectURL(cropObjectUrl);
    cropObjectUrl = null;
    cropImage = null;
    cropPreview.hidden = true;
    cropLoading.hidden = false;
    cropZoom.disabled = true;
    currentAvatar.hidden = !user.avatar;
    dialog.querySelector('[data-crop-placeholder]').hidden = Boolean(user.avatar);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      avatarInput.value = '';
      cropLoading.hidden = true;
      showToast('Pilih foto JPG, PNG, atau WebP.', 'error');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      avatarInput.value = '';
      cropLoading.hidden = true;
      showToast('Ukuran foto maksimal 4 MB.', 'error');
      return;
    }
    cropObjectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (loadRevision !== cropLoadRevision || !dialog.isConnected) return;
      cropImage = image;
      cropX = 0.5;
      cropY = 0.5;
      cropZoom.disabled = false;
      cropZoom.value = '1';
      cropPreview.src = cropObjectUrl;
      cropPreview.hidden = false;
      cropLoading.hidden = true;
      currentAvatar.hidden = true;
      requestAnimationFrame(() => {
        updateCropPreview();
        setTimeout(updateCropPreview, 50);
      });
    };
    image.onerror = () => {
      if (loadRevision !== cropLoadRevision) return;
      cropLoading.hidden = true;
      avatarInput.value = '';
      currentAvatar.hidden = !user.avatar;
      dialog.querySelector('[data-crop-placeholder]').hidden = Boolean(user.avatar);
      showToast('Foto tidak dapat dibuka. Coba gambar lain.', 'error');
    };
    image.src = cropObjectUrl;
  });
  cropZoom.addEventListener('input', updateCropPreview);
  cropFrame.addEventListener('pointerdown', (event) => {
    if (!cropImage) return;
    dragStart = { x: event.clientX, y: event.clientY, cropX, cropY };
    cropFrame.setPointerCapture(event.pointerId);
  });
  cropFrame.addEventListener('pointermove', (event) => {
    if (!dragStart || !cropImage) return;
    const scale = Math.max(cropFrame.clientWidth / cropImage.naturalWidth, cropFrame.clientHeight / cropImage.naturalHeight) * Number(cropZoom.value);
    const overflowX = Math.max(0, cropImage.naturalWidth * scale - cropFrame.clientWidth);
    const overflowY = Math.max(0, cropImage.naturalHeight * scale - cropFrame.clientHeight);
    cropX = overflowX ? Math.max(0, Math.min(1, dragStart.cropX + (event.clientX - dragStart.x) / overflowX)) : 0.5;
    cropY = overflowY ? Math.max(0, Math.min(1, dragStart.cropY + (event.clientY - dragStart.y) / overflowY)) : 0.5;
    updateCropPreview();
  });
  cropFrame.addEventListener('pointerup', () => { dragStart = null; });
  cropFrame.addEventListener('pointercancel', () => { dragStart = null; });
  dialog.addEventListener('close', () => { if (cropObjectUrl) URL.revokeObjectURL(cropObjectUrl); dialog.remove(); });
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
    const avatar = avatarInput.files?.[0];
    if (!avatar?.size) formData.delete('avatar');
    else {
      try {
        formData.set(
          'avatar',
          await cropSquareImage(cropImage, Number(cropZoom.value), cropX, cropY, 'profile.jpg'),
        );
      } catch (error) {
        showToast(error.message || 'Foto gagal diproses.', 'error');
        return;
      }
    }
    const button = submitButton;
    button.disabled = true;
    button.textContent = 'Menyimpan…';
    try {
      const result = await updateCurrentUser(formData);
      if (!result.success) throw new Error(result.message || 'Profil belum tersimpan.');
      if (avatar?.size && !result.data?.avatar)
        throw new Error('Foto belum tersimpan di server. Periksa koneksi penyimpanan foto lalu coba lagi.');
      dialog.close();
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
  style.textContent = `.pr-page{padding:3px 0 22px}.pr-hero{min-height:175px;padding:28px 35px;display:grid;grid-template-columns:126px 1fr auto;align-items:center;gap:26px;border-radius:28px;box-shadow:0 12px 35px #123a2a0c}.pr-avatar-wrap{position:relative}.pr-avatar{width:126px;height:126px;border-radius:15px;overflow:hidden;display:grid;place-items:center;background:linear-gradient(145deg,#d4f0dd,#b5dec7);color:#145740;font-size:42px;font-weight:600}.pr-avatar img{width:100%;height:100%;object-fit:cover}.pr-avatar-edit{position:absolute;right:-6px;bottom:-6px;width:33px;height:33px;border:2px solid white;border-radius:50%;background:#235347;color:white;font-size:16px;cursor:pointer}.pr-identity h1{margin:0;color:#202925;font-size:29px;font-weight:550;letter-spacing:-.6px}.pr-identity>p{margin:8px 0 13px;color:#65716b;font-size:13px;line-height:1.55}.pr-badges{display:flex;flex-wrap:wrap;gap:8px}.pr-badges span{padding:6px 10px;border-radius:999px;background:#d3f0dd;color:#45755b;font-size:10px;font-weight:500}.pr-badges span.verified{background:#145d50;color:#fff}.pr-edit{min-width:135px}.pr-impact{margin-top:37px}.pr-section-title{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:14px}.pr-section-title h2{margin:0;color:#215344;font-size:20px;font-weight:500}.pr-section-title>span,.pr-section-title>a{color:#87928b;font-size:10px;text-decoration:none}.pr-section-title>a{color:#286651;font-weight:600}.pr-section-title>a span{margin-left:5px}.pr-kicker{margin:0 0 5px;color:#799285;font-size:9px;font-weight:700;letter-spacing:.13em}.pr-impact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.pr-impact-card{min-height:130px;padding:19px 22px;border:1px solid #e8eeea;border-radius:20px;background:white;box-shadow:0 8px 26px #123a2a08}.pr-impact-icon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#c9ecd4;color:#367351;font-size:19px}.pr-impact-icon.mint{background:#c9f1e8;color:#398475}.pr-impact-icon.light{background:#ffffff24;color:#e4f2eb}.pr-impact-card>strong{display:block;margin:11px 0 1px;color:#155444;font-size:28px;font-weight:550;letter-spacing:-.4px}.pr-impact-card>strong i{font-size:14px;font-style:normal}.pr-impact-card>small{color:#78847d;font-size:9px;letter-spacing:.04em;text-transform:uppercase}.pr-impact-card.deep{border-color:#225e52;background:#225e52}.pr-impact-card.deep>strong,.pr-impact-card.deep>small{color:#d2eee0}.pr-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:35px;margin-top:40px}.pr-details{overflow:hidden;border-radius:18px}.pr-details>div{min-height:60px;padding:12px 18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #eff2ef}.pr-details>div:last-child{border:0}.pr-detail-icon{width:25px;color:#77847c;text-align:center;font-size:16px}.pr-details p{min-width:0;margin:0;display:flex;flex-direction:column;gap:4px}.pr-details small{color:#87938c;font-size:8px;font-weight:600;letter-spacing:.08em}.pr-details strong{overflow:hidden;color:#47544d;font-size:11px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.pr-products{min-height:178px;padding:8px 17px;border-radius:18px}.pr-product{min-height:49px;display:flex;align-items:center;gap:11px;border-bottom:1px solid #eff2ef;color:inherit;text-decoration:none}.pr-product:last-child{border:0}.pr-product img{width:39px;height:39px;border-radius:9px;object-fit:cover;background:#f0f3f0}.pr-product span{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}.pr-product strong{overflow:hidden;color:#34453b;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.pr-product small{color:#819087;font-size:9px}.pr-product>b{color:#5d816e;font-size:14px}.pr-empty{margin:22px 0;color:#78867e;font-size:11px;text-align:center}.pr-bottom-actions{margin-top:30px;padding-top:20px;border-top:1px solid #ebefec;display:flex;gap:10px}.pr-logout{border:1px solid #f4d9d6;background:#fff0ef;color:#ad4942}.pr-loading,.pr-error{min-height:320px;display:grid;place-content:center;gap:10px;text-align:center;color:#718078}.pr-error{padding:35px}.pr-error h1{margin:0;color:#204839;font-size:23px}.pr-error p{font-size:13px}.pr-error .fi-button{justify-self:center}.pr-dialog{width:min(520px,calc(100% - 26px));padding:0;border:0;border-radius:23px;box-shadow:0 25px 90px #091b1460}.pr-dialog::backdrop{background:#102c2480;backdrop-filter:blur(3px)}.pr-dialog-card{position:relative;padding:31px;display:flex;flex-direction:column;gap:14px}.pr-dialog-card h2{margin:0 0 3px;color:#173f32;font-size:23px}.pr-dialog-card textarea{box-sizing:border-box;height:auto;padding-top:11px;resize:vertical}.pr-dialog-close{position:absolute;top:18px;right:18px;width:34px;height:34px;border:0;border-radius:50%;background:#f1f4f1;color:#4f5a54;font-size:21px;cursor:pointer}.pr-dialog-actions{margin-top:7px;display:flex;justify-content:flex-end;gap:9px}@media(max-width:760px){.pr-detail-grid{grid-template-columns:1fr;gap:25px}.pr-section-title>span{display:none}}@media(max-width:540px){.pr-hero{padding:20px;grid-template-columns:72px 1fr;gap:15px;border-radius:22px}.pr-avatar{width:72px;height:72px;border-radius:13px;font-size:28px}.pr-avatar-edit{width:27px;height:27px}.pr-identity h1{font-size:20px}.pr-identity>p{font-size:11px}.pr-identity .pr-badges span{padding:5px 8px;font-size:9px}.pr-edit{grid-column:1/-1;width:100%;min-height:39px}.pr-impact{margin-top:27px}.pr-section-title{align-items:flex-start}.pr-section-title h2{font-size:18px}.pr-impact-grid{grid-template-columns:1fr;gap:9px}.pr-impact-card{min-height:0;padding:14px;position:relative}.pr-impact-card>strong{margin:0;position:absolute;right:15px;top:18px;font-size:23px}.pr-impact-card>small{display:block;margin-top:6px}.pr-detail-grid{margin-top:30px}.pr-details>div{padding:11px 13px}.pr-bottom-actions{flex-direction:column}.pr-bottom-actions .fi-button{width:100%}.pr-dialog-card{padding:25px 19px}.pr-dialog-actions{flex-direction:column-reverse}.pr-dialog-actions .fi-button{width:100%}}`;
  style.textContent += `.pr-username-status{min-height:13px;color:#708078;font-size:10px;font-weight:400}.pr-username-status[data-state="available"]{color:#24754e}.pr-username-status[data-state="unavailable"],.pr-username-status[data-state="invalid"],.pr-username-status[data-state="error"]{color:#b44740}.pr-username-status[data-state="checking"]{color:#73847a}`;
  style.textContent += `.pr-dialog{max-height:min(92vh,850px);overflow:auto}.pr-dialog-card{gap:9px}.pr-dialog-intro{margin:0 0 9px;color:#718078;font-size:13px}.pr-edit-grid{display:grid;grid-template-columns:190px minmax(0,1fr);gap:24px;align-items:start}.pr-edit-photo{display:flex;flex-direction:column;align-items:center;gap:11px}.pr-crop-frame{position:relative;width:176px;height:176px;overflow:hidden;border-radius:22px;background:linear-gradient(145deg,#d4f0dd,#b5dec7);touch-action:none;cursor:grab}.pr-crop-frame:active{cursor:grabbing}.pr-crop-frame img{position:absolute;left:0;top:0;width:100%;height:100%;max-width:none;object-fit:cover;user-select:none;pointer-events:none}.pr-crop-frame .pr-crop-preview{object-fit:fill}.pr-current-avatar{object-fit:cover}.pr-crop-frame span{position:absolute;inset:0;display:grid;place-items:center;color:#145740;font-size:54px;font-weight:600}.pr-upload-button{position:relative;display:inline-flex;align-items:center;justify-content:center;min-height:37px;padding:0 16px;border:1px solid #d6e7dd;border-radius:999px;color:#24634f;font-size:12px;font-weight:600;cursor:pointer}.pr-upload-button input{position:absolute;width:1px;height:1px;opacity:0}.pr-crop-hint{max-width:180px;color:#819087;font-size:10px;line-height:1.5;text-align:center}.pr-zoom-label{width:100%;display:grid;gap:5px;color:#52675b;font-size:11px}.pr-zoom-label input{width:100%;accent-color:#235347}.pr-edit-fields{display:grid;gap:13px}.pr-edit-fields textarea{box-sizing:border-box;height:auto;padding-top:11px;resize:vertical}.pr-dialog-actions{padding-top:10px;border-top:1px solid #edf1ed}@media(max-width:560px){.pr-edit-grid{grid-template-columns:1fr;gap:17px}.pr-edit-photo{display:grid;grid-template-columns:92px 1fr;justify-items:start;align-items:center;column-gap:14px}.pr-crop-frame{grid-row:span 3;width:92px;height:92px;border-radius:16px}.pr-crop-frame span{font-size:34px}.pr-crop-hint{max-width:none;text-align:left}.pr-zoom-label{grid-column:1/-1}.pr-edit-fields{gap:11px}}`;
  style.textContent += `.pr-avatar-placeholder{width:100%;height:100%;display:block}.pr-crop-placeholder{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}.pr-crop-loading{position:absolute;inset:0;display:grid;place-items:center;background:#eaf4ed;color:#526b5b;font-size:12px}.pr-crop-frame [hidden]{display:none!important}`;
  style.textContent += `.pr-page{max-width:1180px;margin-inline:auto;padding:4px 0 30px}.pr-hero{position:relative;grid-template-columns:112px minmax(0,1fr) auto;gap:24px;min-height:160px;padding:25px 30px;border:1px solid #dce9df;border-radius:24px;background:radial-gradient(ellipse at 88% 0%,#e5f2e7 0,transparent 38%),linear-gradient(135deg,#fff 0%,#f7fbf7 100%);box-shadow:0 12px 32px #123a2a08}.pr-avatar-wrap{width:108px;height:108px}.pr-avatar{width:108px;height:108px;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 1px #c8ddce,0 8px 22px #123a2a14}.pr-avatar-edit{right:0;bottom:0;width:34px;height:34px;display:grid;place-items:center;box-shadow:0 3px 12px #123a2a28}.pr-avatar-edit .fi-icon{width:15px;height:15px}.pr-identity{min-width:0}.pr-identity h1{color:#0b2b26;font-size:clamp(24px,2.5vw,32px);letter-spacing:-.9px}.pr-identity>p{max-width:610px;margin:7px 0 12px;color:#63736a;font-size:13px}.pr-badges span{border:1px solid #d8e9dc;background:#eef6ef;color:#3f7154}.pr-badges span.verified{border-color:#d7e8db;background:#e7f3e9;color:#235347}.pr-edit{min-width:128px;align-self:center}.pr-impact{margin-top:30px}.pr-section-title{margin-bottom:12px}.pr-section-title h2{color:#0b2b26;font-size:18px;font-weight:600;letter-spacing:-.25px}.pr-section-title>span{font-size:10px}.pr-impact-grid{gap:12px}.pr-impact-card{position:relative;min-height:120px;padding:17px 19px;border-color:#e0eae2;border-radius:18px;background:linear-gradient(145deg,#fff,#f8fbf8);box-shadow:0 7px 22px #123a2a07}.pr-impact-icon{width:32px;height:32px;background:#e4f1e6;color:#235347}.pr-impact-icon.mint{background:#e4f1e6;color:#235347}.pr-impact-icon.light{background:#e4f1e6;color:#235347}.pr-impact-card>strong{margin:9px 0 0;color:#163832;font-size:26px;font-weight:650}.pr-impact-card>small{color:#6f7d73;font-size:9px;letter-spacing:.06em}.pr-impact-card.deep{border-color:#e0eae2;background:linear-gradient(145deg,#fff,#f8fbf8)}.pr-impact-card.deep>strong,.pr-impact-card.deep>small{color:#163832}.pr-detail-grid{gap:22px;margin-top:31px}.pr-details,.pr-products{border:1px solid #e3ebe4;border-radius:18px;background:#fff;box-shadow:0 6px 20px #123a2a06}.pr-details>div{min-height:62px;padding:12px 17px;border-color:#edf2ed}.pr-detail-icon{width:30px;height:30px;flex:none;border-radius:10px;display:grid;place-items:center;background:#f0f6f1;color:#3b7155}.pr-details small{font-size:8px}.pr-details strong{color:#283c31;font-size:12px}.pr-products{min-height:184px;padding:7px 15px}.pr-product{min-height:54px;padding-inline:3px;transition:background .18s ease}.pr-product:hover{background:#f7faf7}.pr-product img{width:42px;height:42px;border-radius:11px}.pr-product strong{color:#203b30;font-size:11px}.pr-product small{font-size:10px}.pr-product>b .fi-icon{width:15px;height:15px}.pr-empty{margin:23px 0 15px}.pr-bottom-actions{margin-top:25px;padding-top:17px}.pr-logout{border-color:#f0d9d6;background:#fff8f7}.pr-dialog{border:1px solid #dce9df}.pr-dialog-card{background:#fff}@media(max-width:760px){.pr-page{padding-top:0}.pr-detail-grid{gap:20px}.pr-section-title{align-items:center}}@media(max-width:540px){.pr-hero{grid-template-columns:68px minmax(0,1fr);gap:13px;padding:17px 15px;border-radius:20px}.pr-avatar-wrap,.pr-avatar{width:68px;height:68px}.pr-avatar{border-width:2px}.pr-avatar-edit{width:27px;height:27px}.pr-identity h1{font-size:19px}.pr-identity>p{margin:5px 0 8px;font-size:10px;line-height:1.45}.pr-badges{gap:5px}.pr-badges span{padding:4px 7px;font-size:8px}.pr-edit{grid-column:1/-1;min-height:38px}.pr-impact{margin-top:23px}.pr-impact-grid{gap:7px}.pr-impact-card{padding:11px 12px;border-radius:14px}.pr-impact-icon{width:29px;height:29px}.pr-impact-card>strong{top:14px;right:13px;font-size:21px}.pr-impact-card>small{font-size:8px}.pr-detail-grid{margin-top:25px;gap:22px}.pr-section-title h2{font-size:17px}.pr-details>div{min-height:58px}.pr-products{min-height:0}.pr-bottom-actions{margin-top:22px}}`;
  style.textContent += `.pr-address-card{margin-top:26px;padding:20px 23px;display:flex;align-items:center;justify-content:space-between;gap:18px;border:1px solid #e0eae2;border-radius:18px;background:linear-gradient(120deg,#fff,#f7fbf7);box-shadow:0 6px 20px #123a2a06}.pr-address-card h2{margin:0;color:#163832;font-size:17px}.pr-address-summary{margin:8px 0 0;color:#63736a;font-size:12px;line-height:1.65}.pr-address-dialog{width:min(720px,calc(100% - 24px))}.pr-address-form{gap:11px}.pr-address-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 13px}.pr-address-fields .fi-label{display:grid;gap:6px;margin:0 0 9px;color:#52675b;font-size:11px;font-weight:600}.pr-address-fields .fi-input{box-sizing:border-box;width:100%;min-width:0;min-height:42px;padding:0 11px;border:1px solid #d9e4dc;border-radius:10px;background:#fff;color:#263c31;font:500 12px Inter,Arial,sans-serif}.pr-address-fields .fi-input:focus{border-color:#54977d;outline:3px solid #54977d20}.pr-address-notes{grid-column:1/-1}.pr-address-map-label{margin:5px 0 -5px;color:#52675b;font-size:11px;font-weight:650}.pr-address-map-label small{display:block;margin-top:4px;color:#74827b;font-weight:400;line-height:1.5}.pr-address-error{margin:0;color:#b44740;font-size:11px;line-height:1.5}.pr-address-error:empty{display:none}.pr-address-form .fi-location-map{height:260px;min-height:220px}.pr-address-form .fi-map-controls{margin-bottom:0}.pr-address-form .pr-dialog-actions{margin-top:3px}@media(max-width:540px){.pr-address-card{align-items:stretch;flex-direction:column;padding:17px}.pr-address-card .fi-button{width:100%}.pr-address-fields{grid-template-columns:1fr;gap:0}.pr-address-notes{grid-column:auto}.pr-address-form .fi-location-map{height:230px}}`;
  document.head.append(style);
}
