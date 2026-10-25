import { createWaste, getWastes } from '../../services/waste.js';
import { getAIRecommendation } from '../../services/ai.js';
import { getCurrentUser } from '../../services/user.js';
import { getMyStore } from '../../services/store.js';
import { getToken } from '../../utils/storage.js';
import { escapeHtml } from '../../utils/html.js';
import { formatRupiah, renderShell, showToast } from '../../ui/shell.js';
import { icon } from '../../ui/icons.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';
import { skeleton } from '../../ui/skeleton.js';
import { translate } from '../../utils/i18n.js';
import { compressImage } from '../../utils/image-compress.js';
import {
  addProductWeightField,
  formatProductWeight,
  totalProductWeightGrams,
} from '../../utils/product-weight.js';

const draftKey = 'foodilee_waste_draft_v1';
let insightRequestRevision = 0;

export async function renderTambahLimbah() {
  const navigationRevision = getNavigationRevision();
  renderShell('add', wasteLoadingSkeleton());
  injectWasteStyles();
  let draft = {};
  let scopedDraftKey = getToken()
    ? `${draftKey}:session-${hashToken(getToken())}`
    : draftKey;
  try {
    const profile = await getCurrentUser();
    if (profile.success && profile.data?.id)
      scopedDraftKey = `${draftKey}:${profile.data.id}`;
  } catch {
    /* preserve the anonymous draft key when the profile cannot be loaded */
  }
  try {
    const storeResult = await getMyStore();
    if (!isRouteCurrent('#tambah-limbah', navigationRevision)) return;
    if (!storeResult.success || !storeResult.data) {
      renderShell(
        'add',
        `<section class="wa-page"><div class="wa-store-required fi-card"><span aria-hidden="true">${icon('home')}</span><p class="wa-kicker">TOKO DIPERLUKAN</p><h1>Buat toko sebelum menjual produk</h1><p>Produk yang Anda unggah akan ditampilkan atas nama toko. Lengkapi toko terlebih dahulu untuk mulai menawarkan limbah organik.</p><a class="fi-button" href="#buat-toko">Buat toko <span>→</span></a></div></section>`,
      );
      injectWasteStyles();
      return;
    }
  } catch (error) {
    if (!isRouteCurrent('#tambah-limbah', navigationRevision)) return;
    renderShell(
      'add',
      `<section class="wa-page"><div class="wa-store-check-error fi-card"><p class="wa-kicker">TOKO BELUM DAPAT DIPERIKSA</p><h1>Produk belum bisa diunggah</h1><p>${escapeHtml(error.message || 'Periksa koneksi lalu coba lagi.')}</p><button class="fi-button" type="button" data-store-retry>Coba lagi</button></div></section>`,
    );
    injectWasteStyles();
    document.querySelector('[data-store-retry]')?.addEventListener('click', renderTambahLimbah);
    return;
  }
  try {
    draft = JSON.parse(localStorage.getItem(scopedDraftKey) || '{}');
  } catch {
    draft = {};
  }
  let products = [];
  try {
    const result = await getWastes({ mine: true });
    products = Array.isArray(result.data) ? result.data : [];
  } catch {
    /* optional impact card */
  }
  if (!isRouteCurrent('#tambah-limbah', navigationRevision)) return;
  const totalWeight = totalProductWeightGrams(products);
  const stock = totalWeight / 1000;
  renderShell(
    'add',
    `<section class="wa-page"><div class="wa-layout"><form class="wa-form fi-card" id="waste-form"><label class="fi-label">Foto limbah <span class="wa-optional">Foto wajib</span></label><label class="wa-drop" for="waste-image"><input id="waste-image" name="image" type="file" accept="image/*" required><span class="wa-drop-icon">${icon('upload')}</span><strong>Klik atau tarik foto ke sini</strong><small>JPG, PNG, WebP · maks. 4 MB</small><img class="wa-preview" alt="Pratinjau foto produk"></label><label class="fi-label" for="waste-title">Nama limbah<input class="fi-input" id="waste-title" name="title" value="${escapeHtml(draft.title || '')}" placeholder="Contoh: Kulit sayuran campuran" minlength="3" required></label><fieldset class="wa-category"><legend class="fi-label">Kategori pemanfaatan</legend><label><input type="radio" name="category" value="Pakan Ternak" ${draft.category !== 'Kompos' ? 'checked' : ''}><span class="wa-category-icon">${icon('leaf')}</span><strong>Pakan Ternak</strong><small>Bahan yang cocok dimanfaatkan sebagai pakan</small></label><label><input type="radio" name="category" value="Kompos" ${draft.category === 'Kompos' ? 'checked' : ''}><span class="wa-category-icon compost">${icon('compost')}</span><strong>Kompos</strong><small>Sisa organik untuk pengolahan kompos</small></label></fieldset><div class="wa-two-fields"><label class="fi-label">Jumlah / berat (kg)<input class="fi-input" name="stock" type="number" min="1" step="1" value="${escapeHtml(draft.stock || '')}" placeholder="Contoh: 10" required></label><label class="fi-label">Harga penawaran / kg<input class="fi-input" name="price" type="number" min="0" step="1" value="${escapeHtml(draft.price || '')}" placeholder="Rp 0" required></label></div><p class="wa-price-tip">${icon('guide')} Harga yang masuk akal membantu pembeli membandingkan penawaran.</p><label class="fi-label">Lokasi penjemputan<input class="fi-input" name="location" maxlength="180" value="${escapeHtml(draft.location || '')}" placeholder="Kecamatan, kota, provinsi" required></label><label class="fi-label">Catatan tambahan<textarea class="fi-input" name="description" rows="4" minlength="5" placeholder="Jelaskan kondisi, waktu ketersediaan, atau cara penjemputan…" required>${escapeHtml(draft.description || '')}</textarea></label><div class="wa-form-actions"><button class="fi-button fi-button-outline" type="button" id="waste-save-draft">Simpan Draft</button><button class="fi-button" type="submit">Unggah Penawaran <span>→</span></button></div></form><aside class="wa-aside"><section class="wa-ai-card"><div class="wa-aside-heading"><span>${icon('sparkles')}</span><div><strong>Insight AI Food Ilee</strong><small>Masukan untuk deskripsi Anda</small></div></div><div class="wa-ai-image"><img src="/assets/foodilee-login-hero.png" alt="" width="512" height="512" loading="lazy"><span>Gambar ilustrasi · pemanfaatan bahan organik</span></div><div class="wa-ai-result" id="waste-ai-insight"><p>Isi nama dan catatan limbah, lalu pilih kategori. Insight yang relevan akan muncul di sini.</p></div></section><section class="wa-impact-card" aria-labelledby="wa-impact-title"><div class="wa-impact-header"><div class="wa-impact-heading-copy"><p>ETALASE ANDA</p><h2 id="wa-impact-title">Ringkasan penawaran</h2></div><span class="wa-impact-icon" aria-hidden="true">${icon('leaf')}</span></div><div class="wa-impact-metrics"><div class="wa-impact-stat"><strong>${products.length}</strong><span>produk aktif</span></div><div class="wa-impact-stat"><strong>${stock.toLocaleString('id-ID')} kg</strong><span>stok ditawarkan</span></div></div><a class="wa-impact-link" href="#kelola-toko">Kelola penawaran <span aria-hidden="true">→</span></a></section></aside></div></section>`,
  );
  document.querySelector('.wa-drop small').textContent = 'Foto dikompres otomatis sebelum diunggah';
  injectWasteStyles();
  addProductWeightField(document.getElementById('waste-form'), draft);
  const stockSummary = document.querySelector('.wa-impact-stat:nth-child(2) strong');
  if (stockSummary) stockSummary.textContent = formatProductWeight(totalWeight);
  const stockSummaryLabel = document.querySelector('.wa-impact-stat:nth-child(2) span');
  if (stockSummaryLabel) stockSummaryLabel.textContent = translate('Total berat tersedia');
  bindWasteForm(scopedDraftKey);
}

