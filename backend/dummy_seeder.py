import mysql.connector
from config import Config
from faker import Faker
import random
from datetime import datetime, timedelta

fake = Faker('id_ID') # Indonesian locale

def seed_dummy_data():
    conn = mysql.connector.connect(
        host=Config.MYSQL_HOST,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        database=Config.MYSQL_DB
    )
    cursor = conn.cursor(dictionary=True)
    
    try:
        print("[*] Memulai proses generate 40 data karyawan & absensi dummy...")
        
        # Ambil list departemen
        cursor.execute("SELECT id FROM departemens")
        depts = cursor.fetchall()
        
        cursor.execute("SELECT id FROM shift_kerjas")
        shifts = cursor.fetchall()

        if not depts or not shifts:
            print("[!] Tabel departemens atau shift_kerjas masih kosong! Tolong isi master data dulu dari dashboard admin.")
            return

        # Generate 40 Karyawan
        emp_ids = []
        for i in range(40):
            nama = fake.name()
            username = nama.split(' ')[0].lower() + str(random.randint(10, 99))
            email = f"{username}@gmail.com"
            password_hash = "karyawan123" # Default pass
            
            # 1. Insert User
            cursor.execute("""
                INSERT INTO users (username, email, password_hash, nama_lengkap, role)
                VALUES (%s, %s, %s, %s, %s)
            """, (username, email, password_hash, nama, 'karyawan'))
            user_id = cursor.lastrowid
            
            # 2. Insert Karyawan
            dept_id = random.choice(depts)['id']
            jabatan_str = random.choice(['Manager', 'Supervisor', 'Staff IT', 'Admin', 'HRD Staff'])
            kode_karyawan = f"EMP{random.randint(1000, 9999)}{i}"

            # 3. Karyawan
            cursor.execute("""
                INSERT INTO karyawans (user_id, dept_id, jabatan, kode_karyawan, nama, nomor_hp, status_kerja)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (user_id, dept_id, jabatan_str, kode_karyawan, nama, '081234567890', 'aktif'))
            karyawan_id = cursor.lastrowid
            emp_ids.append(karyawan_id)
            
            print(f"[+] Karyawan {i+1}/40 Created: {nama} ({kode_karyawan})")
            
        print("\n[*] Membuat data absensi untuk 14 hari terakhir...")
        # Generate Absensi for the last 14 days
        today = datetime.now()
        for i in range(14):
            # Mundur i hari
            target_date = today - timedelta(days=i)
            
            # Skip weekend (Sabtu & Minggu)
            if target_date.weekday() >= 5:
                continue
                
            date_str = target_date.strftime('%Y-%m-%d')
            
            for emp_id in emp_ids:
                # 90% chance to attend
                if random.random() < 0.9:
                    shift_id = random.choice(shifts)['id']
                    
                    # --- JAM MASUK ---
                    # Acak jam masuk (mayoritas jam 07:30 - 08:30)
                    h = random.choice([7, 7, 7, 8, 8, 9])
                    m = random.randint(0, 59)
                    waktu_masuk_str = f"{h:02d}:{m:02d}:00"
                    
                    status_masuk = 'tepat_waktu'
                    menit_telat = 0
                    if h >= 8 and m > 15:
                        status_masuk = 'terlambat'
                        menit_telat = m
                    
                    conf = round(random.uniform(90.5, 98.9), 1)
                    
                    cursor.execute("""
                        INSERT INTO absensis (karyawan_id, shift_id, tanggal, waktu, jenis, status, menit_terlambat, confidence_score)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (emp_id, shift_id, date_str, waktu_masuk_str, 'masuk', status_masuk, menit_telat, conf))
                    
                    # --- JAM PULANG ---
                    # Acak jam pulang (mayoritas jam 17:00 - 18:00)
                    if random.random() < 0.95: # 95% chance absen pulang
                        h_p = random.choice([16, 17, 17, 17, 18])
                        m_p = random.randint(0, 59)
                        waktu_pulang_str = f"{h_p:02d}:{m_p:02d}:00"
                        
                        status_pulang = 'tepat_waktu'
                        alasan = None
                        if h_p == 16:
                            status_pulang = 'pulang_awal'
                            alasan = random.choice(['Sakit perut', 'Izin urusan keluarga', 'Anak sakit', 'Kehujanan'])
                        
                        conf_p = round(random.uniform(90.5, 98.9), 1)
                        
                        cursor.execute("""
                            INSERT INTO absensis (karyawan_id, shift_id, tanggal, waktu, jenis, status, alasan, confidence_score)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, (emp_id, shift_id, date_str, waktu_pulang_str, 'pulang', status_pulang, alasan, conf_p))
        
        conn.commit()
        print("\n[SUCCESS] Berhasil menggenerate 40 Karyawan dan ribuan baris log Absensi dummy!")
        
    except Exception as e:
        print(f"[ERROR] {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    seed_dummy_data()
