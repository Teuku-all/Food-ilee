import { API_BASE_URL }
  from './api.js';

import { getToken }
  from '../utils/storage.js';

export async function createStore(
  formData
) {

  const token =
    getToken();

  const response =
    await fetch(

      `${API_BASE_URL}/stores`,

      {

        method: 'POST',

        headers: {

          Authorization:
            `Bearer ${token}`
        },

        body: formData
      }
    );

  return response.json();
}

export async function getMyStore() {

  const token =
    getToken();

  const response =
    await fetch(

      `${API_BASE_URL}/stores/me`,

      {

        headers: {

          Authorization:
            `Bearer ${token}`
        }
      }
    );

  return response.json();
}