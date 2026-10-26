import { additionalEnglish } from './translations-en.js';
import { transitionLanguage } from './language-motion.js';
const LANGUAGE_KEY = 'foodilee_language';

const english = Object.freeze({
  ...additionalEnglish,
  'Navigasi utama': 'Main navigation',
  'Tautan akun': 'Account links',
  'Menu akun': 'Account menu',
  'Buka menu akun': 'Open account menu',
  'Akun Anda': 'Your account',
  Pengguna: 'User',
  Anggota: 'Member',
  Profil: 'Profile',
  'Profil Anda': 'Your profile',
  Transaksi: 'Orders',
  'Riwayat Transaksi': 'Order history',
  Pesan: 'Messages',
  Notifikasi: 'Notifications',
  'Kelola Toko': 'Manage store',
  'Panel Admin': 'Admin panel',
  Panduan: 'Guide',
  'Panduan Food Ilee': 'Food Ilee guide',
  Keluar: 'Sign out',
  'Keranjang belanja': 'Shopping cart',
  Marketplace: 'Marketplace',
  'Tambah Limbah': 'Add food waste',
  'Tanya AI': 'Ask AI',
  'Dashboard belum dapat dimuat': 'Dashboard could not be loaded',
  'Periksa koneksi ke Food Ilee, lalu coba kembali.':
    'Check your connection to Food Ilee, then try again.',
  'Muat ulang': 'Reload',
  'RUANG KERJA FOOD ILEE': 'FOOD ILEE WORKSPACE',
  'Kelola penawaran dan pantau perjalanan sirkularitas Anda.':
    'Manage your listings and track your circular journey.',
  'Jelajahi Marketplace': 'Explore marketplace',
  'Tambah Limbah': 'Add food waste',
  'Total produk': 'Total listings',
  'Stok tersedia': 'Available stock',
  'Pesanan berjalan': 'Active orders',
  'ETALASE SAYA': 'MY LISTINGS',
  'Produk yang Anda tawarkan': 'Your listings',
  'Lihat marketplace': 'View marketplace',
  'Etalase Anda siap dimulai': 'Your marketplace is ready',
  'Tambahkan limbah organik pertama dan hubungkan dengan calon pemanfaat.':
    'Add your first organic material and connect with potential users.',
  'Tambah penawaran': 'Add a listing',
  'Buat penawaran': 'Create a listing',
  Semua: 'All',
  'Menunggu Pembayaran': 'Awaiting payment',
  Diproses: 'Processing',
  Dikirim: 'Shipped',
  Selesai: 'Completed',
  Dibatalkan: 'Cancelled',
  'Tampilkan Lebih Banyak': 'Show more',
  PESANAN: 'ORDERS',
  'RINGKASAN PESANAN': 'ORDER SUMMARY',
  Pembayaran: 'Payment',
  'Checkout produk dipilih': 'Checkout selected items',
  'Ringkasan pembayaran': 'Payment summary',
  'Subtotal produk': 'Item subtotal',
  Pengiriman: 'Shipping',
  Total: 'Total',
  'Pilih layanan': 'Choose a service',
  'Produk dipilih': 'Selected items',
  Diskon: 'Discount',
  'Profil belum dapat dimuat': 'Profile could not be loaded',
  'Coba lagi sebentar lagi.': 'Please try again shortly.',
  'Memuat ulang': 'Reload',
  'AKTIVITAS ANDA': 'YOUR ACTIVITY',
  'Ringkasan sirkular': 'Circular summary',
  'Data dari aktivitas akun Food Ilee': 'Based on your Food Ilee account activity',
  'Produk ditawarkan': 'Listings created',
  'Total stok tersedia': 'Total available stock',
  'Pesanan dibuat': 'Orders placed',
  AKUN: 'ACCOUNT',
  'Detail akun': 'Account details',
  'ALAMAT EMAIL': 'EMAIL ADDRESS',
  'NAMA PENGGUNA': 'USERNAME',
  'Belum diatur': 'Not set',
  BERGABUNG: 'MEMBER SINCE',
  ETALASE: 'LISTINGS',
  'Aktivitas penawaran': 'Listing activity',
  'Kelola toko': 'Manage store',
  'Anda belum menawarkan produk.': 'You have not listed any products yet.',
  'Tambahkan limbah': 'Add food waste',
  'Jelajahi panduan': 'Explore the guide',
  'Keluar dari akun': 'Sign out',
  'Edit Profil': 'Edit profile',
  'Edit profil': 'Edit profile',
  'Perbarui informasi dan foto yang tampil di akun Anda.':
    'Update the information and photo shown on your account.',
  'Nama lengkap': 'Full name',
  'Nama pengguna': 'Username',
  'Tentang Anda': 'About you',
  'Pilih foto': 'Choose a photo',
  'Geser foto untuk mengatur posisi. Hasil akan dipotong persegi 1:1.':
    'Drag the photo to adjust its position. It will be cropped to a square.',
  'Perbesar foto': 'Zoom photo',
  Batal: 'Cancel',
  'Simpan perubahan': 'Save changes',
  'Nama toko': 'Store name',
  'Lokasi toko': 'Store location',
  'Cerita toko': 'Store story',
  'Foto toko': 'Store photo',
  'Buat toko': 'Create store',
  'Edit Toko': 'Edit store',
  Produk: 'Products',
  Pesanan: 'Orders',
  Ulasan: 'Reviews',
  'Lokasi belum ditambahkan': 'Location not added',
  'Belum ada rating': 'No rating yet',
  'Produk belum bisa diunggah': 'Product could not be uploaded',
  'Buat toko sebelum menjual produk': 'Create a store before listing products',
  'TOKO DIPERLUKAN': 'STORE REQUIRED',
  'Lengkapi toko terlebih dahulu untuk mulai menawarkan limbah organik.':
    'Complete your store profile before listing organic materials.',
  'Toko belum dapat dimuat': 'Store could not be loaded',
  'Toko belum dapat diperiksa': 'Store could not be checked',
  'MULAI BERJUAL DI FOOD ILEE': 'START SELLING ON FOOD ILEE',
  'Ruang usaha Anda': 'YOUR BUSINESS SPACE',
  'Kelola Toko Anda': 'Manage your store',
  'Tambah Produk': 'Add product',
  'TAMBAH LIMBAH': 'ADD FOOD WASTE',
  'Tambah limbah': 'Add food waste',
  'Nama produk': 'Product name',
  Kategori: 'Category',
  'Pilih kategori': 'Choose a category',
  'Pakan Ternak': 'Animal feed',
  Kompos: 'Compost',
  'Jumlah stok': 'Stock quantity',
  'Harga per kg': 'Price per kg',
  Deskripsi: 'Description',
  'Lokasi pengambilan': 'Pickup location',
  'Unggah foto': 'Upload photo',
  Simpan: 'Save',
  Kirim: 'Send',
  'Kirim pesan': 'Send message',
  'Tulis pesan...': 'Write a message...',
  Cari: 'Search',
  'Cari produk': 'Search products',
  Filter: 'Filter',
  Urutkan: 'Sort by',
  Harga: 'Price',
  Terbaru: 'Newest',
  Tersedia: 'Available',
  'Detail produk': 'Product details',
  'Beli sekarang': 'Buy now',
  'Tambah ke keranjang': 'Add to cart',
  'Keranjang Anda kosong': 'Your cart is empty',
  'Lanjutkan belanja': 'Continue shopping',
  'Lanjut ke pembayaran': 'Proceed to checkout',
  'Pembayaran aman': 'Secure checkout',
  'Alamat penerima': 'Shipping address',
  'Nama penerima': 'Recipient name',
  'Nomor telepon': 'Phone number',
  Provinsi: 'Province',
  'Kabupaten/Kota': 'City/Regency',
  Kecamatan: 'District',
  'Desa/Kelurahan': 'Village',
  'Kode pos': 'Postal code',
  'Detail alamat': 'Address details',
  'Catatan untuk kurir (opsional)': 'Courier notes (optional)',
  'Simpan alamat ini': 'Save this address',
  Notifikasi: 'Notifications',
  'Belum ada notifikasi': 'No notifications yet',
  'Pesan Anda': 'Your messages',
  'Pilih percakapan': 'Choose a conversation',
  'Cari percakapan': 'Search conversations',
  'Jawaban AI dapat perlu diperiksa kembali sesuai kondisi bahan.':
    'AI suggestions should be checked against the material’s condition.',
  'MULAI TANYA': 'START A CONVERSATION',
  'Tanyakan apa pun seputar pengolahan limbah pangan.': 'Ask anything about reusing food waste.',
  Sebelumnya: 'Previous',
  Berikutnya: 'Next',
  'Lihat semua': 'View all',
  Kembali: 'Back',
  'Simpan profil': 'Save profile',
  'Profil berhasil diperbarui.': 'Profile updated successfully.',
  'Penawaran berhasil dihapus.': 'Listing deleted successfully.',
  'Penawaran diperbarui.': 'Listing updated successfully.',
  'Pilih foto JPG, PNG, atau WebP.': 'Choose a JPG, PNG, or WebP photo.',
  'Opsional · foto dikompres otomatis': 'Optional · photo compressed automatically',
  'Pilih bahasa': 'Choose language',
  Bahasa: 'Language',
  Tentang: 'About',
  'Cara Kerja': 'How it works',
  Dampak: 'Impact',
  'AI Assist': 'AI assistant',
  'Mulai Sekarang': 'Get started',
  'MASA DEPAN SIRKULARITAS PANGAN': 'THE FUTURE OF CIRCULAR FOOD',
  'Ubah limbah pangan': 'Turn food waste',
  menjadi: 'into',
  'lebih bernilai.': 'new value.',
  'Food Ilee mempertemukan pemilik limbah pangan dan orang yang dapat memanfaatkannya kembali — dengan bantuan teknologi AI.':
    'Food Ilee connects food waste owners with people who can put those resources to use, supported by AI.',
  'Jelajahi Food Ilee': 'Explore Food Ilee',
  'Kenali cara kerjanya': 'See how it works',
  'Marketplace sirkular': 'Circular marketplace',
  'Panduan AI': 'AI guidance',
  'Komunitas lokal': 'Local community',
  'Setiap sisa punya kesempatan kedua.': 'Every leftover has another chance.',
  'Mulai dari komunitas Anda, hari ini.': 'Start with your community today.',
  'SIRKULARITAS PANGAN': 'CIRCULAR FOOD SYSTEM',
  'TENTANG FOOD ILEE': 'ABOUT FOOD ILEE',
  'Masalah pangan butuh cara pandang': 'Food needs a new perspective',
  'yang baru.': 'for a better future.',
  'Jelajahi platform': 'Explore the platform',
  'Perpanjang manfaat': 'Extend the value',
  'Temukan kemungkinan': 'Find new possibilities',
  'Bangun ekosistem lokal': 'Grow local connections',
  'CARA KERJA': 'HOW IT WORKS',
  'Sederhana untuk dimulai.': 'Easy to get started.',
  'Berdampak saat dilakukan.': 'Better when we do it together.',
  'Bagikan yang tersedia': 'Share what you have',
  'Temukan pemanfaatnya': 'Find the right user',
  'Manfaatkan kembali': 'Put it to use again',
  'Mulai perjalanan Anda': 'Start your journey',
  'DAMPAK SIRKULAR': 'CIRCULAR IMPACT',
  'Sumber daya yang berputar.': 'Resources in motion.',
  'Masa depan yang lebih baik.': 'A better future.',
  'Jadi bagian perubahan': 'Be part of the change',
  'PASAR SIRKULAR': 'CIRCULAR MARKETPLACE',
  'Temukan nilai di setiap': 'Find value in every',
  'kategori.': 'category.',
  'Buka marketplace': 'Open marketplace',
  'Bahan pakan': 'Animal feed materials',
  'Bahan kompos': 'Compost materials',
  'Komunitas lokal': 'Local community',
  'AI ASSIST': 'AI ASSISTANT',
  'Ide pengolahan,': 'New ideas,',
  'selangkah lebih dekat.': 'one question away.',
  'Coba AI Food Ilee': 'Try Food Ilee AI',
  'LANGKAH SIRKULAR DIMULAI DARI SINI': 'YOUR CIRCULAR JOURNEY STARTS HERE',
  'Jadikan sisa sebagai': 'Let what is left',
  'awal yang baru.': 'begin something new.',
  'Bergabung dengan Food Ilee': 'Join Food Ilee',
  'PANGAN LEBIH BAIK, BUMI LEBIH SEHAT': 'BETTER FOOD, A HEALTHIER PLANET',
  'Masuk ke akun Anda': 'Sign in to your account',
  'Buat akun Anda': 'Create your account',
  'Nama lengkap': 'Full name',
  'Konfirmasi kata sandi': 'Confirm password',
  'Lupa kata sandi?': 'Forgot password?',
  'Buat Akun': 'Create account',
  'ATAU DAFTAR DENGAN': 'OR SIGN UP WITH',
  'ATAU MASUK DENGAN': 'OR SIGN IN WITH',
  'Sudah punya akun?': 'Already have an account?',
  'Belum punya akun?': 'New to Food Ilee?',
  'Google Sign-In belum dikonfigurasi.': 'Google Sign-In is not configured.',
  'Google Sign-In gagal dimuat. Coba muat ulang halaman.':
    'Google Sign-In failed to load. Try reloading the page.',
  'Temukan bahan terbaik': 'Find the right materials',
  'Bahan organik untuk kebutuhan pakan ternak dan kompos.':
    'Organic materials for animal feed and composting.',
  'URUTKAN PRODUK': 'SORT PRODUCTS',
  'Harga terendah': 'Lowest price',
  'Harga tertinggi': 'Highest price',
  'Produk dan toko di sekitar': 'Products and nearby stores',
  'Pilih lokasi untuk memfilter produk berdasarkan jarak.':
    'Choose a location to filter products by distance.',
  'Jarak pencarian': 'Search radius',
  'Semua jarak': 'Any distance',
  'Gunakan lokasi saya': 'Use my location',
  'Lokasi toko': 'Store location',
  'Memuat peta…': 'Loading map…',
  'JADI BAGIAN DARI SIKLUSNYA': 'BE PART OF THE CYCLE',
  'Punya bahan organik yang masih bisa dimanfaatkan?':
    'Have organic materials that could still be useful?',
  'Marketplace belum dapat dimuat': 'Marketplace could not be loaded',
  'Periksa koneksi server Anda.': 'Check your server connection.',
  'Coba lagi': 'Try again',
  CONTOH: 'SAMPLE',
  Lanjutkan: 'Continue',
  'Kata sandi': 'Password',
  Email: 'Email',
  Masuk: 'Sign in',
  Daftar: 'Sign up',
  'Buat toko sebelum menjual produk': 'Create a store before listing products',
  'Buat toko terlebih dahulu untuk mulai menawarkan limbah organik.':
    'Create a store before listing organic materials.',
  'Kelola produk, ulasan, dan pesanan yang masuk ke etalase.':
    'Manage products, reviews, and incoming orders.',
});

