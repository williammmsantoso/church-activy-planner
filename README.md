# Perencana Kegiatan & Anggaran

Aplikasi web untuk input rencana kegiatan departemen (nama kegiatan, tanggal, waktu,
budget, fungsi budget, sumber pendanaan), yang otomatis terurut berdasarkan tanggal &
waktu, ditampilkan sebagai tabel dan kalender 1 tahun, serta bisa diunduh sebagai
file Excel (tabel) dan gambar PNG (kalender).

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

## Build untuk production

```bash
npm run build
```

Hasil build ada di folder `dist/`.

```

## Fitur

- **Panel kiri (Input):**
  - Nama Departement.
  - Form tambah kegiatan: Nama Kegiatan, Tanggal Kegiatan, Waktu Kegiatan, Budget,
    Fungsi Budget, dan Pendanaan (Kas Departement / Kas Gereja).
  - Daftar kegiatan yang sudah ditambahkan, otomatis terurut berdasarkan tanggal &
    waktu, dan bisa dihapus satu per satu.
- **Panel kanan (Preview):**
  - Tabel ringkasan seluruh kegiatan (siap diunduh sebagai file Excel asli `.xlsx`).
  - Kalender 1 tahun penuh yang menandai tanggal-tanggal dengan kegiatan (arahkan
    kursor ke tanggal untuk melihat nama kegiatan), siap diunduh sebagai gambar PNG.
  - Tombol unduh terpisah untuk tabel (Excel) dan kalender (gambar).

## Teknologi

- React 18 + Vite
- [SheetJS (xlsx)](https://sheetjs.com/) untuk ekspor Excel
- [html2canvas](https://html2canvas.hertzen.com/) untuk ekspor gambar kalender
```
