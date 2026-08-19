<<<<<<< HEAD
# face-recognition-cnn-react-python
Web-based automatic attendance system using face recognition with CNN, React frontend, and Python backend.
=======
# 👤 Face Recognition Attendance System (CNN)

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB.svg)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)

Sistem absensi otomatis berbasis pengenalan wajah menggunakan algoritma **Convolutional Neural Networks (CNN)**. Proyek ini dikembangkan sebagai bagian dari penelitian Skripsi untuk meningkatkan efisiensi pencatatan kehadiran.

---

## 📌 Fitur Utama

- ✅ **Real-time Face Detection**: Deteksi wajah langsung melalui webcam.
- ✅ **CNN Identification**: Pengenalan wajah menggunakan model deep learning.
- ✅ **Automated Attendance**: Pencatatan kehadiran otomatis ke database.
- ✅ **Employee Management**: Registrasi karyawan dan pengambilan dataset wajah.
- ✅ **Lateness Migration**: Fitur untuk migrasi dan kalkulasi keterlambatan.

---

## 📂 Struktur Proyek

```bash
Facial_Login_System/
├── 📁 backend/                # API Service (Python/Flask)
│   ├── 🐍 main.py             # File utama (Entry Point)
│   ├── 🐍 config.py           # Konfigurasi Database (absensi_cnn)
│   ├── 🐍 migrate_lateness.py # Script migrasi data keterlambatan
│   ├── 🐍 create_table_departemen.py # Setup tabel departemen
│   ├── 📄 requirements.txt    # Daftar dependensi Python
│   └── 📄 dlib-19.24.1...whl  # Wheel file untuk instalasi dlib
├── 📁 frontend/               # User Interface (React.js)
│   ├── 📁 src/                # Source code aplikasi
│   └── 📄 package.json        # Konfigurasi npm
└── 📄 README.md               # Dokumentasi Proyek
```

---

## 🚀 Panduan Instalasi

### 1. Persiapan Database
1. Pastikan **MySQL** sudah berjalan.
2. Buat database dengan nama `absensi_cnn`.
3. Sesuaikan *username* dan *password* di file `backend/config.py`.

### 2. Setup Backend (Python & Virtual Environment)
Sangat disarankan menggunakan Virtual Environment (venv) saat memindahkan program ke laptop lain agar versi library (terutama dlib dan face_recognition) tidak bentrok.

```bash
cd backend

# 1. Buat virtual environment bernama 'venv'
python -m venv venv

# 2. Aktifkan venv (Windows)
venv\Scripts\activate
# (Catatan: Jika menggunakan Mac/Linux, jalankan: source venv/bin/activate)

# 3. Instal semua library yang dibutuhkan (pastikan (venv) sudah muncul di terminal)
pip install -r requirements.txt

# 4. Jika gagal menginstal dlib, instal secara manual menggunakan file wheel yang sudah disediakan (khusus Windows Python 3.11):
pip install dlib-19.24.1-cp311-cp311-win_amd64.whl

# 5. Inisialisasi Database (Buat Tabel & Akun Admin Default) - WAJIB DIJALANKAN PERTAMA KALI
python init_db.py

# 6. Jalankan server backend
python main.py
```

### 3. Setup Frontend (React)
```bash
cd frontend
# Instal dependensi
npm install

# Jalankan aplikasi (Development mode)
npm start
```

### 4. Akses Akun Administrator (Default)
Setelah aplikasi berjalan, buka browser dan akses `http://localhost:3000`. Gunakan kredensial berikut untuk login pertama kali:
- **Email:** `admin@gmail.com`
- **Password:** `admin123`

---

## ⚙️ Alur Kerja Sistem

1. **Registrasi**: Admin mendaftarkan karyawan dan mengambil sampel foto wajah.
2. **Preprocessing**: Foto diproses untuk diekstraksi fiturnya oleh model CNN.
3. **Recognition**: Saat karyawan berdiri di depan kamera, sistem mencocokkan wajah dengan dataset.
4. **Logging**: Jika wajah teridentifikasi, data waktu masuk/keluar disimpan ke tabel absensi.

---

## 📸 Tampilan Aplikasi

| Scan Wajah (Login) | Dashboard Admin |
| :---: | :---: |
| *[Masukkan Foto Scan]* | *[Masukkan Foto Dashboard]* |

---

## 👨‍💻 Penulis

**M. Irham Badruzzaman**  
*Undergraduate Thesis - Computer Science*

---
© 2024 - Project Absensi Skripsi
>>>>>>> 93cc674 (first commit)
