# Checkout dan pengiriman

## Data wilayah

Form memakai API statis Emsifa v2: `https://www.emsifa.com/api-wilayah-indonesia/v2`. Endpoint yang dipakai adalah `provinces.json`, `regencies/{provinceId}.json`, `districts/{regencyId}.json`, dan `villages/{districtId}.json`. Backend memeriksa ulang rantai kode/nama serta kecocokan kode pos sebelum meminta tarif. Dataset dan generator sumbernya tersedia di [emsifa/api-wilayah-indonesia](https://github.com/emsifa/api-wilayah-indonesia). Bila sumber tidak dapat diakses, checkout menolak melanjutkan agar alamat yang tidak tervalidasi tidak dipakai.

## Biteship

Untuk pengiriman kurir, rates diminta server ke `POST /v1/rates/couriers`. Saat checkout, backend meminta ulang tarif dan menggunakan nilai dari respons Biteship, bukan harga yang dikirim browser. Paket memakai satuan produk marketplace yang ditampilkan sebagai kilogram dan dikonversi ke gram untuk API. Sesudah pembayaran online terverifikasi, backend membuat order Biteship dan menyimpan waybill/tracking yang tersedia.

Pickup memakai alamat terstruktur pada profil toko: provinsi, kabupaten/kota, kecamatan, desa/kelurahan, detail jalan, kode pos, dan titik koordinat yang dipilih pada peta, ditambah nama serta telepon kontak. Koordinat asal dan tujuan dikirim ke Biteship untuk permintaan tarif serta pembuatan pengiriman. Satu checkout hanya dapat memuat produk dari satu toko, sehingga satu order Biteship memiliki satu titik asal. Pesanan menyimpan snapshot alamat pickup agar perubahan profil tidak mengubah alamat order yang sudah dibuat. Toko lama perlu memilih titik pickup pada peta saat memperbarui alamatnya. Konfigurasikan `BITESHIP_API_KEY`, `BITESHIP_COURIERS=gojek,grab`, dan `BITESHIP_WEBHOOK_SECRET` di backend; konfigurasi tersebut membatasi tarif ke GoSend (`gojek`) dan GrabExpress (`grab`) yang tersedia untuk alamat terkait. Variabel `BITESHIP_ORIGIN_*` global tidak lagi digunakan.

Alamat penerima checkout menyimpan latitude dan longitude bersama alamat yang disimpan lokal di perangkat pembeli. Pembeli wajib memilih titik pada peta sebelum meminta tarif kurir. Peta memakai Leaflet dengan tile Esri Light Gray Canvas dan reference layer agar jalan serta nama lokasi terlihat dengan minim ikon POI; atribusi sumber peta ditampilkan pada peta. Marketplace memakai koordinat toko untuk menghitung filter jarak dari lokasi penerima dan menampilkan pin toko pada peta.

Pembeli juga dapat memilih jemput langsung di toko. Pilihan ini tidak membuat shipment Biteship dan tidak memerlukan alamat tujuan. Lokasi serta kontak pickup diambil dari snapshot alamat toko pada pesanan. Pembayaran cash hanya tersedia untuk jemput langsung; uang dibayarkan kepada penjual saat pengambilan. Penjual mengonfirmasi pesanan selesai setelah menerima cash. Pengiriman GoSend dan GrabExpress hanya tersedia dengan pembayaran online.

Request instalasi webhook yang tidak membawa body menerima respons `200` dengan body `ok`, tanpa mengubah pesanan. Notifikasi pengiriman yang berisi event tetap harus membawa token yang cocok dengan `BITESHIP_WEBHOOK_SECRET`.

## Pembagian pembayaran Midtrans

Pembagian dana langsung ke merchant penjual memakai fitur **Transaction Split untuk Partner Solutions**, yang tidak tersedia otomatis pada setiap akun Snap. Agar checkout bisa dipakai sekarang dengan akun Midtrans biasa, biarkan `MIDTRANS_SPLIT_ENABLED=false`: pembayaran masuk ke akun Midtrans Food Ilee, sementara `sellerSettlementAmount` dan `sellerSettlementStatus=pending_manual` mencatat nominal produk yang perlu diselesaikan Food Ilee kepada penjual. Isi rekening penerima pada profil toko dan lakukan payout/rekonsiliasi secara manual; sistem ini tidak mengirim transfer bank otomatis.

Saat split aktif, backend meminta alokasi subtotal produk ke merchant penjual dan sisa transaksi (termasuk ongkir) ke merchant platform. MDR mengikuti pengaturan Split di akun Midtrans. Tanpa split, nominal payable penjual dicatat sebesar subtotal produk; ongkir tetap menjadi komponen terpisah.

Jangan aktifkan `MIDTRANS_SPLIT_ENABLED=true` sebelum Midtrans mengonfirmasi Partner Split dan merchant penerima sudah terdaftar. Dokumentasi Midtrans menyatakan merchant penerima harus terdaftar di bawah Partner setup: [Partner Checkout — Transaction Split](https://docs.midtrans.com/reference/partner-checkout-advanced-features).

Setelah Midtrans mendaftarkan penjual, admin menghubungkan merchant ID ke toko melalui `PATCH /api/admin/stores/:id/midtrans-merchant` dengan JSON `{ "merchantId": "..." }`. Endpoint ini memerlukan autentikasi admin. Jangan menerima merchant ID dari formulir penjual.

Rujukan resmi: [Midtrans Partner Checkout — Transaction Split](https://docs.midtrans.com/reference/partner-checkout-advanced-features). Merchant penerima harus terdaftar pada Partner setup.

Pembayaran online ditampilkan dengan Snap Embedded di halaman checkout Food Ilee. Client Key dan Snap token dikirim ke browser dari backend; Server Key tetap berada di backend. Snap callback hanya memperbarui tampilan—status akhir tetap dibaca ulang dari Midtrans oleh backend.

## Endpoint Food Ilee

- `POST /api/orders/rates` — validasi item dan mengambil tarif GoSend/GrabExpress, atau mengembalikan lokasi jemput toko.
- `POST /api/orders/checkout` — hitung ulang harga dan stok; membuat transaksi Snap untuk pembayaran online atau order cash jemput langsung.
- `GET /api/orders/my` — daftar pesanan milik pengguna login.
- `GET /api/orders/:id` — detail pesanan milik pengguna login.
- `POST /api/orders/:id/cancel` — pembeli dapat membatalkan pesanan Midtrans yang masih menunggu pembayaran; backend membatalkan transaksi ke Midtrans dan memulihkan stok satu kali. Pesanan yang sudah dibayar atau mulai diproses tidak dapat dibatalkan lewat fitur ini, dan refund tidak dilakukan otomatis.
- `GET /api/payments/:id/status` — periksa status Midtrans dari server.
- `POST /api/payments/midtrans/webhook` — verifikasi notifikasi Midtrans.
- `POST /api/payments/biteship/webhook` — autentikasi dan terapkan notifikasi status/waybill Biteship.
