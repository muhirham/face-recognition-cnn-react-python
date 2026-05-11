from flask import Flask, request, jsonify, send_from_directory
import cv2
import numpy as np
import base64
import face_recognition
from flask_cors import CORS
import mysql.connector
import json
import random
import string
import os
import uuid
from datetime import datetime, timedelta
import traceback
from config import Config

app = Flask(__name__)
# Allow up to 64MB payloads for high-res image datasets
app.config['MAX_CONTENT_LENGTH'] = 64 * 1024 * 1024 
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])

# Database Configuration
db_config = {
    'host': Config.MYSQL_HOST,
    'user': Config.MYSQL_USER,
    'password': Config.MYSQL_PASSWORD,
    'database': Config.MYSQL_DB
}

# Ensure static directories exist
UPLOAD_FOLDER = 'static/attendance_photos'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        return None

def save_attendance_photo(image_base64, employee_id):
    try:
        # Decode base64
        header, encoded = image_base64.split(",", 1)
        data = base64.b64decode(encoded)
        
        # Generate unique filename
        filename = f"att_{employee_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}.jpg"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        with open(filepath, "wb") as f:
            f.write(data)
        return filename
    except Exception as e:
        print(f"Error saving photo: {e}")
        return None

def get_face_encodings(img):
    try:
        rgb_image = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        face_encodings = face_recognition.face_encodings(rgb_image)
        return face_encodings[0] if len(face_encodings) > 0 else None
    except Exception as e:
        print(f"Face Encoding Error: {e}")
        return None

# --- PUBLIC ROUTES ---

