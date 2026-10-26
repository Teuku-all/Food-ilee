import { loadStylesheet } from '../../utils/stylesheet.js';
import { createStore, getMyStore } from '../../services/store.js';
import { invalidateStoreAccess } from '../../utils/store-access.js';
import { escapeHtml } from '../../utils/html.js';
import { renderShell, showToast } from '../../ui/shell.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { skeleton } from '../../ui/skeleton.js';
import { bindRegionAddress } from '../../utils/region-address.js';
import { mountLocationPicker } from '../../utils/location-map.js';
import { compressImage } from '../../utils/image-compress.js';

export async function renderCreateStore() {
  const navigationRevision = getNavigationRevision();
  injectCreateStoreStyles();
  renderShell('', createStoreLoadingSkeleton());
  try {
    const result = await getMyStore();
    if (!isRouteCurrent('#buat-toko', navigationRevision)) return;
    if (result.success && result.data) {
      invalidateStoreAccess();
      location.hash = '#kelola-toko';
      return;
    }
  } catch {
    /* allow retrying the form when shop lookup is unavailable */
  }
  if (!isRouteCurrent('#buat-toko', navigationRevision)) return;
  renderShell(
    '',
    `<section class="cs-page"><a class="cs-back" href="#marketplace">← Kembali ke marketplace</a><div class="cs-layout"><div class="cs-story"><p class="cs-kicker">BANGUN TOKO SIRKULAR ANDA</p><h1>Ruang untuk<br><em>nilai yang baru.</em></h1><p>Buat etalase agar calon pembeli mengenal sumber bahan organik yang Anda tawarkan.</p><small>Nama dan cerita toko Anda akan tampil di marketplace.</small></div><form id="store-form" class="cs-form fi-card"><p class="cs-kicker">MULAI BERJUAL</p><h2>Buka toko Anda</h2><p>Alamat pickup dipakai menghitung ongkir. Rekening disimpan untuk pencatatan pembayaran penjual.</p><label class="fi-label">Nama toko<input class="fi-input" type="text" name="name" placeholder="Contoh: Kebun Berkah Organik" required minlength="3" maxlength="80"></label><label class="fi-label">Lokasi toko<input class="fi-input" type="text" name="location" placeholder="Kecamatan, kota, provinsi" maxlength="180"></label><section class="cs-form-section cs-pickup-section"><div class="cs-section-heading"><span>01</span><div><h3>Alamat pickup</h3><p>Lokasi ini digunakan untuk mengecek ongkir dan menjemput pesanan.</p></div></div><div class="cs-form-grid"><label class="fi-label">Nama kontak<input class="fi-input" name="shippingOriginContactName" required maxlength="100" placeholder="Nama yang bisa dihubungi"></label><label class="fi-label">Nomor telepon<input class="fi-input" name="shippingOriginContactPhone" required maxlength="20" inputmode="tel" placeholder="08xxxxxxxxxx"></label></div><div class="cs-region-grid"><label class="fi-label">Provinsi<select class="fi-input" id="store-province" required><option value="">Pilih provinsi</option></select></label><label class="fi-label">Kabupaten/Kota<select class="fi-input" id="store-city" required disabled><option value="">Pilih kabupaten/kota</option></select></label><label class="fi-label">Kecamatan<select class="fi-input" id="store-district" required disabled><option value="">Pilih kecamatan</option></select></label><label class="fi-label">Desa/Kelurahan<select class="fi-input" id="store-village" required disabled><option value="">Pilih desa/kelurahan</option></select></label></div><p id="store-region-error" class="cs-region-error" role="alert"></p><div class="cs-form-grid cs-address-detail-grid"><label class="fi-label">Nama jalan, nomor, RT/RW<input class="fi-input" id="store-details" required maxlength="240" placeholder="Contoh: Jl. Melati No. 10, RT 02/RW 01"></label><label class="fi-label">Kode pos<input class="fi-input" id="store-postal" name="shippingOriginPostalCode" required inputmode="numeric" pattern="[0-9]{5}" maxlength="5" placeholder="12345"></label></div><input type="hidden" name="shippingOriginAddress"><input type="hidden" name="shippingOriginRegion"></section><h3>Rekening penerimaan penjual</h3><p>Pembayaran Midtrans saat ini masuk ke Food Ilee. Rekening ini dipakai untuk pencatatan dan penyelesaian dana ke penjual.</p><label class="fi-label">Nama bank<input class="fi-input" name="bankName" required maxlength="60" placeholder="Contoh: BCA"></label><label class="fi-label">Nomor rekening<input class="fi-input" name="bankAccountNumber" required inputmode="numeric" pattern="[0-9 -]{6,36}" maxlength="36"></label><label class="fi-label">Nama pemilik rekening<input class="fi-input" name="bankAccountHolder" required maxlength="100"></label><label class="fi-label">Cerita toko<textarea class="fi-input" name="description" rows="4" placeholder="Ceritakan sumber dan jenis bahan yang Anda tawarkan…" maxlength="500"></textarea></label><label class="fi-label">Foto toko <span class="cs-muted">Opsional · JPG/PNG maksimal 4 MB</span><input class="fi-input" type="file" name="image" accept="image/*"></label><img class="cs-preview" alt="Pratinjau foto toko"><button class="fi-button cs-submit" type="submit">Buat toko <span>→</span></button><small class="cs-privacy">Nama dan profil toko tampil di marketplace; data rekening disimpan untuk internal.</small></form></div></section>`,
  );
  document.querySelector('.cs-muted').textContent = 'Opsional · foto dikompres otomatis';
  injectCreateStoreStyles();
  const form = document.getElementById('store-form');
  const regionAddress = await bindRegionAddress(form, 'store');
  const mapSection = document.createElement('div');
  mapSection.innerHTML =
    '<label class="fi-label fi-map-label">Titik lokasi toko <small>Pilih titik pickup pada peta untuk menyesuaikan alamat administratif secara otomatis.</small></label><div id="store-map" class="fi-location-map" role="application" aria-label="Peta pemilih lokasi toko"></div><div class="fi-map-controls"><button type="button" class="fi-button fi-button-outline" id="store-locate">Gunakan lokasi perangkat</button><span id="store-map-status" role="status">Memuat peta…</span></div><input type="hidden" name="latitude"><input type="hidden" name="longitude">';
  form.querySelector('[name="shippingOriginAddress"]').before(mapSection);
  const mapStatus = form.querySelector('#store-map-status');
  const mapPicker = await mountLocationPicker({
    element: form.querySelector('#store-map'),
    latitudeInput: form.elements.latitude,
    longitudeInput: form.elements.longitude,
    status: mapStatus,
    locateButton: form.querySelector('#store-locate'),
    allowRegionChange: true,
    onAddressChange: (names) => regionAddress.selectRegion(names),
  }).catch((error) => {
    mapStatus.textContent = error.message;
    return null;
  });
  const updateStoreMapArea = async () => {
    if (!mapPicker) return;
    const value = (level) =>
      form.querySelector(`#store-${level}`)?.selectedOptions[0]?.textContent?.trim() || '';
    try {
      await mapPicker.setArea({
        village: value('village'),
        district: value('district'),
        city: value('city'),
        province: value('province'),
      });
    } catch (error) {
      mapStatus.textContent = error.message;
    }
  };
  form.querySelector('#store-district').addEventListener('change', updateStoreMapArea);
  form.querySelector('#store-village').addEventListener('change', updateStoreMapArea);
  for (const level of ['province', 'city']) {
    form.querySelector(`#store-${level}`).addEventListener('change', () => mapPicker?.clearArea());
  }
  const preview = document.querySelector('.cs-preview');
  form.elements.image.addEventListener('change', () => {
    const image = form.elements.image.files[0];
    if (!image) return;
    if (!image.type.startsWith('image/')) {
      showToast('Pilih foto berformat gambar.', 'error');
      form.elements.image.value = '';
      return;
    }
    preview.src = URL.createObjectURL(image);
    preview.classList.add('visible');
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    const previous = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Membuat toko…';
    try {
      const pickup = regionAddress.read();
      if (!form.elements.latitude.value || !form.elements.longitude.value)
        throw new Error('Pilih titik lokasi pickup toko pada peta.');
      const data = new FormData(form);
      const image = form.elements.image.files[0];
      if (image) data.set('image', await compressImage(image));
      data.set('shippingOriginAddress', pickup.address);
      data.set('shippingOriginRegion', JSON.stringify(pickup.region));
      const result = await createStore(data);
      if (!result.success) throw new Error(result.message || 'Toko belum dapat dibuat.');
      invalidateStoreAccess();
      showToast('Toko berhasil dibuat.');
      location.hash = '#kelola-toko';
    } catch (error) {
      showToast(error.message || 'Toko belum dapat dibuat.', 'error');
      button.disabled = false;
      button.innerHTML = previous;
    }
  });
}

function createStoreLoadingSkeleton() {
  return `<section class="cs-page" aria-busy="true"><div class="cs-layout"><div class="cs-story">${skeleton('145px', '10px')}<div style="height:15px"></div>${skeleton('85%', '34px')}${skeleton('70%', '34px')}<div style="height:15px"></div>${skeleton('95%', '13px')}${skeleton('80%', '13px')}</div><div class="cs-form fi-card">${skeleton('100px', '10px')}<div style="height:10px"></div>${skeleton('180px', '27px')}<div style="height:8px"></div>${skeleton('95%', '12px')}<div style="height:22px"></div>${Array.from({ length: 4 }, () => `<div>${skeleton('125px', '11px')}<div style="height:8px"></div>${skeleton('100%', '44px', 'pill')}</div>`).join('')}${skeleton('100%', '42px', 'pill')}</div></div></section>`;
}

function injectCreateStoreStyles() {
  loadStylesheet(
    'create-store-style',
    new URL('../../styles/pages/create-store.css', import.meta.url),
  );
}
