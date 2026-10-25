# Food Ilee

Marketplace pengelolaan limbah makanan. Food Ilee menghubungkan toko (penjual) dengan pembeli agar limbah makanan yang masih bernilai guna dapat dimanfaatkan kembali, lengkap dengan pembayaran online, pengiriman kurir, chat real-time, dan asisten AI.

Repositori: https://github.com/Teuku-all/Food-ilee

## Fitur

- **Akun:** registrasi, login email/password, login Google, dan reset kata sandi lewat email.
- **Toko dan produk:** buat toko (alamat pickup dan titik lokasi di peta), kelola produk limbah beserta harga, stok, dan berat per unit.
- **Marketplace:** pencarian, kategori, filter radius jarak, dan peta lokasi toko.
- **Keranjang dan checkout:** alamat divalidasi dengan data wilayah Indonesia, tarif kurir GoSend/GrabExpress dari Biteship, pembayaran online Midtrans, atau jemput langsung di toko dengan pembayaran cash.
- **Pesanan:** pelacakan status, pembatalan oleh pembeli sebelum dibayar, dan konfirmasi dari penjual.
- **Chat real-time** antara pembeli dan penjual (Socket.IO), dengan status terkirim dan terbaca.
- **Asisten AI** seputar limbah makanan dan rekomendasi klasifikasi limbah (Groq).
- **Ulasan produk dan notifikasi.**
- **Panel admin:** pantau pengguna, produk, pesanan, dan analitik; blokir pengguna.
- **Antarmuka dua bahasa:** Indonesia dan Inggris.

## Tech Stack

| Lapisan | Teknologi |
| --- | --- |
| Frontend | HTML, CSS, JavaScript (ES Module) tanpa framework, Leaflet, socket.io-client |
| Backend | Node.js 18+, Express 4, Socket.IO, JWT, bcryptjs, Joi, Helmet, Multer |
| Database | PostgreSQL dengan Prisma ORM |
| Layanan eksternal | Google OAuth, Groq, Cloudinary, Midtrans Snap, Biteship, Resend, API Wilayah Indonesia (Emsifa) |
| Deployment | Vercel (dua proyek: `backend` dan `frontend`) |

## Tim

| Nama | Peran |
| --- | --- |
| Abdullah Asy-Syifawi | Backend |
| Teuku Al Jumanatul Ali | Frontend |
| Abdi Dzil Ikram | Desain UI/UX |
| M. Rayyanta Adha Barus | Project manager, pengelola API key |

## Struktur Proyek

```text
.
├── backend/
│   ├── prisma/              # Skema Prisma dan migrasi database
│   └── src/
│       ├── config/          # Prisma, Cloudinary, Midtrans, Multer
│       ├── controllers/     # Penanganan request HTTP
│       ├── middlewares/     # Auth, admin, upload, validasi, error
│       ├── routes/          # Endpoint /api/*
│       ├── services/        # Logika bisnis dan akses data
│       ├── validations/     # Skema Joi
│       ├── app.js           # Aplikasi Express (diekspor ke Vercel)
│       └── server.js        # HTTP server + Socket.IO (lokal)
├── frontend/
│   ├── pages/               # Renderer halaman
│   ├── services/            # Klien API
│   ├── ui/ utils/ styles/   # Komponen, utilitas (i18n, peta), stylesheet
│   ├── assets/              # Gambar aplikasi
│   ├── scripts/             # Build dan uji i18n
│   ├── app.js               # Router hash dan guard autentikasi
│   └── server.js            # Static file server lokal
├── docs/                    # Catatan checkout, referensi desain, review UI
└── ui-refference/           # Materi referensi desain UI
```

## Prasyarat

- Node.js 18 atau lebih baru dan npm
- PostgreSQL
- Git
- Koneksi internet (peta, data wilayah, dan layanan eksternal)
- Opsional, sesuai fitur yang dipakai: kredensial Google OAuth, Groq, Cloudinary, Midtrans (Sandbox), Biteship, dan Resend

