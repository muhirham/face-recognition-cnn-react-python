from flask import Blueprint, request, jsonify
from utils import get_db_connection, get_all_templates, save_attendance_photo
import base64
import numpy as np
import cv2
import face_recognition
from datetime import datetime, timedelta
import traceback

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/detect_live', methods=['POST'])
def detect_live():
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        data = request.get_json()
        image = data.get('image', '')
        if not image or ',' not in image: return jsonify({'message': 'Invalid Image'}), 400

        image_data = base64.b64decode(image.split(',')[1])
        np_img = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        face_locations = face_recognition.face_locations(rgb_img, model='hog')
        results, recognized_user = [], None

        if len(face_locations) > 0:
            live_encodings = face_recognition.face_encodings(rgb_img, face_locations)
            all_templates = get_all_templates()

            cursor.execute("SELECT nilai FROM pengaturans WHERE kunci = 'min_confidence'")
            setting = cursor.fetchone()
            min_conf_percent = int(setting['nilai']) if setting else 85
            min_dist_threshold = (100 - min_conf_percent) / 100

            # Cari index wajah terbesar (paling dekat ke kamera)
            face_areas = [(bottom - top) * (right - left) for (top, right, bottom, left) in face_locations]
            largest_face_idx = face_areas.index(max(face_areas)) if face_areas else -1

            # Pre-extract all known encodings and their metadata for vectorization
            if all_templates:
                known_encodings = [t['embedding_vector'] for t in all_templates]
                known_names = [t['nama'] for t in all_templates]
                known_emp_ids = [t['employee_id'] for t in all_templates]
            else:
                known_encodings, known_names, known_emp_ids = [], [], []

            for idx, ((top, right, bottom, left), live_enc) in enumerate(zip(face_locations, live_encodings)):
                name, emp_id, min_dist = "Unknown", None, min_dist_threshold
                
                if known_encodings:
                    # Vectorized C++ calculation for massive performance boost
                    distances = face_recognition.face_distance(known_encodings, live_enc)
                    best_match_index = np.argmin(distances)
                    
                    if distances[best_match_index] < min_dist:
                        min_dist = distances[best_match_index]
                        name = known_names[best_match_index]
                        emp_id = known_emp_ids[best_match_index]

                confidence = round((1 - min_dist) * 100, 1) if name != "Unknown" else 0
                results.append({"box": [top, right, bottom, left], "name": name, "confidence": confidence})
                
                if name != "Unknown" and idx == largest_face_idx:
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

@attendance_bp.route('/submit_attendance', methods=['POST'])
def submit_attendance():
    data = request.get_json()
    emp_id = data.get('employee_id')
    confidence = data.get('confidence')
    jenis = data.get('jenis', 'masuk')
    image_base64 = data.get('image')
    reason = data.get('reason', None)

    if not emp_id or confidence is None or not image_base64:
        return jsonify({'message': 'Data tidak lengkap'}), 400

    client_ip = request.remote_addr
    if request.headers.get('X-Forwarded-For'):
        client_ip = request.headers.get('X-Forwarded-For').split(',')[0]

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Cek IP Jaringan (Wi-Fi Kantor)
        cursor.execute("SELECT nilai FROM pengaturans WHERE kunci = 'ip_kantor'")
        ip_setting = cursor.fetchone()
        
        if ip_setting and ip_setting['nilai'] and ip_setting['nilai'].strip() != "":
            allowed_ip = ip_setting['nilai'].strip()
            if client_ip != allowed_ip and client_ip != '127.0.0.1' and not client_ip.startswith('192.168'): 
                return jsonify({'message': f'Absensi Ditolak! Harus terhubung ke Wi-Fi Kantor. IP Anda: {client_ip}'}), 403

        print(f"[*] Menyimpen Absen: EmpID={emp_id}, Conf={confidence}, Jenis={jenis}")

        cursor.execute("SELECT nilai FROM pengaturans WHERE kunci = 'min_confidence'")
        setting = cursor.fetchone()
        min_conf_required = int(setting['nilai']) if setting else 85

        if confidence < min_conf_required:
            return jsonify({'message': f'Absensi Gagal! Kemiripan wajah Anda ({confidence}%) di bawah batas minimum {min_conf_required}%.'}), 400
            
        now = datetime.now()
        date_str, time_str = now.strftime('%Y-%m-%d'), now.strftime('%H:%M:%S')
        
        cursor.execute("SELECT id FROM absensis WHERE karyawan_id = %s AND tanggal = %s AND jenis = %s", (emp_id, date_str, jenis))
        if cursor.fetchone():
            return jsonify({'message': f'Sudah absen {jenis} hari ini!'}), 400

        cursor.execute("""
            SELECT k.id, s.id as shift_id, s.jam_masuk, s.jam_pulang, s.toleransi_menit 
            FROM karyawans k
            LEFT JOIN shift_kerjas s ON k.dept_id = s.dept_id
            WHERE k.id = %s LIMIT 1
        """, (emp_id,))
        info = cursor.fetchone()
        
        status_absen, menit_terlambat = 'tepat_waktu', 0
        
        if info and info.get('jam_masuk') is not None and info.get('toleransi_menit') is not None:
            base_time = datetime.strptime(time_str, '%H:%M:%S')
            if jenis == 'masuk':
                sched_td = info['jam_masuk']
                sched_time = datetime.strptime("00:00:00", '%H:%M:%S') + sched_td
                limit_time = sched_time + timedelta(minutes=info['toleransi_menit'])
                if base_time > limit_time:
                    status_absen = 'terlambat'
                    menit_terlambat = int((base_time - sched_time).total_seconds() / 60)
            elif jenis == 'pulang' and info.get('jam_pulang') is not None:
                sched_td = info['jam_pulang']
                sched_time = datetime.strptime("00:00:00", '%H:%M:%S') + sched_td
                if base_time < sched_time:
                    status_absen = 'pulang_awal'
                else:
                    overtime_gate = sched_time + timedelta(hours=1)
                    if base_time > overtime_gate:
                        status_absen = 'lembur'

        photo_name = save_attendance_photo(image_base64, emp_id)
        sql = """
            INSERT INTO absensis (karyawan_id, shift_id, tanggal, waktu, jenis, status, menit_terlambat, alasan, confidence_score, foto_absen) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (emp_id, info['shift_id'] if info else None, date_str, time_str, jenis, status_absen, menit_terlambat, reason, confidence, photo_name))
        conn.commit()
        
        return jsonify({'message': 'Absensi Berhasil!', 'status': status_absen.replace('_',' ').title()})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@attendance_bp.route('/attendance_history', methods=['GET'])
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
        formatted_history = []
        for row in raw_history:
            row['tanggal'] = row['tanggal'].strftime('%Y-%m-%d') if row['tanggal'] else None
            row['waktu'] = str(row['waktu']) if row['waktu'] else None
            formatted_history.append(row)

        return jsonify({'history': formatted_history})
    finally:
        cursor.close()
        conn.close()

@attendance_bp.route('/user/stats', methods=['GET'])
def get_user_stats():
    user_id = request.args.get('user_id')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM karyawans WHERE user_id = %s", (user_id,))
        karyawan = cursor.fetchone()
        if not karyawan: return jsonify({'message': 'Error'}), 404
        
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
