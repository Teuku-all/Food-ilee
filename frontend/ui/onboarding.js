import { dashboardHeader, dashboardFooter, bindShell, injectShellStyles } from './shell.js';
import { getCachedCurrentUser } from '../services/user.js';

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
  const render = () => {
    const step = steps[activeStep];
    const shellStart = standalone ? `<div class="fi-app">${dashboardHeader('')}` : '';
    const shellEnd = standalone ? `${dashboardFooter()}</div>` : '';
    const screen = `<section class="fi-onboard-screen${standalone ? ' standalone' : ''}"><div class="fi-onboard-card fi-enter"><button class="fi-onboard-close" type="button" aria-label="Tutup panduan">×</button><div class="fi-onboard-art"><div class="fi-onboard-orbit orbit-a"></div><div class="fi-onboard-orbit orbit-b"></div><span class="fi-onboard-number">${step.icon}</span><span class="fi-onboard-leaf">✳</span><span class="fi-onboard-dot dot-a"></span><span class="fi-onboard-dot dot-b"></span></div><div class="fi-onboard-copy"><p class="fi-onboard-kicker">SELAMAT DATANG DI FOOD ILEE</p><h1>${step.title}</h1><p>${step.text}</p><div class="fi-onboard-progress">${steps.map((_, index) => `<span class="${index === activeStep ? 'active' : ''}"></span>`).join('')}</div><div class="fi-onboard-actions"><button class="fi-onboard-skip" type="button">Lewati panduan</button><button class="fi-button fi-onboard-next" type="button">${activeStep === steps.length - 1 ? 'Mulai sekarang' : 'Lanjut'} <span aria-hidden="true">→</span></button></div></div></div></section>`;
    if (standalone) app.innerHTML = `${shellStart}${screen}${shellEnd}`;
    else {
      app.querySelector('.fi-onboard-screen')?.remove();
      app.insertAdjacentHTML('beforeend', screen);
    }
    if (standalone) bindShell();
    document.querySelector('.fi-onboard-close').addEventListener('click', finish);
    document.querySelector('.fi-onboard-skip').addEventListener('click', finish);
    document.querySelector('.fi-onboard-next').addEventListener('click', () => {
      if (activeStep < steps.length - 1) {
        activeStep += 1;
        render();
        return;
      }
      localStorage.setItem(storageKey, 'done');
      if (standalone) location.hash = '#dashboard';
      else app.querySelector('.fi-onboard-screen')?.remove();
    });
  };
  const finish = () => {
    localStorage.setItem(storageKey, 'done');
    if (standalone) location.hash = '#dashboard';
    else app.querySelector('.fi-onboard-screen')?.remove();
  };
  const style = document.createElement('style');
  style.id = 'fi-onboard-style';
  style.textContent = `.fi-onboard-screen{position:fixed;inset:0;z-index:1000;padding:24px;display:grid;place-items:center;background:#082f2891;backdrop-filter:blur(6px)}.fi-onboard-screen.standalone{position:relative;min-height:calc(100vh - 400px);background:linear-gradient(130deg,#eff8f2,#fbfaf8)}.fi-onboard-card{position:relative;width:min(820px,100%);min-height:405px;padding:42px;display:grid;grid-template-columns: .95fr 1.05fr;align-items:center;gap:50px;border:1px solid #ecf0ed;border-radius:30px;background:#fff;box-shadow:0 28px 80px #071f1730;overflow:hidden}.fi-onboard-close{position:absolute;top:18px;right:19px;width:36px;height:36px;border:0;border-radius:50%;background:#f2f4f1;color:#495650;font-size:24px;cursor:pointer}.fi-onboard-art{position:relative;min-height:290px;border-radius:25px;display:grid;place-items:center;overflow:hidden;background:linear-gradient(145deg,#d3f1df,#7ec39c 55%,#005448);color:white}.fi-onboard-art:before,.fi-onboard-art:after{content:'';position:absolute;width:200px;height:200px;border-radius:45% 55% 60% 40%;background:#ffffff20;transform:rotate(28deg)}.fi-onboard-art:before{top:-85px;left:-60px}.fi-onboard-art:after{right:-70px;bottom:-100px;background:#003c3230}.fi-onboard-orbit{position:absolute;width:204px;height:204px;border:1px solid #ffffff58;border-radius:50%}.orbit-a{transform:scaleX(1.6) rotate(-28deg)}.orbit-b{transform:scaleX(.8) rotate(36deg)}.fi-onboard-number{position:relative;z-index:1;font-size:70px;font-weight:600;letter-spacing:-4px}.fi-onboard-leaf{position:absolute;right:40px;bottom:40px;font-size:29px;color:#e1f8e9}.fi-onboard-dot{position:absolute;width:12px;height:12px;border:3px solid #f4fff6;border-radius:50%;background:#68ad86}.dot-a{top:50px;right:57px}.dot-b{left:57px;bottom:60px;width:8px;height:8px}.fi-onboard-copy{padding:12px 0}.fi-onboard-kicker{margin:0 0 12px;color:#3d7b62;font-size:10px;font-weight:700;letter-spacing:.14em}.fi-onboard-copy h1{max-width:365px;margin:0 0 14px;color:#153d32;font-size:32px;line-height:1.17;letter-spacing:-.8px}.fi-onboard-copy>p:not(.fi-onboard-kicker){margin:0;color:#66736d;font-size:14px;line-height:1.7}.fi-onboard-progress{display:flex;gap:7px;margin:28px 0 23px}.fi-onboard-progress span{width:25px;height:5px;border-radius:9px;background:#e5ebe6;transition:width .2s,background .2s}.fi-onboard-progress span.active{width:47px;background:#176457}.fi-onboard-actions{display:flex;align-items:center;justify-content:space-between;gap:15px}.fi-onboard-skip{padding:10px 0;border:0;background:none;color:#748078;font:500 12px Inter,Arial,sans-serif;cursor:pointer}.fi-onboard-next{min-width:143px}.fi-onboard-next span{font-size:16px}@media(max-width:650px){.fi-onboard-screen{padding:12px}.fi-onboard-card{min-height:0;padding:18px;grid-template-columns:1fr;gap:24px;border-radius:24px}.fi-onboard-art{min-height:165px;border-radius:18px}.fi-onboard-number{font-size:55px}.fi-onboard-copy{padding:0 5px 5px}.fi-onboard-copy h1{font-size:26px}.fi-onboard-copy>p:not(.fi-onboard-kicker){font-size:13px}.fi-onboard-progress{margin:20px 0}.fi-onboard-actions{align-items:flex-start}.fi-onboard-next{min-width:125px}.fi-onboard-screen.standalone{min-height:calc(100vh - 290px)}}`;
  if (!document.getElementById('fi-onboard-style')) document.head.append(style);
  render();
}

