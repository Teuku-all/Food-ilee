import { apiRequest } from './api.js';
import { getToken } from '../utils/storage.js';

export async function askAI(message) {
  return apiRequest('/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ message }),
  });
}

export async function getAIRecommendation(title, description) {
  return apiRequest('/ai/recommend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ title, description }),
  });
}
