import { loadStylesheet } from '../../utils/stylesheet.js';

// Example promotion content; independent from products, prices, and checkout.
export function marketplacePromoBanner() {
  return `
    <section class="mp-promo" aria-labelledby="mp-promo-title">
      <div class="mp-promo-copy">
        <h1 class="mp-promo-title" id="mp-promo-title">Beri sisa pangan<br><span>kesempatan kedua.</span></h1>
        <p>Jadikan bahan organik lebih bermanfaat. Temukan pilihan untuk pakan ternak dan kompos di marketplace.</p>
        <button type="button" class="mp-promo-cta" id="mp-promo-explore">Jelajahi produk <span aria-hidden="true">↗</span></button>
      </div>
      <div class="mp-promo-visual">
        <img src="/assets/foodilee-login-hero.png" alt="" width="512" height="512" decoding="async">
        <span class="mp-promo-caption">Dari alam, kembali bermanfaat.</span>
      </div>
    </section>`;
}

export function injectMarketplacePromoStyle() {
  loadStylesheet(
    'marketplace-promo-style',
    new URL('../../styles/pages/marketplace-promo.css', import.meta.url),
  );
}
