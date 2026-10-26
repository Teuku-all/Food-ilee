import { loadStylesheet } from '../../utils/stylesheet.js';
import { languagePicker } from '../../utils/i18n.js';
import {
  loginUser,
  loginWithGoogle,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from '../../services/auth.js';
import { saveToken } from '../../utils/storage.js';
import { escapeHtml } from '../../utils/html.js';
import { brandImage, brandLogo, icon } from '../../ui/icons.js';

let mode = 'login';
let googleIdentityScript;
let nextAuthMessage = '';
let enteringMarketplace = false;
let marketplaceArrivalRevision = 0;

export function renderLogin(initialMode = 'login') {
  mode = initialMode;
  const app = document.getElementById('app');
  const switching = Boolean(app.querySelector('.auth-page'));
  const renderPage = () => {
    app.innerHTML = `
    <main class="auth-page ${initialMode === 'register' ? 'register-page' : ''} ${switching ? 'auth-switching' : 'auth-enter'}">
      <section class="auth-hero" aria-label="Tentang Food Ilee">
        <a class="auth-brand" href="#" aria-label="Food Ilee">${brandLogo()}</a>
        <div class="auth-hero-copy"><p class="auth-kicker">PANGAN LEBIH BAIK, BUMI LEBIH SEHAT</p><h1>Membangun Masa<br>Depan Sirkular.</h1><p>Bersama Food Ilee, setiap langkah kecil Anda dalam pengelolaan limbah berkontribusi pada ekosistem pangan yang lebih cerdas dan hijau.</p><div class="auth-community"><span class="auth-community-icon">${icon('community')}</span><span>Dipercaya komunitas pangan berkelanjutan</span></div></div>
        <span class="auth-hero-caption">Dari sisa menjadi sumber daya.</span>
      </section>
      <section class="auth-panel">${languagePicker()}<div class="auth-form-wrap" id="auth-form-wrap"></div><p class="auth-copyright">© 2026 Food Ilee · Memberdayakan sirkularitas untuk Indonesia.</p></section>
    </main>`;
    injectStyle();
    renderAuthForm(nextAuthMessage);
    nextAuthMessage = '';
  };

  if (
    switching &&
    document.startViewTransition &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    document.documentElement.dataset.authTransition = 'true';
    const transition = document.startViewTransition(renderPage);
    const clearTransition = () => delete document.documentElement.dataset.authTransition;
    transition.finished.then(clearTransition, clearTransition);
  } else {
    renderPage();
  }
}

function renderAuthForm(message = '') {
  const wrap = document.getElementById('auth-form-wrap');
  if (!wrap) return;
  if (mode === 'forgot') {
    renderForgotPasswordForm(wrap, message);
    return;
  }
  const registering = mode === 'register';
  wrap.innerHTML = `
    <a class="auth-wordmark" href="#" aria-label="Food Ilee">${brandLogo()}</a>
    <p class="auth-overline">${registering ? 'MULAI PERJALANAN ANDA' : 'SELAMAT DATANG KEMBALI'}</p>
    <h2>${registering ? 'Buat akun Anda' : 'Masuk ke akun Anda'}</h2>
    <p class="auth-intro">${registering ? 'Bergabung untuk mengubah limbah pangan menjadi peluang.' : 'Masuk untuk melanjutkan perjalanan ekonomi sirkular Anda.'}</p>
    ${message ? `<div class="auth-message" role="status">${escapeHtml(message)}</div>` : ''}
    <form class="auth-form" id="auth-form">
      ${registering ? '<label for="auth-name">Nama lengkap</label><input id="auth-name" name="name" type="text" placeholder="Nama Anda" autocomplete="name" minlength="3" required>' : ''}
      <label for="auth-email">Email</label><input id="auth-email" name="email" type="email" placeholder="nama@email.com" autocomplete="email" required>
      <div class="auth-password-label"><label for="auth-password">Kata sandi</label>${registering ? '' : '<button type="button" class="auth-text-button" id="auth-forgot">Lupa kata sandi?</button>'}</div>
      <div class="auth-password-wrap"><input id="auth-password" name="password" type="password" placeholder="${registering ? 'Minimal 8 karakter' : 'Masukkan kata sandi'}" autocomplete="${registering ? 'new-password' : 'current-password'}" minlength="${registering ? '8' : '1'}" required><button type="button" id="auth-toggle-password" aria-label="Tampilkan kata sandi" aria-pressed="false" aria-controls="auth-password"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6.2 9.5-6.2 9.5 6.2 9.5 6.2-3.4 6.2-9.5 6.2S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/></svg></button></div>
      ${registering ? '<label for="auth-confirm">Konfirmasi kata sandi</label><div class="auth-password-wrap"><input id="auth-confirm" name="confirmPassword" type="password" placeholder="Ulangi kata sandi" autocomplete="new-password" minlength="8" required></div><label class="auth-terms"><input type="checkbox" name="acceptTerms" value="yes" required><span>Saya menyetujui Syarat &amp; Ketentuan dan Kebijakan Privasi.</span></label>' : ''}
      <button class="auth-submit" type="submit">${registering ? 'Buat Akun' : 'Masuk'} <span>→</span></button>
    </form>
    <div class="auth-divider"><span>${registering ? 'ATAU DAFTAR DENGAN' : 'ATAU MASUK DENGAN'}</span></div>
    <div class="auth-google is-loading" id="auth-google" aria-live="polite">Memuat Google Sign-In…</div>
    <p class="auth-switch">${registering ? 'Sudah punya akun?' : 'Belum punya akun?'} <button type="button" id="auth-switch">${registering ? 'Masuk' : 'Daftar Sekarang'}</button></p>`;

  document.getElementById('auth-form').addEventListener('submit', submitAuth);
  document.getElementById('auth-switch').addEventListener('click', () => {
    location.hash = registering ? '#login' : '#daftar';
  });
  document.getElementById('auth-toggle-password').addEventListener('click', (event) => {
    const input = document.getElementById('auth-password');
    const showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    event.currentTarget.setAttribute('aria-pressed', String(showing));
    event.currentTarget.setAttribute(
      'aria-label',
      showing ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi',
    );
  });
  document.getElementById('auth-forgot')?.addEventListener('click', () => {
    mode = 'forgot';
    renderAuthForm();
  });
  configureGoogleButton(registering);
}

// Keep the user's entries intact when a request needs to be retried.
function showAuthError(form, message) {
  const wrap = form.parentElement;
  wrap.querySelector('.auth-message')?.remove();
  const feedback = document.createElement('div');
  feedback.className = 'auth-message';
  feedback.setAttribute('role', 'alert');
  feedback.tabIndex = -1;
  feedback.textContent = message;
  form.before(feedback);
  feedback.focus({ preventScroll: true });
}

function renderForgotPasswordForm(wrap, message = '') {
  wrap.innerHTML = `
    <p class="auth-overline">PEMULIHAN AKUN</p>
    <h2>Lupa password?</h2>
    <p class="auth-intro">Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat password baru.</p>
    ${message ? `<div class="auth-message" role="status">${escapeHtml(message)}</div>` : ''}
    <form class="auth-form" id="auth-forgot-form">
      <label for="auth-reset-email">Email</label>
      <input id="auth-reset-email" name="email" type="email" placeholder="nama@email.com" autocomplete="email" required>
      <button class="auth-submit" type="submit">Kirim tautan reset</button>
    </form>
    <p class="auth-switch"><button type="button" id="auth-back-login">Kembali ke login</button></p>`;

  wrap.querySelector('#auth-back-login').addEventListener('click', () => {
    mode = 'login';
    renderAuthForm();
  });
  wrap.querySelector('#auth-forgot-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('.auth-submit');
    submit.disabled = true;
    submit.textContent = 'Mengirim tautan…';
    try {
      const email = new FormData(form).get('email');
      const result = await requestPasswordReset(email);
      renderAuthForm(result.message || 'Jika email terdaftar, tautan reset password akan dikirim.');
    } catch (error) {
      showAuthError(form, error.message || 'Permintaan belum berhasil. Coba lagi.');
      submit.disabled = false;
      submit.textContent = 'Kirim tautan reset';
    }
  });
}

