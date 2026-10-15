# Checkout dan pengiriman

## Data wilayah

Form memakai API statis Emsifa v2: `https://www.emsifa.com/api-wilayah-indonesia/v2`. Endpoint yang dipakai adalah `provinces.json`, `regencies/{provinceId}.json`, `districts/{regencyId}.json`, dan `villages/{districtId}.json`. Backend memeriksa ulang rantai kode/nama serta kecocokan kode pos sebelum meminta tarif. Dataset dan generator sumbernya tersedia di [emsifa/api-wilayah-indonesia](https://github.com/emsifa/api-wilayah-indonesia). Bila sumber tidak dapat diakses, checkout menolak melanjutkan agar alamat yang tidak tervalidasi tidak dipakai.

## Biteship

Rates diminta server ke `POST /v1/rates/couriers`. Saat checkout, backend meminta ulang tarif dan menggunakan nilai dari respons Biteship, bukan harga yang dikirim browser. Paket memakai satuan produk marketplace yang ditampilkan sebagai kilogram dan dikonversi ke gram untuk API. Sesudah pembayaran terverifikasi, backend membuat order Biteship dan menyimpan waybill/tracking yang tersedia.

Pickup memakai alamat terstruktur pada profil toko: provinsi, kabupaten/kota, kecamatan, desa/kelurahan, detail jalan, dan kode pos, ditambah nama serta telepon kontak. Satu checkout hanya dapat memuat produk dari satu toko, sehingga satu order Biteship memiliki satu titik asal. Pesanan menyimpan snapshot alamat pickup agar perubahan profil tidak mengubah alamat order yang sudah dibuat. Konfigurasikan `BITESHIP_API_KEY`, `BITESHIP_COURIERS`, dan `BITESHIP_WEBHOOK_SECRET` di backend; variabel `BITESHIP_ORIGIN_*` global tidak lagi digunakan.

## Pembagian pembayaran Midtrans

Pembagian dana langsung ke merchant penjual memakai fitur **Transaction Split untuk Partner Solutions**, yang tidak tersedia otomatis pada setiap akun Snap. Agar checkout bisa dipakai sekarang dengan akun Midtrans biasa, biarkan `MIDTRANS_SPLIT_ENABLED=false`: pembayaran masuk ke akun Midtrans Food Ilee, sementara `sellerSettlementAmount` dan `sellerSettlementStatus=pending_manual` mencatat nominal produk yang perlu diselesaikan Food Ilee kepada penjual. Isi rekening penerima pada profil toko dan lakukan payout/rekonsiliasi secara manual; sistem ini tidak mengirim transfer bank otomatis.

Saat split aktif, backend meminta alokasi subtotal produk ke merchant penjual dan sisa transaksi (termasuk ongkir) ke merchant platform. MDR mengikuti pengaturan Split di akun Midtrans. Tanpa split, nominal payable penjual dicatat sebesar subtotal produk; ongkir tetap menjadi komponen terpisah.

Jangan aktifkan `MIDTRANS_SPLIT_ENABLED=true` sebelum Midtrans mengonfirmasi Partner Split dan merchant penerima sudah terdaftar. Dokumentasi Midtrans menyatakan merchant penerima harus terdaftar di bawah Partner setup: [Partner Checkout — Transaction Split](https://docs.midtrans.com/reference/partner-checkout-advanced-features).

Setelah Midtrans mendaftarkan penjual, admin menghubungkan merchant ID ke toko melalui `PATCH /api/admin/stores/:id/midtrans-merchant` dengan JSON `{ "merchantId": "..." }`. Endpoint ini memerlukan autentikasi admin. Jangan menerima merchant ID dari formulir penjual.

Rujukan resmi: [Midtrans Partner Checkout — Transaction Split](https://docs.midtrans.com/reference/partner-checkout-advanced-features). Merchant penerima harus terdaftar pada Partner setup.

Pembayaran online ditampilkan dengan Snap Embedded di halaman checkout Food Ilee. Client Key dan Snap token dikirim ke browser dari backend; Server Key tetap berada di backend. Snap callback hanya memperbarui tampilan—status akhir tetap dibaca ulang dari Midtrans oleh backend.

## COD Biteship

COD hanya ditawarkan untuk layanan yang pada respons tarif Biteship menyatakan COD tersedia. Backend meminta tarif COD berdasarkan nilai produk + ongkir, menyimpan biaya COD secara terpisah, dan mengirim nilai tagihan tersebut bersama `BITESHIP_COD_SETTLEMENT_DAYS` (`3_days`, `5_days`, atau `7_days`) saat membuat shipment. Pembeli membayar produk + ongkir ke kurir; biaya layanan COD dipotong dari pencairan penjual. Shipment COD dibuat saat checkout karena pembayaran terjadi ketika kurir menyerahkan barang; status pesanan baru menjadi paid setelah webhook Biteship mengonfirmasi `delivered`. Pembatalan atau pengembalian yang dikonfirmasi membatalkan pesanan dan mengembalikan stok secara idempoten.

Hasil COD dicairkan menurut pengaturan/akun COD Biteship, bukan melalui Midtrans Partner Split. Dana tidak otomatis terbagi ke rekening tiap penjual oleh integrasi ini; Food Ilee perlu mengelola pencatatan dan settlement seller terpisah sampai tersedia integrasi payout khusus.

## Endpoint Food Ilee

- `POST /api/orders/rates` — validasi item, alamat, merchant split, lalu mengambil tarif aktual.
- `POST /api/orders/checkout` — hitung ulang harga, stok, ongkir, buat order dan transaksi Snap dengan aturan split.
- `GET /api/orders/my` — daftar pesanan milik pengguna login.
- `GET /api/orders/:id` — detail pesanan milik pengguna login.
- `GET /api/payments/:id/status` — periksa status Midtrans dari server.
- `POST /api/payments/midtrans/webhook` — verifikasi notifikasi Midtrans.
- `POST /api/payments/biteship/webhook` — autentikasi dan terapkan notifikasi status/waybill Biteship.
