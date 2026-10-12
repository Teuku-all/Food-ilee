export function showLoading() {
  if (document.querySelector('.loading-overlay')) return;

  const loading = document.createElement('div');

  loading.className = 'loading-overlay';

  loading.innerHTML = `

    <div class="spinner"></div>
  `;

  document.body.appendChild(loading);
}

export function hideLoading() {
  const loading = document.querySelector('.loading-overlay');

  if (loading) {
    loading.remove();
  }
}

export function injectLoadingStyle() {
  if (document.getElementById('loading-style')) return;

  const style = document.createElement('style');

  style.id = 'loading-style';

  style.innerHTML = `

    .loading-overlay {

      position: fixed;

      inset: 0;

      background:
        rgba(255,255,255,0.6);

      backdrop-filter: blur(4px);

      display: flex;

      align-items: center;

      justify-content: center;

      z-index: 99999;
    }

    .spinner {

      width: 60px;

      height: 60px;

      border-radius: 50%;

      border:
        6px solid #e5e7eb;

      border-top:
        6px solid #22c55e;

      animation:
        spin 1s linear infinite;
    }

    @keyframes spin {

      to {
        transform: rotate(360deg);
      }
    }
  `;

  document.head.appendChild(style);
}
