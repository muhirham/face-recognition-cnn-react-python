import mysql.connector
from config import Config
from datetime import datetime, timedelta
import random

def inject_dashboard_dummy():
    conn = mysql.connector.connect(
        host=Config.MYSQL_HOST,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        database=Config.MYSQL_DB
    )
    cursor = conn.cursor(dictionary=True)
    try:
        # Get all employees
        cursor.execute("SELECT id, dept_id FROM karyawans")
        karyawans = cursor.fetchall()
        
        # Get all shifts
        cursor.execute("SELECT id, dept_id FROM shift_kerjas")
        shifts = cursor.fetchall()
        
        if not karyawans or not shifts:
            print("Belum ada data karyawan/shift.")
            return
            
        today = datetime.now()
        
        # Generate for the last 7 days including today
        for i in range(7):
            target_date = today - timedelta(days=i)
            # Skip weekend
            if target_date.weekday() >= 5:
                continue
                
            date_str = target_date.strftime('%Y-%m-%d')
            
            for emp in karyawans:
                # 85% chance to attend
                if random.random() < 0.85:
                    # check if already exists
                    cursor.execute("SELECT id FROM absensis WHERE karyawan_id = %s AND tanggal = %s AND jenis = 'masuk'", (emp['id'], date_str))
                    if cursor.fetchone():
                        continue # Skip if already absen
                        
                    # find matching shift or default
                    shift_id = None
                    for s in shifts:
                        if s['dept_id'] == emp['dept_id']:
                            shift_id = s['id']
                            break
                    if not shift_id:
                        for s in shifts:
                            if s['dept_id'] is None:
                                shift_id = s['id']
                                break
                    if not shift_id:
                        shift_id = shifts[0]['id']
                        
                    # Time: mostly on time
                    if random.random() < 0.8:
                        h = random.choice([7, 7, 7, 8])
                        m = random.randint(0, 15) if h == 8 else random.randint(0, 59)
                        status_masuk = 'tepat_waktu'
                        menit_telat = 0
                    else:
                        h = 8
                        m = random.randint(16, 59)
                        status_masuk = 'terlambat'
                        menit_telat = m - 15
                        
                    waktu_masuk_str = f"{h:02d}:{m:02d}:00"
                    
                    cursor.execute("""
                        INSERT INTO absensis (karyawan_id, shift_id, tanggal, waktu, jenis, status, menit_terlambat, confidence_score)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (emp['id'], shift_id, date_str, waktu_masuk_str, 'masuk', status_masuk, menit_telat, 95.5))
                    
        conn.commit()
        print("Berhasil menyuntikkan data dummy untuk dashboard!")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    inject_dashboard_dummy()