const originalText = new WeakMap();
const translatedText = new WeakMap();
const originalAttributes = new WeakMap();
let observer;
let translateQueued = false;
let selectedLanguage;
const normalize = (text) => text.replace(/\s+/g, ' ').trim();
const dictionary = new Map(Object.entries(english).map(([key, value]) => [normalize(key), value]));

export function translate(text, language = getLanguage()) {
  if (language !== 'en' || typeof text !== 'string') return text;
  const key = normalize(text);
  const exact = dictionary.get(key);
  if (exact) return exact;
  for (const [pattern, replacement] of dynamicTranslations) {
    if (pattern.test(key)) return key.replace(pattern, replacement);
  }
  return text;
}

const dynamicTranslations = [
  [/^DASHBOARD TOKO · (.+)$/, 'STORE DASHBOARD · $1'],
  [/^(\d+) produk$/, '$1 products'],
  [/^Pesanan #(.+)$/, 'Order #$1'],
  [/^(\d+) produk tersedia$/, '$1 products available'],
  [/^(\d+) transaksi$/, (_, count) => `${count} ${count === '1' ? 'order' : 'orders'}`],
  [/^tersedia (.+) kg$/, '$1 kg available'],
  [/^tersedia (.+) unit · (.+)\/unit$/, 'Available: $1 units · $2 per unit'],
  [/^(.+) \/ unit · (.+) unit · (.+)\/unit$/, '$1 / unit · $2 units · $3 per unit'],
  [/^(.+) \/ unit · (.+)\/unit$/, '$1 / unit · $2 per unit'],
  [/^(.+) unit · (.+)\/unit × (.+)\/unit$/, '$1 units · $2 per unit × $3 per unit'],
  [/^(.+) unit · (.+)\/unit · (.+)\/unit$/, '$1 units · $2 per unit · $3 per unit'],
  [/^(.+) unit · (.+)\/unit$/, '$1 units · $2 per unit'],
  [/^(.+) unit × (.+)$/, '$1 units × $2'],
  [/^(\d+) unit$/, '$1 units'],
  [/^unit · (.+)\/unit$/, 'units · $1 per unit'],
  [/^Diperbarui (.+)$/, (_, date) => `Updated ${translateDateWords(date)}`],
  [
    /^(.+) · Pengiriman: (.+)$/,
    (_, payment, shipping) =>
      `${translate(payment, 'en')} · Shipping: ${translate(shipping, 'en')}`,
  ],
  [/^♻ Membantu mengurangi (.+) kg emisi CO₂$/, '♻ Helping reduce $1 kg of CO₂ emissions'],

  [/^(\d+) pilihan tersedia$/, '$1 options available'],
  [/^Menampilkan produk dalam radius (.+) dari (.+)\.$/, 'Showing products within $1 of $2.'],
  [/^(\d+) belum dibaca$/, '$1 unread'],
  [/^LANGKAH (\d+)$/, 'STEP $1'],
  [/^Anggota sejak (.+)$/, (_, date) => `Member since ${translateDateWords(date)}`],
  [
    /^(\d{1,2} )?(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Jan|Feb|Mar|Apr|Jun|Jul|Agu|Sep|Okt|Nov|Des) \d{4}$/,
    (date) => translateDateWords(date),
  ],

  [/^Selamat datang, (.+)$/, 'Welcome, $1'],
  [/^(\d+) produk dalam keranjang$/, '$1 products in your cart'],
  [/^(\d+) (?:produk|Produk)$/, '$1 products'],
  [/^(\d+) (?:ulasan|Ulasan)$/, '$1 reviews'],
  [/^(\d+) pesanan sedang berjalan$/, '$1 active orders'],
  [/^Langkah (\d+) dari (\d+)$/, 'Step $1 of $2'],
  [/^(\d+)% selesai$/, '$1% complete'],
  [/^(\d+) dari (\d+) baris ditampilkan$/, '$1 of $2 rows shown'],
  [/^Pilih (.+) untuk checkout$/, 'Select $1 for checkout'],
  [/^Hapus penawaran “(.+)”\?$/, 'Delete listing “$1”?'],
  [/^Hapus “(.+)” dari toko\?$/, 'Delete “$1” from the store?'],
  [/^Pesanan ([A-Z0-9-]+)$/, 'Order $1'],
  [/^Pembeli (.+)$/, 'Buyer $1'],
  [
    /^(Pengguna|Produk|Pesanan) \((\d+)\)$/,
    (_, label, count) => `${dictionary.get(label)} (${count})`,
  ],
  [/^(.+) · dipotong dari pencairan penjual$/, '$1 · deducted from seller payout'],
  [/^Kategori saran: (.+)$/, (_, category) => `Suggested category: ${translate(category, 'en')}`],

  [/^Keranjang belanja, (.+) barang$/, 'Shopping cart, $1 items'],
  [/^(\d+) produk$/, '$1 products'],
  [/^(\d+) produk dipilih$/, '$1 selected products'],
  [/^(\d+) ulasan$/, '$1 reviews'],
  [/^Stok:? (.+)$/, 'Stock: $1'],
  [
    /^Pilih (.+)$/,
    (match, label) =>
      dictionary.has(label) ? `Choose ${dictionary.get(label).toLowerCase()}` : match,
  ],
];

function translateDateWords(date) {
  const months = {
    Januari: 'January',
    Februari: 'February',
    Maret: 'March',
    Mei: 'May',
    Juni: 'June',
    Juli: 'July',
    Agustus: 'August',
    Oktober: 'October',
    Desember: 'December',
    Agu: 'Aug',
    Okt: 'Oct',
    Des: 'Dec',
  };
  return date.replace(
    /\b(Januari|Februari|Maret|Mei|Juni|Juli|Agustus|Oktober|Desember|Agu|Okt|Des)\b/g,
    (month) => months[month],
  );
}

export function languagePicker() {
  return `<div class="public-language" role="group" aria-label="Pilih bahasa"><button type="button" data-language-choice="id" aria-label="Bahasa Indonesia">ID</button><button type="button" data-language-choice="en" aria-label="English">EN</button></div>`;
}

export function getLanguage() {
  if (selectedLanguage) return selectedLanguage;
  try {
    return localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'id';
  } catch {
    return 'id';
  }
}

let requestedLanguage;
let languageChange;

function commitLanguage(selected) {
  selectedLanguage = selected;
  try {
    localStorage.setItem(LANGUAGE_KEY, selected);
  } catch {
    /* Use the selected language for this page even if storage is unavailable. */
  }
  document.documentElement.lang = selected;
  applyTranslations(document.body, selected);
  window.dispatchEvent(
    new CustomEvent('foodilee:language-changed', { detail: { language: selected } }),
  );
  updateLanguageButtons(selected);
  watchTranslations();
}

export function setLanguage(language) {
  requestedLanguage = language === 'en' ? 'en' : 'id';
  if (languageChange) return languageChange;
  if (requestedLanguage === getLanguage()) return Promise.resolve();
  languageChange = (async () => {
    while (requestedLanguage !== getLanguage()) {
      await transitionLanguage(() => {
        if (requestedLanguage !== getLanguage()) commitLanguage(requestedLanguage);
      });
    }
  })().finally(() => {
    languageChange = null;
  });
  return languageChange;
}

export function applyTranslations(root = document.getElementById('app'), language = getLanguage()) {
  if (!root) return;
  document.documentElement.lang = language;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style,noscript,textarea,[data-no-translate]'))
        return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let textNode;
  while ((textNode = walker.nextNode())) translateTextNode(textNode, language);
  if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root, language);
  root.querySelectorAll?.('*').forEach((element) => translateAttributes(element, language));
  updateLanguageButtons(language);
  watchTranslations();
}

