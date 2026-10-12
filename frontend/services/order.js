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

export function getMyOrders() {
  return request('/orders/my');
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
