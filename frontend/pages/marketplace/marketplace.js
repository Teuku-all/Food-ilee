import {
  getWastes
}
from '../../services/waste.js';
import { escapeHtml } from '../../utils/html.js';

export async function renderMarketplace() {

  const app =
    document.getElementById(
      'app'
    );

  const result =
    await getWastes();

  const wastes =
    result.data || [];

  app.innerHTML = `

    <main class="container">

      <div class="marketplace-header">

        <h1>
          Marketplace Limbah
        </h1>

        <p>
          Temukan limbah recycle terbaik
        </p>

      </div>

      <div class="market-grid">

        ${
          wastes.length === 0

            ? `

              <p>
                Belum ada produk
              </p>

            `

            : wastes.map((waste) => `

              <div class="market-card">

                <img
                  src="${escapeHtml(waste.image)}"
                />

                <div class="market-content">

                  <h3>
                    ${escapeHtml(waste.title)}
                  </h3>

                  <p>
                    ${escapeHtml(waste.description)}
                  </p>

                  <div class="market-price">

                    Rp ${escapeHtml(waste.price)}
                  </div>

                  <div class="market-store">

                    🏪
                    ${escapeHtml(waste.store?.name || waste.seller?.email || 'Penjual')}
                  </div>

                  <button
                    class="market-btn"
                    data-id="${escapeHtml(waste.id)}"
                  >
                    Lihat Detail
                  </button>

                </div>

              </div>

            `).join('')
        }

      </div>

    </main>
  `;

  injectMarketplaceStyle();
}

function injectMarketplaceStyle() {

  if (
    document.getElementById(
      'marketplace-style'
    )
  ) return;

  const style =
    document.createElement(
      'style'
    );

  style.id =
    'marketplace-style';

  style.innerHTML = `

    .marketplace-header {

      margin-bottom: 30px;
    }

    .market-grid {

      display: grid;

      grid-template-columns:
        repeat(
          auto-fit,
          minmax(300px, 1fr)
        );

      gap: 24px;
    }

    .market-card {

      background: white;

      border-radius: 24px;

      overflow: hidden;

      box-shadow:
        0 10px 30px rgba(0,0,0,0.05);

      border:
        1px solid var(--border);
    }

    .market-card img {

      width: 100%;

      height: 240px;

      object-fit: cover;
    }

    .market-content {

      padding: 20px;
    }

    .market-content h3 {

      margin-bottom: 12px;
    }

    .market-price {

      font-size: 24px;

      font-weight: 700;

      color: var(--green);

      margin: 16px 0;
    }

    .market-store {

      margin-bottom: 20px;

      color: var(--gray);
    }

    .market-btn {

      width: 100%;

      background: var(--green);

      color: white;

      padding: 14px;

      border-radius: 14px;
    }
  `;

  document.head.appendChild(
    style
  );
}
