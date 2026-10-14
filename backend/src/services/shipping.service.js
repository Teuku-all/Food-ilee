const BITESHIP_URL = 'https://api.biteship.com/v1';
const REGION_URL = 'https://www.emsifa.com/api-wilayah-indonesia/v2';

function requireConfig(names) {
  const missing = names.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Pengiriman belum dikonfigurasi: ${missing.join(', ')}`);
}

async function biteship(path, body) {
  requireConfig(['BITESHIP_API_KEY']);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    let response;
    try {
      response = await fetch(`${BITESHIP_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: process.env.BITESHIP_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
      });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw new Error('Layanan Biteship sedang tidak dapat dihubungi. Coba lagi.');
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false)
      throw new Error(result.message || 'Biteship belum dapat memproses permintaan.');
    return result;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Permintaan ke Biteship melewati batas waktu. Coba lagi.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function validateAddress(address) {
  const required = ['recipientName', 'phone', 'provinceCode', 'province', 'cityCode', 'city', 'districtCode', 'district', 'villageCode', 'village', 'postalCode', 'details'];
  for (const key of required) {
    if (typeof address?.[key] !== 'string' || !address[key].trim()) throw new Error('Lengkapi seluruh alamat dan informasi penerima.');
  }
  if (!/^\d{5}$/.test(address.postalCode)) throw new Error('Kode pos harus terdiri dari 5 angka.');
  if (!/^\+?[0-9\s()-]{8,20}$/.test(address.phone)) throw new Error('Nomor telepon penerima tidak valid.');
}

async function validateRegion(address) {
  const levels = [
    ['provinces', null, address.provinceCode, address.province],
    ['regencies', address.provinceCode, address.cityCode, address.city],
    ['districts', address.cityCode, address.districtCode, address.district],
    ['villages', address.districtCode, address.villageCode, address.village],
  ];
  for (const [resource, parent, code, name] of levels) {
    const url = parent ? `${REGION_URL}/${resource}/${encodeURIComponent(parent)}.json` : `${REGION_URL}/provinces.json`;
    let response;
    try { response = await fetch(url, { signal: AbortSignal.timeout(8000) }); }
    catch { throw new Error('Layanan data wilayah sedang tidak dapat dihubungi. Coba lagi.'); }
    if (!response.ok) throw new Error('Data wilayah belum dapat divalidasi. Coba lagi.');
    const result = await response.json();
    const areas = result.data;
    if (!Array.isArray(areas)) throw new Error('Data wilayah belum dapat divalidasi. Coba lagi.');
    if (!areas.some((area) => String(area.id) === String(code) && area.name === name))
      throw new Error('Urutan provinsi, kabupaten/kota, kecamatan, atau desa tidak sesuai. Pilih ulang wilayah.');
    if (resource === 'villages') {
      const village = areas.find((area) => String(area.id) === String(code));
      if (village.postal_code && String(village.postal_code) !== String(address.postalCode))
        throw new Error('Kode pos tidak sesuai dengan desa/kelurahan yang dipilih.');
      if (!village.postal_code) {
        let postalResponse;
        try { postalResponse = await fetch(`${REGION_URL}/postal-codes/${encodeURIComponent(address.postalCode)}.json`, { signal: AbortSignal.timeout(8000) }); }
        catch { throw new Error('Layanan data kode pos sedang tidak dapat dihubungi. Coba lagi.'); }
        const postalResult = await postalResponse.json();
        if (!postalResponse.ok || !postalResult.data?.some((area) => String(area.id) === String(code)))
          throw new Error('Kode pos tidak sesuai dengan desa/kelurahan yang dipilih.');
      }
    }
  }
}

function addressText(address) {
  return `${address.details}, ${address.village}, ${address.district}, ${address.city}, ${address.province}, Indonesia`;
}

function makeItems(items) {
  return items.map((item) => ({
    name: item.title,
    description: item.title,
    category: 'groceries',
    value: item.unitPrice,
    quantity: item.quantity,
    weight: item.quantity * 1000,
  }));
}

async function getRates(address, items) {
  validateAddress(address);
  await validateRegion(address);
  requireConfig(['BITESHIP_ORIGIN_POSTAL_CODE', 'BITESHIP_COURIERS']);
  if (!/^\d{5}$/.test(process.env.BITESHIP_ORIGIN_POSTAL_CODE))
    throw new Error('BITESHIP_ORIGIN_POSTAL_CODE harus berupa 5 angka.');
  const result = await biteship('/rates/couriers', {
    origin_postal_code: Number(process.env.BITESHIP_ORIGIN_POSTAL_CODE),
    destination_postal_code: Number(address.postalCode),
    couriers: process.env.BITESHIP_COURIERS,
    items: makeItems(items),
  });
  return (result.pricing || []).map((rate) => ({
    company: rate.company,
    courierName: rate.courier_name,
    serviceName: rate.courier_service_name,
    serviceCode: rate.courier_service_code || rate.type,
    courierType: rate.type,
    price: rate.price,
    duration: rate.duration || null,
    collectionMethod: rate.available_collection_method?.[0] || 'pickup',
  }));
}

async function createShipment(order, buyer, items) {
  requireConfig([
    'BITESHIP_ORIGIN_POSTAL_CODE', 'BITESHIP_ORIGIN_CONTACT_NAME',
    'BITESHIP_ORIGIN_CONTACT_PHONE', 'BITESHIP_ORIGIN_ADDRESS',
  ]);
  const address = order.shippingAddress;
  const result = await biteship('/orders', {
    origin_contact_name: process.env.BITESHIP_ORIGIN_CONTACT_NAME,
    origin_contact_phone: process.env.BITESHIP_ORIGIN_CONTACT_PHONE,
    origin_address: process.env.BITESHIP_ORIGIN_ADDRESS,
    origin_postal_code: Number(process.env.BITESHIP_ORIGIN_POSTAL_CODE),
    destination_contact_name: address.recipientName,
    destination_contact_phone: address.phone,
    destination_contact_email: buyer.email || undefined,
    destination_address: addressText(address),
    destination_postal_code: Number(address.postalCode),
    courier_company: order.courier,
    courier_type: order.courierService,
    delivery_type: 'now',
    origin_collection_method: order.shippingAddress.collectionMethod || 'pickup',
    reference_id: order.id,
    order_note: address.notes || undefined,
    items: makeItems(items),
  });
  if (!result.id) throw new Error('Biteship tidak mengembalikan ID pengiriman.');
  return {
    id: result.id,
    trackingNumber: result.courier?.waybill_id || result.courier_waybill_id || null,
    trackingUrl: result.courier?.link || null,
    status: result.status || 'confirmed',
  };
}

module.exports = { getRates, validateAddress, validateRegion, createShipment };
