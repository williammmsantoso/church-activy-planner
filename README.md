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

## Deploy ke Netlify (gratis)

**Opsi A — Drag & drop (paling cepat, tanpa akun Git):**
1. Jalankan `npm install` lalu `npm run build` di komputer Anda.
2. Buka https://app.netlify.com/drop
3. Seret (drag) folder `dist/` ke halaman tersebut. Situs langsung online.

**Opsi B — Hubungkan repo Git (auto-deploy setiap push):**
1. Push folder project ini ke GitHub/GitLab/Bitbucket.
2. Di Netlify, klik "Add new site" → "Import an existing project".
3. Pilih repo Anda. Netlify akan otomatis mendeteksi pengaturan dari `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Klik "Deploy site".

**Opsi C — Netlify CLI:**
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
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
