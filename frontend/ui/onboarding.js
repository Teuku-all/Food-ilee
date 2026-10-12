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
