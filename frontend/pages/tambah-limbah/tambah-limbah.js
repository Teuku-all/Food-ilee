import { createWaste, getWastes } from '../../services/waste.js';
import { getAIRecommendation } from '../../services/ai.js';
import { escapeHtml } from '../../utils/html.js';
import { formatRupiah, renderShell, showToast } from '../../ui/shell.js';
import { getNavigationRevision, isRouteCurrent } from '../../utils/navigation.js';

const draftKey = 'foodilee_waste_draft_v1';

export async function renderTambahLimbah() {
  const navigationRevision = getNavigationRevision();
  let draft = {};
  try {
    draft = JSON.parse(localStorage.getItem(draftKey) || '{}');
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
  const stock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  renderShell(
    'add',
    `<section class="wa-page"><div class="wa-heading"><div><p class="wa-kicker">BAGIKAN SUMBER DAYA</p><h1>Tambah Limbah Organik</h1><p>Unggah bahan organik Anda agar dapat ditemukan dan dimanfaatkan kembali.</p></div><a class="fi-button fi-button-outline" href="#panduan"><span>▤</span> Lihat Panduan</a></div><div class="wa-layout"><form class="wa-form fi-card" id="waste-form"><label class="fi-label">Foto limbah <span class="wa-optional">Foto wajib</span></label><label class="wa-drop" for="waste-image"><input id="waste-image" name="image" type="file" accept="image/*" required><span class="wa-drop-icon">⌑</span><strong>Klik atau tarik foto ke sini</strong><small>JPG, PNG, WebP · maks. 5 MB</small><img class="wa-preview" alt="Pratinjau foto produk"></label><label class="fi-label" for="waste-title">Nama limbah<input class="fi-input" id="waste-title" name="title" value="${escapeHtml(draft.title || '')}" placeholder="Contoh: Kulit sayuran campuran" minlength="3" required></label><fieldset class="wa-category"><legend class="fi-label">Kategori pemanfaatan</legend><label><input type="radio" name="category" value="Pakan Ternak" ${draft.category !== 'Kompos' ? 'checked' : ''}><span class="wa-category-icon">♧</span><strong>Pakan Ternak</strong><small>Bahan yang cocok dimanfaatkan sebagai pakan</small></label><label><input type="radio" name="category" value="Kompos" ${draft.category === 'Kompos' ? 'checked' : ''}><span class="wa-category-icon compost">◌</span><strong>Kompos</strong><small>Sisa organik untuk pengolahan kompos</small></label></fieldset><div class="wa-two-fields"><label class="fi-label">Jumlah / berat (kg)<input class="fi-input" name="stock" type="number" min="1" step="1" value="${escapeHtml(draft.stock || '')}" placeholder="Contoh: 10" required></label><label class="fi-label">Harga penawaran / kg<input class="fi-input" name="price" type="number" min="0" step="1" value="${escapeHtml(draft.price || '')}" placeholder="Rp 0" required></label></div><p class="wa-price-tip">ⓘ Harga yang masuk akal membantu pembeli membandingkan penawaran.</p><label class="fi-label">Lokasi penjemputan<input class="fi-input" name="location" maxlength="180" value="${escapeHtml(draft.location || '')}" placeholder="Kecamatan, kota, provinsi" required></label><label class="fi-label">Catatan tambahan<textarea class="fi-input" name="description" rows="4" minlength="5" placeholder="Jelaskan kondisi, waktu ketersediaan, atau cara penjemputan…" required>${escapeHtml(draft.description || '')}</textarea></label><div class="wa-form-actions"><button class="fi-button fi-button-outline" type="button" id="waste-save-draft">Simpan Draft</button><button class="fi-button" type="submit">Unggah Penawaran <span>→</span></button></div></form><aside class="wa-aside"><section class="wa-ai-card"><div class="wa-aside-heading"><span>✳</span><div><strong>Insight AI Food Ilee</strong><small>Masukan untuk deskripsi Anda</small></div></div><div class="wa-ai-result" id="waste-ai-insight"><p>Isi nama dan catatan limbah, lalu pilih kategori. Insight yang relevan akan muncul di sini.</p></div><div class="wa-ai-image"><span>ALUR SIRKULAR DIMULAI DARI SINI</span></div></section><section class="wa-impact-card"><p>ETALASE ANDA</p><div><strong>${products.length}</strong><span>produk aktif</span></div><div><strong>${stock.toLocaleString('id-ID')} kg</strong><span>stok ditawarkan</span></div><a href="#kelola-toko">Kelola penawaran <span>→</span></a></section></aside></div></section>`,
  );
  injectWasteStyles();
  bindWasteForm();
}

function bindWasteForm() {
  const form = document.getElementById('waste-form');
  const fileInput = document.getElementById('waste-image');
  const drop = document.querySelector('.wa-drop');
  const preview = document.querySelector('.wa-preview');
  const inputNames = ['title', 'description', 'stock', 'price', 'location'];
  const saveDraft = () => {
    const values = Object.fromEntries(new FormData(form));
    delete values.image;
    localStorage.setItem(draftKey, JSON.stringify(values));
  };
  document.getElementById('waste-save-draft').addEventListener('click', () => {
    saveDraft();
    showToast('Draft tersimpan di perangkat ini.');
  });
  inputNames.forEach((name) =>
    form.elements[name].addEventListener('input', () => {
      const values = Object.fromEntries(new FormData(form));
      delete values.image;
      localStorage.setItem(draftKey, JSON.stringify(values));
    }),
  );
  const previewFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Pilih berkas gambar.', 'error');
      fileInput.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran foto maksimum 5 MB.', 'error');
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
    const insight = document.getElementById('waste-ai-insight');
    insight.innerHTML = '<p class="wa-insight-loading">Menganalisis bahan Anda…</p>';
    try {
      const result = await getAIRecommendation(title, description);
      if (!result.success) throw new Error(result.message);
      const data = result.data || {};
      insight.innerHTML = `<p>${escapeHtml(data.recommendation || 'Pertimbangkan penyimpanan kering dan pisahkan dari bahan nonorganik.')}</p><small>Kategori saran: ${escapeHtml(data.category || 'belum ditentukan')}</small>${data.recycle_tip ? `<p class="wa-recycle-tip">${escapeHtml(data.recycle_tip)}</p>` : ''}`;
    } catch {
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
      formData.set('stock', String(Number(formData.get('stock'))));
      formData.set('price', String(Number(formData.get('price'))));
      const result = await createWaste(formData);
      if (!result.success) throw new Error(result.message || 'Penawaran belum dapat disimpan.');
      localStorage.removeItem(draftKey);
      showToast('Penawaran berhasil ditambahkan ke marketplace.');
      location.hash = '#marketplace';
    } catch (error) {
      showToast(error.message || 'Unggahan gagal. Coba lagi.', 'error');
      button.disabled = false;
      button.innerHTML = oldLabel;
    }
  });
}