## Instalasi Lokal

1. Ambil kode:

   ```bash
   git clone https://github.com/Teuku-all/Food-ilee.git
   cd Food-ilee
   ```

2. Buat database PostgreSQL:

   ```bash
   psql -U postgres -c "CREATE DATABASE foodilee;"
   ```

3. Pasang dependensi backend dan salin konfigurasi:

   ```bash
   npm --prefix backend install

   # Linux / macOS
   cp backend/.env.example backend/.env
   # Windows PowerShell
   Copy-Item backend/.env.example backend/.env
   ```

4. Isi `backend/.env`. Dua variabel berikut wajib:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/foodilee?schema=public"
   JWT_SECRET=isi-dengan-string-acak-yang-panjang
   ```

5. Terapkan migrasi dan buat Prisma Client:

   ```bash
   npm --prefix backend run db:deploy
   npm --prefix backend run db:generate
   ```

6. Jalankan backend dan frontend di dua terminal dari direktori akar:

   ```bash
   npm run dev:backend    # http://localhost:5000
   npm run dev:frontend   # http://localhost:5501
   ```

Frontend berupa berkas statis sehingga tidak memerlukan `npm install`. Saat dibuka dari `localhost`, frontend otomatis memakai API di `http://localhost:5000/api`.

### Verifikasi

1. Buka `http://localhost:5000/`; backend menampilkan respons JSON berstatus sukses.
2. Buka `http://localhost:5501/`; halaman landing tampil.
3. Daftar akun (kata sandi minimal 8 karakter), login, buat toko, lalu tambahkan produk.

### Akun admin

Akun baru berperan `user`. Untuk mencoba panel admin, ubah perannya di database:

```bash
psql -U postgres -d foodilee -c "UPDATE \"User\" SET role='admin' WHERE email='email-anda@contoh.com';"
```

## Variabel Lingkungan

Template lengkap ada di [`backend/.env.example`](backend/.env.example). Jangan pernah meng-commit file `.env` atau kredensial asli.

| Variabel | Fungsi |
| --- | --- |
| `DATABASE_URL`, `JWT_SECRET` | Wajib untuk backend |
| `PORT`, `FRONTEND_URL`, `CORS_ORIGINS` | Port dan origin yang diizinkan |
| `GOOGLE_CLIENT_ID` | Login Google. Isi juga `googleClientId` di `frontend/config.js` dan daftarkan `http://localhost:5501` sebagai Authorized JavaScript origin |
| `GROQ_API_KEY` | Asisten AI dan rekomendasi limbah |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Unggah gambar |
| `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION` | Pembayaran online (pakai kunci Sandbox dengan `MIDTRANS_IS_PRODUCTION=false`) |
| `MIDTRANS_SPLIT_ENABLED`, `MIDTRANS_PARTNER_MERCHANT_ID` | Pembagian dana ke merchant penjual (biarkan `false` bila belum diaktifkan Midtrans) |
| `BITESHIP_API_KEY`, `BITESHIP_COURIERS` (`gojek,grab`), `BITESHIP_WEBHOOK_SECRET` | Tarif dan pengiriman kurir |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Email reset kata sandi (pengirim harus terverifikasi di Resend) |

Fitur tanpa kredensial yang sesuai tidak aktif, tetapi bagian aplikasi lainnya tetap berjalan.

## Perintah Berguna

| Perintah | Fungsi |
| --- | --- |
| `npm run dev:backend` | Backend dengan auto-reload (nodemon) |
| `npm run start:backend` | Backend tanpa file watcher |
| `npm run dev:frontend` | Static server frontend (port 5501) |
| `npm --prefix frontend run build` | Build produksi ke `frontend/dist` (nama aset gambar di-hash) |
| `npm --prefix frontend run preview` | Pratinjau hasil build |
| `npm --prefix frontend run test:i18n` | Uji katalog terjemahan |
| `npm --prefix backend run db:migrate` | Buat migrasi baru saat pengembangan |
| `npm --prefix backend run db:deploy` | Terapkan migrasi yang ada |
| `npm run format` / `npm run format:check` | Format dan cek format kode (Prettier) |

