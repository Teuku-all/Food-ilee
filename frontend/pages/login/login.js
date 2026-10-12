import { loginUser, registerUser } from '../../services/auth.js';
import { saveToken } from '../../utils/storage.js';
import { escapeHtml } from '../../utils/html.js';

let mode = 'login';

export function renderLogin(initialMode = 'login') {
  mode = initialMode;
  const app = document.getElementById('app');
  app.innerHTML = `
    <main class="auth-page ${initialMode === 'register' ? 'register-page' : ''}">
      <section class="auth-hero" aria-label="Tentang Food Ilee">
        <a class="auth-brand" href="#">Food Ilee</a>
        <div class="auth-hero-copy"><p class="auth-kicker">PANGAN LEBIH BAIK, BUMI LEBIH SEHAT</p><h1>Membangun Masa<br>Depan Sirkular.</h1><p>Bersama Food Ilee, setiap langkah kecil Anda dalam pengelolaan limbah berkontribusi pada ekosistem pangan yang lebih cerdas dan hijau.</p><div class="auth-community"><span class="auth-community-icon">✳</span><span>Dipercaya komunitas pangan berkelanjutan</span></div></div>
        <span class="auth-hero-caption">Dari sisa menjadi sumber daya.</span>
      </section>
      <section class="auth-panel"><div class="auth-form-wrap" id="auth-form-wrap"></div><p class="auth-copyright">© 2026 Food Ilee · Memberdayakan sirkularitas untuk Indonesia.</p></section>
    </main>`;
  injectStyle();
  renderAuthForm();
}

function renderAuthForm(message = '') {
  const wrap = document.getElementById('auth-form-wrap');
  if (!wrap) return;
  const registering = mode === 'register';
  wrap.innerHTML = `
    <a class="auth-wordmark" href="#">Food Ilee</a>
    <p class="auth-overline">${registering ? 'MULAI PERJALANAN ANDA' : 'SELAMAT DATANG KEMBALI'}</p>
    <h2>${registering ? 'Buat akun Anda' : 'Masuk ke akun Anda'}</h2>
    <p class="auth-intro">${registering ? 'Bergabung untuk mengubah limbah pangan menjadi peluang.' : 'Masuk untuk melanjutkan perjalanan ekonomi sirkular Anda.'}</p>
    ${message ? `<div class="auth-message" role="status">${escapeHtml(message)}</div>` : ''}
    <form class="auth-form" id="auth-form">
      ${registering ? '<label for="auth-name">Nama lengkap</label><input id="auth-name" name="name" type="text" placeholder="Nama Anda" autocomplete="name" minlength="3" required>' : ''}
      <label for="auth-email">Email</label><input id="auth-email" name="email" type="email" placeholder="nama@email.com" autocomplete="email" required>
      <div class="auth-password-label"><label for="auth-password">Kata sandi</label>${registering ? '' : '<button type="button" class="auth-text-button" id="auth-forgot">Lupa kata sandi?</button>'}</div>
      <div class="auth-password-wrap"><input id="auth-password" name="password" type="password" placeholder="${registering ? 'Minimal 8 karakter' : 'Masukkan kata sandi'}" autocomplete="${registering ? 'new-password' : 'current-password'}" minlength="${registering ? '8' : '1'}" required><button type="button" id="auth-toggle-password" aria-label="Tampilkan kata sandi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6.2 9.5-6.2 9.5 6.2 9.5 6.2-3.4 6.2-9.5 6.2S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/></svg></button></div>
      ${registering ? '<label for="auth-confirm">Konfirmasi kata sandi</label><div class="auth-password-wrap"><input id="auth-confirm" name="confirmPassword" type="password" placeholder="Ulangi kata sandi" autocomplete="new-password" minlength="8" required></div><label class="auth-terms"><input type="checkbox" name="acceptTerms" value="yes" required><span>Saya menyetujui Syarat &amp; Ketentuan dan Kebijakan Privasi.</span></label>' : ''}
      <button class="auth-submit" type="submit">${registering ? 'Buat Akun' : 'Masuk'} <span>→</span></button>
    </form>
    ${registering ? '<div class="auth-divider"><span>ATAU DAFTAR DENGAN</span></div><button type="button" class="auth-google" disabled><b>G</b> Daftar dengan Google</button>' : '<div class="auth-divider"><span>AMAN &amp; TERPERCAYA</span></div>'}
    <p class="auth-switch">${registering ? 'Sudah punya akun?' : 'Belum punya akun?'} <button type="button" id="auth-switch">${registering ? 'Masuk' : 'Daftar Sekarang'}</button></p>`;

  document.getElementById('auth-form').addEventListener('submit', submitAuth);
  document.getElementById('auth-switch').addEventListener('click', () => {
    location.hash = registering ? '#login' : '#daftar';
  });
  document.getElementById('auth-toggle-password').addEventListener('click', (event) => {
    const input = document.getElementById('auth-password');
    const showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    event.currentTarget.setAttribute(
      'aria-label',
      showing ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi',
    );
  });
  document.getElementById('auth-forgot')?.addEventListener('click', () => {
    renderAuthForm('Untuk mengatur ulang kata sandi, hubungi tim Food Ilee melalui pusat bantuan.');
  });
}

