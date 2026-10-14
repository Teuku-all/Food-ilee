# Checkout dan pengiriman

## Data wilayah

Form memakai API statis Emsifa v2: `https://www.emsifa.com/api-wilayah-indonesia/v2`. Endpoint yang dipakai adalah `provinces.json`, `regencies/{provinceId}.json`, `districts/{regencyId}.json`, dan `villages/{districtId}.json`. Backend memeriksa ulang rantai kode/nama serta kecocokan kode pos sebelum meminta tarif. Data dan generator sumbernya tersedia di [emsifa/api-wilayah-indonesia](https://github.com/emsifa/api-wilayah-indonesia); repositori menerangkan dataset dan pembaruan rutinnya. Bila sumber tidak dapat diakses, checkout menolak melanjutkan agar alamat yang tidak tervalidasi tidak dipakai.

## Biteship

Rates diminta server ke `POST /v1/rates/couriers`. Saat checkout, backend meminta ulang tarif dan menggunakan nilai dari respons Biteship, bukan harga yang dikirim browser. Paket memakai satuan produk marketplace yang sudah ditampilkan sebagai kilogram dan dikonversi ke gram untuk API. Biteship menerima pilihan tarif dalam format `company` dan `type`; saat pembayaran terverifikasi backend membuat order Biteship dan menyimpan waybill/tracking yang tersedia.

Aplikasi saat ini memakai satu titik pickup operasional dari konfigurasi `BITESHIP_ORIGIN_*`. Ini perlu menunjuk ke alamat pickup yang benar. Keranjang multi-produk dibatasi ke satu toko karena skema toko belum memiliki alamat pickup tersendiri. Konfigurasi Biteship Order API dan webhook Bearer secret harus diaktifkan di dashboard Biteship. Webhook memakai secret autentikasi yang ditetapkan di dashboard dan disamakan dengan `BITESHIP_WEBHOOK_SECRET`.

## Endpoint Food Ilee

- `POST /api/orders/rates` — validasi item dan alamat, lalu mengambil tarif aktual.
- `POST /api/orders/checkout` — hitung ulang harga, stok, ongkir, buat order dan transaksi Snap.
- `GET /api/orders/my` — daftar pesanan milik pengguna login.
- `GET /api/orders/:id` — detail pesanan milik pengguna login.
- `GET /api/payments/:id/status` — periksa status Midtrans dari server.
- `POST /api/payments/midtrans/webhook` — verifikasi notifikasi Midtrans.
- `POST /api/payments/biteship/webhook` — autentikasi dan terapkan notifikasi status/waybill Biteship.
