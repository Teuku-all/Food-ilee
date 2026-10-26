import { loadStylesheet } from '../../utils/stylesheet.js';
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

export async function renderAddWaste() {
  const navigationRevision = getNavigationRevision();
  renderShell('add', wasteLoadingSkeleton());
  injectWasteStyles();
  let draft = {};
  let scopedDraftKey = getToken() ? `${draftKey}:session-${hashToken(getToken())}` : draftKey;
  try {
    const profile = await getCurrentUser();
    if (profile.success && profile.data?.id) scopedDraftKey = `${draftKey}:${profile.data.id}`;
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
    document.querySelector('[data-store-retry]')?.addEventListener('click', renderAddWaste);
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
  loadStylesheet('waste-new-style', new URL('../../styles/pages/add-waste.css', import.meta.url));
}
