import { createStore, getMyStore } from '../../services/store.js';
import { escapeHtml } from '../../utils/html.js';
import { renderShell, showToast } from '../../ui/shell.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';

export async function renderCreateStore() {
  const navigationRevision = getNavigationRevision();
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
    `<section class="cs-page"><a class="cs-back" href="#dashboard">← Kembali ke dashboard</a><div class="cs-layout"><div class="cs-story"><p class="cs-kicker">BANGUN TOKO SIRKULAR ANDA</p><h1>Ruang untuk<br><em>nilai yang baru.</em></h1><p>Buat etalase agar calon pembeli mengenal sumber bahan organik yang Anda tawarkan.</p><div class="cs-story-art"><span>F</span><i></i><b></b></div><small>Nama dan cerita toko Anda akan tampil di marketplace.</small></div><form id="store-form" class="cs-form fi-card"><p class="cs-kicker">MULAI BERJUAL</p><h2>Buka toko Anda</h2><p>Lengkapi informasi dasar. Anda dapat mulai menambahkan produk setelah toko dibuat.</p><label class="fi-label">Nama toko<input class="fi-input" type="text" name="name" placeholder="Contoh: Kebun Berkah Organik" required minlength="3" maxlength="80"></label><label class="fi-label">Lokasi toko<input class="fi-input" type="text" name="location" placeholder="Kecamatan, kota, provinsi" maxlength="180"></label><label class="fi-label">Cerita toko<textarea class="fi-input" name="description" rows="4" placeholder="Ceritakan sumber dan jenis bahan yang Anda tawarkan…" maxlength="500"></textarea></label><label class="fi-label">Foto toko <span class="cs-muted">Opsional · JPG/PNG maksimal 5 MB</span><input class="fi-input" type="file" name="image" accept="image/*"></label><img class="cs-preview" alt="Pratinjau foto toko"><button class="fi-button cs-submit" type="submit">Buat toko <span>→</span></button><small class="cs-privacy">Informasi toko dapat dilihat oleh pengunjung marketplace.</small></form></div></section>`,
  );
  injectCreateStoreStyles();
  const form = document.getElementById('store-form');
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
      const result = await createStore(new FormData(form));
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

function injectCreateStoreStyles() {
  if (document.getElementById('create-store-style')) return;
  const style = document.createElement('style');
  style.id = 'create-store-style';
  style.textContent = `.cs-page{max-width:1080px;margin:auto;padding:0 15px 15px}.cs-back{display:inline-block;margin-bottom:24px;color:#597268;text-decoration:none;font-size:12px}.cs-layout{display:grid;grid-template-columns:.9fr 1.1fr;align-items:stretch;gap:25px}.cs-story{position:relative;min-height:540px;padding:47px 39px;border-radius:27px;overflow:hidden;background:linear-gradient(158deg,#eaf5f3,#d7e9e7 57%,#c6e0dd)}.cs-kicker{margin:0 0 10px;color:#668774;font-size:9px;font-weight:700;letter-spacing:.15em}.cs-story h1{margin:0;color:#004847;font-size:42px;font-weight:500;line-height:1.12;letter-spacing:-1.4px}.cs-story h1 em{color:#5f9978;font-style:normal}.cs-story>p:not(.cs-kicker){max-width:320px;margin:16px 0;color:#597369;font-size:13px;line-height:1.7}.cs-story-art{position:absolute;left:50%;top:53%;width:250px;height:250px;transform:translate(-50%,-15%);border:1px solid #588e6e3b;border-radius:50%;display:grid;place-items:center}.cs-story-art:before,.cs-story-art:after{content:'';position:absolute;inset:12%;border:1px solid #588e6e45;border-radius:50%;transform:scaleX(1.45) rotate(32deg)}.cs-story-art:after{transform:scaleX(.75) rotate(-38deg)}.cs-story-art span{width:92px;height:92px;border-radius:27px 27px 27px 7px;display:grid;place-items:center;background:#176457;color:white;font-size:44px;font-weight:600;box-shadow:0 15px 30px #17493825}.cs-story-art i,.cs-story-art b{position:absolute;width:16px;height:16px;border:4px solid #f8fff8;border-radius:50%;background:#4d936f;box-shadow:0 3px 12px #194b3530}.cs-story-art i{top:29px;right:47px}.cs-story-art b{left:30px;bottom:51px;width:11px;height:11px}.cs-story>small{position:absolute;left:39px;bottom:30px;color:#748e7e;font-size:10px}.cs-form{padding:37px 38px;border-radius:27px;box-shadow:0 12px 36px #123a2a0b}.cs-form>h2{margin:0;color:#183f32;font-size:29px;font-weight:550;letter-spacing:-.6px}.cs-form>p:not(.cs-kicker){margin:9px 0 23px;color:#78847d;font-size:12px;line-height:1.65}.cs-form label{margin-bottom:16px}.cs-form textarea.fi-input{box-sizing:border-box;height:auto;padding-top:12px;resize:vertical}.cs-muted{float:right;color:#99a39c;font-size:9px;font-weight:400}.cs-preview{display:none;width:100%;max-height:180px;margin:-5px 0 17px;border-radius:15px;object-fit:cover}.cs-preview.visible{display:block}.cs-submit{width:100%;margin-top:7px}.cs-privacy{display:block;margin-top:14px;color:#909b94;font-size:9px;text-align:center}@media(max-width:760px){.cs-layout{grid-template-columns:1fr}.cs-story{min-height:260px;padding:30px}.cs-story h1{font-size:34px}.cs-story-art{right:12px;left:auto;top:35px;width:145px;height:145px;transform:none}.cs-story-art span{width:60px;height:60px;border-radius:19px;font-size:30px}.cs-story-art i{top:14px;right:24px}.cs-story-art b{left:16px;bottom:27px}.cs-story>p:not(.cs-kicker){max-width:230px;font-size:11px}.cs-story>small{left:30px;bottom:19px;font-size:8px}.cs-form{padding:25px 20px}}`;
  document.head.append(style);
}
