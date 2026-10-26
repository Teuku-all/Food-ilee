import { dashboardHeader, dashboardFooter, bindShell, injectShellStyles } from './shell.js';
import { getCachedCurrentUser } from '../services/user.js';
import { icon } from './icons.js';

const steps = [
  {
    icon: '01',
    title: 'Sisa pangan punya nilai baru',
    text: 'Food Ilee menghubungkan pelaku pangan agar limbah organik dapat dimanfaatkan kembali, bukan berakhir begitu saja.',
    action: 'Jelajahi marketplace',
    href: '#marketplace',
  },
  {
    icon: '02',
    title: 'Mulai dari satu unggahan',
    text: 'Bagikan limbah yang tersedia, tambahkan foto, kategori, stok, dan harga. Informasi yang jelas membantu pembeli menemukan produk Anda.',
    action: 'Tambah limbah',
    href: '#tambah-limbah',
  },
  {
    icon: '03',
    title: 'Belajar dan pantau dampaknya',
    text: 'Tanyakan cara pemanfaatan kepada AI Food Ilee dan pantau pesanan serta perjalanan sirkularitas Anda dari satu tempat.',
    action: 'Buka Tanya AI',
    href: '#tanya-ai',
  },
];

const onboardVisuals = [
  {
    src: './assets/landing-compost-demo.jpg',
    label: 'TEMUKAN',
    title: 'Yang tersisa masih berharga.',
  },
  {
    src: './assets/demo-banana-peels.jpg',
    label: 'BAGIKAN',
    title: 'Satu unggahan, peluang baru.',
  },
  {
    src: './assets/landing-food-demo.jpg',
    label: 'BERTUMBUH',
    title: 'Langkah kecil, dampak bersama.',
  },
];

const guideImages = [
  {
    src: 'https://images.unsplash.com/photo-1714510949759-f87b13c30cc0?auto=format&fit=crop&w=1200&q=82',
    alt: 'Aneka sayuran segar tersusun di pasar petani',
  },
  {
    src: 'https://images.unsplash.com/photo-1611843467160-25afb8df1074?auto=format&fit=crop&w=1200&q=82',
    alt: 'Tangan menanam bibit pada tanah yang subur',
  },
  {
    src: 'https://images.unsplash.com/photo-1542128722-d6fe34923abc?auto=format&fit=crop&w=1200&q=82',
    alt: 'Seseorang memegang sayuran segar hasil panen',
  },
];

function onboardingStorageKey(userId) {
  return userId ? `foodilee_onboarding_v1:${userId}` : 'foodilee_onboarding_v1';
}

export function shouldShowOnboarding(userId) {
  const legacyKey = 'foodilee_onboarding_v1';
  if (!userId) return !localStorage.getItem(legacyKey);
  const key = onboardingStorageKey(userId);
  if (localStorage.getItem(legacyKey) === 'done') {
    localStorage.setItem(key, 'done');
    localStorage.removeItem(legacyKey);
  }
  return !localStorage.getItem(key);
}