export function renderPasswordReset(token) {
  renderLogin('login');
  const wrap = document.getElementById('auth-form-wrap');
  if (!wrap) return;
  const normalizedToken = String(token || '');
  if (!/^[a-f0-9]{64}$/i.test(normalizedToken)) {
    wrap.innerHTML = `<p class="auth-overline">PEMULIHAN AKUN</p><h2>Tautan tidak valid</h2><p class="auth-intro">Minta tautan reset password yang baru dari halaman login.</p><p class="auth-switch"><button type="button" id="auth-back-login">Kembali ke login</button></p>`;
    wrap.querySelector('#auth-back-login').addEventListener('click', () => {
      mode = 'login';
      renderAuthForm();
    });
    return;
  }

  wrap.innerHTML = `
    <p class="auth-overline">PEMULIHAN AKUN</p>
    <h2>Buat password baru</h2>
    <p class="auth-intro">Gunakan password baru minimal 8 karakter.</p>
    <form class="auth-form" id="auth-reset-form">
      <label for="auth-new-password">Password baru</label>
      <input id="auth-new-password" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>
      <label for="auth-confirm-password">Konfirmasi password</label>
      <input id="auth-confirm-password" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>
      <button class="auth-submit" type="submit">Simpan password baru</button>
    </form>`;
  wrap.querySelector('#auth-reset-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (data.password !== data.confirmPassword) {
      form.parentElement.querySelector('.auth-message')?.remove();
      form.insertAdjacentHTML(
        'beforebegin',
        '<div class="auth-message" role="alert">Konfirmasi password belum cocok.</div>',
      );
      return;
    }
    const submit = form.querySelector('.auth-submit');
    submit.disabled = true;
    submit.textContent = 'Menyimpan…';
    try {
      const result = await resetPassword(normalizedToken, data.password);
      history.replaceState(null, '', `${location.pathname}${location.search}#login`);
      mode = 'login';
      renderAuthForm(result.message || 'Password berhasil diperbarui. Silakan masuk.');
    } catch (error) {
      renderAuthForm(error.message || 'Tautan reset tidak valid atau sudah kedaluwarsa.');
    }
  });
}

