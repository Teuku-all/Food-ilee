import { API_BASE_URL }
  from './api.js';

import { getToken }
  from '../utils/storage.js';

export async function getWastes({ mine = false } = {}) {

  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/wastes${mine ? '?mine=true' : ''}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.json();
}

export async function createWaste(
  formData
) {

  const token =
    getToken();

  const response =
    await fetch(

      `${API_BASE_URL}/wastes`,

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

export async function deleteWaste(id) {

  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/wastes/${id}`,
    {
      method: 'DELETE',

      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.json();
}

export async function updateWaste(
  id,
  formData
) {

  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/wastes/${id}`,
    {
      method: 'PUT',

      headers: {
        Authorization: `Bearer ${token}`
      },

      body: formData
    }
  );

  return response.json();
}   
