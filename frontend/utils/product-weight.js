import { translate } from './i18n.js';

export function productWeightGrams(product) {
  const weight = Number(product?.weightPerUnitGrams);
  return Number.isSafeInteger(weight) && weight > 0 ? weight : 1000;
}

export function formatProductWeight(weightGrams) {
  const weight = Number(weightGrams);
  if (!Number.isFinite(weight) || weight <= 0) return '0 g';
  if (weight >= 1000 && weight % 1000 === 0) return `${(weight / 1000).toLocaleString('id-ID')} kg`;
  return `${weight.toLocaleString('id-ID')} g`;
}

export function totalProductWeightGrams(products) {
  return products.reduce(
    (total, product) => total + Number(product.stock || 0) * productWeightGrams(product),
    0,
  );
}

export function addProductWeightField(form, product) {
  const stockInput = form.elements.namedItem('stock');
  const priceInput = form.elements.namedItem('price');
  const stockLabel = stockInput?.closest('label');
  const priceLabel = priceInput?.closest('label');
  if (!stockLabel || !priceLabel) throw new Error('Form stok dan harga produk tidak lengkap.');

  stockInput.max = '2147483647';
  stockLabel.childNodes[0].textContent = translate('Jumlah stok (unit)');
  priceLabel.childNodes[0].textContent = translate('Harga per unit');
  const weightLabel = document.createElement('label');
  weightLabel.className = stockLabel.className;
  weightLabel.append(translate('Berat per unit (gram)'));
  const weightInput = document.createElement('input');
  weightInput.className = stockInput.className;
  weightInput.name = 'weightPerUnitGrams';
  weightInput.type = 'number';
  weightInput.min = '1';
  weightInput.max = '2147483647';
  weightInput.step = '1';
  weightInput.required = true;
  weightInput.value = String(product?.weightPerUnitGrams || 1000);
  weightInput.placeholder = translate('Contoh: 500');
  weightLabel.append(weightInput);
  stockLabel.after(weightLabel);
  return weightInput;
}