## Ringkasan API

Semua endpoint berada di bawah `/api`. Endpoint terproteksi memerlukan header `Authorization: Bearer <JWT>`.

| Prefiks | Endpoint utama |
| --- | --- |
| `/auth` | `POST /register`, `/login`, `/google`, `/forgot-password`, `/reset-password`; `GET /me` |
| `/users` | `GET /me`, `/username-availability`, `/:username`; `PUT /me` |
| `/stores` | `POST /`; `GET /`; `GET` dan `PUT /me` |
| `/wastes` | `GET /`, `/:id`; `POST /`; `PUT` dan `DELETE /:id` |
| `/orders` | `POST /rates`, `/checkout`, `/:id/cancel`; `GET /my`, `/sales`, `/:id`; `PATCH /:id/status` |
| `/payments` | `GET /:id/status`; `POST /midtrans/webhook`, `/biteship/webhook` |
| `/chat` | `GET /`; `POST /`; `GET` dan `POST /:chatId/messages` |
| `/reviews` | `POST /`; `GET /:wasteId` |
| `/notifications` | `GET /`; `PATCH /:id/read` |
| `/ai` | `POST /chat`, `/recommend` |
| `/admin` | `GET /users`, `/wastes`, `/orders`, `/analytics`; `PATCH /users/:id/ban`; `DELETE /wastes/:id` |

Detail alur checkout, pengiriman, dan pembayaran ada di [`docs/checkout.md`](docs/checkout.md). Skema basis data ada di [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).

## Deployment ke Vercel

Deploy sebagai **dua proyek Vercel** dari repositori yang sama.

1. **Backend:** Root Directory `backend`. Isi `DATABASE_URL` (PostgreSQL terkelola), `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, dan variabel integrasi yang dipakai. Salin URL produksinya.
2. Jalankan migrasi terhadap database produksi: `npm --prefix backend run db:deploy`.
3. **Frontend:** Root Directory `frontend`. Isi `FOODILEE_API_BASE_URL` (misalnya `https://foodilee-api.vercel.app/api`), `GOOGLE_CLIENT_ID`, dan `FOODILEE_REALTIME=false`. Build gagal bila `FOODILEE_API_BASE_URL` kosong.
4. Isi `FRONTEND_URL` dan `CORS_ORIGINS` di backend dengan domain frontend, lalu deploy ulang backend.
5. Atur webhook di dasbor penyedia:
   - `https://<domain-backend>/api/payments/midtrans/webhook`
   - `https://<domain-backend>/api/payments/biteship/webhook`

Vercel Functions tidak mendukung koneksi Socket.IO, sehingga di produksi chat memakai HTTP polling (`FOODILEE_REALTIME=false`). Gambar yang dikirim ke API serverless dibatasi 4 MB. Simpan semua kredensial di pengaturan environment Vercel, dan deploy ulang proyek terkait setelah mengubah variabel.

## Pemecahan Masalah

| Gejala | Solusi |
| --- | --- |
| Port 5000 sudah dipakai | Hentikan proses lama atau ubah `PORT` di `backend/.env` |
| Galat koneksi database saat `db:deploy` | Periksa `DATABASE_URL` dan pastikan database `foodilee` sudah dibuat |
| Galat CORS di browser | Buka frontend lewat `http://localhost:5501` atau tambahkan origin ke `CORS_ORIGINS` |
| Respons 429 "Terlalu banyak request" | Batas 100 request per 15 menit per IP; tunggu atau restart backend |
| Reset kata sandi mengembalikan 503 | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, atau `FRONTEND_URL` belum diisi |
| Unggah gambar gagal | Kredensial `CLOUDINARY_*` belum diisi |
| Peta atau data wilayah tidak tampil | Periksa koneksi internet |