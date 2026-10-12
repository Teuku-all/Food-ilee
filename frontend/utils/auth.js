import { getToken } from './storage.js';

export function isAuthenticated() {
  return !!getToken();
}
