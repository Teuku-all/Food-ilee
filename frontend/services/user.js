import { apiRequest } from './api.js';
import { getToken } from '../utils/storage.js';

let currentUserRequest = null;

export async function getCurrentUser() {
  const token = getToken();
  if (currentUserRequest?.token === token) return currentUserRequest.promise;

  const promise = apiRequest('/users/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  currentUserRequest = { token, promise };
  const clearRequest = () => {
    if (currentUserRequest?.promise === promise) currentUserRequest = null;
  };
  promise.then(clearRequest, clearRequest);
  return promise;
}

export async function updateCurrentUser(formData) {
  const token = getToken();
  const result = await apiRequest('/users/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  currentUserRequest = null;
  return result;
}
