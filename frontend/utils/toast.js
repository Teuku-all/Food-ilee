export function showToast(message, type = 'success') {
  injectToastStyle();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  toast.textContent = message;
  const activeDialog = [...document.querySelectorAll('dialog[open]')]
    .reverse()
    .find((dialog) => dialog.matches(':modal'));
  if (activeDialog) {
    toast.classList.add('toast-in-dialog');
    activeDialog.append(toast);
  } else {
    document.body.append(toast);
  }
  requestAnimationFrame(() => toast.classList.add('show'));
  window.setTimeout(() => {
    toast.classList.remove('show');
    window.setTimeout(() => toast.remove(), 220);
  }, 3200);
}

export function injectToastStyle() {
  if (document.getElementById('toast-style')) return;

  const style = document.createElement('style');

  style.id = 'toast-style';

  style.innerHTML = `
    .toast {
      position: fixed;
      inset: auto 24px 24px auto;
      z-index: 2147483647;
      max-width: min(390px, calc(100vw - 36px));
      margin: 0;
      padding: 14px 18px;
      border: 1px solid #dbe8df;
      border-radius: 14px;
      background: #fff;
      color: #234b3c;
      font: 600 14px/1.5 Inter, Arial, sans-serif;
      box-shadow: 0 12px 38px #14392c35;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 180ms ease, transform 180ms ease;
      pointer-events: none;
    }
    .toast-in-dialog {
      position: absolute;
      inset: 16px 16px auto auto;
      z-index: 2147483647;
      max-width: min(360px, calc(100% - 32px));
      box-sizing: border-box;
      box-shadow: 0 12px 38px #14392c55;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    .toast-success {
      border-color: #cfe5d5;
    }
    .toast-error {
      border-color: #f1d6d3;
      color: #963c34;
    }
    @media(max-width:560px){.toast{inset:auto 12px 12px;max-width:none;width:calc(100vw - 56px)}}
  `;

  document.head.appendChild(style);
}