function translateTextNode(node, language) {
  if (!originalText.has(node)) originalText.set(node, node.nodeValue);
  const lastTranslation = translatedText.get(node);
  let original = originalText.get(node);
  if (lastTranslation !== undefined && node.nodeValue === lastTranslation) {
    original = originalText.get(node);
  } else if (node.nodeValue !== original) {
    original = node.nodeValue;
    originalText.set(node, original);
    translatedText.delete(node);
  }
  if (language !== 'en') {
    if (node.nodeValue !== original) node.nodeValue = original;
    translatedText.delete(node);
    return;
  }
  const trimmed = original.trim();
  const translated = translate(trimmed, language);
  if (!translated) return;
  const leading = original.slice(0, original.indexOf(trimmed));
  const trailing = original.slice(original.indexOf(trimmed) + trimmed.length);
  const next = `${leading}${translated}${trailing}`;
  if (node.nodeValue !== next) node.nodeValue = next;
  translatedText.set(node, next);
}

function translateAttributes(element, language) {
  if (element.closest('script,style,[data-no-translate]')) return;
  for (const name of ['placeholder', 'title', 'aria-label', 'alt']) {
    if (!element.hasAttribute(name)) continue;
    let saved = originalAttributes.get(element);
    if (!saved) {
      saved = new Map();
      originalAttributes.set(element, saved);
    }
    const current = element.getAttribute(name);
    let entry = saved.get(name);
    if (!entry || (current !== entry.original && current !== entry.translated)) {
      entry = { original: current, translated: null };
      saved.set(name, entry);
    }
    const next = language === 'en' ? translate(entry.original, language) : entry.original;
    entry.translated = next;
    if (current !== next) element.setAttribute(name, next);
  }
}

function updateLanguageButtons(language) {
  document.querySelectorAll('[data-language-choice]').forEach((button) => {
    const selected = button.dataset.languageChoice === language;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-selected', selected);
  });
}

function watchTranslations() {
  if (observer || !document.body) return;
  observer = new MutationObserver((records) => {
    if (translateQueued) return;
    translateQueued = true;
    queueMicrotask(() => {
      translateQueued = false;
      observer.disconnect();
      applyTranslations(document.body, getLanguage());
      observeTranslations();
    });
  });
  observeTranslations();
}

function observeTranslations() {
  observer.observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['placeholder', 'title', 'aria-label', 'alt'],
  });
}

function initializeLanguage() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-language-choice]');
    if (button) setLanguage(button.dataset.languageChoice);
  });
  const root = document.getElementById('app');
  if (root) applyTranslations(root, getLanguage());
  watchTranslations();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', initializeLanguage, { once: true });
  else initializeLanguage();
}