async function configureGoogleButton(registering) {
  const container = document.getElementById('auth-google');
  const clientId = globalThis.FOODILEE_CONFIG?.googleClientId;
  if (!container) return;
  if (!clientId) {
    container.classList.remove('is-loading', 'is-ready');
    container.classList.add('is-unavailable');
    container.textContent = 'Google Sign-In belum dikonfigurasi.';
    container.title = 'Google Sign-In belum dikonfigurasi.';
    return;
  }

  try {
    await loadGoogleIdentity();
    if (!container.isConnected) return;
    container.replaceChildren();
    globalThis.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
    });
    container.classList.remove('is-loading', 'is-unavailable');
    container.classList.add('is-ready');
    container.removeAttribute('aria-live');
    globalThis.google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: registering ? 'signup_with' : 'signin_with',
      shape: 'pill',
      width: Math.min(container.clientWidth, 400),
    });
  } catch {
    if (!container.isConnected) return;
    container.classList.remove('is-loading', 'is-ready');
    container.classList.add('is-unavailable');
    container.textContent = 'Google Sign-In gagal dimuat. Coba muat ulang halaman.';
    container.title = 'Google Identity Services tidak dapat dimuat.';
  }
}

function loadGoogleIdentity() {
  if (globalThis.google?.accounts?.id) return Promise.resolve();
  if (googleIdentityScript) return googleIdentityScript;

  googleIdentityScript = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => (globalThis.google?.accounts?.id ? resolve() : reject());
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return googleIdentityScript;
}

