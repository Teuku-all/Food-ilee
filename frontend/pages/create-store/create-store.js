import { createStore, getMyStore } from '../../services/store.js';
import { escapeHtml } from '../../utils/html.js';
import { renderShell, showToast } from '../../ui/shell.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { skeleton } from '../../ui/skeleton.js';
import { bindRegionAddress } from '../../utils/region-address.js';

export async function renderCreateStore() {
  const navigationRevision = getNavigationRevision();
  injectCreateStoreStyles();
  renderShell('', createStoreLoadingSkeleton());
  try {
    const result = await getMyStore();
    if (!isRouteCurrent('#buat-toko', navigationRevision)) return;
    if (result.success && result.data) {
      location.hash = '#kelola-toko';
      return;
    }
  } catch {
    /* allow retrying the form when shop lookup is unavailable */
  }
  if (!isRouteCurrent('#buat-toko', navigationRevision)) return;
  renderShell(
    '',
    `<section class="cs-page"><a class="cs-back" href="#dashboard">← Kembali ke dashboard</a><div class="cs-layout"><div class="cs-story"><p class="cs-kicker">BANGUN TOKO SIRKULAR ANDA</p><h1>Ruang untuk<br><em>nilai yang baru.</em></h1><p>Buat etalase agar calon pembeli mengenal sumber bahan organik yang Anda tawarkan.</p><div class="cs-story-art"><span>F</span><i></i><b></b></div><small>Nama dan cerita toko Anda akan tampil di marketplace.</small></div><form id="store-form" class="cs-form fi-card"><p class="cs-kicker">MULAI BERJUAL</p><h2>Buka toko Anda</h2><p>Alamat pickup dipakai menghitung ongkir. Rekening disimpan untuk pencatatan pembayaran penjual.</p><label class="fi-label">Nama toko<input class="fi-input" type="text" name="name" placeholder="Contoh: Kebun Berkah Organik" required minlength="3" maxlength="80"></label><label class="fi-label">Lokasi toko<input class="fi-input" type="text" name="location" placeholder="Kecamatan, kota, provinsi" maxlength="180"></label><section class="cs-form-section cs-pickup-section"><div class="cs-section-heading"><span>01</span><div><h3>Alamat pickup</h3><p>Lokasi ini digunakan untuk mengecek ongkir dan menjemput pesanan.</p></div></div><div class="cs-form-grid"><label class="fi-label">Nama kontak<input class="fi-input" name="shippingOriginContactName" required maxlength="100" placeholder="Nama yang bisa dihubungi"></label><label class="fi-label">Nomor telepon<input class="fi-input" name="shippingOriginContactPhone" required maxlength="20" inputmode="tel" placeholder="08xxxxxxxxxx"></label></div><div class="cs-region-grid"><label class="fi-label">Provinsi<select class="fi-input" id="store-province" required><option value="">Pilih provinsi</option></select></label><label class="fi-label">Kabupaten/Kota<select class="fi-input" id="store-city" required disabled><option value="">Pilih kabupaten/kota</option></select></label><label class="fi-label">Kecamatan<select class="fi-input" id="store-district" required disabled><option value="">Pilih kecamatan</option></select></label><label class="fi-label">Desa/Kelurahan<select class="fi-input" id="store-village" required disabled><option value="">Pilih desa/kelurahan</option></select></label></div><p id="store-region-error" class="cs-region-error" role="alert"></p><div class="cs-form-grid cs-address-detail-grid"><label class="fi-label">Nama jalan, nomor, RT/RW<input class="fi-input" id="store-details" required maxlength="240" placeholder="Contoh: Jl. Melati No. 10, RT 02/RW 01"></label><label class="fi-label">Kode pos<input class="fi-input" id="store-postal" name="shippingOriginPostalCode" required inputmode="numeric" pattern="[0-9]{5}" maxlength="5" placeholder="12345"></label></div><input type="hidden" name="shippingOriginAddress"><input type="hidden" name="shippingOriginRegion"></section><h3>Rekening penerimaan penjual</h3><p>Pembayaran Midtrans saat ini masuk ke Food Ilee. Rekening ini dipakai untuk pencatatan dan penyelesaian dana ke penjual.</p><label class="fi-label">Nama bank<input class="fi-input" name="bankName" required maxlength="60" placeholder="Contoh: BCA"></label><label class="fi-label">Nomor rekening<input class="fi-input" name="bankAccountNumber" required inputmode="numeric" pattern="[0-9 -]{6,36}" maxlength="36"></label><label class="fi-label">Nama pemilik rekening<input class="fi-input" name="bankAccountHolder" required maxlength="100"></label><label class="fi-label">Cerita toko<textarea class="fi-input" name="description" rows="4" placeholder="Ceritakan sumber dan jenis bahan yang Anda tawarkan…" maxlength="500"></textarea></label><label class="fi-label">Foto toko <span class="cs-muted">Opsional · JPG/PNG maksimal 5 MB</span><input class="fi-input" type="file" name="image" accept="image/*"></label><img class="cs-preview" alt="Pratinjau foto toko"><button class="fi-button cs-submit" type="submit">Buat toko <span>→</span></button><small class="cs-privacy">Nama dan profil toko tampil di marketplace; data rekening disimpan untuk internal.</small></form></div></section>`,
  );
  injectCreateStoreStyles();
  const form = document.getElementById('store-form');
  const regionAddress = await bindRegionAddress(form, 'store');
  const preview = document.querySelector('.cs-preview');
  form.elements.image.addEventListener('change', () => {
    const image = form.elements.image.files[0];
    if (!image) return;
    if (!image.type.startsWith('image/') || image.size > 5 * 1024 * 1024) {
      showToast('Pilih foto berformat gambar, maksimal 5 MB.', 'error');
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
      const data = new FormData(form);
      data.set('shippingOriginAddress', pickup.address);
      data.set('shippingOriginRegion', JSON.stringify(pickup.region));
      const result = await createStore(data);
      if (!result.success) throw new Error(result.message || 'Toko belum dapat dibuat.');
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
  if (document.getElementById('create-store-style')) return;
  const style = document.createElement('style');
  style.id = 'create-store-style';
  style.textContent = `.cs-page{max-width:1080px;margin:auto;padding:0 15px 15px}.cs-back{display:inline-block;margin-bottom:24px;color:#597268;text-decoration:none;font-size:12px}.cs-layout{display:grid;grid-template-columns:.9fr 1.1fr;align-items:stretch;gap:25px}.cs-story{position:relative;min-height:540px;padding:47px 39px;border-radius:27px;overflow:hidden;background:linear-gradient(158deg,#eaf5f3,#d7e9e7 57%,#c6e0dd)}.cs-kicker{margin:0 0 10px;color:#668774;font-size:9px;font-weight:700;letter-spacing:.15em}.cs-story h1{margin:0;color:#004847;font-size:42px;font-weight:500;line-height:1.12;letter-spacing:-1.4px}.cs-story h1 em{color:#5f9978;font-style:normal}.cs-story>p:not(.cs-kicker){max-width:320px;margin:16px 0;color:#597369;font-size:13px;line-height:1.7}.cs-story-art{position:absolute;left:50%;top:53%;width:250px;height:250px;transform:translate(-50%,-15%);border:1px solid #588e6e3b;border-radius:50%;display:grid;place-items:center}.cs-story-art:before,.cs-story-art:after{content:'';position:absolute;inset:12%;border:1px solid #588e6e45;border-radius:50%;transform:scaleX(1.45) rotate(32deg)}.cs-story-art:after{transform:scaleX(.75) rotate(-38deg)}.cs-story-art span{width:92px;height:92px;border-radius:27px 27px 27px 7px;display:grid;place-items:center;background:#176457;color:white;font-size:44px;font-weight:600;box-shadow:0 15px 30px #17493825}.cs-story-art i,.cs-story-art b{position:absolute;width:16px;height:16px;border:4px solid #f8fff8;border-radius:50%;background:#4d936f;box-shadow:0 3px 12px #194b3530}.cs-story-art i{top:29px;right:47px}.cs-story-art b{left:30px;bottom:51px;width:11px;height:11px}.cs-story>small{position:absolute;left:39px;bottom:30px;color:#748e7e;font-size:10px}.cs-form{padding:37px 38px;border-radius:27px;box-shadow:0 12px 36px #123a2a0b}.cs-form>h2{margin:0;color:#183f32;font-size:29px;font-weight:550;letter-spacing:-.6px}.cs-form>p:not(.cs-kicker){margin:9px 0 23px;color:#78847d;font-size:12px;line-height:1.65}.cs-form label{margin-bottom:16px}.cs-form textarea.fi-input{box-sizing:border-box;height:auto;padding-top:12px;resize:vertical}.cs-muted{float:right;color:#99a39c;font-size:9px;font-weight:400}.cs-preview{display:none;width:100%;max-height:180px;margin:-5px 0 17px;border-radius:15px;object-fit:cover}.cs-preview.visible{display:block}.cs-submit{width:100%;margin-top:7px}.cs-privacy{display:block;margin-top:14px;color:#909b94;font-size:9px;text-align:center}@media(max-width:760px){.cs-layout{grid-template-columns:1fr}.cs-story{min-height:260px;padding:30px}.cs-story h1{font-size:34px}.cs-story-art{right:12px;left:auto;top:35px;width:145px;height:145px;transform:none}.cs-story-art span{width:60px;height:60px;border-radius:19px;font-size:30px}.cs-story-art i{top:14px;right:24px}.cs-story-art b{left:16px;bottom:27px}.cs-story>p:not(.cs-kicker){max-width:230px;font-size:11px}.cs-story>small{left:30px;bottom:19px;font-size:8px}.cs-form{padding:25px 20px}}`;
  style.textContent += `.cs-pickup-section{margin:25px 0;padding:20px;border:1px solid #dce9e5;border-radius:20px;background:linear-gradient(145deg,#f7fbf9,#f1f8f5)}.cs-section-heading{display:flex;align-items:flex-start;gap:12px;margin-bottom:19px}.cs-section-heading>span{flex:none;width:31px;height:31px;border-radius:10px;display:grid;place-items:center;background:#dcefe8;color:#176457;font-size:11px;font-weight:800}.cs-section-heading h3{margin:1px 0 4px;color:#17473e;font-size:15px}.cs-section-heading p{margin:0;color:#7b8b83;font-size:11px;line-height:1.5}.cs-form-grid,.cs-region-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 13px}.cs-address-detail-grid{grid-template-columns:minmax(0,1.5fr) minmax(100px,.65fr)}.cs-pickup-section .fi-label{display:block;min-width:0;margin-bottom:12px;color:#526a60;font-size:11px;font-weight:650}.cs-pickup-section .fi-input{box-sizing:border-box;width:100%;min-height:45px;margin-top:7px;padding:0 12px;border:1px solid #d6e2dd;border-radius:12px;background:#fff;color:#26483c;font-size:12px;outline:none;transition:border-color .16s,box-shadow .16s}.cs-pickup-section .fi-input:focus{border-color:#54977d;box-shadow:0 0 0 3px #54977d20}.cs-pickup-section select.fi-input{padding-right:34px;cursor:pointer}.cs-pickup-section select:disabled{background:#edf2ef;color:#a1aca6;cursor:not-allowed}.cs-region-error{min-height:0;margin:0 0 10px;color:#a54e43;font-size:11px;line-height:1.5}.cs-region-error:empty{display:none}@media(max-width:520px){.cs-pickup-section{padding:15px;border-radius:16px}.cs-form-grid,.cs-region-grid,.cs-address-detail-grid{grid-template-columns:1fr;gap:0}.cs-section-heading{margin-bottom:15px}}`;
  document.head.append(style);
}
