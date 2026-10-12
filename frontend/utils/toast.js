export function showToast(message, type = 'success') {
  const toast = document.createElement('div');

  toast.className = `toast toast-${type}`;

  toast.innerText = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');

    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

export function injectToastStyle() {
  if (document.getElementById('toast-style')) return;

  const style = document.createElement('style');

  style.id = 'toast-style';

  style.innerHTML = `

    .toast {

      position: fixed;

      top: 30px;

      right: 30px;

      padding: 14px 20px;

      border-radius: 14px;

      color: white;

      font-weight: 700;

      z-index: 9999;

      transform:
        translateX(120%);

      transition: 0.3s;

      box-shadow:
        0 10px 30px rgba(0,0,0,0.15);
    }

    .toast.show {

      transform:
        translateX(0);
    }

    .toast-success {
      background: #22c55e;
    }

    .toast-error {
      background: #ef4444;
    }
  `;

  document.head.appendChild(style);
}
