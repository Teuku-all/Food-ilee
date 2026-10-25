const REGION_API = 'https://www.emsifa.com/api-wilayah-indonesia/v2';

const labels = {
  province: 'provinsi',
  city: 'kabupaten/kota',
  district: 'kecamatan',
  village: 'desa/kelurahan',
};
const resources = {
  province: 'provinces',
  city: 'regencies',
  district: 'districts',
  village: 'villages',
};
const parents = { city: 'province', district: 'city', village: 'district' };
const regionCache = new Map();

async function getRegions(level, parentId) {
  const url = parentId
    ? `${REGION_API}/${resources[level]}/${encodeURIComponent(parentId)}.json`
    : `${REGION_API}/${resources[level]}.json`;
  if (regionCache.has(url)) return regionCache.get(url);
  const request = fetch(url, { signal: AbortSignal.timeout(10000) })
    .then((response) => {
      if (!response.ok) throw new Error('Data wilayah belum dapat dimuat. Coba lagi.');
      return response.json();
    })
    .then((result) => result.data || [])
    .catch((error) => {
      regionCache.delete(url);
      throw error;
    });
  regionCache.set(url, request);
  return request;
}

function optionsFor(select, rows, level) {
  if (!select) return;
  select.replaceChildren(new Option(`Pilih ${labels[level]}`, ''));
  for (const row of rows) {
    const option = new Option(row.name, row.id);
    if (row.postal_code) option.dataset.postalCode = row.postal_code;
    select.add(option);
  }
  select.disabled = false;
}

function normalizeRegionName(value, level) {
  let name = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('id-ID')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  const prefixes = {
    province: /^(?:provinsi|province)\s+/,
    city: /^(?:(?:kota administrasi|kota adm|kabupaten|kab|kota|regency|city)\s+)/,
    district: /^(?:kecamatan|kec|district|subdistrict)\s+/,
    village: /^(?:(?:desa|kelurahan|gampong|kampung|nagari|village|ward)\s+)/,
  };
  name = name.replace(prefixes[level], '');
  const suffixes = {
    province: /\s+(?:province|provinsi)$/,
    city: /\s+(?:regency|city)$/,
    district: /\s+(?:district|subdistrict)$/,
    village: /\s+(?:village|ward)$/,
  };
  name = name.replace(suffixes[level], '');
  if (level === 'province') {
    if (name === 'jakarta' || name === 'dki jakarta') return 'daerah khusus ibukota jakarta';
    if (name === 'special region of yogyakarta') return 'di yogyakarta';
  }
  return name.replace(/\s+/g, ' ').trim();
}

function findRegion(rows, candidates, level) {
  const names = (Array.isArray(candidates) ? candidates : [candidates])
    .map((candidate) => normalizeRegionName(candidate, level))
    .filter(Boolean);
  return rows.find((row) => names.includes(normalizeRegionName(row.name, level)));
}

export async function selectRegionAddress(
  root,
  prefix,
  names,
  postalSelector = `#${prefix}-postal`,
) {
  const select = (level) => root.querySelector(`#${prefix}-${level}`);
  const postal = root.querySelector(postalSelector);
  const levels = ['province', 'city', 'district', 'village'];

  if (!names) {
    for (const level of levels) {
      const field = select(level);
      if (!field) continue;
      optionsFor(field, [], level);
      field.disabled = level !== 'province';
    }
    if (postal) postal.value = '';
    return null;
  }

  const resolved = {};
  let parentId = '';
  try {
    for (const level of levels) {
      const rows = await getRegions(level, parentId);
      const match = findRegion(rows, names[level], level);
      if (!match) throw new Error(`Wilayah ${labels[level]} dari titik peta tidak ditemukan.`);
      resolved[level] = { rows, match };
      parentId = match.id;
    }
  } catch (error) {
    await selectRegionAddress(root, prefix, null, postalSelector);
    throw error;
  }

  for (const level of levels) {
    const field = select(level);
    if (!field) throw new Error(`Kolom ${labels[level]} tidak tersedia.`);
    optionsFor(field, resolved[level].rows, level);
    field.value = resolved[level].match.id;
  }
  if (postal) postal.value = resolved.village.match.postal_code || '';
  return Object.fromEntries(
    levels.flatMap((level) => [
      [`${level}Code`, resolved[level].match.id],
      [level, resolved[level].match.name],
    ]),
  );
}

export async function bindRegionAddress(root, prefix, initial = {}) {
  const select = (level) => root.querySelector(`#${prefix}-${level}`);
  const error = root.querySelector(`#${prefix}-region-error`);
  const postal = root.querySelector(`#${prefix}-postal`);
  const getRegion = () =>
    Object.fromEntries(
      ['province', 'city', 'district', 'village'].flatMap((level) => {
        const field = select(level);
        return [
          [`${level}Code`, field?.value || ''],
          [level, field?.selectedOptions[0]?.textContent || ''],
        ];
      }),
    );

  const loadChildren = async (level, parentId, restoreCode = '') => {
    const field = select(level);
    optionsFor(field, [], level);
    field.disabled = true;
    if (!parentId) return;
    const data = await getRegions(level, parentId);
    if (!field.isConnected) return;
    optionsFor(field, data, level);
    field.value = restoreCode;
  };

  try {
    optionsFor(select('province'), await getRegions('province'), 'province');
    if (initial.provinceCode) {
      select('province').value = initial.provinceCode;
      await loadChildren('city', initial.provinceCode, initial.cityCode);
      if (initial.cityCode) await loadChildren('district', initial.cityCode, initial.districtCode);
      if (initial.districtCode)
        await loadChildren('village', initial.districtCode, initial.villageCode);
    }
  } catch (cause) {
    if (error) error.textContent = cause.message;
  }

  for (const level of ['province', 'city', 'district']) {
    select(level)?.addEventListener('change', async () => {
      const next = { province: 'city', city: 'district', district: 'village' }[level];
      const currentIndex = ['province', 'city', 'district', 'village'].indexOf(level);
      ['province', 'city', 'district', 'village'].slice(currentIndex + 2).forEach((child) => {
        const field = select(child);
        field.replaceChildren(new Option(`Pilih ${labels[child]}`, ''));
        field.disabled = true;
      });
      try {
        await loadChildren(next, select(level).value);
        if (error) error.textContent = '';
      } catch (cause) {
        if (error) error.textContent = cause.message;
      }
    });
  }
  select('village')?.addEventListener('change', () => {
    const village = select('village').selectedOptions[0];
    if (village?.dataset.postalCode) postal.value = village.dataset.postalCode;
  });

  return {
    selectRegion(names) {
      return selectRegionAddress(root, prefix, names);
    },
    read() {
      const region = getRegion();
      const details = root.querySelector(`#${prefix}-details`)?.value.trim() || '';
      const postalCode = postal?.value.trim() || '';
      const levels = ['province', 'city', 'district', 'village'];
      if (levels.some((level) => !region[`${level}Code`]))
        throw new Error('Pilih provinsi, kabupaten/kota, kecamatan, dan desa/kelurahan.');
      if (!details) throw new Error('Isi nama jalan, nomor, atau detail alamat pickup.');
      if (!/^\d{5}$/.test(postalCode)) throw new Error('Kode pos harus terdiri dari 5 angka.');
      return {
        region: { ...region, details },
        address: [details, region.village, region.district, region.city, region.province].join(
          ', ',
        ),
        postalCode,
      };
    },
  };
}