async function submitAuth(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('.auth-submit');
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
      mode = 'login';
      renderAuthForm('Akun berhasil dibuat. Silakan masuk dengan email dan kata sandi Anda.');
      return;
    }
    saveToken(result.data.token);
    location.hash = '#dashboard';
  } catch (error) {
    renderAuthForm(error.message || 'Terjadi kendala. Silakan coba lagi.');
  }
}

function injectStyle() {
  if (document.getElementById('auth-style')) return;
  const style = document.createElement('style');
  style.id = 'auth-style';
  style.textContent = `
    .auth-page{min-height:100vh;display:grid;grid-template-columns:minmax(0,1.5fr) minmax(470px,1fr);background:#fbfcfa;color:#18221e;font-family:Inter,Arial,sans-serif}.auth-hero{position:relative;min-height:100vh;padding:42px 9%;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;background:linear-gradient(90deg,rgba(0,66,55,.77),rgba(0,77,64,.52)),url('./assets/foodilee-login-hero.png') center/cover no-repeat;color:#fff}.auth-brand{color:white;font-size:23px;font-weight:700;letter-spacing:-.6px}.auth-hero-copy{max-width:540px;margin:40px auto}.auth-kicker{margin:0 0 17px;color:#b7e5d5;font-size:11px;font-weight:700;letter-spacing:.15em}.auth-hero-copy h1{margin:0 0 20px;color:#d1f2e5;font-size:clamp(38px,4vw,58px);line-height:1.08;letter-spacing:-1.6px;font-weight:600}.auth-hero-copy>p:not(.auth-kicker){max-width:465px;margin:0;color:#d9eee6;font-size:17px;line-height:1.65}.auth-community{display:flex;align-items:center;gap:11px;margin-top:36px;color:#d2eae1;font-size:13px}.auth-community-icon{width:38px;height:38px;border:1px solid #ffffff55;border-radius:50%;display:grid;place-items:center;background:#ffffff20;color:#d1f2e5;font-size:19px}.auth-hero-caption{margin:0 auto;max-width:540px;width:100%;padding-bottom:5px;color:#d1e6dfaa;font-size:12px;letter-spacing:.04em}
    .auth-panel{min-height:100vh;padding:62px 9% 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fbfcfa}.auth-form-wrap{width:100%;max-width:448px}.auth-wordmark{display:none;color:#005448;font-size:22px;font-weight:700}.auth-overline{margin:0 0 10px;color:#54726a;font-size:11px;font-weight:700;letter-spacing:.13em}.auth-form-wrap h2{margin:0 0 8px;color:#18221e;font-size:36px;line-height:1.2;letter-spacing:-1.1px;font-weight:600}.auth-intro{margin:0 0 34px;color:#68736f;font-size:15px;line-height:1.6}.auth-message{margin:-15px 0 20px;padding:12px 14px;border:1px solid #d2e8dc;border-radius:12px;background:#eff7f2;color:#245b49;font-size:13px;line-height:1.5}.auth-form{display:flex;flex-direction:column;gap:10px}.auth-form>label,.auth-password-label label{color:#34423c;font-size:13px;font-weight:500}.auth-form>input,.auth-password-wrap input{width:100%;height:54px;padding:0 17px;border:1px solid transparent;border-radius:999px;outline:none;background:#f0f2ef;color:#202a26;font:400 14px Inter,Arial,sans-serif;transition:border .15s,box-shadow .15s}.auth-form>input::placeholder,.auth-password-wrap input::placeholder{color:#a7b1ac}.auth-form>input:focus,.auth-password-wrap input:focus{border-color:#6f9d8b;box-shadow:0 0 0 3px #0b6c5514}.auth-password-label{display:flex;align-items:center;justify-content:space-between;margin-top:14px}.auth-text-button{padding:0;border:0;background:none;color:#005448;font:600 11px Inter,Arial,sans-serif;cursor:pointer}.auth-password-wrap{position:relative}.auth-password-wrap input{padding-right:52px}.auth-password-wrap>button{position:absolute;top:50%;right:15px;transform:translateY(-50%);width:28px;height:28px;padding:4px;border:0;background:none;color:#5c6863;cursor:pointer}.auth-password-wrap svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.7}.auth-submit{height:53px;margin-top:16px;border:0;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:10px;background:#005448;color:white;font:500 14px Inter,Arial,sans-serif;cursor:pointer;box-shadow:0 8px 18px #00544815;transition:background .16s}.auth-submit:hover{background:#176457}.auth-submit:disabled{opacity:.7;cursor:wait}.auth-submit>span:not(.auth-spinner){font-size:17px}.auth-spinner{width:15px;height:15px;border:2px solid #ffffff60;border-top-color:white;border-radius:50%;animation:auth-spin .8s linear infinite}@keyframes auth-spin{to{transform:rotate(360deg)}}.auth-divider{height:38px;margin:10px 0 8px;display:flex;align-items:center;gap:15px;color:#a5b0aa;font-size:10px;font-weight:600;letter-spacing:.1em}.auth-divider:before,.auth-divider:after{content:'';height:1px;flex:1;background:#e6eae6}.auth-trust{display:flex;align-items:center;gap:12px;padding:13px 15px;border:1px solid #e7ece8;border-radius:14px;background:#fff}.auth-trust>span{width:30px;height:30px;flex:none;display:grid;place-items:center;border-radius:50%;background:#edf6f0;color:#176457}.auth-trust p{margin:0;color:#6e7974;font-size:11px;line-height:1.5}.auth-switch{margin:31px 0 0;color:#66716c;font-size:13px;text-align:center}.auth-switch button{padding:0;border:0;background:none;color:#005448;font:600 13px Inter,Arial,sans-serif;cursor:pointer}.auth-copyright{margin:auto 0 0;color:#89938e;font-size:10px;text-align:center}
    @media(max-width:900px){.auth-page{grid-template-columns:1fr}.auth-hero{min-height:260px;padding:22px 7%}.auth-brand{font-size:20px}.auth-hero-copy{margin:34px auto 25px}.auth-kicker{margin-bottom:10px}.auth-hero-copy h1{font-size:34px;margin-bottom:9px}.auth-hero-copy>p:not(.auth-kicker){font-size:14px}.auth-community,.auth-hero-caption{display:none}.auth-panel{min-height:calc(100vh - 260px);padding:38px 24px 18px}.auth-form-wrap{max-width:520px}.auth-wordmark{display:inline-block;margin-bottom:24px}.auth-form-wrap h2{font-size:30px}.auth-copyright{margin-top:34px}}
    .auth-terms{display:flex;align-items:flex-start;gap:9px;margin-top:7px;color:#68756d;font-size:10px;line-height:1.55}.auth-terms input{accent-color:#005448;margin:1px 0 0}.auth-terms span{max-width:365px}.auth-google{height:46px;border:1px solid #e3e9e5;border-radius:999px;background:#fff;color:#47554d;font:500 12px Inter,Arial,sans-serif}.auth-google b{margin-right:7px;color:#3885e8;font-size:16px}.register-page{min-height:100vh;padding:24px;box-sizing:border-box;grid-template-columns:minmax(320px,410px) minmax(420px,500px);align-content:center;justify-content:center;gap:0;background:radial-gradient(ellipse at 6% 91%,#d7f7ed 0,transparent 34%),linear-gradient(130deg,#f4fbf8,#f9fbf8)}.register-page .auth-hero{min-height:650px;padding:34px 34px 24px;background:linear-gradient(180deg,#003c3260,#003c3270),url('./assets/foodilee-login-hero.png') center/cover no-repeat;border-radius:27px 0 0 27px}.register-page .auth-brand{font-size:21px}.register-page .auth-hero-copy{margin:auto 0;align-self:flex-start}.register-page .auth-hero-copy h1{font-size:37px}.register-page .auth-hero-copy>p:not(.auth-kicker){font-size:13px}.register-page .auth-community{margin-top:28px}.register-page .auth-panel{min-height:650px;box-sizing:border-box;padding:42px 47px 23px;border-radius:0 27px 27px 0;box-shadow:0 25px 80px #183f3216}.register-page .auth-form-wrap{max-width:100%}.register-page .auth-form-wrap h2{font-size:29px}.register-page .auth-intro{margin-bottom:23px;font-size:13px}.register-page .auth-form{gap:8px}.register-page .auth-form>input,.register-page .auth-password-wrap input{height:47px}.register-page .auth-password-label{margin-top:7px}.register-page .auth-submit{height:48px;margin-top:10px}.register-page .auth-divider{margin:4px 0 2px}.register-page .auth-google{width:100%}.register-page .auth-trust{display:none}.register-page .auth-switch{margin-top:20px}.register-page .auth-copyright{margin-top:19px;font-size:8px}.register-page .auth-hero-caption{display:none}
    @media(max-width:900px){.register-page{min-height:100vh;grid-template-columns:minmax(0,1fr) minmax(0,1fr);padding:20px}.register-page .auth-hero,.register-page .auth-panel{min-height:650px}.register-page .auth-panel{padding:38px 27px}}
    @media(max-width:600px){.register-page{grid-template-columns:1fr;padding:13px}.register-page .auth-hero{min-height:210px;padding:18px 22px;border-radius:22px 22px 0 0}.register-page .auth-hero-copy{margin:30px auto 15px}.register-page .auth-hero-copy h1{font-size:27px}.register-page .auth-hero-copy>p:not(.auth-kicker){font-size:11px}.register-page .auth-panel{min-height:0;padding:24px 20px 22px;border-radius:0 0 22px 22px}.register-page .auth-wordmark{display:none}.register-page .auth-form-wrap h2{font-size:25px}.register-page .auth-intro{font-size:12px;margin-bottom:17px}.register-page .auth-form>input,.register-page .auth-password-wrap input{height:43px}.register-page .auth-submit{height:45px}.register-page .auth-switch{margin-top:17px}.register-page .auth-copyright{margin-top:15px}}
  `;
  document.head.appendChild(style);
}
