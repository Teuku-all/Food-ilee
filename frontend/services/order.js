import { apiRequest } from './api.js';
import { getToken } from '../utils/storage.js';

async function request(path, options = {}) {
  return apiRequest(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
}

export function createOrder(wasteId, quantity) {
  return request('/orders', { method: 'POST', body: JSON.stringify({ wasteId, quantity }) });
}
export function getShippingRates(items, address, paymentMethod = 'midtrans', deliveryMethod = 'courier') {
  return request('/orders/rates', { method: 'POST', body: JSON.stringify({ items, address, paymentMethod, deliveryMethod }) });
}
export function createCheckout(items, address, courier, courierType, checkoutKey, paymentMethod = 'midtrans', deliveryMethod = 'courier') {
  return request('/orders/checkout', {
    method: 'POST',
    body: JSON.stringify({ items, address, courier, courierType, checkoutKey, paymentMethod, deliveryMethod }),
  });
}

export function getMyOrders() {
  return request('/orders/my');
}
export function getOrder(id) {
  return request(`/orders/${encodeURIComponent(id)}`);
}
export function cancelOrder(id) {
  return request(`/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
}
export function refreshOrderPayment(id) {
  return request(`/payments/${encodeURIComponent(id)}/status`);
}
export function getMySales() {
  return request('/orders/sales');
}
export function updateOrderStatus(id, status) {
  return request(`/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
export function createReview(wasteId, rating, comment) {
  return request('/reviews', {
    method: 'POST',
    body: JSON.stringify({ wasteId, rating, comment }),
  });
}