@app.route('/static/attendance_photos/<filename>')
def serve_photo(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/login_credential', methods=['POST'])
def login_credential():
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        data = request.get_json()
        email, password = data.get('email'), data.get('password')
        cursor.execute("SELECT id, username, role, password_hash FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if user and user['password_hash'] == password:
            return jsonify({'message': 'Login Success', 'user_id': user['id'], 'username': user['username'], 'role': user['role']})
        return jsonify({'message': 'Invalid credentials'}), 401
    finally:
        cursor.close()
        conn.close()

@app.route('/detect_live', methods=['POST'])
def detect_live():
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        data = request.get_json()
        image = data.get('image', '')
        if not image or ',' not in image: return jsonify({'message': 'Invalid Image'}), 400

        # Decode Image Live
        image_data = base64.b64decode(image.split(',')[1])
        np_img = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        face_locations = face_recognition.face_locations(rgb_img, model='hog')
        results, recognized_user = [], None

        if len(face_locations) > 0:
            live_encodings = face_recognition.face_encodings(rgb_img, face_locations)
            
            # Ambil SEMUA vektor aktif dari DB
            cursor.execute("""
                SELECT k.id as employee_id, k.nama, f.embedding_vector 
                FROM face_templates f
                JOIN karyawans k ON f.karyawan_id = k.id
                WHERE f.status = 'aktif'
            """)
            all_templates = cursor.fetchall()

            # Ambil Pengaturan Min Confidence dari DB
            cursor.execute("SELECT nilai FROM pengaturans WHERE kunci = 'min_confidence'")
            setting = cursor.fetchone()
            min_conf_percent = int(setting['nilai']) if setting else 85
            # Konversi persen ke distance (Contoh: 85% -> 0.15 distance)
            min_dist_threshold = (100 - min_conf_percent) / 100

            for (top, right, bottom, left), live_enc in zip(face_locations, live_encodings):
                name, emp_id, min_dist = "Unknown", None, min_dist_threshold
                
                # Bandingkan live_enc dengan SEMUA template di DB
                for t in all_templates:
                    try:
                        stored_vec = np.array(json.loads(t['embedding_vector']))
                        dist = face_recognition.face_distance([stored_vec], live_enc)[0]
                        
                        if dist < min_dist:
                            min_dist = dist
                            name, emp_id = t['nama'], t['employee_id']
                    except: continue

                confidence = round((1 - min_dist) * 100, 1) if name != "Unknown" else 0
                results.append({"box": [top, right, bottom, left], "name": name, "confidence": confidence})
                
                if name != "Unknown":
                    # Cari user_id buat submit absensi
                    cursor.execute("SELECT user_id FROM karyawans WHERE id = %s", (emp_id,))
                    u = cursor.fetchone()
                    recognized_user = {
                        "id": u['user_id'] if u else None, 
                        "employee_id": emp_id, 
                        "username": name, 
                        "confidence": confidence
                    }

        return jsonify({"faces": results, "recognized": recognized_user is not None, "user": recognized_user})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'message': f"Detection Error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/submit_attendance', methods=['POST'])
def submit_attendance():
    data = request.get_json()
    emp_id = data.get('employee_id')
    confidence = data.get('confidence')
    jenis = data.get('jenis', 'masuk')
    image_base64 = data.get('image')

    if not emp_id or confidence is None or not image_base64:
        return jsonify({'message': 'Data tidak lengkap'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # DEBUG: Liat apa yang masuk
        print(f"[*] Menyimpen Absen: EmpID={emp_id}, Conf={confidence}, Jenis={jenis}")

        # Ambil Pengaturan Min Confidence dari DB (Dinamis)
        cursor.execute("SELECT nilai FROM pengaturans WHERE kunci = 'min_confidence'")
        setting = cursor.fetchone()
        min_conf_required = int(setting['nilai']) if setting else 85
        print(f"[*] Threshold DB: {min_conf_required}")

        if confidence < min_conf_required:
            print(f"[!] DITOLAK: Confidence {confidence} < {min_conf_required}")
            return jsonify({'message': f'Absensi Gagal! Kemiripan wajah Anda ({confidence}%) di bawah batas minimum {min_conf_required}%.'}), 400
            
        now = datetime.now()
        date_str, time_str = now.strftime('%Y-%m-%d'), now.strftime('%H:%M:%S')
        
        # 1. Prevent Double Attendance
        cursor.execute("SELECT id FROM absensis WHERE karyawan_id = %s AND tanggal = %s AND jenis = %s", (emp_id, date_str, jenis))
        if cursor.fetchone():
            print(f"[!] DITOLAK: Sudah absen {jenis} hari ini.")
            return jsonify({'message': f'Sudah absen {jenis} hari ini!'}), 400

        # 2. Get Employee Shift (Specific to Department)
        cursor.execute("""
            SELECT k.id, s.id as shift_id, s.jam_masuk, s.jam_pulang, s.toleransi_menit 
            FROM karyawans k
            LEFT JOIN shift_kerjas s ON k.dept_id = s.dept_id
            WHERE k.id = %s LIMIT 1
        """, (emp_id,))
        info = cursor.fetchone()
        print(f"[*] Data Shift: {info}")
        
        status_absen, menit_terlambat = 'tepat_waktu', 0
        
        if info:
            base_time = datetime.strptime(time_str, '%H:%M:%S')
            
            if jenis == 'masuk':
                # Calc Lateness
                sched_td = info['jam_masuk'] # Time object
                sched_time = datetime.strptime("00:00:00", '%H:%M:%S') + sched_td
                limit_time = sched_time + timedelta(minutes=info['toleransi_menit'])
                
                if base_time > limit_time:
                    status_absen = 'terlambat'
                    menit_terlambat = int((base_time - sched_time).total_seconds() / 60)
            
            elif jenis == 'pulang':
                # Calc Early Checkout
                sched_td = info['jam_pulang']
                sched_time = datetime.strptime("00:00:00", '%H:%M:%S') + sched_td
                
                if base_time < sched_time:
                    status_absen = 'pulang_awal'
                    print(f"[!] Pulang Awal: {time_str} < {sched_td}")
                else:
                    # Optional: Check for Overtime (Lembur)
                    overtime_gate = sched_time + timedelta(hours=1)
                    if base_time > overtime_gate:
                        status_absen = 'lembur'

        # 3. Save Photo Physical File
        photo_name = save_attendance_photo(image_base64, emp_id)

        # 4. Save to DB
        sql = """
            INSERT INTO absensis (karyawan_id, shift_id, tanggal, waktu, jenis, status, menit_terlambat, confidence_score, foto_absen) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (emp_id, info['shift_id'] if info else None, date_str, time_str, jenis, status_absen, menit_terlambat, confidence, photo_name))
        conn.commit()
        
        return jsonify({'message': 'Absensi Berhasil!', 'status': status_absen.replace('_',' ').title()})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- ADMIN ROUTES ---

@app.route('/admin/attendance_logs', methods=['GET'])
def get_all_attendance_logs():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT a.id, k.nama, a.tanggal, a.waktu, a.jenis, a.status, a.menit_terlambat, a.confidence_score, a.foto_absen
            FROM absensis a
            JOIN karyawans k ON a.karyawan_id = k.id
            ORDER BY a.tanggal DESC, a.waktu DESC
        """)
        
        raw_logs = cursor.fetchall()
        # Convert DATE and TIMEDELTA to string for JSON
        formatted_logs = []
        for row in raw_logs:
            row['tanggal'] = row['tanggal'].strftime('%Y-%m-%d') if row['tanggal'] else None
            row['waktu'] = str(row['waktu']) if row['waktu'] else None
            formatted_logs.append(row)

        return jsonify({'history': formatted_logs})
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/register_face', methods=['POST'])
def register_face():
    conn = None
    try:
        data = request.get_json()
        employee_id = data.get('employee_id')
        images = data.get('images') 

        if not employee_id or not images:
            return jsonify({'message': 'Data tidak lengkap'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # 1. Ambil data buat folder
        cursor.execute("SELECT nama, kode_karyawan FROM karyawans WHERE id = %s", (employee_id,))
        emp = cursor.fetchone()
        if not emp: return jsonify({'message': 'Karyawan tidak ditemukan'}), 404
        
        emp_name = emp['nama'].lower()
        emp_code = emp['kode_karyawan']
        folder_name = f"{emp_name} ({emp_code})"
        dataset_dir = os.path.join('dataset', folder_name)
        
        if not os.path.exists(dataset_dir):
            os.makedirs(dataset_dir)

        # 2. Hapus data lama biar nggak duplikat
        cursor.execute("DELETE FROM face_templates WHERE karyawan_id = %s", (employee_id,))
        
        saved_count = 0
        # 3. Proses 20 Foto (Simpan Fisik + Ekstrak Vektor)
        for i, img_base64 in enumerate(images):
            try:
                header, encoded = img_base64.split(",", 1)
                image_bytes = base64.b64decode(encoded)
                
                # Simpan File Fisik
                filename = f"{i}.jpg"
                filepath = os.path.join(dataset_dir, filename)
                with open(filepath, "wb") as f:
                    f.write(image_bytes)

                # Ekstrak Vektor (Embedding)
                np_img = np.frombuffer(image_bytes, np.uint8)
                img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
                encoding = get_face_encodings(img)
                
                if encoding is not None:
                    # Simpan Vektor ke Database (Ubah ke JSON String)
                    vector_json = json.dumps(encoding.tolist())
                    cursor.execute("""
                        INSERT INTO face_templates (karyawan_id, embedding_vector, status) 
                        VALUES (%s, %s, 'aktif')
                    """, (employee_id, vector_json))
                    saved_count += 1
            except Exception as e:
                print(f"Error processing image {i}: {e}")

        conn.commit()
        return jsonify({
            'message': f'Berhasil! {saved_count} Vektor disimpan di DB & Foto disimpan di folder {folder_name}',
            'folder': folder_name
        })
    except Exception as e:
        if conn: conn.rollback()
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500
    finally:
        if conn:
            cursor.close()
            conn.close()


@app.route('/admin/reset_face', methods=['POST'])
def reset_face():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        data = request.get_json()
        emp_id = data.get('karyawan_id')
        cursor.execute("DELETE FROM face_templates WHERE karyawan_id = %s", (emp_id,))
        conn.commit()
        return jsonify({'message': 'Data wajah berhasil dihapus'})
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/employees/<int:user_id>', methods=['PUT', 'DELETE'])
def manage_employee(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'DELETE':
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()
            return jsonify({'message': 'Karyawan berhasil dihapus'})
            
        elif request.method == 'PUT':
            data = request.get_json()
            cursor.execute("""
                UPDATE users SET username = %s, email = %s, role = %s WHERE id = %s
            """, (data['username'], data['email'], data['role'], user_id))
            
            cursor.execute("""
                UPDATE karyawans SET dept_id = %s, jabatan_id = %s, nama = %s WHERE user_id = %s
            """, (data['dept_id'], data['jabatan_id'], data['username'], user_id))
            
            conn.commit()
            return jsonify({'message': 'Data berhasil diperbarui'})
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/stats', methods=['GET'])
def get_admin_stats():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        cursor.execute("SELECT COUNT(*) as total FROM karyawans")
        total = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(DISTINCT karyawan_id) as total FROM absensis WHERE tanggal = %s", (today,))
        present = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as total FROM absensis WHERE tanggal = %s AND status = 'terlambat'", (today,))
        late = cursor.fetchone()['total']
        
        return jsonify({
            'total_employees': total,
            'present_today': present,
            'late_today': late,
            'absent_today': max(0, total - present),
            'attendance_rate': round((present/total*100),1) if total > 0 else 0
        })
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/employees', methods=['GET'])
def get_employees():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Gunakan k.id AS id biar sinkron sama frontend
        cursor.execute("""
            SELECT 
                k.id, 
                k.user_id,
                k.nama, 
                u.username, 
                u.email, 
                u.role, 
                k.kode_karyawan, 
                d.nama_dept, 
                j.nama_jabatan,
                (SELECT COUNT(*) FROM face_templates ft WHERE ft.karyawan_id = k.id AND ft.status = 'aktif') as has_template
            FROM users u
            JOIN karyawans k ON u.id = k.user_id
            LEFT JOIN departemens d ON k.dept_id = d.id
            LEFT JOIN jabatans j ON k.jabatan_id = j.id
        """)
        return jsonify({'employees': cursor.fetchall()})
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/schedule', methods=['GET', 'POST'])
def manage_schedule():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.method == 'POST':
            data = request.get_json()
            # Update or Insert per Department
            dept_id = data.get('dept_id')
            if not dept_id:
                return jsonify({'message': 'Pilih Departemen!'}), 400
                
            # Check if exists for this dept
            cursor.execute("SELECT id FROM shift_kerjas WHERE dept_id = %s", (dept_id,))
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute("""
                    UPDATE shift_kerjas 
                    SET jam_masuk = %s, jam_pulang = %s, toleransi_menit = %s 
                    WHERE dept_id = %s
                """, (data['jam_masuk'], data['jam_pulang'], data['toleransi_menit'], dept_id))
            else:
                cursor.execute("""
                    INSERT INTO shift_kerjas (dept_id, nama_shift, jam_masuk, jam_pulang, toleransi_menit)
                    VALUES (%s, %s, %s, %s, %s)
                """, (dept_id, f"Shift {dept_id}", data['jam_masuk'], data['jam_pulang'], data['toleransi_menit']))
                
            conn.commit()
            return jsonify({'message': 'Jadwal Departemen berhasil diperbarui'})
        
        # GET with JOIN to Dept Name
        cursor.execute("""
            SELECT s.*, d.nama_dept 
            FROM shift_kerjas s
            LEFT JOIN departemens d ON s.dept_id = d.id
        """)
        rows = cursor.fetchall()
        for row in rows:
            row['jam_masuk'] = str(row['jam_masuk'])
            row['jam_pulang'] = str(row['jam_pulang'])
        return jsonify({'schedules': rows})
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/schedule/<int:id>', methods=['DELETE'])
def delete_schedule(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM shift_kerjas WHERE id = %s", (id,))
        conn.commit()
        return jsonify({'message': 'Shift berhasil dihapus'})
    finally:
        cursor.close()
        conn.close()

# --- HARI LIBUR / TANGGAL MERAH ---
@app.route('/admin/holidays', methods=['GET', 'POST'])
def manage_holidays():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.method == 'POST':
            data = request.get_json()
            cursor.execute("INSERT INTO hari_liburs (tanggal, keterangan) VALUES (%s, %s)",
                           (data['tanggal'], data['keterangan']))
            conn.commit()
            return jsonify({'message': 'Hari libur berhasil ditambah'})
        
        cursor.execute("SELECT * FROM hari_liburs ORDER BY tanggal ASC")
        return jsonify({'holidays': cursor.fetchall()})
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/holidays/<int:id>', methods=['DELETE'])
def delete_holiday(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM hari_liburs WHERE id = %s", (id,))
        conn.commit()
        return jsonify({'message': 'Hari libur dihapus'})
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/report', methods=['GET'])
def get_report():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Simple daily rekap for report tab
        cursor.execute("""
            SELECT k.nama, k.kode_karyawan, d.nama_dept, 
                   COUNT(a.id) as total_hadir,
                   SUM(CASE WHEN a.status = 'terlambat' THEN 1 ELSE 0 END) as total_terlambat
            FROM karyawans k
            JOIN departemens d ON k.dept_id = d.id
            LEFT JOIN absensis a ON k.id = a.karyawan_id
            GROUP BY k.id
        """)
        return jsonify({'report': cursor.fetchall()})
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/master_data', methods=['GET'])
def get_master_data():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, nama_dept FROM departemens")
        depts = cursor.fetchall()
        cursor.execute("SELECT id, nama_jabatan FROM jabatans")
        jabs = cursor.fetchall()
        cursor.execute("SELECT id, nama_shift FROM shift_kerjas")
        shifts = cursor.fetchall()
        return jsonify({'departemens': depts, 'jabatans': jabs, 'shifts': shifts})
    finally:
        cursor.close()
        conn.close()

# CRUD DEPARTEMEN
@app.route('/admin/departemens', methods=['POST'])
def add_dept():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        data = request.get_json()
        cursor.execute("INSERT INTO departemens (nama_dept) VALUES (%s)", (data['nama_dept'],))
        conn.commit()
        return jsonify({'message': 'Departemen berhasil ditambah'})
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/departemens/<int:id>', methods=['DELETE'])
def delete_dept(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM departemens WHERE id = %s", (id,))
        conn.commit()
        return jsonify({'message': 'Departemen berhasil dihapus'})
    finally:
        cursor.close()
        conn.close()

# CRUD JABATAN
@app.route('/admin/jabatans', methods=['POST'])
def add_jabatan():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        data = request.get_json()
        cursor.execute("INSERT INTO jabatans (nama_jabatan) VALUES (%s)", (data['nama_jabatan'],))
        conn.commit()
        return jsonify({'message': 'Jabatan berhasil ditambah'})
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/jabatans/<int:id>', methods=['DELETE'])
def delete_jabatan(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM jabatans WHERE id = %s", (id,))
        conn.commit()
        return jsonify({'message': 'Jabatan berhasil dihapus'})
    finally:
        cursor.close()
        conn.close()

# CRUD USERS
@app.route('/admin/users', methods=['GET', 'POST'])
def manage_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.method == 'POST':
            data = request.get_json()
            cursor.execute("INSERT INTO users (username, email, password_hash, role) VALUES (%s, %s, %s, %s)",
                           (data['username'], data['email'], data['password'], data['role']))
            conn.commit()
            return jsonify({'message': 'User berhasil ditambah'})
        
        cursor.execute("SELECT id, username, email, role FROM users")
        return jsonify({'users': cursor.fetchall()})
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/users/<int:id>', methods=['DELETE'])
def delete_user(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM users WHERE id = %s", (id,))
        conn.commit()
        return jsonify({'message': 'User berhasil dihapus'})
    finally:
        cursor.close()
        conn.close()

# --- USER ROUTES ---
@app.route('/greeting', methods=['GET'])
def get_greeting():
    user_id = request.args.get('user_id')
    if not user_id: return jsonify({'message': 'User ID required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Cek dulu di tabel users buat dapet basic info
        cursor.execute("SELECT username, role FROM users WHERE id = %s", (user_id,))
        base_user = cursor.fetchone()
        if not base_user: return jsonify({'message': 'User tidak ditemukan'}), 404

        # 2. Kalau dia karyawan, baru cari detail departemennya
        # Gunakan alias k.id AS id biar nggak tabrakan sama id tabel lain
        cursor.execute("""
            SELECT 
                k.id, 
                k.kode_karyawan, 
                k.nama, 
                k.status_kerja,
                d.nama_dept, 
                j.nama_jabatan 
            FROM karyawans k
            LEFT JOIN departemens d ON k.dept_id = d.id
            LEFT JOIN jabatans j ON k.jabatan_id = j.id
            WHERE k.user_id = %s
        """, (user_id,))
        karyawan = cursor.fetchone()
        
        # Get Global Settings
        cursor.execute("SELECT nilai FROM pengaturans WHERE kunci = 'min_confidence'")
        setting = cursor.fetchone()
        min_conf = int(setting['nilai']) if setting else 85
        
        # Gabungkan data: Pake nama karyawan kalau ada, kalau nggak pake username
        response_data = {
            'username': karyawan['nama'] if karyawan else base_user['username'],
            'nama': karyawan['nama'] if karyawan else base_user['username'],
            'role': base_user['role'],
            'nama_dept': karyawan['nama_dept'] if karyawan else 'Administrator',
            'nama_jabatan': karyawan['nama_jabatan'] if karyawan else 'Super Admin',
            'min_confidence': min_conf
        }
        
        return jsonify(response_data)
    finally:
        cursor.close()
        conn.close()

@app.route('/user/stats', methods=['GET'])
def get_user_stats():
    user_id = request.args.get('user_id')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM karyawans WHERE user_id = %s", (user_id,))
        karyawan = cursor.fetchone()
        if not karyawan: return jsonify({'message': 'Error'}), 404
        
        # Hitung statistik sederhana
        cursor.execute("SELECT COUNT(*) as hadir FROM absensis WHERE karyawan_id = %s", (karyawan['id'],))
        hadir = cursor.fetchone()['hadir']
        
        cursor.execute("SELECT COUNT(*) as terlambat FROM absensis WHERE karyawan_id = %s AND status = 'terlambat'", (karyawan['id'],))
        terlambat = cursor.fetchone()['terlambat']
        
        return jsonify({
            'hadir': hadir,
            'terlambat': terlambat,
            'izin': 0,
            'sakit': 0
        })
    finally:
        cursor.close()
        conn.close()

@app.route('/register', methods=['POST'])
def register():
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        data = request.get_json()
        email = data.get('email')
        username = data.get('username')
        password = data.get('password', '123456')
        # Konversi string kosong ke None agar MySQL nggak eror (Foreign Key)
        dept_id = data.get('dept_id') if data.get('dept_id') else None
        jab_id = data.get('jabatan_id') if data.get('jabatan_id') else None
        role = data.get('role', 'karyawan')
        
        if not email or not username:
            return jsonify({'message': 'Nama dan Email wajib diisi!'}), 400

        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone(): 
            return jsonify({'message': 'Email sudah terdaftar!'}), 400

        # Transaction Start
        # 1. Simpan ke tabel users
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, nama_lengkap, role) 
            VALUES (%s, %s, %s, %s, %s)
        """, (username, email, password, username, role))
        user_id = cursor.lastrowid
        
        # 2. Simpan ke tabel karyawans
        kode_kry = 'KRY-' + ''.join(random.choices(string.digits, k=4))
        cursor.execute("""
            INSERT INTO karyawans (user_id, dept_id, jabatan_id, kode_karyawan, nama) 
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, dept_id, jab_id, kode_kry, username))
        
        conn.commit()
        return jsonify({
            'message': f'Sukses! {username} terdaftar dengan NIP: {kode_kry}',
            'user_id': user_id,
            'kode': kode_kry
        })
    except Exception as e:
        if conn: conn.rollback()
        traceback.print_exc()
        return jsonify({'message': f'Server Error: {str(e)}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/attendance_history', methods=['GET'])
def get_user_attendance_history():
    user_id = request.args.get('user_id')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM karyawans WHERE user_id = %s", (user_id,))
        karyawan = cursor.fetchone()
        if not karyawan: return jsonify({'message': 'Error'}), 404
        
        cursor.execute("""
            SELECT tanggal, waktu, jenis, status, menit_terlambat, confidence_score, foto_absen 
            FROM absensis 
            WHERE karyawan_id = %s 
            ORDER BY tanggal DESC, waktu DESC
        """, (karyawan['id'],))
        
        raw_history = cursor.fetchall()
        # Convert DATE and TIMEDELTA to string for JSON
        formatted_history = []
        for row in raw_history:
            row['tanggal'] = row['tanggal'].strftime('%Y-%m-%d') if row['tanggal'] else None
            row['waktu'] = str(row['waktu']) if row['waktu'] else None
            formatted_history.append(row)

        return jsonify({'history': formatted_history})
    finally:
        cursor.close()
        conn.close()


@app.route('/admin/check_template/<int:employee_id>')
def check_template(employee_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Gunakan karyawan_id sesuai struktur tabel
        cursor.execute("SELECT id FROM face_templates WHERE karyawan_id = %s LIMIT 1", (employee_id,))
        exists = cursor.fetchone() is not None
        return jsonify({'exists': exists})
    finally:
        cursor.close()
        conn.close()

# --- PENGATURAN GLOBAL ---
@app.route('/admin/settings', methods=['GET', 'POST'])
def manage_settings():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.method == 'POST':
            data = request.get_json()
            for key, value in data.items():
                cursor.execute("UPDATE pengaturans SET nilai = %s WHERE kunci = %s", (str(value), key))
            conn.commit()
            return jsonify({'message': 'Pengaturan sistem berhasil diperbarui'})
        
        cursor.execute("SELECT kunci, nilai FROM pengaturans")
        rows = cursor.fetchall()
        settings = {r['kunci']: r['nilai'] for r in rows}
        return jsonify(settings)
    finally:
        cursor.close()
        conn.close()

from flask import send_from_directory

@app.route('/dataset/<path:filename>')
def serve_dataset(filename):
    return send_from_directory('dataset', filename)

@app.route('/admin/get_dataset/<int:employee_id>')
def get_dataset(employee_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Ambil nama dan kode buat nyusun nama folder
        cursor.execute("SELECT nama, kode_karyawan FROM karyawans WHERE id = %s", (employee_id,))
        emp = cursor.fetchone()
        
        if not emp: return jsonify({'images': []})
        
        # Susun nama folder: nama (KRY-XXXX)
        folder_name = f"{emp['nama'].lower()} ({emp['kode_karyawan']})"
        dataset_dir = os.path.join('dataset', folder_name)
        
        print(f"[*] Mencari dataset di: {dataset_dir}")

        if not os.path.exists(dataset_dir):
            return jsonify({'images': []})
        
        images = [f for f in os.listdir(dataset_dir) if f.endswith('.jpg')]
        image_urls = [f"/dataset/{folder_name}/{img}" for img in sorted(images)]
        
        return jsonify({'images': image_urls})
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/delete_dataset/<int:employee_id>', methods=['DELETE'])
def delete_dataset(employee_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Cari info karyawan buat tau nama foldernya
        cursor.execute("SELECT nama, kode_karyawan FROM karyawans WHERE id = %s", (employee_id,))
        emp = cursor.fetchone()
        
        # 2. Hapus dari Database
        cursor.execute("DELETE FROM face_templates WHERE karyawan_id = %s", (employee_id,))
        
        # 3. Hapus Folder Fisik
        if emp:
            folder_name = f"{emp['nama'].lower()} ({emp['kode_karyawan']})"
            dataset_dir = os.path.join('dataset', folder_name)
            if os.path.exists(dataset_dir):
                import shutil
                shutil.rmtree(dataset_dir)
            
        conn.commit()
        return jsonify({'message': 'Dataset dan template berhasil dihapus'})
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
