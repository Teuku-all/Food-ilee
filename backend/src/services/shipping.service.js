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
      headers: {
        Authorization: process.env.BITESHIP_API_KEY.startsWith('Bearer ')
          ? process.env.BITESHIP_API_KEY
          : `Bearer ${process.env.BITESHIP_API_KEY}`,
        'Content-Type': 'application/json',
      },
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

async function requestRates(origin, address, items, { codAmount, codType = '7_days', couriers } = {}) {
  if (!origin || !/^\d{5}$/.test(String(origin.postalCode || '')))
    throw new Error('Kode pos pickup penjual belum valid. Minta penjual memperbarui alamat tokonya.');
  requireConfig(['BITESHIP_COURIERS']);
  const request = {
    origin_postal_code: Number(origin.postalCode),
    destination_postal_code: Number(address.postalCode),
    couriers: couriers || process.env.BITESHIP_COURIERS,
    items: makeItems(items),
  };
  if (codAmount) {
    request.destination_cash_on_delivery = codAmount;
    request.destination_cash_on_delivery_type = codType;
  }
  const result = await biteship('/rates/couriers', request);
  return result.pricing || [];
}

function formatRate(rate, codAmount) {
  const supportsCod = rate.available_for_cash_on_delivery === true;
  return {
    company: rate.company,
    courierName: rate.courier_name,
    serviceName: rate.courier_service_name,
    serviceCode: rate.courier_service_code || rate.type,
    courierType: rate.type,
    // With COD, `price` includes the COD service fee. The buyer pays item + shipping;
    // the COD fee is recorded separately as a settlement deduction.
    price: Number(codAmount ? rate.shipping_fee ?? rate.price : rate.price || 0),
    biteshipPrice: Number(rate.price || 0),
    cashOnDeliveryFee: rate.cash_on_delivery_fee == null ? null : Number(rate.cash_on_delivery_fee),
    supportsCod,
    ...(codAmount ? { codAmount } : {}),
    duration: rate.duration || null,
    collectionMethod: rate.available_collection_method?.[0] || 'pickup',
  };
}

async function getRates(origin, address, items, { codAmount, codType = '7_days' } = {}) {
  validateAddress(address);
  await validateRegion(address);
  if (!codAmount) {
    const rates = await requestRates(origin, address, items);
    return rates.map((rate) => formatRate(rate));
  }
  if (!Number.isSafeInteger(Number(codAmount)) || Number(codAmount) <= 0 || Number(codAmount) > 15000000)
    throw new Error('Nilai COD harus lebih dari nol dan tidak melebihi batas Biteship.');
  if (!['3_days', '5_days', '7_days'].includes(codType))
    throw new Error('BITESHIP_COD_SETTLEMENT_DAYS harus bernilai 3_days, 5_days, atau 7_days.');
  const baseRates = await requestRates(origin, address, items);
  const eligible = baseRates.filter((rate) => rate.available_for_cash_on_delivery === true);
  const output = new Array(eligible.length);
  let cursor = 0;
  async function worker() {
    while (cursor < eligible.length) {
      const index = cursor++;
      const baseRate = eligible[index];
      const CODAmount = Number(codAmount) + Number(baseRate.shipping_fee ?? baseRate.price ?? 0);
      if (CODAmount > 15000000) continue;
      const codRates = await requestRates(origin, address, items, {
        codAmount: CODAmount,
        codType,
        couriers: baseRate.company,
      });
      const quoted = codRates.find((rate) => rate.company === baseRate.company && rate.type === baseRate.type);
      if (!quoted || quoted.available_for_cash_on_delivery !== true) continue;
      output[index] = formatRate(quoted, CODAmount);
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, eligible.length) }, () => worker()));
  return output.filter(Boolean);
}

async function createShipment(order, buyer, items) {
  const origin = order.sellerShippingOrigin;
  if (!origin?.contactName || !origin?.contactPhone || !origin?.address || !/^\d{5}$/.test(String(origin?.postalCode || '')))
    throw new Error('Snapshot alamat pickup penjual tidak lengkap.');
  const address = order.shippingAddress;
  const codDays = process.env.BITESHIP_COD_SETTLEMENT_DAYS || '7_days';
  if (order.paymentMethod === 'cod' && !['3_days', '5_days', '7_days'].includes(codDays))
    throw new Error('BITESHIP_COD_SETTLEMENT_DAYS harus bernilai 3_days, 5_days, atau 7_days.');
  const result = await biteship('/orders', {
    origin_contact_name: origin.contactName,
    origin_contact_phone: origin.contactPhone,
    origin_address: origin.address,
    origin_postal_code: Number(origin.postalCode),
    destination_contact_name: address.recipientName,
    destination_contact_phone: address.phone,
    destination_contact_email: buyer.email || undefined,
    destination_address: addressText(address),
    destination_postal_code: Number(address.postalCode),
    courier_company: order.courier,
    courier_type: order.courierService,
    ...(order.paymentMethod === 'cod'
      ? {
          destination_cash_on_delivery: order.codAmount,
          destination_cash_on_delivery_type: codDays,
        }
      : {}),
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