function wasteLoadingSkeleton() {
  return `<section class="wa-page" aria-busy="true"><div class="wa-layout"><div class="wa-form fi-card">${Array.from({ length: 6 }, (_, index) => `<div style="margin-bottom:${index === 0 ? '20px' : '17px'}">${skeleton(index === 0 ? '100%' : '150px', index === 0 ? '140px' : '11px', index === 0 ? '' : '')}${index > 0 ? `<div style="height:8px"></div>${skeleton('100%', '42px', 'pill')}` : ''}</div>`).join('')}${skeleton('100%', '43px', 'pill')}</div><aside class="wa-aside"><section class="wa-ai-card">${skeleton('175px', '14px')}<div style="height:15px"></div>${skeleton('100%', '120px')}</section><section class="wa-impact-card">${skeleton('110px', '12px')}${skeleton('120px', '25px')}</section></aside></div></section>`;
}

function bindWasteForm(scopedDraftKey) {
  const form = document.getElementById('waste-form');
  const fileInput = document.getElementById('waste-image');
  const drop = document.querySelector('.wa-drop');
  const preview = document.querySelector('.wa-preview');
  const inputNames = ['title', 'description', 'stock', 'weightPerUnitGrams', 'price', 'location'];
  const saveDraft = () => {
    const values = Object.fromEntries(new FormData(form));
    delete values.image;
    localStorage.setItem(scopedDraftKey, JSON.stringify(values));
  };
  document.getElementById('waste-save-draft').addEventListener('click', () => {
    saveDraft();
    showToast('Draft tersimpan di perangkat ini.');
  });
  inputNames.forEach((name) =>
    form.elements[name].addEventListener('input', () => {
      const values = Object.fromEntries(new FormData(form));
      delete values.image;
      localStorage.setItem(scopedDraftKey, JSON.stringify(values));
    }),
  );
  const previewFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Pilih berkas gambar.', 'error');
      fileInput.value = '';
      return;
    }
    preview.src = URL.createObjectURL(file);
    preview.classList.add('visible');
    drop.classList.add('has-image');
  };
  fileInput.addEventListener('change', () => previewFile(fileInput.files[0]));
  drop.addEventListener('dragover', (event) => {
    event.preventDefault();
    drop.classList.add('dragging');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    drop.classList.remove('dragging');
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    previewFile(file);
  });
  const updateInsight = async () => {
    const title = form.elements.title.value.trim();
    const description = form.elements.description.value.trim();
    if (title.length < 3 || description.length < 5) return;
    const requestRevision = ++insightRequestRevision;
    const insight = document.getElementById('waste-ai-insight');
    insight.innerHTML = '<p class="wa-insight-loading">Menganalisis bahan Anda…</p>';
    try {
      const result = await getAIRecommendation(title, description);
      if (!result.success) throw new Error(result.message);
      if (
        requestRevision !== insightRequestRevision ||
        !insight.isConnected ||
        form.elements.title.value.trim() !== title ||
        form.elements.description.value.trim() !== description
      )
        return;
      const data = result.data || {};
      insight.innerHTML = `<p>${escapeHtml(data.recommendation || 'Pertimbangkan penyimpanan kering dan pisahkan dari bahan nonorganik.')}</p><small>Kategori saran: ${escapeHtml(data.category || 'belum ditentukan')}</small>${data.recycle_tip ? `<p class="wa-recycle-tip">${escapeHtml(data.recycle_tip)}</p>` : ''}`;
    } catch {
      if (
        requestRevision !== insightRequestRevision ||
        !insight.isConnected ||
        form.elements.title.value.trim() !== title ||
        form.elements.description.value.trim() !== description
      )
        return;
      insight.innerHTML =
        '<p>Insight AI sementara tidak tersedia. Lengkapi deskripsi bahan untuk membantu calon pembeli.</p>';
    }
  };
  form.elements.title.addEventListener('blur', updateInsight);
  form.elements.description.addEventListener('blur', updateInsight);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!fileInput.files[0]) {
      showToast('Tambahkan foto limbah sebelum mengunggah.', 'error');
      return;
    }
    const button = form.querySelector('[type="submit"]');
    const oldLabel = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Mengunggah…';
    try {
      const formData = new FormData(form);
      formData.set('image', await compressImage(fileInput.files[0]));
      formData.set('stock', String(Number(formData.get('stock'))));
      formData.set('weightPerUnitGrams', String(Number(formData.get('weightPerUnitGrams'))));
      formData.set('price', String(Number(formData.get('price'))));
      const result = await createWaste(formData);
      if (!result.success) throw new Error(result.message || 'Penawaran belum dapat disimpan.');
      localStorage.removeItem(scopedDraftKey);
      showToast('Penawaran berhasil ditambahkan ke marketplace.');
      location.hash = '#marketplace';
    } catch (error) {
      showToast(error.message || 'Unggahan gagal. Coba lagi.', 'error');
      button.disabled = false;
      button.innerHTML = oldLabel;
    }
  });
}

