from flask import Flask, request, jsonify
import cv2
import numpy as np
import base64
import face_recognition
from flask_cors import CORS
import mysql.connector
import json
import random
import string
from datetime import datetime, timedelta
import traceback
from config import Config

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Allow up to 16MB payloads
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Database Configuration (Imported from config.py)
db_config = {
    'host': Config.MYSQL_HOST,
    'user': Config.MYSQL_USER,
    'password': Config.MYSQL_PASSWORD,
    'database': Config.MYSQL_DB
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        return None

def generate_employee_code():
    return 'KRY-' + ''.join(random.choices(string.digits, k=4))

def get_workdays(start_date_str, end_date_str):
    try:
        start = datetime.strptime(start_date_str, '%Y-%m-%d')
        end = datetime.strptime(end_date_str, '%Y-%m-%d')
        count = 0
        from datetime import timedelta
        curr = start
        while curr <= end:
            if curr.weekday() < 5: # 0-4 is Mon-Fri
                count += 1
            curr += timedelta(days=1)
        return count
    except:
        return 0

def get_face_encodings(img):
    try:
        rgb_image = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        face_encodings = face_recognition.face_encodings(rgb_image)
        if len(face_encodings) > 0:
            return face_encodings[0]
        return None
    except Exception as e:
        print(f"Error in processing face encoding: {e}")
        return None

@app.route('/register', methods=['POST'])
def register():
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        data = request.get_json()
        email = data['email']
        username = data['username']
        password = data.get('password', '123456') # Default for dev
        role = data.get('role', 'karyawan')
        image = data.get('image', '')
        jabatan = data.get('jabatan', '-')
        departemen = data.get('departemen', '-')

        # Image is now optional during initial data registration
        encoding = None

        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            print(f"Registration failed: Email {email} already exists.")
            return jsonify({'message': 'Email already registered'}), 400

        if image and ',' in image:
            image_data = base64.b64decode(image.split(',')[1])
            np_image = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(np_image, cv2.IMREAD_COLOR)
            
            if img is not None:
                encoding = get_face_encodings(img)
                if encoding is None:
                    print("Registration: Image provided but no face detected.")
                    return jsonify({'message': 'No face detected in provided image'}), 400
            else:
                return jsonify({'message': 'Failed to decode image'}), 400

        print(f"Face encoding successful. Registering {role}: {username}")
        # Insert user with provided password and role
        sql_user = "INSERT INTO users (username, email, password_hash, nama_lengkap, role, status_aktif) VALUES (%s, %s, %s, %s, %s, %s)"
        cursor.execute(sql_user, (username, email, password, username, role, 1))
        user_id = cursor.lastrowid

        kode_kry = generate_employee_code()
        sql_karyawan = "INSERT INTO karyawans (user_id, kode_karyawan, nama, jabatan, departemen, status_kerja) VALUES (%s, %s, %s, %s, %s, %s)"
        cursor.execute(sql_karyawan, (user_id, kode_kry, username, jabatan, departemen, 'aktif'))
        karyawan_id = cursor.lastrowid

        if encoding is not None:
            face_encoding_str = json.dumps(encoding.tolist())
            sql_face = "INSERT INTO face_templates (karyawan_id, embedding_vector, tanggal_perekaman, status) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql_face, (karyawan_id, face_encoding_str, datetime.now(), 'aktif'))

        conn.commit()
        return jsonify({'message': 'Register success', 'user_id': user_id, 'employee_code': kode_kry, 'role': role})

    except Exception as e:
        if conn: conn.rollback()
        traceback.print_exc()
        return jsonify({'message': 'Error occurred', 'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/login_credential', methods=['POST'])
def login_credential():
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        cursor.execute("SELECT id, username, role, password_hash FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user and user['password_hash'] == password: # Simple matching for skripsi
            return jsonify({
                'message': 'Login Success',
                'user_id': user['id'],
                'username': user['username'],
                'role': user['role']
            })
        
        return jsonify({'message': 'Invalid email or password'}), 401
    except Exception as e:
        traceback.print_exc()
        return jsonify({'message': 'Error occurred', 'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/detect_live', methods=['POST'])
def detect_live():
    print(">>> [DEBUG] detect_live request received")
    # Dedicated endpoint for real-time processing
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'DB Error'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        data = request.get_json()
        image = data.get('image', '')
        if not image or ',' not in image:
            return jsonify({'message': 'Invalid Image'}), 400

        # Decode image
        image_data = base64.b64decode(image.split(',')[1])
        np_img = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({'message': 'Decode Error'}), 400

        # Convert to RGB for face_recognition
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Detect Face Locations (Using HOG for speed in live preview)
        face_locations = face_recognition.face_locations(rgb_img, model='hog')
        print(f"   [DEBUG] Face locations found: {len(face_locations)}")
        
        results = []
        recognized_user = None

        if len(face_locations) > 0:
            # We got faces! Let's encode them to see who they are
            encodings = face_recognition.face_encodings(rgb_img, face_locations)
            print("   [DEBUG] Encodings calculated")
            
            # Get templates from DB
            cursor.execute("""
                SELECT u.id as user_id, u.username, k.id as employee_id, f.embedding_vector 
                FROM face_templates f
                JOIN karyawans k ON f.karyawan_id = k.id
                JOIN users u ON k.user_id = u.id
                WHERE f.status = 'aktif'
            """)
            templates = cursor.fetchall()

            for (top, right, bottom, left), face_encoding in zip(face_locations, encodings):
                name = "Unknown"
                user_id = None
                confidence_val = None
                
                # Find BEST match (minimum distance)
                best_match_idx = -1
                min_dist = 1.0 # Default max distance
                
                for idx, t in enumerate(templates):
                    if t['embedding_vector']:
                        stored = np.array(json.loads(t['embedding_vector']))
                        face_distances = face_recognition.face_distance([stored], face_encoding)
                        if face_distances[0] < min_dist:
                            min_dist = face_distances[0]
                            best_match_idx = idx

                # Apply tolerance threshold (0.6)
                if best_match_idx != -1 and min_dist <= 0.9:
                    t = templates[best_match_idx]
                    confidence_val = round((1.0 - min_dist) * 100, 2)
                    name = t['username']
                    user_id = t['user_id']
                    recognized_user = {
                        "id": user_id, 
                        "employee_id": t['employee_id'], 
                        "username": name, 
                        "confidence": confidence_val
                    }
                
                results.append({
                    "box": [top, right, bottom, left],
                    "name": name,
                    "confidence": confidence_val
                })

        return jsonify({
            "faces": results,
            "recognized": recognized_user is not None,
            "user": recognized_user
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/submit_attendance', methods=['POST'])
def submit_attendance():
    # Final endpoint with AUTOMATIC status calculation based on Department Schedule
    data = request.get_json()
    emp_id = data.get('employee_id')
    confidence = data.get('confidence')
    jenis = data.get('jenis', 'masuk')
    
    if not emp_id or confidence is None:
        return jsonify({'message': 'Data tidak lengkap'}), 400
        
    if confidence < 85:
        return jsonify({'message': 'Akurasi terlalu rendah (Min 85%)'}), 401

    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        now = datetime.now()
        date_str = now.strftime('%Y-%m-%d')
        time_str = now.strftime('%H:%M:%S')
        
        # Mapping day names to Indonesian
        day_names = {
            'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu', 
            'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu', 'Sunday': 'Minggu'
        }
        hari_ini = day_names.get(now.strftime('%A'))

        # 0. Check for existing record of the same type today
        cursor.execute("SELECT id FROM absensis WHERE karyawan_id = %s AND tanggal = %s AND jenis = %s", (emp_id, date_str, jenis))
        if cursor.fetchone():
            return jsonify({'message': f'Anda sudah melakukan absensi {jenis} hari ini!'}), 400

        # 1. Look up Employee's Department
        cursor.execute("SELECT departemen FROM karyawans WHERE id = %s", (emp_id,))
        emp = cursor.fetchone()
        dept = emp['departemen'] if emp else None

        # 2. Look up Schedule for that Department and Day
        # Default state
        status_absen = 'tepat_waktu'
        menit_terlambat = 0
        
        if dept:
            cursor.execute("""
                SELECT jam_masuk, toleransi_keterlambatan 
                FROM jadwal_departemen 
                WHERE departemen = %s AND hari = %s
            """, (dept, hari_ini))
            schedule = cursor.fetchone()

            if schedule and jenis == 'masuk':
                # Calculate if late
                format_str = '%H:%M:%S'
                check_in_time = datetime.strptime(time_str, format_str)
                
                # sched_time is expected to be a timedelta from DB
                sched_timedelta = schedule['jam_masuk']
                # Create a datetime for the schedule on a dummy day
                base_time = datetime.strptime("00:00:00", format_str)
                limit_time = base_time + sched_timedelta + timedelta(minutes=schedule['toleransi_keterlambatan'])
                
                if check_in_time > limit_time:
                    status_absen = 'terlambat'
                    # Calculate minutes late
                    sched_time = base_time + sched_timedelta
                    diff = check_in_time - sched_time
                    menit_terlambat = int(diff.total_seconds() / 60)

        # 3. Insert Attendance
        sql = """
            INSERT INTO absensis (karyawan_id, tanggal, waktu, jenis, status, menit_terlambat, confidence_score, created_at, updated_at) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (
            emp_id, 
            date_str, 
            time_str, 
            jenis, 
            status_absen,
            menit_terlambat,
            confidence,
            now,
            now
        ))
        conn.commit()
        return jsonify({
            'message': 'Absensi berhasil disimpan!',
            'status': status_absen.replace('_', ' ').title()
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/login', methods=['POST'])
def login():
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        data = request.get_json()
        image = data.get('image', '')

        if not image or ',' not in image:
            return jsonify({'message': 'No image captured yet'}), 400

        image_data = base64.b64decode(image.split(',')[1])
        np_img = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'message': 'Failed to decode image'}), 400
            
        current_encoding = get_face_encodings(img)

        if current_encoding is not None:
            # Modified query to get department too
            query = """
                SELECT u.id as user_id, u.username, k.id as employee_id, k.departemen, f.embedding_vector 
                FROM face_templates f
                JOIN karyawans k ON f.karyawan_id = k.id
                JOIN users u ON k.user_id = u.id
                WHERE f.status = 'aktif'
            """
            cursor.execute(query)
            templates = cursor.fetchall()

            # Find BEST match (minimum distance)
            best_match_idx = -1
            min_dist = 0.9 # Using standard threshold
            
            for idx, t in enumerate(templates):
                if t['embedding_vector']:
                    stored_encoding = np.array(json.loads(t['embedding_vector']))
                    face_distances = face_recognition.face_distance([stored_encoding], current_encoding)
                    if face_distances[0] < min_dist:
                        min_dist = face_distances[0]
                        best_match_idx = idx

            if best_match_idx != -1:
                t = templates[best_match_idx]
                confidence = round((1.0 - min_dist) * 100, 2)

                # Record Attendance automatically on login
                now = datetime.now()
                date_str = now.strftime('%Y-%m-%d')
                time_str = now.strftime('%H:%M:%S')
                
                # Calculate Status & Lateness
                status_absen = 'tepat_waktu'
                menit_terlambat = 0
                
                # Mapping day names
                day_names = {
                    'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu', 
                    'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu', 'Sunday': 'Minggu'
                }
                hari_ini = day_names.get(now.strftime('%A'))
                
                if t['departemen']:
                    cursor.execute("""
                        SELECT jam_masuk, toleransi_keterlambatan 
                        FROM jadwal_departemen 
                        WHERE departemen = %s AND hari = %s
                    """, (t['departemen'], hari_ini))
                    schedule = cursor.fetchone()
                    
                    if schedule:
                        format_str = '%H:%M:%S'
                        check_in_time = datetime.strptime(time_str, format_str)
                        sched_timedelta = schedule['jam_masuk']
                        base_time = datetime.strptime("00:00:00", format_str)
                        limit_time = base_time + sched_timedelta + timedelta(minutes=schedule['toleransi_keterlambatan'])
                        
                        if check_in_time > limit_time:
                            status_absen = 'terlambat'
                            sched_time = base_time + sched_timedelta
                            diff = check_in_time - sched_time
                            menit_terlambat = int(diff.total_seconds() / 60)

                sql_attendance = """
                    INSERT INTO absensis (karyawan_id, tanggal, waktu, jenis, status, menit_terlambat, confidence_score, created_at, updated_at) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(sql_attendance, (
                    t['employee_id'], 
                    date_str, 
                    time_str, 
                    'masuk', 
                    status_absen,
                    menit_terlambat,
                    confidence,
                    now,
                    now
                ))
                conn.commit()

                return jsonify({
                    'message': 'Login Success & Attendance Recorded',
                    'username': t['username'],
                    'user_id': t['user_id'],
                    'confidence': confidence,
                    'status': status_absen.replace('_', ' ').title(),
                    'menit_terlambat': menit_terlambat
                })
            
            return jsonify({'message': 'User not recognized'}), 401
        else:
            return jsonify({'message': 'No face detected in webcam'}), 400

    except Exception as e:
        traceback.print_exc()
        return jsonify({'message': 'Error occurred', 'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/attendance_history', methods=['GET'])
def get_attendance_history():
    user_id = request.args.get('user_id')
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        # Join absensis with karyawans to get logs for specific user_id
        query = """
            SELECT a.tanggal, a.waktu, a.jenis, a.status, a.menit_terlambat, a.confidence_score, a.created_at
            FROM absensis a
            JOIN karyawans k ON a.karyawan_id = k.id
            WHERE k.user_id = %s
            ORDER BY a.tanggal DESC, a.waktu DESC
        """
        cursor.execute(query, (user_id,))
        history = cursor.fetchall()
        
        # Convert date objects to string for JSON serialization
        for item in history:
            if item['tanggal']:
                item['tanggal'] = item['tanggal'].strftime('%Y-%m-%d')
            if item['waktu']:
                # waktu is a timedelta object in mysql-connector
                item['waktu'] = str(item['waktu'])
            if item['created_at']:
                item['created_at'] = item['created_at'].strftime('%Y-%m-%d %H:%M:%S')
            if item['confidence_score'] is None:
                item['confidence_score'] = 0
        
        return jsonify({'history': history})
    except Exception as e:
        return jsonify({'message': 'Error occurred', 'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/admin/stats', methods=['GET'])
def get_admin_stats():
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Total Employees
        cursor.execute("SELECT COUNT(*) as total FROM karyawans")
        total_employees = cursor.fetchone()['total']
        
        # 2. Today's Summary
        today = datetime.now().strftime('%Y-%m-%d')
        
        cursor.execute("SELECT COUNT(DISTINCT karyawan_id) as total FROM absensis WHERE tanggal = %s", (today,))
        present_today = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as total FROM absensis WHERE tanggal = %s AND status = 'terlambat'", (today,))
        late_today = cursor.fetchone()['total']
        
        absent_today = max(0, total_employees - present_today)
        
        # 3. Recent History (top 5)
        cursor.execute("""
            SELECT k.nama, a.tanggal, a.waktu, a.jenis, a.status 
            FROM absensis a
            JOIN karyawans k ON a.karyawan_id = k.id
            ORDER BY a.tanggal DESC, a.waktu DESC
            LIMIT 5
        """)
        recent_logs = cursor.fetchall()
        for log in recent_logs:
            log['tanggal'] = log['tanggal'].strftime('%d/%m/%Y')
            log['waktu'] = str(log['waktu'])[:5] # HH:MM

        # 4. Weekly Stats (Last 7 Days)
        weekly_stats = []
        for i in range(6, -1, -1):
            target_date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            day_label = (datetime.now() - timedelta(days=i)).strftime('%d')
            cursor.execute("SELECT COUNT(DISTINCT karyawan_id) as total FROM absensis WHERE tanggal = %s", (target_date,))
            count = cursor.fetchone()['total']
            weekly_stats.append({'label': day_label, 'value': count})

        # 5. Notifications
        notifications = []
        # Missing Template
        cursor.execute("""
            SELECT nama FROM karyawans k 
            WHERE NOT EXISTS (SELECT 1 FROM face_templates ft WHERE ft.karyawan_id = k.id AND ft.status = 'aktif')
        """)
        unregistered = cursor.fetchall()
        if unregistered:
            notifications.append({
                'id': 'notif_reg',
                'text': f"{len(unregistered)} karyawan belum punya template wajah",
                'type': 'warning',
                'priority': False
            })

        return jsonify({
            'total_employees': total_employees,
            'present_today': present_today,
            'late_today': late_today,
            'absent_today': absent_today,
            'attendance_rate': round((present_today / total_employees * 100), 1) if total_employees > 0 else 0,
            'recent_history': recent_logs,
            'weekly_stats': weekly_stats,
            'notifications': notifications
        })
    except Exception as e:
        print(f"Stats Error: {e}")
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/all_history', methods=['GET'])
def get_all_history():
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT a.id, k.nama, a.tanggal, a.waktu, a.jenis, a.status, a.confidence_score, a.created_at
            FROM absensis a
            JOIN karyawans k ON a.karyawan_id = k.id
            ORDER BY a.tanggal DESC, a.waktu DESC
        """
        cursor.execute(query)
        history = cursor.fetchall()
        for item in history:
            item['tanggal'] = item['tanggal'].strftime('%Y-%m-%d')
            item['waktu'] = str(item['waktu'])
            if item['created_at']:
                item['created_at'] = item['created_at'].strftime('%Y-%m-%d %H:%M:%S')
            if item['confidence_score'] is None:
                item['confidence_score'] = 0
        return jsonify({'history': history})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/employees', methods=['GET'])
def get_employees():
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT u.id as user_id, u.username, u.email, u.role, k.id as karyawan_id, k.kode_karyawan, k.status_kerja, k.departemen, k.jabatan,
                   (SELECT COUNT(*) FROM face_templates ft WHERE ft.karyawan_id = k.id AND ft.status = 'aktif') as has_template
            FROM users u
            LEFT JOIN karyawans k ON u.id = k.user_id
        """)
        return jsonify({'employees': cursor.fetchall()})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/employees/<int:user_id>', methods=['DELETE'])
def delete_employee(user_id):
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor()
    try:
        # Relational delete should be handled by DB or explicit here
        # Assuming we just deactivate or delete user
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        return jsonify({'message': 'Employee deleted successfully'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/employees/<int:user_id>', methods=['PUT'])
def update_employee(user_id):
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        role = data.get('role')
        jabatan = data.get('jabatan', '-')
        departemen = data.get('departemen', '-')

        # Check for email duplication excluding this user
        cursor.execute("SELECT id FROM users WHERE email = %s AND id != %s", (email, user_id))
        if cursor.fetchone():
            return jsonify({'message': 'Email already in use by another user'}), 400

        # Update Users table
        sql_user = "UPDATE users SET username = %s, email = %s, role = %s, nama_lengkap = %s WHERE id = %s"
        cursor.execute(sql_user, (username, email, role, username, user_id))

        # Update Karyawans table
        sql_karyawan = "UPDATE karyawans SET nama = %s, jabatan = %s, departemen = %s WHERE user_id = %s"
        cursor.execute(sql_karyawan, (username, jabatan, departemen, user_id))

        conn.commit()
        return jsonify({'message': 'Employee updated successfully'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/reset_face', methods=['POST'])
def reset_face():
    data = request.get_json()
    karyawan_id = data.get('karyawan_id')
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE face_templates SET status = 'tidak_aktif' WHERE karyawan_id = %s", (karyawan_id,))
        conn.commit()
        return jsonify({'message': 'Face template reset. Employee needs to re-enroll.'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/register_face', methods=['POST'])
def register_face():
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        data = request.get_json()
        karyawan_id = data.get('karyawan_id')
        image = data.get('image', '')

        if not image or ',' not in image:
            return jsonify({'message': 'No facial image provided'}), 400

        # Decode and process image
        image_data = base64.b64decode(image.split(',')[1])
        np_image = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(np_image, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'message': 'Failed to decode image'}), 400

        # Optimization: Resize for faster encoding if image is too large
        h, w = img.shape[:2]
        if w > 800:
            scale = 800 / w
            img = cv2.resize(img, (0, 0), fx=scale, fy=scale)

        encoding = get_face_encodings(img)
        if encoding is None:
            return jsonify({'message': 'No face detected in capture'}), 400

        face_encoding_str = json.dumps(encoding.tolist())
        
        # Check if template already exists
        cursor.execute("SELECT id FROM face_templates WHERE karyawan_id = %s", (karyawan_id,))
        existing = cursor.fetchone()

        if existing:
            sql = "UPDATE face_templates SET embedding_vector = %s, tanggal_perekaman = %s, status = 'aktif' WHERE karyawan_id = %s"
            cursor.execute(sql, (face_encoding_str, datetime.now(), karyawan_id))
        else:
            sql = "INSERT INTO face_templates (karyawan_id, embedding_vector, tanggal_perekaman, status) VALUES (%s, %s, %s, 'aktif')"
            cursor.execute(sql, (karyawan_id, face_encoding_str, datetime.now()))

        conn.commit()
        return jsonify({'message': 'Template wajah berhasil disimpan'})

    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/schedules', methods=['GET'])
def get_schedules():
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT * FROM jadwal_departemen 
            ORDER BY departemen, FIELD(hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')
        """
        cursor.execute(query)
        schedules = cursor.fetchall()
        # Convert TIME objects to string
        for s in schedules:
            s['jam_masuk'] = str(s['jam_masuk'])
            s['jam_pulang'] = str(s['jam_pulang'])
            
        return jsonify({'schedules': schedules})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/schedules', methods=['POST'])
def add_schedule():
    data = request.get_json()
    departemen = data.get('departemen')
    hari_input = data.get('hari') # can be string "Senin" or list ["Senin", "Selasa", ...]
    jam_masuk = data.get('jam_masuk')
    jam_pulang = data.get('jam_pulang')
    toleransi_keterlambatan = data.get('toleransi_keterlambatan', 0)

    # Convert single string to list for uniform processing
    hari_list = [hari_input] if isinstance(hari_input, str) else hari_input

    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor()
    try:
        sql = """
            INSERT INTO jadwal_departemen (departemen, hari, jam_masuk, jam_pulang, toleransi_keterlambatan)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                jam_masuk = VALUES(jam_masuk),
                jam_pulang = VALUES(jam_pulang),
                toleransi_keterlambatan = VALUES(toleransi_keterlambatan)
        """
        for hr in hari_list:
            cursor.execute(sql, (departemen, hr, jam_masuk, jam_pulang, toleransi_keterlambatan))
        
        conn.commit()
        msg = f'Jadwal {departemen} berhasil disimpan' if len(hari_list) > 1 else f'Jadwal {departemen} hari {hari_list[0]} berhasil disimpan'
        return jsonify({'message': msg})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/schedules/<int:id>', methods=['DELETE'])
def delete_schedule(id):
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM jadwal_departemen WHERE id = %s", (id,))
        conn.commit()
        return jsonify({'message': 'Jadwal berhasil dihapus'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/reports/summary', methods=['GET'])
def get_report_summary():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not start_date or not end_date:
        return jsonify({'message': 'Start and end dates are required'}), 400

    workdays = get_workdays(start_date, end_date)
    
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get count of attendance per employee in range
        sql = """
            SELECT 
                k.id as karyawan_id, 
                k.nama,
                k.departemen,
                SUM(CASE WHEN a.status = 'tepat_waktu' THEN 1 ELSE 0 END) as tepat_waktu,
                SUM(CASE WHEN a.status = 'terlambat' THEN 1 ELSE 0 END) as terlambat,
                SUM(a.menit_terlambat) as total_menit_terlambat,
                COUNT(DISTINCT a.tanggal) as total_hadir
            FROM karyawans k
            LEFT JOIN absensis a ON k.id = a.karyawan_id 
                AND a.tanggal BETWEEN %s AND %s 
                AND a.jenis = 'masuk'
            GROUP BY k.id, k.nama, k.departemen
        """
        cursor.execute(sql, (start_date, end_date))
        data = cursor.fetchall()

        # Calculate Global Stats
        total_karyawan = len(data)
        total_hadir_global = 0
        total_terlambat_global = 0
        total_alfa_global = 0

        # Calculate Individual Stats and Global Totals
        for row in data:
            row['alfa'] = max(0, workdays - row['total_hadir'])
            row['hadir'] = row['tepat_waktu'] + row['terlambat']
            # Percentage: (Actual Presence / Workdays) * 100
            row['persentase'] = round((row['total_hadir'] / workdays * 100), 1) if workdays > 0 else 0
            
            # Sanitise total_menit_terlambat
            if not row['total_menit_terlambat']: row['total_menit_terlambat'] = 0
            
            total_hadir_global += row['total_hadir']
            total_terlambat_global += row['terlambat']
            total_alfa_global += row['alfa']

        avg_attendance_rate = round((total_hadir_global / (total_karyawan * workdays) * 100), 1) if (total_karyawan * workdays) > 0 else 0

        return jsonify({
            'period': f"{start_date} sd {end_date}",
            'workdays': workdays,
            'summary': data,
            'stats': {
                'total_karyawan': total_karyawan,
                'total_terlambat': total_terlambat_global,
                'total_alfa': total_alfa_global,
                'avg_attendance_rate': avg_attendance_rate
            }
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/greeting', methods=['GET'])
def greeting():
    user_id = request.args.get('user_id')
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Get user and their department schedule
        now = datetime.now()
        day_names = {
            'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu', 
            'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu', 'Sunday': 'Minggu'
        }
        hari_ini = day_names.get(now.strftime('%A'))

        query = """
            SELECT u.username, k.departemen, j.jam_masuk, j.jam_pulang
            FROM users u
            LEFT JOIN karyawans k ON u.id = k.user_id
            LEFT JOIN jadwal_departemen j ON k.departemen = j.departemen AND j.hari = %s
            WHERE u.id = %s
        """
        cursor.execute(query, (hari_ini, user_id))
        data = cursor.fetchone()

        if data:
            # Convert time objects to strings
            if data['jam_masuk']: data['jam_masuk'] = str(data['jam_masuk'])
            if data['jam_pulang']: data['jam_pulang'] = str(data['jam_pulang'])
            
            return jsonify({
                'username': data['username'],
                'schedule': {
                    'hari': hari_ini,
                    'jam_masuk': data['jam_masuk'],
                    'jam_pulang': data['jam_pulang']
                }
            })
        return jsonify({'message': 'User not found'}), 404
    except Exception as e:
        traceback.print_exc()
        return jsonify({'message': 'Error occurred', 'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
