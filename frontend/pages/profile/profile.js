import { loadStylesheet } from '../../utils/stylesheet.js';
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
import {
  formatProductWeight,
  productWeightGrams,
  totalProductWeightGrams,
} from '../../utils/product-weight.js';
import { bindRegionAddress } from '../../utils/region-address.js';
import { mountLocationPicker, validCoordinates } from '../../utils/location-map.js';
import { translate } from '../../utils/i18n.js';

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
  const region = [address.village, address.district, address.city, address.province]
    .filter(Boolean)
    .join(', ');
  return `<section class="pr-address-card fi-card"><div><p class="pr-kicker">PENGIRIMAN</p><h2>Alamat tersimpan</h2><p class="pr-address-summary">${
    hasAddress
      ? `${escapeHtml(address.recipientName || '')}${address.phone ? ` · ${escapeHtml(address.phone)}` : ''}<br>${escapeHtml(address.details || '')}${region ? `<br>${escapeHtml(region)}` : ''}${address.postalCode ? `<br>Kode pos ${escapeHtml(address.postalCode)}` : ''}`
      : 'Belum ada alamat tersimpan. Tambahkan alamat agar lebih cepat saat checkout.'
  }</p></div><button class="fi-button fi-button-outline" type="button" data-edit-address>${hasAddress ? 'Ubah alamat' : 'Tambah alamat'}</button></section>`;
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
    const totalWeight = totalProductWeightGrams(products);
    renderShell(
      '',
      `<section class="pr-page"><div class="pr-hero fi-card"><div class="pr-avatar-wrap"><div class="pr-avatar">${user.avatar ? `<img src="${escapeHtml(user.avatar)}" alt="Foto profil ${escapeHtml(user.name || user.email)}">` : `<svg class="pr-avatar-placeholder" role="img" aria-label="Foto profil bawaan" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49" fill="#edf0eb"/><circle cx="50" cy="37" r="17" fill="#718076"/><path d="M18 88c2-20 15-31 32-31s30 11 32 31" fill="#718076"/></svg>`}</div><button type="button" class="pr-avatar-edit" data-edit-profile aria-label="Edit profil">${icon('edit')}</button></div><div class="pr-identity"><h1>${escapeHtml(user.name || user.username || 'Pengguna Food Ilee')}</h1><p>${escapeHtml(user.bio || 'Bersama membangun ekosistem pangan yang lebih sirkular.')}</p><div class="pr-badges"><span>Anggota sejak ${new Date(user.createdAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>${user.role === 'admin' ? '<span class="verified">Tim Food Ilee</span>' : ''}</div></div><button class="fi-button pr-edit" data-edit-profile>Edit Profil</button></div><section class="pr-impact"><div class="pr-section-title"><div><p class="pr-kicker">AKTIVITAS ANDA</p><h2>Ringkasan sirkular</h2></div><span>Data dari aktivitas akun Food Ilee</span></div><div class="pr-impact-grid"><article class="pr-impact-card"><span class="pr-impact-icon">${icon('package')}</span><strong>${products.length}</strong><small>Produk ditawarkan</small></article><article class="pr-impact-card"><span class="pr-impact-icon mint">${icon('scale')}</span><strong>${escapeHtml(formatProductWeight(totalWeight))}</strong><small>Total berat tersedia</small></article><article class="pr-impact-card deep"><span class="pr-impact-icon light">${icon('receipt')}</span><strong>${orders.length}</strong><small>Pesanan dibuat</small></article></div></section><div class="pr-detail-grid"><section><div class="pr-section-title"><div><p class="pr-kicker">AKUN</p><h2>Detail akun</h2></div></div><div class="pr-details fi-card"><div><span class="pr-detail-icon">${icon('mail')}</span><p><small>ALAMAT EMAIL</small><strong>${escapeHtml(user.email)}</strong></p></div><div><span class="pr-detail-icon">${icon('profile')}</span><p><small>NAMA PENGGUNA</small><strong>${escapeHtml(user.username || 'Belum diatur')}</strong></p></div><div><span class="pr-detail-icon">${icon('calendar')}</span><p><small>BERGABUNG</small><strong>${new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p></div></div></section><section><div class="pr-section-title"><div><p class="pr-kicker">ETALASE</p><h2>Aktivitas penawaran</h2></div><a href="#kelola-toko">Kelola toko <span>→</span></a></div><div class="pr-products fi-card">${
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
    document.querySelectorAll('.pr-product').forEach((card, index) => {
      const product = products[index];
      const details = card.querySelector('small');
      if (!product || !details) return;
      details.textContent = translate(
        `${Number(product.stock || 0).toLocaleString('id-ID')} unit · ${formatProductWeight(productWeightGrams(product))}/unit · ${formatRupiah(product.price)}/unit`,
      );
    });
    document
      .querySelector('.pr-bottom-actions')
      .insertAdjacentHTML('beforebegin', renderShippingAddress(savedShippingAddress()));
    document
      .querySelector('[data-edit-address]')
      .addEventListener('click', () => openEditAddress(savedShippingAddress()));
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
  dialog.setAttribute('aria-labelledby', 'pr-address-title');
  dialog.innerHTML = `<form class="pr-dialog-card pr-address-form"><button class="pr-dialog-close" type="button" aria-label="Tutup">×</button><p class="pr-kicker">PENGIRIMAN</p><h2 id="pr-address-title">${saved.recipientName ? 'Ubah alamat' : 'Tambah alamat'}</h2><p class="pr-dialog-intro">Alamat tersimpan di perangkat ini dan akan digunakan saat checkout.</p><div class="pr-address-fields"><label class="fi-label">Nama penerima<input class="fi-input" name="recipientName" value="${escapeHtml(saved.recipientName || '')}" required maxlength="100" autocomplete="name"></label><label class="fi-label">Nomor telepon<input class="fi-input" name="phone" value="${escapeHtml(saved.phone || '')}" required maxlength="20" inputmode="tel" autocomplete="tel"></label><label class="fi-label">Provinsi<select class="fi-input" id="profile-address-province" required><option value="">Pilih provinsi</option></select></label><label class="fi-label">Kabupaten/Kota<select class="fi-input" id="profile-address-city" required disabled><option value="">Pilih kabupaten/kota</option></select></label><label class="fi-label">Kecamatan<select class="fi-input" id="profile-address-district" required disabled><option value="">Pilih kecamatan</option></select></label><label class="fi-label">Desa/Kelurahan<select class="fi-input" id="profile-address-village" required disabled><option value="">Pilih desa/kelurahan</option></select></label><label class="fi-label">Nama jalan, nomor, RT/RW<input class="fi-input" id="profile-address-details" value="${escapeHtml(saved.details || '')}" required maxlength="240" placeholder="Contoh: Jl. Melati No. 10, RT 02/RW 01"></label><label class="fi-label">Kode pos<input class="fi-input" id="profile-address-postal" name="postalCode" value="${escapeHtml(saved.postalCode || '')}" required inputmode="numeric" pattern="[0-9]{5}" maxlength="5"></label><label class="fi-label pr-address-notes">Catatan untuk kurir (opsional)<input class="fi-input" name="notes" value="${escapeHtml(saved.notes || '')}" maxlength="200"></label></div><p class="pr-address-map-label">Titik lokasi penerima <small>Pilih titik pada peta untuk menyesuaikan provinsi, kabupaten/kota, kecamatan, dan desa.</small></p><div id="profile-address-map" class="fi-location-map" role="application" aria-label="Peta alamat penerima"></div><div class="fi-map-controls"><button type="button" class="fi-button fi-button-outline" id="profile-address-locate">Gunakan lokasi perangkat</button><span id="profile-address-map-status" role="status">Pilih titik di peta untuk mengisi wilayah otomatis.</span></div><input type="hidden" name="latitude"><input type="hidden" name="longitude"><p class="pr-address-error" role="alert"></p><div class="pr-dialog-actions"><button class="fi-button fi-button-outline" type="button" data-cancel>Batal</button><button class="fi-button" type="submit">Simpan alamat</button></div></form>`;
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
    allowRegionChange: true,
    onAddressChange: async (names) => {
      const regionAddress = await regionAddressPromise;
      await regionAddress.selectRegion(names);
    },
  }).catch((error) => {
    mapStatus.textContent = error.message;
    return null;
  });
  const regionName = (level) =>
    form.querySelector(`#profile-address-${level}`)?.selectedOptions[0]?.textContent?.trim() || '';
  const updateAddressMapArea = async () => {
    try {
      const picker = await mapPickerPromise;
      if (picker)
        await picker.setArea({
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
  dialog
    .querySelectorAll('[data-cancel],.pr-dialog-close')
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
      document
        .querySelector('[data-edit-address]')
        .addEventListener('click', () => openEditAddress(address));
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
  dialog.setAttribute('aria-labelledby', 'pr-edit-title');
  dialog.innerHTML = `<form class="pr-dialog-card"><button class="pr-dialog-close" type="button" aria-label="Tutup">×</button><p class="pr-kicker">AKUN FOOD ILEE</p><h2 id="pr-edit-title">Edit profil</h2><p class="pr-dialog-intro">Perbarui informasi dan foto yang tampil di akun Anda.</p><div class="pr-edit-grid"><div class="pr-edit-photo"><div class="pr-crop-frame"><img class="pr-current-avatar" data-current-avatar src="${escapeHtml(user.avatar || '')}" alt="Foto profil saat ini" ${user.avatar ? '' : 'hidden'}><img class="pr-crop-preview" data-crop-preview alt="Pratinjau foto yang akan diunggah" hidden><svg class="pr-crop-placeholder" data-crop-placeholder role="img" aria-label="Foto profil bawaan" viewBox="0 0 100 100" ${user.avatar ? 'hidden' : ''}><circle cx="50" cy="50" r="49" fill="#edf0eb"/><circle cx="50" cy="37" r="17" fill="#718076"/><path d="M18 88c2-20 15-31 32-31s30 11 32 31" fill="#718076"/></svg><span class="pr-crop-loading" data-crop-loading hidden>Memuat foto…</span></div><label class="pr-upload-button">Pilih foto<input name="avatar" type="file" accept="image/jpeg,image/png,image/webp"></label><small class="pr-crop-hint">Geser foto untuk mengatur posisi. Hasil akan dipotong persegi 1:1.</small><label class="pr-zoom-label">Perbesar foto<input data-crop-zoom type="range" min="1" max="3" step="0.01" value="1" disabled></label></div><div class="pr-edit-fields"><label class="fi-label">Nama lengkap<input class="fi-input" name="name" value="${escapeHtml(user.name || '')}" required minlength="3"></label><label class="fi-label">Nama pengguna<input class="fi-input" name="username" value="${escapeHtml(user.username || '')}" required minlength="3" maxlength="30" autocomplete="username" aria-describedby="pr-username-status"><small class="pr-username-status" id="pr-username-status" role="status" aria-live="polite"></small></label><label class="fi-label">Tentang Anda<textarea class="fi-input" name="bio" rows="4" maxlength="240">${escapeHtml(user.bio || '')}</textarea></label></div></div><div class="pr-dialog-actions"><button class="fi-button fi-button-outline" type="button" data-cancel>Batal</button><button class="fi-button" type="submit">Simpan perubahan</button></div></form>`;
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
    const scale =
      Math.max(frameWidth / cropImage.naturalWidth, frameHeight / cropImage.naturalHeight) *
      Number(cropZoom.value);
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
    const scale =
      Math.max(
        cropFrame.clientWidth / cropImage.naturalWidth,
        cropFrame.clientHeight / cropImage.naturalHeight,
      ) * Number(cropZoom.value);
    const overflowX = Math.max(0, cropImage.naturalWidth * scale - cropFrame.clientWidth);
    const overflowY = Math.max(0, cropImage.naturalHeight * scale - cropFrame.clientHeight);
    cropX = overflowX
      ? Math.max(0, Math.min(1, dragStart.cropX + (event.clientX - dragStart.x) / overflowX))
      : 0.5;
    cropY = overflowY
      ? Math.max(0, Math.min(1, dragStart.cropY + (event.clientY - dragStart.y) / overflowY))
      : 0.5;
    updateCropPreview();
  });
  cropFrame.addEventListener('pointerup', () => {
    dragStart = null;
  });
  cropFrame.addEventListener('pointercancel', () => {
    dragStart = null;
  });
  dialog.addEventListener('close', () => {
    if (cropObjectUrl) URL.revokeObjectURL(cropObjectUrl);
    dialog.remove();
  });
  const usernameInput = form.elements.username;
  const usernameStatus = dialog.querySelector('#pr-username-status');
  const submitButton = form.querySelector('[type="submit"]');
  const originalUsername = String(user.username || '')
    .trim()
    .toLowerCase();
  let usernameCheckRevision = 0;
  let usernameCheckTimer;
  const setUsernameStatus = (state, message) => {
    usernameStatus.textContent = message;
    usernameStatus.dataset.state = state;
    usernameInput.setAttribute(
      'aria-invalid',
      String(state === 'unavailable' || state === 'invalid'),
    );
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
      setUsernameStatus(
        'invalid',
        username.length < 3 ? 'Username minimal 3 karakter.' : 'Username maksimal 30 karakter.',
      );
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
        throw new Error(
          'Foto belum tersimpan di server. Periksa koneksi penyimpanan foto lalu coba lagi.',
        );
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
  loadStylesheet('profile-style', new URL('../../styles/pages/profile.css', import.meta.url));
}
