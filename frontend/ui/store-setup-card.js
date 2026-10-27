import { loadStylesheet } from '../utils/stylesheet.js';
import { icon } from './icons.js';

// Both selling entry points share the same store setup invitation and presentation.
export function storeSetupCard() {
  loadStylesheet('store-page-style', new URL('../styles/pages/store.css', import.meta.url));
  return `<section class="st-no-store fi-card" aria-labelledby="st-start-title">
    <div class="st-start-copy">
      <p class="st-kicker">MULAI BERJUAL DI FOOD ILEE</p>
      <h1 id="st-start-title">Dari sisa, jadi<br><em>peluang baru.</em></h1>
      <p class="st-start-intro">Buka ruang bagi produk Anda. Buat toko dan pertemukan penawaran organik Anda dengan orang yang membutuhkannya.</p>
      <a class="fi-button st-start-cta" href="#buat-toko">Buat toko Anda ${icon('arrow')}</a>
      <ul class="st-start-benefits" aria-label="Fitur toko">
        <li>${icon('store')} Etalase produk</li>
        <li>${icon('receipt')} Kelola pesanan</li>
        <li>${icon('community')} Jangkau pembeli</li>
      </ul>
    </div>
    <div class="st-start-visual" aria-hidden="true">
      <span class="st-start-note">${icon('leaf')} Ada nilai di setiap sisa.</span>
      <div class="st-start-preview">
        <div class="st-preview-cover"><img src="./assets/landing-food-demo.jpg" alt="" loading="lazy"><span>FOOD ILEE · ETALASE ANDA</span></div>
        <div class="st-preview-content">
          <span class="st-preview-avatar">${icon('store')}</span>
          <span class="st-preview-label">RUANG USAHA ANDA</span>
          <strong>Toko organik Anda</strong>
          <p>Produk bernilai, untuk masa depan yang lebih hijau.</p>
          <div class="st-preview-products">
            <img src="./assets/demo-vegetables.jpg" alt="" loading="lazy">
            <img src="./assets/landing-compost-demo.jpg" alt="" loading="lazy">
            <img src="./assets/demo-banana-peels.jpg" alt="" loading="lazy">
          </div>
        </div>
      </div>
      <span class="st-start-seal">${icon('sprout')}<span>Langkah kecil Anda.<br><strong>Dampak yang berarti.</strong></span></span>
    </div>
    <ol class="st-start-steps" aria-label="Langkah mulai berjualan">
      <li><span>01</span><div><strong>Buat profil toko</strong><p>Kenalkan usaha Anda.</p></div></li>
      <li><span>02</span><div><strong>Tambahkan produk</strong><p>Tampilkan penawaran pertama.</p></div></li>
      <li><span>03</span><div><strong>Mulai berjualan</strong><p>Temukan calon pemanfaat.</p></div></li>
    </ol>
  </section>`;
}
