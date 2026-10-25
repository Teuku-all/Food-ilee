import { getMyStore } from '../services/store.js';
import { getToken } from './storage.js';

let checkedToken;
let cachedStore;
let pending;
let generation = 0;

export function getCachedStore() {
  const token = getToken();
  return token && token === checkedToken ? cachedStore : undefined;
}

export async function getStoreAccess({ refresh = false } = {}) {
  const token = getToken();
  if (!token) return null;
  if (token !== checkedToken || refresh) {
    checkedToken = token;
    cachedStore = undefined;
    pending = undefined;
    generation += 1;
  }
  if (cachedStore !== undefined) return cachedStore;
  if (!pending) {
    const requestGeneration = generation;
    const request = getMyStore().then((result) => {
      if (!result?.success) throw new Error(result?.message || 'Toko belum dapat diperiksa.');
      const store = result.data || null;
      if (checkedToken === token && generation === requestGeneration) cachedStore = store;
      return store;
    });
    pending = request.finally(() => {
      if (checkedToken === token && generation === requestGeneration) pending = undefined;
    });
  }
  return pending;
}

export function invalidateStoreAccess() {
  checkedToken = undefined;
  cachedStore = undefined;
  pending = undefined;
  generation += 1;
}
