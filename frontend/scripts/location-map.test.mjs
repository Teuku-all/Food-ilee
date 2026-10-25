import assert from 'node:assert/strict';
import test from 'node:test';
import { reverseGeocodeCoordinates } from '../utils/location-map.js';

test('resolves Indonesian administrative names from reverse geocoding', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      json: async () => ({
        address: {
          country_code: 'id',
          state: 'Aceh',
          county: 'Banda Aceh City',
          city_district: 'Baiturrahman District',
          neighbourhood: 'Peuniti',
        },
      }),
    };
  };

  try {
    assert.deepEqual(await reverseGeocodeCoordinates(5.55, 95.32), {
      province: ['Aceh'],
      city: ['Banda Aceh City'],
      district: ['Baiturrahman District'],
      village: ['Peuniti'],
    });
    assert.equal(requestedUrl.searchParams.get('lat'), '5.55');
    assert.equal(requestedUrl.searchParams.get('lon'), '95.32');
    assert.equal(requestedUrl.searchParams.get('addressdetails'), '1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects reverse-geocoded locations outside Indonesia', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ address: { country_code: 'my' } }),
  });

  try {
    await assert.rejects(
      reverseGeocodeCoordinates(3.14, 101.68),
      /Titik peta harus berada di Indonesia/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