function hashToken(token) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1)
    hash = Math.imul(hash ^ token.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36);
}

function injectWasteStyles() {
  if (document.getElementById('waste-new-style')) return;
  const style = document.createElement('style');
  style.id = 'waste-new-style';
  style.textContent = `.wa-page{padding:3px 0 12px}.wa-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:27px}.wa-kicker{margin:0 0 7px;color:#718b7d;font-size:9px;font-weight:700;letter-spacing:.14em}.wa-heading h1{margin:0;color:#114b3d;font-size:35px;font-weight:550;letter-spacing:-1.1px}.wa-heading p:last-child{margin:7px 0 0;color:#6e7973;font-size:13px}.wa-heading>.fi-button{flex:none}.wa-layout{display:grid;grid-template-columns:minmax(0,1.85fr) minmax(260px,.85fr);align-items:start;gap:21px}.wa-form{padding:25px 27px 23px;border-radius:24px;box-shadow:0 10px 34px #123a2a09}.wa-form>.fi-label,.wa-form>label.fi-label{margin:0 0 19px;color:#37594b;line-height:1.45}.wa-optional{float:right;color:#97a29b;font-size:9px;font-weight:400}.wa-drop{position:relative;min-height:142px;margin:9px 0 21px;border:1px dashed #a7c4b2;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;overflow:hidden;background:#f8faf7;color:#66746d;cursor:pointer;transition:border .16s,background .16s}.wa-drop.dragging{border-color:#235347;background:#eaf5ee}.wa-drop input{position:absolute;width:1px;height:1px;opacity:0}.wa-drop-icon{width:39px;height:39px;border-radius:50%;display:grid;place-items:center;background:#c9ecd5;color:#3c7958;font-size:22px}.wa-drop strong{font-size:12px;font-weight:500}.wa-drop small{color:#9aa39e;font-size:9px}.wa-preview{display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.wa-preview.visible{display:block}.wa-drop.has-image:after{content:'Foto siap';position:absolute;right:12px;bottom:12px;padding:7px 11px;border-radius:999px;background:#fff;color:#215a45;font-size:10px;font-weight:600;box-shadow:0 3px 10px #123a2a22}.wa-category{min-width:0;margin:0 0 17px;padding:0;border:0}.wa-category legend{margin-bottom:8px}.wa-category>label{position:relative;min-height:104px;padding:14px 13px;border:1px solid #dce6df;border-radius:17px;display:inline-flex;width:calc(50% - 7px);box-sizing:border-box;flex-direction:column;align-items:center;justify-content:center;background:#f6f7f4;color:#58645d;cursor:pointer;transition:border .16s,background .16s,transform .16s}.wa-category>label:hover{transform:translateY(-1px)}.wa-category>label+label{margin-left:10px}.wa-category>label:has(input:checked){border:1.5px solid #1c6a50;background:#c9ecd5;color:#215d46}.wa-category input{position:absolute;opacity:0;pointer-events:none}.wa-category-icon{font-size:20px;color:#286a50}.wa-category-icon.compost{color:#56806a}.wa-category strong{margin-top:4px;font-size:11px;font-weight:600}.wa-category small{margin-top:4px;color:#849087;font-size:8px;text-align:center}.wa-two-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:16px}.wa-two-fields .fi-label{min-width:0;margin:0;line-height:1.45}.wa-form .fi-label>.fi-input{display:block;box-sizing:border-box;width:100%;margin-top:8px}.wa-price-tip{margin:3px 0 18px;color:#89948d;font-size:9px;line-height:1.5}.wa-form textarea.fi-input{box-sizing:border-box;height:auto;padding-top:12px;resize:vertical}.wa-form-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}.wa-form-actions .fi-button{min-width:160px}.wa-aside{display:flex;flex-direction:column;gap:15px}.wa-ai-card{padding:20px;border-radius:25px;background:#dcefeb;box-shadow:0 10px 28px #0d494014}.wa-aside-heading{display:flex;align-items:center;gap:10px}.wa-aside-heading>span{width:33px;height:33px;border-radius:50%;display:grid;place-items:center;background:#163832;color:#fff;font-size:16px}.wa-aside-heading>div{display:flex;flex-direction:column;gap:4px}.wa-aside-heading strong{color:#163832;font-size:11px;font-weight:600}.wa-aside-heading small{color:#63817d;font-size:9px}.wa-ai-result{min-height:132px;margin:17px 0 13px;padding:16px;border-radius:18px;background:#f5fbfa;color:#526d69}.wa-ai-result p{margin:0;font-size:11px;line-height:1.7}.wa-ai-result small{display:block;margin-top:10px;color:#718985;font-size:9px}.wa-ai-result .wa-recycle-tip{margin-top:10px;padding-top:10px;border-top:1px solid #dceae8}.wa-insight-loading{animation:wa-pulse 1s ease-in-out infinite alternate}@keyframes wa-pulse{to{opacity:.45}}.wa-ai-image{height:105px;padding:0 12px 10px;border-radius:17px;display:flex;align-items:end;justify-content:center;background:linear-gradient(180deg,#306747 0%,#aac58b 42%,#715f41 43%,#463a29 100%);overflow:hidden}.wa-ai-image span{color:#fff;font-size:8px;font-weight:600;letter-spacing:.12em;text-shadow:0 1px 3px #0008}.wa-impact-card{padding:19px 20px;border-radius:21px;background:#c7ecd3}.wa-impact-card>p{margin:0 0 14px;color:#52715e;font-size:9px;font-weight:600;letter-spacing:.06em}.wa-impact-card>div{display:flex;align-items:baseline;gap:10px;margin-bottom:8px}.wa-impact-card>div strong{color:#155641;font-size:20px;font-weight:600}.wa-impact-card>div span{color:#5e7a68;font-size:10px}.wa-impact-card>a{display:inline-block;margin-top:9px;color:#1c654b;text-decoration:none;font-size:10px;font-weight:600}.wa-impact-card>a span{padding-left:6px}@media(max-width:800px){.wa-layout{grid-template-columns:1fr}.wa-aside{display:grid;grid-template-columns:1.25fr .75fr;align-items:start}.wa-ai-image{height:75px}}@media(max-width:560px){.wa-heading{align-items:flex-start;flex-direction:column}.wa-heading h1{font-size:29px}.wa-heading>.fi-button{min-height:38px}.wa-form{padding:18px 15px;border-radius:20px}.wa-drop{min-height:125px}.wa-two-fields{grid-template-columns:1fr;gap:10px}.wa-category>label{min-height:95px;width:calc(50% - 5px);padding:9px}.wa-category>label+label{margin-left:6px}.wa-category small{font-size:7px}.wa-form-actions{flex-direction:column-reverse}.wa-form-actions .fi-button{width:100%}.wa-aside{grid-template-columns:1fr}.wa-impact-card{order:-1}}`;
  style.textContent += `.wa-store-required{min-height:340px;padding:clamp(28px,6vw,60px);display:flex;flex-direction:column;align-items:flex-start;justify-content:center;border-radius:24px;background:linear-gradient(135deg,#eaf5f3,#d7e9e7)}.wa-store-required>span{width:48px;height:48px;margin-bottom:22px;border-radius:16px;display:grid;place-items:center;background:#d3eae5;color:#267b70;font-size:26px}.wa-store-required .wa-kicker{margin:0 0 8px}.wa-store-required h1{max-width:600px;margin:0;color:#163832;font-size:clamp(28px,4vw,38px);letter-spacing:-.04em}.wa-store-required p:not(.wa-kicker){max-width:560px;margin:10px 0 22px;color:#6c7a77;font-size:14px;line-height:1.7}`;
  style.textContent += `.wa-store-check-error{min-height:280px;padding:clamp(28px,6vw,60px);display:flex;flex-direction:column;align-items:flex-start;justify-content:center;border:1px solid #d8e5df;border-radius:24px;background:linear-gradient(135deg,#f4f8f5,#e8f1eb)}.wa-store-check-error .wa-kicker{margin:0 0 8px}.wa-store-check-error h1{max-width:600px;margin:0;color:#163832;font-size:clamp(25px,4vw,34px);letter-spacing:-.04em}.wa-store-check-error p:not(.wa-kicker){max-width:560px;margin:10px 0 22px;color:#6c7a77;font-size:14px;line-height:1.7}`;
  style.textContent += `.wa-heading{position:relative;isolation:isolate;box-sizing:border-box;min-height:194px;overflow:hidden;margin-bottom:25px;padding:28px 34px;border:1px solid #cfe1d2;border-radius:25px;background:radial-gradient(ellipse at 88% 18%,#d9eee0 0,transparent 34%),linear-gradient(115deg,#f8fbf7,#edf5ef 65%,#e4f1e8);box-shadow:0 13px 34px #174e320d}.wa-heading:before{position:absolute;z-index:-1;right:-62px;bottom:-192px;width:360px;height:360px;border:1px solid #a8cdb544;border-radius:50%;content:'';box-shadow:0 0 0 22px #a9cfad14,0 0 0 45px #a9cfad10}.wa-heading:after{position:absolute;right:118px;bottom:24px;width:62px;height:62px;border:1px solid #b4d1b7;border-radius:20px;display:grid;place-items:center;background:linear-gradient(145deg,#fff,#dceede);box-shadow:0 12px 24px #2863421c;color:#38784d;content:'↻';font-size:34px;transform:rotate(-10deg)}.wa-heading>div{position:relative;z-index:1;max-width:min(66%,680px)}.wa-heading .wa-kicker{display:inline-flex;align-items:center;margin:0 0 11px;padding:6px 10px;border:1px solid #cfe1d2;border-radius:999px;background:#ffffffad;color:#557b61}.wa-heading h1{font-size:clamp(30px,3.5vw,39px);font-weight:620;letter-spacing:-1.3px}.wa-heading p:last-child{max-width:560px;margin:9px 0 0;color:#607369;font-size:14px;line-height:1.6}.wa-heading>.fi-button{position:relative;z-index:1;align-self:flex-start;margin-top:4px;border-color:#cbded0;background:#ffffffd9;color:#276247;box-shadow:0 5px 14px #174e320c}.wa-heading>.fi-button:hover{background:#fff}@media(max-width:560px){.wa-heading{min-height:225px;align-items:flex-start;padding:23px 21px 122px;border-radius:21px}.wa-heading>div{max-width:none}.wa-heading h1{font-size:29px}.wa-heading p:last-child{max-width:390px;font-size:13px}.wa-heading>.fi-button{margin:14px 0 0;min-height:38px}.wa-heading:before{right:-110px;bottom:-238px;width:330px;height:330px}.wa-heading:after{right:42px;bottom:20px;width:49px;height:49px;border-radius:16px;font-size:27px}}`;
  style.textContent += `
    .wa-form.fi-card{border:1.5px solid #bfd4c6;box-shadow:0 12px 32px #123a2a10}
    .wa-form>.fi-label,.wa-form>label.fi-label{margin-bottom:16px}
    .wa-optional{padding:5px 9px;border:1px solid #d7e5da;border-radius:999px;background:#f2f7f2;color:#547562;font-weight:600}
    .wa-drop{
      min-height:168px;margin:8px 0 23px;padding:18px;
      border:2px dashed #8eaf99;border-radius:17px;
      background:radial-gradient(ellipse at center,#ffffff 0%,#f4f8f3 76%);
      box-shadow:inset 0 0 0 4px #eaf2e9;
      transition:border-color 180ms ease,background 180ms ease,box-shadow 180ms ease;
    }
    .wa-drop:hover,.wa-drop:focus-within,.wa-drop.dragging{
      border-color:#31785a;background:#f0f7ef;
      box-shadow:inset 0 0 0 4px #e0eee0,0 0 0 3px #31785a16;
    }
    .wa-drop:focus-within{outline:2px solid #31785a;outline-offset:3px}
    .wa-drop-icon{width:46px;height:46px;background:#dfefe1;color:#287251;font-size:25px}
    .wa-drop strong{color:#345d49;font-size:13px;font-weight:650}
    .wa-drop small{color:#73877b;font-size:10px}
    .wa-preview{z-index:1}
    .wa-drop.has-image>.wa-drop-icon,.wa-drop.has-image>strong,.wa-drop.has-image>small{visibility:hidden}
    .wa-drop.has-image:after{z-index:2;right:14px;bottom:14px;padding:8px 12px;background:#fff;color:#215a45}
    @media(max-width:560px){.wa-form.fi-card{border-radius:18px}.wa-drop{min-height:148px;margin-bottom:20px;padding:14px}}
    @media(prefers-reduced-motion:reduce){.wa-drop{transition:none}}
  `;
  style.textContent += `
    .wa-ai-card{padding:18px;border:1px solid #bcd8d0;border-radius:22px;background:linear-gradient(155deg,#e7f3f0,#dcefeb);box-shadow:0 12px 32px #0d494018}
    .wa-aside-heading{min-height:40px;gap:11px}
    .wa-aside-heading>span{width:38px;height:38px;flex:none;background:#163832;box-shadow:0 4px 12px #16383225}
    .wa-aside-heading>div{min-width:0;gap:5px}
    .wa-aside-heading strong{font-size:12px}
    .wa-aside-heading small{font-size:10px;line-height:1.45}
    .wa-ai-image{position:relative;height:164px;margin-top:16px;padding:0;border:1px solid #bed6c7;border-radius:17px;align-items:flex-end;justify-content:flex-start;overflow:hidden;background:#dcefeb}
    .wa-ai-image>img{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;object-position:center 55%}
    .wa-ai-image::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#102c2410 38%,#102c2480 100%);pointer-events:none}
    .wa-ai-image>span{position:relative;z-index:1;max-width:calc(100% - 24px);margin:12px;padding:7px 10px;border:1px solid #ffffff40;border-radius:999px;background:#073b31bd;color:#fff;font-size:9px;font-weight:600;letter-spacing:.035em;line-height:1.4;text-shadow:none}
    .wa-ai-result{min-height:106px;margin:14px 0 0;padding:15px;border:1px solid #dcebe5;border-radius:15px;background:#f8fcfa;color:#4e6961}
    .wa-ai-result p{font-size:12px;line-height:1.65}
    .wa-ai-result small{font-size:10px;line-height:1.55}
    .wa-ai-result .wa-recycle-tip{border-color:#dceae5}
    @media(max-width:800px){.wa-ai-image{height:clamp(120px,20vw,164px)}.wa-ai-card{padding:16px}}
    @media(max-width:560px){.wa-ai-card{padding:16px;border-radius:20px}.wa-ai-image{height:175px;margin-top:13px}.wa-ai-result{min-height:0;padding:14px}}
    .wa-impact-card{padding:18px;border:1px solid #b8d8c4;border-radius:20px;background:linear-gradient(145deg,#eff8f1,#def0e4);box-shadow:0 10px 26px #17644814}
    .wa-impact-card>.wa-impact-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 15px!important;padding:0!important}
    .wa-impact-heading-copy{display:grid;gap:5px}
    .wa-impact-heading-copy>p{margin:0;color:#547865;font-size:9px;font-weight:700;letter-spacing:.11em}
    .wa-impact-heading-copy>h2{margin:0;color:#174b37;font-size:15px;font-weight:650;letter-spacing:-.2px}
    .wa-impact-card>.wa-impact-header>.wa-impact-icon{display:grid;width:38px;height:38px;flex:none;place-items:center;border:1px solid #b6d7bf;border-radius:13px;background:#fff;color:#287251;font-size:20px}
    .wa-impact-card>.wa-impact-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:0;padding:0}
    .wa-impact-card .wa-impact-stat{display:flex;min-width:0;flex-direction:column;align-items:flex-start;gap:6px;margin:0;padding:12px;border:1px solid #d5e8da;border-radius:14px;background:#ffffffb8}
    .wa-impact-card .wa-impact-stat>strong{color:#155641;font-size:21px;font-weight:650;line-height:1.15}
    .wa-impact-card .wa-impact-stat>span{color:#688272;font-size:10px;line-height:1.4}
    .wa-impact-card>.wa-impact-link{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:42px;margin-top:13px;padding:0 14px;border:1px solid #176448;border-radius:12px;background:#176448;color:#fff;font-size:11px;font-weight:600;text-decoration:none;transition:background 160ms ease,transform 160ms ease}
    .wa-impact-card>.wa-impact-link:hover{transform:translateY(-1px);background:#0b5540}
    .wa-impact-card>.wa-impact-link>span{font-size:17px;transition:transform 160ms ease}
    .wa-impact-card>.wa-impact-link:hover>span{transform:translateX(3px)}
    .wa-impact-card>.wa-impact-link:focus-visible{outline:3px solid #17644850;outline-offset:3px}
    @media(max-width:560px){.wa-impact-card{padding:16px;border-radius:18px}.wa-impact-card .wa-impact-stat{padding:10px}.wa-impact-card .wa-impact-stat>strong{font-size:19px}}
    @media(prefers-reduced-motion:reduce){.wa-impact-card>.wa-impact-link,.wa-impact-card>.wa-impact-link>span{transition:none}.wa-impact-card>.wa-impact-link:hover{transform:none}.wa-impact-card>.wa-impact-link:hover>span{transform:none}}
  `;
  document.head.append(style);
}
