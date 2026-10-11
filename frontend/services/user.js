import { API_BASE_URL }
  from './api.js';

import { getToken }
  from '../utils/storage.js';

export async function getCurrentUser() {

  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/auth/me`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.json();
}