export function renderOnboarding({ standalone = false, userId } = {}) {
  injectShellStyles();
  const accountId = userId || getCachedCurrentUser()?.data?.id;
  const storageKey = onboardingStorageKey(accountId);
  if (standalone) {
    renderGuidePage();
    return;
  }

  let activeStep = 0;
  const app = document.getElementById('app');
  const previousFocus = document.activeElement;
  document.documentElement.classList.add('fi-onboard-open');
  const finish = () => {
    localStorage.setItem(storageKey, 'done');
    app.querySelector('.fi-onboard-screen')?.remove();
    document.documentElement.classList.remove('fi-onboard-open');
    previousFocus?.focus?.({ preventScroll: true });
  };

  const render = () => {
    const step = steps[activeStep];
    const visual = onboardVisuals[activeStep];
    const current = String(activeStep + 1).padStart(2, '0');
    const total = String(steps.length).padStart(2, '0');
    const screen = `
      <section class="fi-onboard-screen">
        <div class="fi-onboard-card ${activeStep === 0 ? 'fi-onboard-enter' : 'fi-onboard-step-enter'}" role="dialog" aria-modal="true" aria-labelledby="fi-onboard-title" aria-describedby="fi-onboard-description">
          <div class="fi-onboard-visual">
            <img class="fi-onboard-photo" src="${visual.src}" alt="" loading="eager">
            <span class="fi-onboard-brand">${icon('leaf')} Food Ilee</span>
            <div class="fi-onboard-visual-bottom">
              <p class="fi-onboard-visual-tag">${visual.label}</p>
              <strong>${visual.title}</strong>
            </div>
          </div>
          <div class="fi-onboard-copy">
            <p class="fi-onboard-kicker">${icon('sparkles')} Panduan singkat</p>
            <h1 id="fi-onboard-title">${step.title}</h1>
            <p class="fi-onboard-description" id="fi-onboard-description">${step.text}</p>
            <div class="fi-onboard-footer">
              <div class="fi-onboard-progress-label"><span>Langkah ${current} dari ${total}</span><span>${Math.round(((activeStep + 1) / steps.length) * 100)}% selesai</span></div>
              <div class="fi-onboard-progress" role="progressbar" aria-label="Kemajuan panduan" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${activeStep + 1}">
                ${steps.map((_, index) => `<span class="${index === activeStep ? 'active' : index < activeStep ? 'done' : ''}"></span>`).join('')}
              </div>
              <div class="fi-onboard-actions">
                <button class="fi-onboard-skip" type="button">Lewati panduan</button>
                <button class="fi-onboard-next" type="button">${activeStep === steps.length - 1 ? 'Mulai sekarang' : 'Lanjut'} ${icon('arrow')}</button>
              </div>
            </div>
          </div>
          <button class="fi-onboard-close" type="button" aria-label="Tutup panduan">${icon('close')}</button>
        </div>
      </section>`;

    app.querySelector('.fi-onboard-screen')?.remove();
    app.insertAdjacentHTML('beforeend', screen);
    const modal = app.querySelector('.fi-onboard-screen');
    modal.querySelector('.fi-onboard-close').addEventListener('click', finish);
    modal.querySelector('.fi-onboard-skip').addEventListener('click', finish);
    const nextButton = modal.querySelector('.fi-onboard-next');
    nextButton.addEventListener('click', () => {
      if (activeStep === steps.length - 1) return finish();
      activeStep += 1;
      render();
    });
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') finish();
      if (event.key !== 'Tab') return;
      const controls = [...modal.querySelectorAll('button')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    nextButton.focus({ preventScroll: true });
  };

  render();
}

function renderGuidePage() {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="fi-app"><div class="fi-guide-shell">${dashboardHeader('')}<main class="fi-guide-page"><section class="fi-guide-hero"><div class="fi-guide-hero-copy"><p class="fi-guide-kicker">PANDUAN FOOD ILEE</p><h1>Mulai dari satu langkah kecil. Ciptakan dampak yang berarti.</h1><p>Food Ilee membantu Anda menemukan manfaat baru dari sisa pangan melalui marketplace, berbagi penawaran, dan wawasan pemanfaatan.</p><a class="fi-guide-primary" href="#marketplace">Jelajahi marketplace <span aria-hidden="true">→</span></a><div class="fi-guide-proof"><span aria-hidden="true">✳</span><span>Ekosistem pangan yang lebih sirkular, dimulai bersama Anda.</span></div></div><div class="fi-guide-hero-image"><img src="${guideImages[0].src}" alt="${guideImages[0].alt}" fetchpriority="high"><span class="fi-guide-image-label"><i></i> Temukan sumber daya di sekitar Anda</span></div></section><section class="fi-guide-section"><div class="fi-guide-section-head"><div><p class="fi-guide-kicker">TIGA LANGKAH MUDAH</p><h2>Perjalanan sirkular Anda dimulai di sini</h2></div><p>Pilih langkah yang ingin Anda mulai. Anda bisa menjelajahi semuanya kapan saja.</p></div><div class="fi-guide-cards">${steps.map((step, index) => `<article class="fi-guide-card"><div class="fi-guide-card-image"><img src="${guideImages[index].src}" alt="${guideImages[index].alt}" loading="lazy"><span>0${index + 1}</span></div><div class="fi-guide-card-copy"><p class="fi-guide-card-step">LANGKAH 0${index + 1}</p><h3>${step.title}</h3><p>${step.text}</p><a href="${step.href}">${step.action}<span aria-hidden="true">→</span></a></div></article>`).join('')}</div></section><section class="fi-guide-footer"><div><p class="fi-guide-kicker">SIAP MEMULAI?</p><h2>Satu pilihan Anda bisa memberi bahan pangan nilai baru.</h2></div><a class="fi-guide-primary" href="#marketplace">Mulai jelajahi <span aria-hidden="true">→</span></a></section><p class="fi-guide-photo-credit">Foto ilustrasi dari <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash</a>.</p></main>${dashboardFooter()}</div></div>`;
  app.querySelectorAll('.fi-guide-page img').forEach((image) => {
    image.addEventListener(
      'error',
      () => {
        image.src = './assets/foodilee-login-hero.png';
      },
      { once: true },
    );
  });
  bindShell();
  if (document.getElementById('fi-guide-style')) return;
  const style = document.createElement('style');
  style.id = 'fi-guide-style';
  style.textContent = `
    .fi-guide-shell{min-height:100vh;background:#e4efeb}
    .fi-guide-page{max-width:1280px;margin:auto;padding:36px 30px 74px}
    .fi-guide-hero{min-height:360px;padding:26px;border:1px solid #d3e2d9;border-radius:26px;display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,.88fr);align-items:center;gap:36px;background:linear-gradient(130deg,#f6fbf7,#eaf4ed);box-shadow:0 16px 40px #1638320b}
    .fi-guide-hero-copy{padding:15px 0 15px 13px}
    .fi-guide-kicker{margin:0 0 12px;color:#28704f;font-size:10px;font-weight:750;letter-spacing:.15em}
    .fi-guide-hero h1{max-width:610px;margin:0;color:#123d31;font-size:clamp(34px,4.4vw,55px);line-height:1.08;letter-spacing:-2px}
    .fi-guide-hero-copy>p:not(.fi-guide-kicker){max-width:560px;margin:17px 0 21px;color:#5c7166;font-size:14px;line-height:1.8}
    .fi-guide-primary{min-height:45px;width:max-content;padding:0 18px;border:1px solid #07594b;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;gap:13px;background:#07594b;color:#fff;font-size:12px;font-weight:700;text-decoration:none;transition:transform 180ms ease,box-shadow 180ms ease,background 180ms ease}
    .fi-guide-primary:hover{transform:translateY(-2px);background:#064b40;box-shadow:0 9px 18px #07594b28}
    .fi-guide-primary span{font-size:17px}
    .fi-guide-proof{display:flex;align-items:center;gap:8px;margin-top:19px;color:#718178;font-size:10px}
    .fi-guide-proof>span:first-child{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#d9eddd;color:#34724a}
    .fi-guide-hero-image{position:relative;min-height:306px;height:100%;overflow:hidden;border-radius:20px;background:#cddfd2}
    .fi-guide-hero-image::after,.fi-guide-card-image::after{position:absolute;inset:38% 0 0;background:linear-gradient(180deg,transparent,#0e30237a);content:'';pointer-events:none}
    .fi-guide-hero-image img,.fi-guide-card-image img{width:100%;height:100%;display:block;object-fit:cover}
    .fi-guide-image-label{position:absolute;z-index:1;right:14px;bottom:14px;left:14px;padding:11px 13px;border:1px solid #ffffff45;border-radius:12px;display:flex;align-items:center;gap:9px;background:#092b2278;color:#fff;font-size:11px;backdrop-filter:blur(10px)}
    .fi-guide-image-label i{width:7px;height:7px;border-radius:50%;background:#8de0a5;box-shadow:0 0 0 4px #8de0a52a}
    .fi-guide-section{padding:50px 0 44px}
    .fi-guide-section-head{margin-bottom:21px;display:flex;align-items:end;justify-content:space-between;gap:20px}
    .fi-guide-section-head .fi-guide-kicker{margin-bottom:8px}
    .fi-guide-section-head h2,.fi-guide-footer h2{margin:0;color:#173e32;font-size:clamp(22px,2.8vw,31px);line-height:1.2;letter-spacing:-.7px}
    .fi-guide-section-head>p{max-width:330px;margin:0;color:#748178;font-size:11px;line-height:1.65}
    .fi-guide-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
    .fi-guide-card{overflow:hidden;border:1px solid #cfddd3;border-radius:20px;background:#f9fcf9;box-shadow:0 9px 24px #16383209;transition:transform 220ms ease,box-shadow 220ms ease}
    .fi-guide-card:hover{transform:translateY(-5px);box-shadow:0 17px 34px #16383218}
    .fi-guide-card-image{position:relative;height:185px;overflow:hidden;background:#dbe9de}
    .fi-guide-card-image img{transition:transform 450ms cubic-bezier(.2,.7,.2,1)}
    .fi-guide-card:hover .fi-guide-card-image img{transform:scale(1.045)}
    .fi-guide-card-image>span{position:absolute;z-index:1;top:13px;left:13px;width:34px;height:34px;border:1px solid #ffffff70;border-radius:11px;display:grid;place-items:center;background:#eff8f0e8;color:#235e40;font-size:11px;font-weight:800;box-shadow:0 4px 12px #16383216}
    .fi-guide-card-copy{padding:19px 19px 18px}
    .fi-guide-card-step{margin:0 0 8px;color:#42805a;font-size:9px;font-weight:750;letter-spacing:.12em}
    .fi-guide-card-copy h3{margin:0 0 8px;color:#214738;font-size:17px;line-height:1.3;letter-spacing:-.2px}
    .fi-guide-card-copy>p:not(.fi-guide-card-step){min-height:59px;margin:0;color:#6b7b71;font-size:11px;line-height:1.7}
    .fi-guide-card-copy>a{margin-top:15px;padding-top:13px;border-top:1px solid #dfe9e1;display:flex;align-items:center;justify-content:space-between;gap:10px;color:#235347;font-size:11px;font-weight:700;text-decoration:none}
    .fi-guide-card-copy>a span{font-size:16px;transition:transform 160ms ease}
    .fi-guide-card-copy>a:hover span{transform:translateX(3px)}
    .fi-guide-footer{padding:22px 24px;border:1px solid #b9d2c1;border-radius:20px;display:flex;align-items:center;justify-content:space-between;gap:20px;background:linear-gradient(120deg,#e4f2e7,#f6faf5)}
    .fi-guide-footer .fi-guide-kicker{margin-bottom:8px}
    .fi-guide-footer h2{max-width:650px;font-size:21px}
    .fi-guide-photo-credit{margin:18px 0 0;color:#809087;font-size:9px;text-align:right}
    .fi-guide-photo-credit a{color:#517866}
    @media(max-width:850px){.fi-guide-page{padding:25px 18px 56px}.fi-guide-hero{grid-template-columns:minmax(0,1fr) minmax(260px,.8fr);gap:22px;padding:20px}.fi-guide-hero-copy{padding-left:3px}.fi-guide-hero-image{min-height:260px}.fi-guide-card-image{height:155px}.fi-guide-card-copy{padding:16px}.fi-guide-card-copy h3{font-size:15px}}
    @media(max-width:640px){.fi-guide-page{padding:18px 14px 42px}.fi-guide-hero{grid-template-columns:1fr;gap:20px;padding:17px;border-radius:21px}.fi-guide-hero-copy{padding:5px 2px 0}.fi-guide-hero h1{font-size:35px;letter-spacing:-1.4px}.fi-guide-hero-copy>p:not(.fi-guide-kicker){font-size:13px;line-height:1.7}.fi-guide-hero-image{min-height:205px;height:205px;border-radius:16px}.fi-guide-section{padding:35px 0}.fi-guide-section-head{align-items:flex-start;flex-direction:column;gap:8px}.fi-guide-section-head>p{font-size:11px}.fi-guide-cards{grid-template-columns:1fr;gap:13px}.fi-guide-card{display:grid;grid-template-columns:118px minmax(0,1fr);border-radius:16px}.fi-guide-card-image{height:100%;min-height:194px}.fi-guide-card-copy{padding:15px}.fi-guide-card-copy h3{font-size:15px}.fi-guide-card-copy>p:not(.fi-guide-card-step){min-height:0;font-size:10px}.fi-guide-card-copy>a{margin-top:12px;padding-top:10px;font-size:10px}.fi-guide-footer{align-items:flex-start;flex-direction:column;padding:19px;border-radius:17px}.fi-guide-footer h2{font-size:19px}.fi-guide-photo-credit{text-align:left}}
    @media(max-width:380px){.fi-guide-hero h1{font-size:30px}.fi-guide-card{grid-template-columns:94px minmax(0,1fr)}.fi-guide-card-image{min-height:210px}.fi-guide-card-copy{padding:13px}.fi-guide-card-copy h3{font-size:14px}}
    @media(prefers-reduced-motion:reduce){.fi-guide-primary,.fi-guide-card,.fi-guide-card-image img,.fi-guide-card-copy>a span{transition:none}}
  `;
  document.head.append(style);
}