async function handleGoogleCredential(response) {
  try {
    const result = await loginWithGoogle(response.credential);
    await enterMarketplace(result.data.token);
  } catch (error) {
    renderAuthForm(error.message || 'Login dengan Google belum berhasil. Silakan coba lagi.');
  }
}

async function submitAuth(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('.auth-submit');
  const previousLabel = submit.innerHTML;
  const data = Object.fromEntries(new FormData(form));
  submit.disabled = true;
  submit.innerHTML = '<span class="auth-spinner"></span> Memproses…';
  try {
    if (mode === 'register') {
      if (data.password !== data.confirmPassword)
        throw new Error('Konfirmasi kata sandi belum cocok.');
      delete data.confirmPassword;
      delete data.acceptTerms;
      const usernameBase =
        (data.name || data.email.split('@')[0])
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 20) || 'pengguna';
      data.username = `${usernameBase}_${Math.random().toString(36).slice(2, 6)}`;
    }
    const result = mode === 'register' ? await registerUser(data) : await loginUser(data);
    if (!result.success)
      throw new Error(
        result.message ||
          (mode === 'register' ? 'Pendaftaran gagal.' : 'Email atau kata sandi tidak cocok.'),
      );
    if (mode === 'register') {
      nextAuthMessage = 'Akun berhasil dibuat. Silakan masuk dengan email dan kata sandi Anda.';
      location.hash = '#login';
      return;
    }
    await enterMarketplace(result.data.token);
  } catch (error) {
    if (form.isConnected) {
      showAuthError(form, error.message || 'Terjadi kendala. Silakan coba lagi.');
      submit.disabled = false;
      submit.innerHTML = previousLabel;
    }
  }
}

function waitForOverlayAnimation(overlay, timeout) {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      overlay.removeEventListener('animationend', onEnd);
      resolve();
    };
    const onEnd = (event) => {
      if (event.target === overlay) finish();
    };
    const timer = setTimeout(finish, timeout);
    overlay.addEventListener('animationend', onEnd);
  });
}

function waitForMarketplace() {
  if (document.querySelector('#app .mp-app')) return Promise.resolve();
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (!document.querySelector('#app .mp-app')) return;
      clearTimeout(timer);
      observer.disconnect();
      resolve();
    });
    const timer = setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 2500);
    observer.observe(document.getElementById('app'), { childList: true, subtree: true });
  });
}

async function enterMarketplace(token) {
  if (enteringMarketplace) return;
  saveToken(token);
  enteringMarketplace = true;
  const arrivalRevision = ++marketplaceArrivalRevision;
  document.documentElement.dataset.authMarketplaceArrival = 'true';
  const finishArrival = () => {
    if (arrivalRevision !== marketplaceArrivalRevision) return;
    delete document.documentElement.dataset.authMarketplaceArrival;
    window.dispatchEvent(new Event('foodilee:auth-marketplace-ready'));
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    location.hash = '#marketplace';
    enteringMarketplace = false;
    setTimeout(finishArrival, 850);
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'auth-success-transition';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `<span class="auth-success-logo">${brandImage()}</span>`;
  document.body.append(overlay);
  let marketplace;
  let mobileNav;
  try {
    await waitForOverlayAnimation(overlay, 760);
    location.hash = '#marketplace';
    await waitForMarketplace();
    marketplace = document.querySelector('#app .mp-app');
    mobileNav = document.querySelector('#app > .fi-mobile-nav');
    marketplace?.classList.add('auth-arriving');
    mobileNav?.classList.add('auth-arriving');
    await new Promise((resolve) => setTimeout(resolve, 100));
    overlay.classList.add('is-revealing');
    await waitForOverlayAnimation(overlay, 880);
  } finally {
    overlay.remove();
    marketplace?.classList.remove('auth-arriving');
    mobileNav?.classList.remove('auth-arriving');
    enteringMarketplace = false;
    setTimeout(finishArrival, 850);
  }
}

function injectStyle() {
  loadStylesheet('auth-style', new URL('../../styles/pages/auth.css', import.meta.url));
}
