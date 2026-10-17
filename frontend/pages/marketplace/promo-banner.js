// Example promotion content; independent from products, prices, and checkout.
export function marketplacePromoBanner() {
  return `
    <section class="mp-promo" aria-labelledby="mp-promo-title">
      <div class="mp-promo-copy">
        <span class="mp-promo-label"><span aria-hidden="true"></span>Contoh banner promosi</span>
        <h2 id="mp-promo-title">Beri sisa pangan<br><span>kesempatan kedua.</span></h2>
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
  if (document.getElementById('marketplace-promo-style')) return;
  const style = document.createElement('style');
  style.id = 'marketplace-promo-style';
  style.textContent = `
    .mp-promo{
      --promo-lift:-7px;--promo-zoom:1.045;--promo-arrow:3px;
      position:relative;isolation:isolate;display:grid;grid-template-columns:1.15fr 1fr;
      margin:30px 0 32px;overflow:hidden;border:1px solid #31746b;border-radius:28px;
      background:linear-gradient(120deg,#004847,#0b5c50);color:#fff;
      box-shadow:0 14px 30px #123a2a20;
      transition:transform 300ms cubic-bezier(.2,.7,.2,1),box-shadow 300ms ease;
    }
    .mp-promo-copy{position:relative;z-index:1;padding:34px 40px 36px}
    .mp-promo-label{display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border:1px solid #a8d4b54d;border-radius:999px;background:#ffffff0b;color:#d8ecca;font-size:10px;font-weight:600;letter-spacing:.09em;text-transform:uppercase}
    .mp-promo-label>span{width:6px;height:6px;flex:none;border-radius:50%;background:#c6ec9d}
    .mp-promo h2{margin:18px 0 12px;color:#fff;font-size:clamp(28px,3vw,40px);font-weight:650;letter-spacing:-1.2px;line-height:1.14}
    .mp-promo h2>span{color:#c6ec9d}
    .mp-promo-copy>p{max-width:390px;margin:0;color:#d2e4dc;font-size:14px;line-height:1.7}
    .mp-promo-cta{display:inline-flex;align-items:center;justify-content:center;gap:22px;min-height:46px;margin-top:22px;padding:12px 20px;border:1px solid #e1f4b8;border-radius:999px;background:#d4eeac;color:#163d35;font:600 13px Inter,Arial,sans-serif;cursor:pointer;transition:background 180ms ease}
    .mp-promo-cta:hover{background:#e5f7c7}
    .mp-promo-cta:focus-visible{outline:3px solid #fff;outline-offset:4px}
    .mp-promo-cta>span{font-size:19px;line-height:1;transition:transform 300ms ease}
    .mp-promo-visual{position:relative;min-width:0;min-height:300px;overflow:hidden}
    .mp-promo-visual>img{display:block;width:100%;height:100%;position:absolute;inset:0;object-fit:cover;object-position:center 54%;transition:transform 500ms ease}
    .mp-promo-visual::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#0a584f,transparent 35%),linear-gradient(0deg,#002b27bb,transparent 45%);pointer-events:none}
    .mp-promo-caption{position:absolute;right:26px;bottom:26px;z-index:1;max-width:calc(100% - 52px);padding:10px 14px;border:1px solid #ffffff38;border-radius:12px;background:#063c32b8;color:#eef7e7;font-size:12px;line-height:1.5;backdrop-filter:blur(8px)}
    .mp-promo:has(:focus-visible){transform:translateY(var(--promo-lift));box-shadow:0 25px 42px #123a2a38}
    .mp-promo:has(:focus-visible) .mp-promo-visual>img{transform:scale(var(--promo-zoom))}
    .mp-promo:has(:focus-visible) .mp-promo-cta>span{transform:translate(var(--promo-arrow),calc(-1 * var(--promo-arrow)))}
    @media(hover:hover) and (pointer:fine){
      .mp-promo:hover{transform:translateY(var(--promo-lift));box-shadow:0 25px 42px #123a2a38}
      .mp-promo:hover .mp-promo-visual>img{transform:scale(var(--promo-zoom))}
      .mp-promo:hover .mp-promo-cta>span{transform:translate(var(--promo-arrow),calc(-1 * var(--promo-arrow)))}
    }
    @media(max-width:760px){
      .mp-promo{grid-template-columns:1fr;border-radius:23px;margin:24px 0 26px}
      .mp-promo-copy{padding:25px 24px 28px}
      .mp-promo h2{font-size:32px;letter-spacing:-.8px}
      .mp-promo-visual{min-height:170px}
      .mp-promo-visual>img{object-position:center 55%}
      .mp-promo-visual::after{background:linear-gradient(180deg,#0a584f,transparent 42%),linear-gradient(0deg,#002b2777,transparent 70%)}
      .mp-promo-caption{right:16px;bottom:16px;max-width:calc(100% - 32px);font-size:11px}
    }
    @media(max-width:360px){.mp-promo-copy{padding:22px 20px 24px}.mp-promo h2{font-size:28px}.mp-promo-copy>p{font-size:13px}}
    @media(prefers-reduced-motion:reduce){
      .mp-promo{--promo-lift:0px;--promo-zoom:1;--promo-arrow:0px;transition:none}
      .mp-promo-visual>img,.mp-promo-cta,.mp-promo-cta>span{transition:none}
    }
  `;
  document.head.append(style);
}
