import { loadStylesheet } from '../../utils/stylesheet.js';
import { languagePicker } from '../../utils/i18n.js';
import { getToken } from '../../utils/storage.js';
import {
  bindHeaderScroll,
  bindMobileNav,
  dashboardFooter,
  injectShellStyles,
} from '../../ui/shell.js';
import { brandImage, icon } from '../../ui/icons.js';

let landingRevealObserver;
let navigationFrame;
let landingNavigationTarget;
let landingNavigationTimer;
const clearLandingNavigationTarget = () => {
  landingNavigationTarget = null;
  clearTimeout(landingNavigationTimer);
};
window.addEventListener('wheel', clearLandingNavigationTarget, { passive: true });
window.addEventListener('touchstart', clearLandingNavigationTarget, { passive: true });
window.addEventListener(
  'scroll',
  () => {
    if (navigationFrame || !document.querySelector('.landing-page')) return;
    navigationFrame = requestAnimationFrame(() => {
      navigationFrame = null;
      if (landingNavigationTarget) {
        const target = document.querySelector(landingNavigationTarget);
        if (target && Math.abs(target.getBoundingClientRect().top - 86) > 28) return;
        clearLandingNavigationTarget();
      }
      const links = [...document.querySelectorAll('.landing-nav .fi-nav-link')];
      let active;
      for (const link of links) {
        const section = document.querySelector(link.getAttribute('href'));
        if (section && section.getBoundingClientRect().top <= window.innerHeight * 0.35)
          active = link;
      }
      for (const link of links) {
        link.classList.toggle('is-active', link === active);
        if (link === active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    });
  },
  { passive: true },
);

export function renderLanding() {
  injectShellStyles();
  const app = document.getElementById('app');
  const destination = getToken() ? '#marketplace' : '#login';
  app.innerHTML = `<main class="landing-page"><header class="fi-header landing-nav"><a class="fi-header-brand" href="#beranda" aria-label="Food Ilee">${brandImage()}</a><nav class="fi-nav" aria-label="Navigasi utama"><a class="fi-nav-link" href="#tentang">${icon('leaf')}<span>Tentang</span></a><a class="fi-nav-link" href="#cara-kerja">${icon('guide')}<span>Cara Kerja</span></a><a class="fi-nav-link" href="#dampak">${icon('recycle')}<span>Dampak</span></a><a class="fi-nav-link" href="#pasar">${icon('market')}<span>Marketplace</span></a><a class="fi-nav-link" href="#teknologi">${icon('ai')}<span>AI Assist</span></a></nav><div class="fi-header-actions landing-actions">${languagePicker()}<a class="landing-login" href="#login">Masuk</a><a class="landing-join" href="#daftar">Mulai Sekarang <span>&rarr;</span></a></div></header><section class="landing-hero" id="beranda"><div class="landing-hero-image"></div><div class="landing-hero-content"><p class="landing-eyebrow"><span></span> MASA DEPAN SIRKULARITAS PANGAN</p><h1>Ubah limbah pangan<br>menjadi <em>lebih bernilai.</em></h1><p>Food Ilee mempertemukan pemilik limbah pangan dan orang yang dapat memanfaatkannya kembali — dengan bantuan teknologi AI.</p><div class="landing-hero-cta"><a class="landing-join" href="${destination}">Jelajahi Food Ilee <span>→</span></a><a href="#cara-kerja" class="landing-text-link">Kenali cara kerjanya <span>↓</span></a></div><div class="landing-highlights"><span><i>01</i> Marketplace sirkular</span><span><i>02</i> Panduan AI</span><span><i>03</i> Komunitas lokal</span></div><div class="landing-proof"><span class="landing-proof-mark">${icon('recycle')}</span><p><strong>Setiap sisa punya kesempatan kedua.</strong><br>Mulai dari komunitas Anda, hari ini.</p></div></div><div class="landing-hero-note"><span>01 / 04</span><i></i><span>SIRKULARITAS PANGAN</span></div></section><section class="landing-about landing-section" id="tentang"><div class="landing-section-label"><span>01</span> TENTANG FOOD ILEE</div><div class="landing-about-grid"><h2>Masalah pangan butuh cara pandang <em>yang baru.</em></h2><div><p>Di balik setiap sisa pangan, ada sumber daya yang belum selesai dimanfaatkan. Food Ilee membantu menghubungkan sumber tersebut dengan peluang baru untuk pakan ternak, kompos, dan pemanfaatan berkelanjutan.</p><a class="landing-underlink" href="${destination}">Jelajahi platform <span>↗</span></a></div></div><div class="landing-values"><article><span class="landing-value-icon">${icon('recycle')}</span><h3>Perpanjang manfaat</h3><p>Hubungkan bahan organik dengan pengguna yang membutuhkannya.</p></article><article><span class="landing-value-icon accent">${icon('sparkles')}</span><h3>Temukan kemungkinan</h3><p>Dapatkan panduan praktis mengolah sisa pangan dengan lebih baik.</p></article><article><span class="landing-value-icon mint">${icon('leaf')}</span><h3>Bangun ekosistem lokal</h3><p>Mulai perubahan sirkular dari penjual dan pembeli di sekitar Anda.</p></article></div></section><section class="landing-how landing-section" id="cara-kerja"><div class="landing-section-label"><span>02</span> CARA KERJA</div><div class="landing-how-heading"><h2>Sederhana untuk dimulai.<br><em>Berdampak saat dilakukan.</em></h2><p>Tiga langkah untuk mengalirkan kembali nilai dari pangan.</p></div><div class="landing-steps"><article><b>01</b><div class="landing-step-symbol">${icon('add')}</div><h3>Bagikan yang tersedia</h3><p>Tambahkan foto, kategori, jumlah, dan harga limbah organik Anda.</p></article><span class="landing-step-line"></span><article><b>02</b><div class="landing-step-symbol accent">${icon('search')}</div><h3>Temukan pemanfaatnya</h3><p>Pembeli menjelajahi produk dan memesan bahan yang sesuai kebutuhan.</p></article><span class="landing-step-line"></span><article><b>03</b><div class="landing-step-symbol mint">${icon('recycle')}</div><h3>Manfaatkan kembali</h3><p>Ubah sisa pangan menjadi bahan berguna untuk rantai pangan berikutnya.</p></article></div><a class="landing-join" href="${destination}">Mulai perjalanan Anda <span>→</span></a></section><section class="landing-impact landing-section" id="dampak"><div class="landing-impact-copy"><div class="landing-section-label light"><span>03</span> DAMPAK SIRKULAR</div><h2>Sumber daya yang berputar. <em>Masa depan yang lebih baik.</em></h2><p>Ekonomi sirkular tumbuh saat kita membuat pilihan yang menjaga nilai sumber daya tetap bergerak. Langkah kecil setiap pelaku membantu membangun sistem pangan yang lebih bijak.</p><a href="${destination}" class="landing-impact-link">Jadi bagian perubahan <span>→</span></a></div><div class="landing-impact-art"><div class="impact-ring ring-one"></div><div class="impact-ring ring-two"></div><div class="impact-core">Food<br>Ilee</div><span class="impact-node node-one">PANEN</span><span class="impact-node node-two">PAKAN</span><span class="impact-node node-three">KOMPOS</span><span class="impact-leaf leaf-one">✳</span><span class="impact-leaf leaf-two">✦</span></div></section><section class="landing-market landing-section" id="pasar"><div class="landing-section-label"><span>04</span> PASAR SIRKULAR</div><div class="landing-market-head"><div><h2>Temukan nilai di setiap <em>kategori.</em></h2><p>Jelajahi bahan organik untuk berbagai kebutuhan pengolahan.</p></div><a href="${destination}" class="landing-underlink">Buka marketplace <span>↗</span></a></div><div class="landing-market-grid"><a href="${destination}" class="landing-category category-feed"><span>01 / PEMANFAATAN</span><div><small>01</small><h3>Bahan pakan</h3><p>Bahan pangan yang dapat dimanfaatkan sebagai pakan ternak.</p></div><span class="category-arrow">${icon('external')}</span></a><a href="${destination}" class="landing-category category-compost"><span>02 / PENGOLAHAN</span><div><small>02</small><h3>Bahan kompos</h3><p>Sisa organik untuk membantu menyuburkan kembali tanah.</p></div><span class="category-arrow">${icon('external')}</span></a><a href="${destination}" class="landing-category category-community"><span>03 / KOLABORASI</span><div><small>03</small><h3>Komunitas lokal</h3><p>Temukan peluang pemanfaatan di dalam ekosistem sekitar.</p></div><span class="category-arrow">${icon('external')}</span></a></div></section><section class="landing-ai landing-section" id="teknologi"><div class="landing-ai-visual"><div class="ai-spark spark-one">✳</div><div class="ai-spark spark-two">✦</div><div class="ai-orbit"></div><div class="ai-chat-pill">Bagaimana mengolah sisa sayuran?</div><div class="ai-answer-pill"><span>✳</span> Pisahkan bahan organik dan hindari kontaminasi agar mudah diolah.</div><div class="ai-glow"></div></div><div class="landing-ai-copy"><div class="landing-section-label"><span>05</span> AI ASSIST</div><h2>Ide pengolahan, <em>selangkah lebih dekat.</em></h2><p>Tanyakan kategori, cara penyimpanan, atau peluang pemanfaatan limbah pangan. AI Food Ilee membantu memberi saran awal sesuai informasi yang Anda bagikan.</p><a href="${destination}" class="landing-join">Coba AI Food Ilee <span>→</span></a><small>Jawaban AI dapat perlu diperiksa kembali sesuai kondisi bahan.</small></div></section><section class="landing-final"><p>LANGKAH SIRKULAR DIMULAI DARI SINI</p><h2>Jadikan sisa sebagai<br><em>awal yang baru.</em></h2><a href="${destination}" class="landing-join">Bergabung dengan Food Ilee <span>→</span></a></section>${dashboardFooter()}</main>`;
  loadStylesheet('landing-style', new URL('../../styles/pages/landing.css', import.meta.url));
  bindHeaderScroll();
  bindMobileNav();
  document.querySelectorAll('.landing-nav .fi-nav-link').forEach((link) => {
    link.setAttribute('aria-label', link.querySelector('span')?.textContent.trim() || 'Navigasi');
  });
  bindLandingReveal();
  document.querySelectorAll('.landing-page a[href^="#"]').forEach((link) =>
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target && link.closest('.landing-nav')) {
        event.preventDefault();
        landingNavigationTarget = link.getAttribute('href');
        clearTimeout(landingNavigationTimer);
        landingNavigationTimer = setTimeout(clearLandingNavigationTarget, 1800);
        document.querySelectorAll('.landing-nav .fi-nav-link').forEach((item) => {
          item.classList.toggle('is-active', item === link);
          if (item === link) item.setAttribute('aria-current', 'location');
          else item.removeAttribute('aria-current');
        });
        target.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
          block: 'start',
        });
      }
    }),
  );
  const hero = document.querySelector('.landing-hero-image');
  if (hero)
    hero.style.backgroundImage =
      "linear-gradient(180deg,rgba(20,55,37,.04),rgba(20,55,37,.22)),url('./assets/landing-food-demo.jpg')";
}

function bindLandingReveal() {
  landingRevealObserver?.disconnect();
  if (
    !('IntersectionObserver' in window) ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return;

  const targets = document.querySelectorAll(
    '.landing-about > .landing-section-label, .landing-about-grid, .landing-values article, ' +
      '.landing-how > .landing-section-label, .landing-how-heading, .landing-steps article, .landing-how > .landing-join, ' +
      '.landing-impact-copy, .landing-impact-art, .landing-market > .landing-section-label, .landing-market-head, .landing-category, ' +
      '.landing-ai-visual, .landing-ai-copy, .landing-final > *, ' +
      '.landing-page .fi-footer-grid > div, .landing-page .fi-footer-bottom',
  );
  if (!targets.length) return;

  targets.forEach((element, index) => {
    element.classList.add('landing-reveal');
    element.style.setProperty('--landing-reveal-delay', `${(index % 3) * 75}ms`);
  });

  landingRevealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: '0px 0px -32px 0px' },
  );

  targets.forEach((element) => landingRevealObserver.observe(element));
}
