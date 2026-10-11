import { loginUser }
  from '../../services/auth.js';

import { saveToken }
  from '../../utils/storage.js';

export function renderLogin() {

  const app =
    document.getElementById('app');

  app.innerHTML = `

    <main class="auth-container">

      <form class="auth-form">

        <h1>Login</h1>

        <input
          type="email"
          placeholder="Email"
          id="email"
        />

        <input
          type="password"
          placeholder="Password"
          id="password"
        />

        <button type="submit">
          Login
        </button>

      </form>

    </main>
  `;

  setupLogin();
  injectStyle();
}

function setupLogin() {

  const form =
    document.querySelector('.auth-form');

  form.addEventListener(
    'submit',
    async (e) => {

      e.preventDefault();

      const email =
        document.getElementById('email').value;

      const password =
        document.getElementById('password').value;

      const result =
        await loginUser({
          email,
          password
        });

      if (!result.success) {
        alert(result.message);
        return;
      }

      saveToken(result.data.token);

      alert('Login berhasil');

      location.reload();
    }
  );
}

function injectStyle() {

  if (document.getElementById('auth-style')) return;

  const style = document.createElement('style');

  style.id = 'auth-style';

  style.innerHTML = `

    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .auth-form {
      width: 100%;
      max-width: 400px;
      background: white;
      padding: 32px;
      border-radius: 14px;
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .auth-form h1 {
      text-align: center;
    }

    .auth-form input {
      padding: 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
    }

    .auth-form button {
      padding: 14px;
      background: var(--green);
      color: white;
      border-radius: 10px;
      font-weight: 700;
    }
  `;

  document.head.appendChild(style);
}