function renderGuidePage() {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="fi-app"><div class="fi-guide-shell">${dashboardHeader('')}<main class="fi-guide-page"><section class="fi-guide-hero"><div class="fi-guide-hero-copy"><p class="fi-guide-kicker">PANDUAN FOOD ILEE</p><h1>Mulai dari satu langkah kecil. Ciptakan dampak yang berarti.</h1><p>Food Ilee membantu Anda menemukan manfaat baru dari sisa pangan melalui marketplace, berbagi penawaran, dan wawasan pemanfaatan.</p><a class="fi-guide-primary" href="#marketplace">Jelajahi marketplace <span aria-hidden="true">→</span></a><div class="fi-guide-proof"><span aria-hidden="true">✳</span><span>Ekosistem pangan yang lebih sirkular, dimulai bersama Anda.</span></div></div><div class="fi-guide-hero-image"><img src="${guideImages[0].src}" alt="${guideImages[0].alt}" fetchpriority="high"><span class="fi-guide-image-label"><i></i> Temukan sumber daya di sekitar Anda</span></div></section><section class="fi-guide-section"><div class="fi-guide-section-head"><div><p class="fi-guide-kicker">TIGA LANGKAH MUDAH</p><h2>Perjalanan sirkular Anda dimulai di sini</h2></div><p>Pilih langkah yang ingin Anda mulai. Anda bisa menjelajahi semuanya kapan saja.</p></div><div class="fi-guide-cards">${steps.map((step, index) => `<article class="fi-guide-card"><div class="fi-guide-card-image"><img src="${guideImages[index].src}" alt="${guideImages[index].alt}" loading="lazy"><span>0${index + 1}</span></div><div class="fi-guide-card-copy"><p class="fi-guide-card-step">LANGKAH 0${index + 1}</p><h3>${step.title}</h3><p>${step.text}</p><a href="${step.href}">${step.action}<span aria-hidden="true">→</span></a></div></article>`).join('')}</div></section><section class="fi-guide-footer"><div><p class="fi-guide-kicker">SIAP MEMULAI?</p><h2>Satu pilihan Anda bisa memberi bahan pangan nilai baru.</h2></div><a class="fi-guide-primary" href="#marketplace">Mulai jelajahi <span aria-hidden="true">→</span></a></section><p class="fi-guide-photo-credit">Foto ilustrasi dari <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash</a>.</p></main>${dashboardFooter()}</div></div>`;
  app.querySelectorAll('.fi-guide-page img').forEach((image) => {
    image.addEventListener('error', () => { image.src = './assets/foodilee-login-hero.png'; }, { once: true });
  });
  bindShell();
  if (document.getElementById('fi-guide-style')) return;
  const style = document.createElement('style');
  style.id = 'fi-guide-style';
  style.textContent = `
    .fi-guide-shell{min-height:100vh;background:#e4efeb}
    .fi-guide-page{max-width:1280px;margin:auto;padding:36px 30px 74px}
    .fi-guide-hero{min-height:360px;padding:26px;border:1px solid #d3e2d9;border-radius:26px;display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,.88fr);align-items:center;gap:36px;background:linear-gradient(130deg,#f6fbf7,#eaf4ed);box-shadow:0 16px 40px #173d3c0b}
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
    .fi-guide-card{overflow:hidden;border:1px solid #cfddd3;border-radius:20px;background:#f9fcf9;box-shadow:0 9px 24px #173d3c09;transition:transform 220ms ease,box-shadow 220ms ease}
    .fi-guide-card:hover{transform:translateY(-5px);box-shadow:0 17px 34px #173d3c18}
    .fi-guide-card-image{position:relative;height:185px;overflow:hidden;background:#dbe9de}
    .fi-guide-card-image img{transition:transform 450ms cubic-bezier(.2,.7,.2,1)}
    .fi-guide-card:hover .fi-guide-card-image img{transform:scale(1.045)}
    .fi-guide-card-image>span{position:absolute;z-index:1;top:13px;left:13px;width:34px;height:34px;border:1px solid #ffffff70;border-radius:11px;display:grid;place-items:center;background:#eff8f0e8;color:#235e40;font-size:11px;font-weight:800;box-shadow:0 4px 12px #173d3c16}
    .fi-guide-card-copy{padding:19px 19px 18px}
    .fi-guide-card-step{margin:0 0 8px;color:#42805a;font-size:9px;font-weight:750;letter-spacing:.12em}
    .fi-guide-card-copy h3{margin:0 0 8px;color:#214738;font-size:17px;line-height:1.3;letter-spacing:-.2px}
    .fi-guide-card-copy>p:not(.fi-guide-card-step){min-height:59px;margin:0;color:#6b7b71;font-size:11px;line-height:1.7}
    .fi-guide-card-copy>a{margin-top:15px;padding-top:13px;border-top:1px solid #dfe9e1;display:flex;align-items:center;justify-content:space-between;gap:10px;color:#176457;font-size:11px;font-weight:700;text-decoration:none}
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
