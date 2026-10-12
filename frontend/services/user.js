import { apiRequest } from './api.js';
import { getToken } from '../utils/storage.js';

let currentUserRequest = null;
let currentUserCache = null;

export async function getCurrentUser() {
  const token = getToken();
  if (currentUserCache?.token === token) return currentUserCache.result;
  if (currentUserRequest?.token === token) return currentUserRequest.promise;

  const promise = apiRequest('/users/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  currentUserRequest = { token, promise };
  promise.then(
    (result) => {
      if (currentUserRequest?.promise !== promise) return;
      currentUserRequest = null;
      if (result?.success && result.data) currentUserCache = { token, result };
    },
    () => {
      if (currentUserRequest?.promise === promise) currentUserRequest = null;
    },
  );
  return promise;
}

export function getCachedCurrentUser() {
  return currentUserCache?.token === getToken() ? currentUserCache.result : null;
}

export function invalidateCurrentUserCache() {
  currentUserCache = null;
  currentUserRequest = null;
}

export async function updateCurrentUser(formData) {
  const token = getToken();
  const result = await apiRequest('/users/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  invalidateCurrentUserCache();
  return result;
}
