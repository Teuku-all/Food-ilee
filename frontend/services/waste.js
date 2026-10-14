import { apiRequest } from './api.js';
import { getToken } from '../utils/storage.js';

export async function getWastes({ mine = false } = {}) {
  const token = getToken();
  const query = new URLSearchParams({ limit: '100' });
  if (mine) query.set('mine', 'true');
  return apiRequest(
    `/wastes?${query}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    'Daftar limbah belum dapat dimuat.',
    { throwOnError: true },
  );
}

export function getWaste(id) {
  return apiRequest(`/wastes/${encodeURIComponent(id)}`);
}

export async function createWaste(formData) {
  const token = getToken();

  return apiRequest('/wastes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
}

export async function deleteWaste(id) {
  const token = getToken();

  return apiRequest(`/wastes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateWaste(id, formData) {
  const token = getToken();

  return apiRequest(`/wastes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
}
