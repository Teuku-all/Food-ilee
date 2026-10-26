# Frontend UI

Food Ilee memakai JavaScript ES Module dan CSS biasa. Perubahan UI tidak memerlukan framework tambahan.

## Tempat mengubah tampilan

- `frontend/styles/variables.css`: palet, warna permukaan, radius, dan tiga tingkat shadow untuk kartu, menu, dan dialog.
- `frontend/styles/global.css`: reset, aturan elemen tersembunyi, dan perilaku dasar dokumen.
- `frontend/ui/icons.js`: satu kumpulan ikon SVG untuk seluruh aplikasi. Pilih ikon sesuai fungsi (`package`, `receipt`, `calendar`, `assistant`, `book`), bukan ornamen. Ketebalan garis 1.65 dan `data-icon` memudahkan pemeriksaan; logo tetap berupa aset merek terpisah.
- `frontend/styles/shell.css` dan `frontend/ui/shell.js`: header, menu akun, footer, dan komponen bersama.
- `frontend/styles/finish.css`: penyelesaian komponen dan satu definisi navbar mobile. Ikon aktif tetap berada di dalam tautan navbar; jangan memindahkannya ke elemen mengambang terpisah.
- `frontend/styles/layout.css`, `editorial.css`, dan `dashboard-layout.css`: grid, hierarki halaman, serta layout dashboard.
- `frontend/styles/polish.css`: konsistensi akhir ukuran kontrol, keterbacaan, fokus keyboard, shadow, tabel, dan dialog. Dimuat terakhir di `index.html` agar aturan bersama tidak saling bersaing.
- `frontend/styles/pages/`: stylesheet khusus halaman, termasuk banner marketplace. CSS halaman tidak lagi disimpan sebagai string panjang di renderer JavaScript.

Panggil `loadStylesheet(id, new URL(..., import.meta.url))` dari `frontend/utils/stylesheet.js` untuk memuat stylesheet halaman sekali. Gunakan ID yang unik dan awalan kelas halaman, misalnya `.ca-`, `.pr-`, atau `.ad-`. Hindari selector global seperti `table`, `input`, atau `button` dalam stylesheet halaman, karena stylesheet tetap terpasang setelah perpindahan rute.

URL gambar di stylesheet halaman dihitung dari `styles/pages/`, misalnya `../../assets/nama-gambar.jpg`. Build tetap mengganti nama aset dengan hash secara otomatis.

## Pola interaksi

- Router tetap berpindah halaman secara langsung. Animasi komponen menghormati `prefers-reduced-motion`.
- Navbar mobile dan jarak bawah halaman memakai safe area perangkat. Jangan memberi transform atau filter pada leluhur navbar karena dapat mengubah acuan `position: fixed`.
- Gunakan `<dialog>` native beserta `aria-labelledby`. Kontennya dapat digulir di dalam viewport; halaman belakang dikunci saat dialog terbuka.
- Bind kontrol yang tetap berada di halaman sekali. Bind ulang hanya kontrol baris yang memang dibuat ulang, seperti baris keranjang.
- Pertahankan pemeriksaan revisi navigasi sesudah request asinkron agar respons rute lama tidak menimpa halaman baru.
- Tambahkan frasa UI baru ke `utils/translations-en.js`. Nama pengguna, deskripsi produk, alamat, dan isi pesan tetap merupakan konten pengguna.

## Pemeriksaan

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

Untuk perubahan visual, buka halaman yang terdampak pada desktop dan mobile; periksa keadaan berisi data, kosong, gagal memuat, dialog, scroll, fokus keyboard, dan kedua bahasa. Muat ulang dokumen setelah mengubah modul JavaScript saat memeriksa hasil: perpindahan hash saja mempertahankan modul yang sudah dimuat browser.
