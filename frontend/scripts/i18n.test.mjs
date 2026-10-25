import test from 'node:test';
import assert from 'node:assert/strict';
import { translate } from '../utils/i18n.js';
import { additionalEnglish } from '../utils/translations-en.js';

test('English catalog covers every additional interface phrase', () => {
  for (const [source, expected] of Object.entries(additionalEnglish)) {
    assert.notEqual(translate(source, 'en'), source, source);
    assert.equal(translate(source, 'id'), source, source);
    assert.ok(expected.trim());
  }
});
test('dynamic counters and dates are fully localized', () => {
  const cases = [
    ['Keranjang belanja, 12 barang', 'Shopping cart, 12 items'],
    ['3 produk dalam keranjang', '3 products in your cart'],
    ['Langkah 2 dari 3', 'Step 2 of 3'],
    ['67% selesai', '67% complete'],
    ['5 dari 12 baris ditampilkan', '5 of 12 rows shown'],
    ['Selamat datang, Alex', 'Welcome, Alex'],
    ['Anggota sejak Januari 2026', 'Member since January 2026'],
    ['25 Oktober 2026', '25 October 2026'],
    ['Diperbarui 25 Okt', 'Updated 25 Oct'],
    ['Menunggu pembayaran · Pengiriman: Dikirim', 'Awaiting payment · Shipping: Shipped'],
    ['tersedia 4 unit · 500 g/unit', 'Available: 4 units · 500 g per unit'],
    ['4 unit · 500 g/unit · Rp2.500/unit', '4 units · 500 g per unit · Rp2.500 per unit'],
    ['Rp2.500 / unit · 500 g/unit', 'Rp2.500 / unit · 500 g per unit'],
  ];
  for (const [source, expected] of cases) assert.equal(translate(source, 'en'), expected);
});
test('user content and identifiers are preserved', () => {
  for (const value of [
    'Kebun Pak Budi',
    'Jalan Melati 10',
    'INV/20261025/ABCD',
    'alex@example.test',
  ])
    assert.equal(translate(value, 'en'), value);
});
test('normalizes whitespace without translating unknown content', () => {
  assert.equal(translate('  Simpan   perubahan  ', 'en'), 'Save changes');
  assert.equal(translate('My own description', 'en'), 'My own description');
});
