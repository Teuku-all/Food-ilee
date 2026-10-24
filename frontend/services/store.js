import { apiRequest } from './api.js';
import { getToken } from '../utils/storage.js';

export async function createStore(formData) {
  const token = getToken();

  return apiRequest('/stores', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
}

export async function getMyStore() {
  const token = getToken();

  return apiRequest('/stores/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getStores() {
  const token = getToken();
  return apiRequest('/stores', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateMyStore(formData) {
  return apiRequest('/stores/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
}
