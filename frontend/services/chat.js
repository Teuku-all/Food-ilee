import { apiRequest } from './api.js';
import { getToken } from '../utils/storage.js';

async function request(path, options = {}) {
  const result = await apiRequest(
    `/chat${path}`,
    {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${getToken()}`,
        ...options.headers,
      },
    },
    'Percakapan belum dapat dimuat.',
    { throwOnError: true },
  );
  return result.data;
}

export const getChats = () => request('/');
export const getMessages = (chatId) => request(`/${encodeURIComponent(chatId)}/messages`);
export const sendChatMessage = (chatId, text) =>
  request(`/${encodeURIComponent(chatId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
export const startChat = (sellerId) =>
  request('/', { method: 'POST', body: JSON.stringify({ sellerId }) });
