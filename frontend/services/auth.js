import { apiRequest } from './api.js';

export async function loginUser(data) {
  return apiRequest(
    '/auth/login',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    },
    'Email atau kata sandi tidak cocok.',
  );
}

export async function registerUser(data) {
  return apiRequest(
    '/auth/register',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    },
    'Pendaftaran belum berhasil.',
  );
}

export async function loginWithGoogle(credential) {
  return apiRequest(
    '/auth/google',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ credential }),
    },
    'Login dengan Google belum berhasil.',
    { throwOnError: true },
  );
}
