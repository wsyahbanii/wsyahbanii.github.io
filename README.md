# Wahyu Syahbani — Portfolio

Portfolio pribadi, dibangun dengan HTML, CSS, dan vanilla JavaScript (tanpa framework/build tool).

## Struktur Folder

```
wsyahbanii-portfolio/
├── index.html
├── assets/
│   ├── css/style.css
│   ├── js/main.js
│   └── images/
│       ├── hero/       -> gambar hero utama
│       ├── projects/   -> thumbnail & preview project
│       ├── gallery/    -> sketsa/art gallery
│       └── icons/      -> aset SVG dekoratif (marquee, dsb)
└── files/
    └── cv-wahyu-syahbani.pdf
```

## Cara Menjalankan Lokal
Buka `index.html` langsung di browser, atau jalankan local server (disarankan agar path relatif konsisten):

```bash
python3 -m http.server 8000
```

Lalu buka http://localhost:8000

## Catatan
- Semua gambar perlu ditaruh sesuai folder di atas (lihat atribut `src` di index.html untuk nama file yang diharapkan).
- File `files/cv-wahyu-syahbani.pdf` perlu ditambahkan agar tombol "Download CV" tidak 404.
