import { API_BASE_URL }
  from './api.js';

import { getToken }
  from '../utils/storage.js';

export async function askAI(
  message
) {

  const token =
    getToken();

  const response =
    await fetch(
      `${API_BASE_URL}/ai/chat`,
      {
        method: 'POST',

        headers: {

          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`
        },

        body:
          JSON.stringify({
            message
          })
      }
    );

  return response.json();
}

export async function getAIRecommendation(
  title,
  description
) {

  const token =
    getToken();

  const response =
    await fetch(
      `${API_BASE_URL}/ai/recommend`,
      {
        method: 'POST',

        headers: {

          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`
        },

        body:
          JSON.stringify({
            title,
            description
          })
      }
    );

  return response.json();
}