import assert from 'node:assert/strict';
import test from 'node:test';
import { selectRegionAddress } from '../utils/region-address.js';

class FakeOption {
  constructor(text, value) {
    this.textContent = text;
    this.value = value;
    this.dataset = {};
  }
}

class FakeSelect {
  constructor() {
    this.options = [];
    this.disabled = false;
    this.value = '';
  }

  replaceChildren(option) {
    this.options = [option];
    this.value = '';
  }

  add(option) {
    this.options.push(option);
  }

  get selectedOptions() {
    return this.options.filter((option) => option.value === this.value);
  }
}

function createRoot() {
  const fields = new Map();
  for (const level of ['province', 'city', 'district', 'village']) {
    fields.set(`#test-${level}`, new FakeSelect());
  }
  fields.set('#test-postal', { value: '' });
  return { querySelector: (selector) => fields.get(selector) };
}

test('selects the full administrative region and postal code from reverse-geocoded names', async () => {
  const originalFetch = globalThis.fetch;
  const originalOption = globalThis.Option;
  globalThis.Option = FakeOption;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    const rows = path.endsWith('/provinces.json')
      ? [{ id: 'p1', name: 'Aceh' }]
      : path.endsWith('/regencies/p1.json')
        ? [{ id: 'c1', name: 'Kota Banda Aceh' }]
        : path.endsWith('/districts/c1.json')
          ? [{ id: 'd1', name: 'Kecamatan Baiturrahman' }]
          : path.endsWith('/villages/d1.json')
            ? [{ id: 'v1', name: 'Desa Peuniti', postal_code: '23243' }]
            : [];
    return { ok: true, json: async () => ({ data: rows }) };
  };

  try {
    const root = createRoot();
    const result = await selectRegionAddress(root, 'test', {
      province: ['Aceh'],
      city: ['Banda Aceh'],
      district: ['Baiturrahman'],
      village: ['Peuniti'],
    });
    assert.deepEqual(result, {
      provinceCode: 'p1',
      province: 'Aceh',
      cityCode: 'c1',
      city: 'Kota Banda Aceh',
      districtCode: 'd1',
      district: 'Kecamatan Baiturrahman',
      villageCode: 'v1',
      village: 'Desa Peuniti',
    });
    assert.equal(root.querySelector('#test-postal').value, '23243');
    assert.deepEqual(
      ['province', 'city', 'district', 'village'].map(
        (level) => root.querySelector(`#test-${level}`).value,
      ),
      ['p1', 'c1', 'd1', 'v1'],
    );
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.Option = originalOption;
  }
});

test('clears old selections when a region cannot be resolved', async () => {
  const originalFetch = globalThis.fetch;
  const originalOption = globalThis.Option;
  globalThis.Option = FakeOption;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ data: [] }) });

  try {
    const root = createRoot();
    for (const level of ['province', 'city', 'district', 'village']) {
      const field = root.querySelector(`#test-${level}`);
      field.add(new FakeOption('Old region', 'old'));
      field.value = 'old';
    }
    root.querySelector('#test-postal').value = '12345';

    await assert.rejects(
      selectRegionAddress(root, 'test', {
        province: ['Tidak diketahui'],
        city: ['Kota'],
        district: ['Kecamatan'],
        village: ['Desa'],
      }),
      /Wilayah provinsi .* tidak ditemukan/,
    );
    assert.deepEqual(
      ['province', 'city', 'district', 'village'].map(
        (level) => root.querySelector(`#test-${level}`).value,
      ),
      ['', '', '', ''],
    );
    assert.equal(root.querySelector('#test-postal').value, '');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.Option = originalOption;
  }
});
