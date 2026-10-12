import { apiRequest } from './api.js';
import { getToken } from '../utils/storage.js';

async function request(path, options = {}) {
  const result = await apiRequest(
    `/notifications${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${getToken()}`,
        ...options.headers,
      },
    },
    'Notifikasi belum dapat dimuat.',
    { throwOnError: true },
  );
  return result.data;
}

export function getNotifications() {
  return request('/');
}

export function markNotificationRead(id) {
  return request(`/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
}
