import { getToken } from '../utils/storage.js';
import { SOCKET_BASE_URL } from './api.js';

let socket;
let clientPromise;

function loadSocketClient() {
  if (globalThis.io) return Promise.resolve();
  if (clientPromise) return clientPromise;
  clientPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${SOCKET_BASE_URL}/socket.io/socket.io.js`;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      clientPromise = null;
      reject(new Error('Koneksi pesan langsung belum tersedia.'));
    };
    document.head.append(script);
  });
  return clientPromise;
}

export async function connectSocket() {
  const token = getToken();
  if (!token) return null;
  await loadSocketClient();
  if (!socket) socket = globalThis.io(SOCKET_BASE_URL, { autoConnect: false });
  socket.auth = { token };
  if (!socket.connected) socket.connect();
  return socket;
}

export function getSocket() {
  return socket || null;
}
