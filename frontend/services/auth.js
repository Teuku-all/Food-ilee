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

export async function requestPasswordReset(email) {
  return apiRequest(
    '/auth/forgot-password',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
    'Permintaan reset password belum dapat diproses.',
    { throwOnError: true },
  );
}

export async function resetPassword(token, password) {
  return apiRequest(
    '/auth/reset-password',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    },
    'Password belum dapat diperbarui.',
    { throwOnError: true },
  );
}
