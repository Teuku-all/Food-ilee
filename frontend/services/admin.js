import { apiRequest } from './api.js';
import { getToken } from '../utils/storage.js';

async function request(path, options = {}) {
  const result = await apiRequest(
    `/admin${path}`,
    {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${getToken()}`,
        ...options.headers,
      },
    },
    'Data admin belum dapat dimuat.',
    { throwOnError: true },
  );
  return result.data;
}

export function getAdminAnalytics() {
  return request('/analytics');
}

export function getAdminUsers() {
  return request('/users');
}

export function getAdminWastes() {
  return request('/wastes');
}

export function getAdminOrders() {
  return request('/orders');
}

export function banAdminUser(id) {
  return request(`/users/${encodeURIComponent(id)}/ban`, { method: 'PATCH' });
}

export function deleteAdminWaste(id) {
  return request(`/wastes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