function injectWasteStyles() {
  if (document.getElementById('waste-new-style')) return;
  const style = document.createElement('style');
  style.id = 'waste-new-style';
  style.textContent = `.wa-page{padding:3px 0 12px}.wa-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:27px}.wa-kicker{margin:0 0 7px;color:#718b7d;font-size:9px;font-weight:700;letter-spacing:.14em}.wa-heading h1{margin:0;color:#114b3d;font-size:35px;font-weight:550;letter-spacing:-1.1px}.wa-heading p:last-child{margin:7px 0 0;color:#6e7973;font-size:13px}.wa-heading>.fi-button{flex:none}.wa-layout{display:grid;grid-template-columns:minmax(0,1.85fr) minmax(260px,.85fr);align-items:start;gap:21px}.wa-form{padding:25px 27px 23px;border-radius:24px;box-shadow:0 10px 34px #123a2a09}.wa-form>.fi-label,.wa-form>label.fi-label{margin:0 0 19px;color:#37594b}.wa-optional{float:right;color:#97a29b;font-size:9px;font-weight:400}.wa-drop{position:relative;min-height:142px;margin:9px 0 21px;border:1px dashed #a7c4b2;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;overflow:hidden;background:#f8faf7;color:#66746d;cursor:pointer;transition:border .16s,background .16s}.wa-drop.dragging{border-color:#176457;background:#eaf5ee}.wa-drop input{position:absolute;width:1px;height:1px;opacity:0}.wa-drop-icon{width:39px;height:39px;border-radius:50%;display:grid;place-items:center;background:#c9ecd5;color:#3c7958;font-size:22px}.wa-drop strong{font-size:12px;font-weight:500}.wa-drop small{color:#9aa39e;font-size:9px}.wa-preview{display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.wa-preview.visible{display:block}.wa-drop.has-image:after{content:'Foto siap';position:absolute;right:12px;bottom:12px;padding:7px 11px;border-radius:999px;background:#fff;color:#215a45;font-size:10px;font-weight:600;box-shadow:0 3px 10px #123a2a22}.wa-category{min-width:0;margin:0 0 17px;padding:0;border:0}.wa-category legend{margin-bottom:8px}.wa-category>label{position:relative;min-height:104px;padding:14px 13px;border:1px solid #dce6df;border-radius:17px;display:inline-flex;width:calc(50% - 7px);box-sizing:border-box;flex-direction:column;align-items:center;justify-content:center;background:#f6f7f4;color:#58645d;cursor:pointer;transition:border .16s,background .16s,transform .16s}.wa-category>label:hover{transform:translateY(-1px)}.wa-category>label+label{margin-left:10px}.wa-category>label:has(input:checked){border:1.5px solid #1c6a50;background:#c9ecd5;color:#215d46}.wa-category input{position:absolute;opacity:0;pointer-events:none}.wa-category-icon{font-size:20px;color:#286a50}.wa-category-icon.compost{color:#56806a}.wa-category strong{margin-top:4px;font-size:11px;font-weight:600}.wa-category small{margin-top:4px;color:#849087;font-size:8px;text-align:center}.wa-two-fields{display:grid;grid-template-columns:1fr 1fr;gap:13px}.wa-two-fields .fi-label{margin-bottom:3px}.wa-price-tip{margin:-7px 0 17px;color:#89948d;font-size:9px}.wa-form textarea.fi-input{box-sizing:border-box;height:auto;padding-top:12px;resize:vertical}.wa-form-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}.wa-form-actions .fi-button{min-width:160px}.wa-aside{display:flex;flex-direction:column;gap:15px}.wa-ai-card{padding:20px;border-radius:25px;background:#dcefeb;box-shadow:0 10px 28px #0d494014}.wa-aside-heading{display:flex;align-items:center;gap:10px}.wa-aside-heading>span{width:33px;height:33px;border-radius:50%;display:grid;place-items:center;background:#075653;color:#fff;font-size:16px}.wa-aside-heading>div{display:flex;flex-direction:column;gap:4px}.wa-aside-heading strong{color:#173d3c;font-size:11px;font-weight:600}.wa-aside-heading small{color:#63817d;font-size:9px}.wa-ai-result{min-height:132px;margin:17px 0 13px;padding:16px;border-radius:18px;background:#f5fbfa;color:#526d69}.wa-ai-result p{margin:0;font-size:11px;line-height:1.7}.wa-ai-result small{display:block;margin-top:10px;color:#718985;font-size:9px}.wa-ai-result .wa-recycle-tip{margin-top:10px;padding-top:10px;border-top:1px solid #dceae8}.wa-insight-loading{animation:wa-pulse 1s ease-in-out infinite alternate}@keyframes wa-pulse{to{opacity:.45}}.wa-ai-image{height:105px;padding:0 12px 10px;border-radius:17px;display:flex;align-items:end;justify-content:center;background:linear-gradient(180deg,#306747 0%,#aac58b 42%,#715f41 43%,#463a29 100%);overflow:hidden}.wa-ai-image span{color:#fff;font-size:8px;font-weight:600;letter-spacing:.12em;text-shadow:0 1px 3px #0008}.wa-impact-card{padding:19px 20px;border-radius:21px;background:#c7ecd3}.wa-impact-card>p{margin:0 0 14px;color:#52715e;font-size:9px;font-weight:600;letter-spacing:.06em}.wa-impact-card>div{display:flex;align-items:baseline;gap:10px;margin-bottom:8px}.wa-impact-card>div strong{color:#155641;font-size:20px;font-weight:600}.wa-impact-card>div span{color:#5e7a68;font-size:10px}.wa-impact-card>a{display:inline-block;margin-top:9px;color:#1c654b;text-decoration:none;font-size:10px;font-weight:600}.wa-impact-card>a span{padding-left:6px}@media(max-width:800px){.wa-layout{grid-template-columns:1fr}.wa-aside{display:grid;grid-template-columns:1.25fr .75fr;align-items:start}.wa-ai-image{height:75px}}@media(max-width:560px){.wa-heading{align-items:flex-start;flex-direction:column}.wa-heading h1{font-size:29px}.wa-heading>.fi-button{min-height:38px}.wa-form{padding:18px 15px;border-radius:20px}.wa-drop{min-height:125px}.wa-two-fields{grid-template-columns:1fr;gap:10px}.wa-category>label{min-height:95px;width:calc(50% - 5px);padding:9px}.wa-category>label+label{margin-left:6px}.wa-category small{font-size:7px}.wa-form-actions{flex-direction:column-reverse}.wa-form-actions .fi-button{width:100%}.wa-aside{grid-template-columns:1fr}.wa-impact-card{order:-1}}`;
  document.head.append(style);
}
