import { getToken } from '../utils/storage.js';

const configuredApiBase = globalThis.FOODILEE_CONFIG?.apiBaseUrl;
const backendOrigin =
  globalThis.location?.hostname && globalThis.location.hostname !== 'localhost'
    ? `${globalThis.location.protocol === 'https:' ? 'https:' : 'http:'}//${globalThis.location.hostname}:5000`
    : 'http://localhost:5000';

export const API_BASE_URL = (configuredApiBase || `${backendOrigin}/api`).replace(/\/+$/, '');
export const SOCKET_BASE_URL =
  globalThis.FOODILEE_CONFIG?.socketUrl || API_BASE_URL.replace(/\/api$/, '');

export async function apiRequest(
  path,
  options = {},
  fallbackMessage = 'Permintaan belum dapat diproses.',
  { throwOnError = false } = {},
) {
  const token = getToken();
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (cause) {
    const error = new Error(
      'Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.',
    );
    error.cause = cause;
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  let result;
  if (contentType.includes('application/json')) {
    result = await response.json().catch(() => null);
  }

  if (response.status === 401 && token && !path.startsWith('/auth/') && getToken() === token) {
    window.dispatchEvent(new CustomEvent('foodilee:session-expired', { detail: { token } }));
  }

  if (
    !result ||
    response.status >= 500 ||
    (throwOnError && (!response.ok || result.success === false))
  ) {
    const error = new Error(result?.message || fallbackMessage);
    error.status = response.status;
    throw error;
  }

  return result;
}
