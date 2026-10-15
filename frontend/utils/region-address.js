const REGION_API = 'https://www.emsifa.com/api-wilayah-indonesia/v2';

const labels = {
  province: 'provinsi',
  city: 'kabupaten/kota',
  district: 'kecamatan',
  village: 'desa/kelurahan',
};
const resources = { province: 'provinces', city: 'regencies', district: 'districts', village: 'villages' };
const parents = { city: 'province', district: 'city', village: 'district' };

async function getRegions(level, parentId) {
  const url = parentId
    ? `${REGION_API}/${resources[level]}/${encodeURIComponent(parentId)}.json`
    : `${REGION_API}/${resources[level]}.json`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Data wilayah belum dapat dimuat. Coba lagi.');
  const result = await response.json();
  return result.data || [];
}

function optionsFor(select, rows, level) {
  select.replaceChildren(new Option(`Pilih ${labels[level]}`, ''));
  for (const row of rows) {
    const option = new Option(row.name, row.id);
    if (row.postal_code) option.dataset.postalCode = row.postal_code;
    select.add(option);
  }
  select.disabled = false;
}

export async function bindRegionAddress(root, prefix, initial = {}) {
  const select = (level) => root.querySelector(`#${prefix}-${level}`);
  const error = root.querySelector(`#${prefix}-region-error`);
  const postal = root.querySelector(`#${prefix}-postal`);
  const getRegion = () => Object.fromEntries(['province', 'city', 'district', 'village'].flatMap((level) => {
    const field = select(level);
    return [[`${level}Code`, field?.value || ''], [level, field?.selectedOptions[0]?.textContent || '']];
  }));

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
      if (initial.districtCode) await loadChildren('village', initial.districtCode, initial.villageCode);
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
    read() {
      const region = getRegion();
      const details = root.querySelector(`#${prefix}-details`)?.value.trim() || '';
      const postalCode = postal?.value.trim() || '';
      const levels = ['province', 'city', 'district', 'village'];
      if (levels.some((level) => !region[`${level}Code`])) throw new Error('Pilih provinsi, kabupaten/kota, kecamatan, dan desa/kelurahan.');
      if (!details) throw new Error('Isi nama jalan, nomor, atau detail alamat pickup.');
      if (!/^\d{5}$/.test(postalCode)) throw new Error('Kode pos harus terdiri dari 5 angka.');
      return {
        region: { ...region, details },
        address: [details, region.village, region.district, region.city, region.province].join(', '),
        postalCode,
      };
    },
  };
}
