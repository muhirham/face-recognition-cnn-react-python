import mysql.connector
from config import Config

def init_database():
    # 1. Koneksi awal (tanpa database)
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD
        )
        cursor = conn.cursor()
        
        # 2. Reset Database
        print(f"[*] Resetting database '{Config.MYSQL_DB}'...")
        cursor.execute(f"DROP DATABASE IF EXISTS {Config.MYSQL_DB}")
        cursor.execute(f"CREATE DATABASE {Config.MYSQL_DB}")
        cursor.execute(f"USE {Config.MYSQL_DB}")
        
        # 3. Create Tabel Master 1: Users
        print("[+] Creating table 'users'...")
        cursor.execute("""
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                nama_lengkap VARCHAR(100),
                role ENUM('admin', 'karyawan') DEFAULT 'karyawan',
                status_aktif TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)

        # 4. Create Tabel Master 2: Departemens
        print("[+] Creating table 'departemens'...")
        cursor.execute("""
            CREATE TABLE departemens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_dept VARCHAR(100) NOT NULL UNIQUE,
                keterangan TEXT
            )
        """)

        # 5. Create Tabel Master 3: Jabatans
        print("[+] Creating table 'jabatans'...")
        cursor.execute("""
            CREATE TABLE jabatans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_jabatan VARCHAR(100) NOT NULL UNIQUE,
                level INT DEFAULT 1
            )
        """)

        # 6. Create Tabel Master 4: Karyawans
        print("[+] Creating table 'karyawans'...")
        cursor.execute("""
            CREATE TABLE karyawans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNIQUE,
                dept_id INT,
                jabatan_id INT,
                kode_karyawan VARCHAR(50) UNIQUE NOT NULL,
                nama VARCHAR(100) NOT NULL,
                foto_referensi VARCHAR(255),
                status_kerja ENUM('aktif', 'non-aktif') DEFAULT 'aktif',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (dept_id) REFERENCES departemens(id) ON DELETE SET NULL,
                FOREIGN KEY (jabatan_id) REFERENCES jabatans(id) ON DELETE SET NULL
            )
        """)

        # 7. Tabel Shift Kerja (Master 4) - Sekarang Mendukung Per Departemen
        print("[+] Creating table 'shift_kerjas'...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS shift_kerjas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                dept_id INT NULL,
                nama_shift VARCHAR(50) NOT NULL,
                jam_masuk TIME NOT NULL,
                jam_pulang TIME NOT NULL,
                toleransi_menit INT DEFAULT 0,
                min_confidence INT DEFAULT 85,
                FOREIGN KEY (dept_id) REFERENCES departemens(id) ON DELETE CASCADE
            )
        """)

        # 6. Tabel Hari Libur / Tanggal Merah
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hari_liburs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tanggal DATE NOT NULL UNIQUE,
                keterangan VARCHAR(100)
            )
        """)

        # 7. Tabel Pengaturan Global (Master 5)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pengaturans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kunci VARCHAR(50) UNIQUE NOT NULL,
                nilai VARCHAR(255) NOT NULL
            )
        """)
        
        # Seed default confidence if not exists
        cursor.execute("INSERT IGNORE INTO pengaturans (kunci, nilai) VALUES ('min_confidence', '85')")

        # 8. Tabel Template Wajah (Master AI)
        print("[+] Creating table 'face_templates'...")
        cursor.execute("""
            CREATE TABLE face_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                karyawan_id INT,
                embedding_vector LONGTEXT NOT NULL,
                tanggal_perekaman DATETIME DEFAULT CURRENT_TIMESTAMP,
                status ENUM('aktif', 'tidak_aktif') DEFAULT 'aktif',
                FOREIGN KEY (karyawan_id) REFERENCES karyawans(id) ON DELETE CASCADE
            )
        """)

        # 9. Create Tabel Transaksi: Absensis
        print("[+] Creating table 'absensis'...")
        cursor.execute("""
            CREATE TABLE absensis (
                id INT AUTO_INCREMENT PRIMARY KEY,
                karyawan_id INT,
                shift_id INT,
                tanggal DATE NOT NULL,
                waktu TIME NOT NULL,
                jenis ENUM('masuk', 'pulang') NOT NULL,
                status ENUM('tepat_waktu', 'terlambat', 'lembur', 'pulang_awal') NOT NULL,
                menit_terlambat INT DEFAULT 0,
                confidence_score DECIMAL(5,2),
                foto_absen VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (karyawan_id) REFERENCES karyawans(id) ON DELETE CASCADE,
                FOREIGN KEY (shift_id) REFERENCES shift_kerjas(id) ON DELETE SET NULL
            )
        """)

        # 10. Buat folder untuk simpen foto absen
        import os
        photo_dir = 'static/attendance_photos'
        if not os.path.exists(photo_dir):
            os.makedirs(photo_dir)
            print(f"[*] Created directory: {photo_dir}")

        # 10. Create Tabel Transaksi: Izins (Pelengkap Report Bulanan)
        print("[+] Creating table 'izins'...")
        cursor.execute("""
            CREATE TABLE izins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                karyawan_id INT,
                tanggal_mulai DATE NOT NULL,
                tanggal_selesai DATE NOT NULL,
                jenis_izin ENUM('sakit', 'izin', 'cuti') NOT NULL,
                keterangan TEXT,
                status_approval ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                FOREIGN KEY (karyawan_id) REFERENCES karyawans(id) ON DELETE CASCADE
            )
        """)

        # --- SEEDING DATA AWAL ---
        print("[*] Seeding initial data...")
        
        # Admin Default
        cursor.execute("INSERT INTO users (username, email, password_hash, nama_lengkap, role) VALUES (%s, %s, %s, %s, %s)",
                       ('admin', 'admin@gmail.com', 'admin123', 'Administrator', 'admin'))
        
        # Departemen & Jabatan Contoh
        cursor.execute("INSERT INTO departemens (nama_dept) VALUES ('IT'), ('HRD'), ('Marketing')")
        cursor.execute("INSERT INTO jabatans (nama_jabatan) VALUES ('Manager'), ('Supervisor'), ('Staff')")
        
        # Shift Default (Normal)
        cursor.execute("INSERT INTO shift_kerjas (nama_shift, jam_masuk, jam_pulang, toleransi_menit) VALUES (%s, %s, %s, %s)",
                       ('Shift Normal', '08:00:00', '17:00:00', 15))

        conn.commit()
        print("\n[SUCCESS] Database 'absensi_cnn' has been initialized perfectly!")

    except mysql.connector.Error as err:
        print(f"\n[ERROR] {err}")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    init_database()
