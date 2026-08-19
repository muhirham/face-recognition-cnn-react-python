from flask import Blueprint, request, jsonify
from utils import get_db_connection, get_all_templates, save_attendance_photo, get_wib_time
import base64
import numpy as np
import cv2
import face_recognition
from datetime import datetime, timedelta
import traceback
from werkzeug.utils import secure_filename
import ipaddress
from scipy.spatial import distance as dist

def calculate_ear(eye):
    # compute the euclidean distances between the two sets of vertical eye landmarks
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])
    # compute the euclidean distance between the horizontal eye landmark
    C = dist.euclidean(eye[0], eye[3])
    # compute the eye aspect ratio
    ear = (A + B) / (2.0 * C)
    return ear

def is_ip_allowed(client_ip, allowed_ips_str):
    if not allowed_ips_str or allowed_ips_str.strip() == "":
        return True
    
    allowed_list = [ip.strip() for ip in allowed_ips_str.split(',') if ip.strip()]
    if not allowed_list: return True
    
    try:
        client_obj = ipaddress.ip_address(client_ip)
    except ValueError:
        return False # Invalid client IP format
        
    for allowed in allowed_list:
        try:
            if '/' in allowed:
                # It's a subnet like 10.10.0.0/20
                net = ipaddress.ip_network(allowed, strict=False)
                if client_obj in net:
                    return True
            else:
                # Exact IP match
                if client_ip == allowed:
                    return True
        except Exception:
            continue
    return False

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/check_network', methods=['GET'])
def check_network():
    client_ip = request.remote_addr
    if request.headers.get('X-Forwarded-For'):
        client_ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()

    conn = get_db_connection()
    if not conn: return jsonify({'allowed': False, 'message': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT nilai FROM pengaturans WHERE kunci = 'allowed_ips'")
        ip_setting = cursor.fetchone()
        
        if not ip_setting or not ip_setting['nilai'] or ip_setting['nilai'].strip() == "":
            return jsonify({'allowed': True, 'message': 'Belum ada batasan jaringan', 'ip': client_ip})
            
        if is_ip_allowed(client_ip, ip_setting['nilai']):
            return jsonify({'allowed': True, 'message': 'Jaringan valid', 'ip': client_ip})
        else:
            return jsonify({'allowed': False, 'message': f'Anda tidak terhubung dengan jaringan internal. IP: {client_ip}', 'ip': client_ip})
    except Exception as e:
        return jsonify({'allowed': False, 'message': f"Error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

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
        
        # Frontend already downscaled the image to 320x240 to save bandwidth.
        # DO NOT downscale it again, otherwise the face becomes too tiny for HOG to detect!
        raw_locations = face_recognition.face_locations(rgb_img, model='hog')
        
        # Scale locations back up to match the frontend canvas which expects 640x480 coordinates
        # Since the image we processed is 320x240, we multiply coordinates by 2.
        face_locations = [(top*2, right*2, bottom*2, left*2) for (top, right, bottom, left) in raw_locations]
        
        results, recognized_user = [], None
        
        user_id = data.get('user_id')

        if len(face_locations) > 0:
            # Find largest face (closest to camera)
            face_areas = [(bottom - top) * (right - left) for (top, right, bottom, left) in face_locations]
            largest_face_idx = face_areas.index(max(face_areas)) if face_areas else -1

            # CPU OPTIMIZATION 2: Only compute encodings & landmarks for the LARGEST face.
            # This prevents 100-300ms lag spikes per false-positive face in the background.
            # CRITICAL FIX: We MUST pass raw_locations (which matches the 320x240 rgb_img size), 
            # NOT face_locations (which was scaled up to 640x480)!
            largest_loc_raw = [raw_locations[largest_face_idx]]
            live_encodings = face_recognition.face_encodings(rgb_img, largest_loc_raw)
            face_landmarks_list = face_recognition.face_landmarks(rgb_img, largest_loc_raw)
            
            live_enc_main = live_encodings[0] if live_encodings else None
            landmarks_main = face_landmarks_list[0] if face_landmarks_list else {}

            all_templates = get_all_templates()
            
            # CPU OPTIMIZATION 3: 1:1 Verification instead of 1:N Search!
            # If we know who is logged in, only compare against THEIR template.
            if user_id:
                cursor.execute("SELECT id FROM karyawans WHERE user_id = %s", (user_id,))
                k_data = cursor.fetchone()
                if k_data:
                    all_templates = [t for t in all_templates if t['employee_id'] == k_data['id']]

            cursor.execute("SELECT nilai FROM pengaturans WHERE kunci = 'min_confidence'")
            setting = cursor.fetchone()
            min_conf_percent = int(setting['nilai']) if setting else 85
            min_dist_threshold = ((100.0 - min_conf_percent) / 250.0) ** (1.0 / 3.0)

            if all_templates:
                known_encodings = [t['embedding_vector'] for t in all_templates]
                known_names = [t['nama'] for t in all_templates]
                known_emp_ids = [t['employee_id'] for t in all_templates]
            else:
                known_encodings, known_names, known_emp_ids = [], [], []

            for idx, (top, right, bottom, left) in enumerate(face_locations):
                name, emp_id, best_dist = "Unknown", None, 1.0
                ear_value = 0.0

                if idx == largest_face_idx and live_enc_main is not None:
                    # Calculate EAR for micro-motion liveness
                    if 'left_eye' in landmarks_main and 'right_eye' in landmarks_main:
                        left_ear = calculate_ear(landmarks_main['left_eye'])
                        right_ear = calculate_ear(landmarks_main['right_eye'])
                        ear_value = round(float((left_ear + right_ear) / 2.0), 4)
                
                    if known_encodings:
                        distances = face_recognition.face_distance(known_encodings, live_enc_main)
                        best_match_index = np.argmin(distances)
                        best_dist = float(distances[best_match_index])
                        
                        hard_max_distance = 0.45
                        effective_threshold = min(min_dist_threshold, hard_max_distance)
                        
                        if best_dist <= effective_threshold:
                            name = known_names[best_match_index]
                            emp_id = known_emp_ids[best_match_index]

                # Konversi dari Euclidean Distance kembali ke Persentase untuk UI (max 100)
                if name != "Unknown":
                    confidence = round(max(0, min(100, 100 - (best_dist ** 3) * 250)), 1)
                else:
                    confidence = 0
                results.append({
                    "box": [int(top), int(right), int(bottom), int(left)], 
                    "name": name, 
                    "confidence": confidence,
                    "ear_value": ear_value
                })
                
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
        import traceback
        traceback.print_exc()
        print(f"Error in detect_live: {e}", flush=True)
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
        cursor.execute("SELECT nilai FROM pengaturans WHERE kunci = 'allowed_ips'")
        ip_setting = cursor.fetchone()
        
        if ip_setting and ip_setting['nilai'] and ip_setting['nilai'].strip() != "":
            if not is_ip_allowed(client_ip, ip_setting['nilai']):
                return jsonify({'message': f'Anda tidak terhubung dengan jaringan internal. IP Anda: {client_ip}'}), 403

        print(f"[*] Menyimpen Absen: EmpID={emp_id}, Conf={confidence}, Jenis={jenis}")

        cursor.execute("SELECT nilai FROM pengaturans WHERE kunci = 'min_confidence'")
        setting = cursor.fetchone()
        min_conf_required = int(setting['nilai']) if setting else 85

        if confidence < min_conf_required:
            return jsonify({'message': f'Absensi Gagal! Kemiripan wajah Anda ({confidence}%) di bawah batas minimum {min_conf_required}%.'}), 400
            
        now = get_wib_time()
        date_str, time_str = now.strftime('%Y-%m-%d'), now.strftime('%H:%M:%S')
        
        cursor.execute("SELECT id FROM absensis WHERE karyawan_id = %s AND tanggal = %s AND jenis = %s", (emp_id, date_str, jenis))
        if cursor.fetchone():
            return jsonify({'message': f'Sudah absen {jenis} hari ini!'}), 400

        cursor.execute("""
            SELECT k.id, k.status_kerja, 
                   COALESCE(s.id, s_default.id) as shift_id, 
                   COALESCE(s.jam_masuk, s_default.jam_masuk) as jam_masuk, 
                   COALESCE(s.jam_pulang, s_default.jam_pulang) as jam_pulang, 
                   COALESCE(s.toleransi_menit, s_default.toleransi_menit) as toleransi_menit 
            FROM karyawans k
            LEFT JOIN shift_kerjas s ON k.dept_id = s.dept_id
            LEFT JOIN (SELECT * FROM shift_kerjas WHERE dept_id IS NULL LIMIT 1) s_default ON 1=1
            WHERE k.id = %s LIMIT 1
        """, (emp_id,))
        karyawan = cursor.fetchone()

        if not karyawan:
            return jsonify({'message': 'Data karyawan tidak ditemukan!'}), 404
            
        if karyawan.get('status_kerja') == 'non-aktif':
            return jsonify({'message': 'Absensi ditolak! Status Anda saat ini Non-Aktif.'}), 403
        
        info = karyawan
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
    month_filter = request.args.get('month')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM karyawans WHERE user_id = %s", (user_id,))
        karyawan = cursor.fetchone()
        if not karyawan: return jsonify({'message': 'Error'}), 404
        
        query = """
            SELECT tanggal, waktu, jenis, status, menit_terlambat, alasan, confidence_score, foto_absen 
            FROM absensis 
            WHERE karyawan_id = %s 
        """
        params = [karyawan['id']]
        if month_filter:
            try:
                import calendar
                y, m = map(int, month_filter.split('-'))
                last_day = calendar.monthrange(y, m)[1]
                query += " AND tanggal BETWEEN %s AND %s"
                params.extend([f"{y}-{m:02d}-01", f"{y}-{m:02d}-{last_day}"])
            except:
                pass
            
        query += " ORDER BY tanggal DESC, waktu DESC"
        
        cursor.execute(query, tuple(params))
        
        raw_history = cursor.fetchall()
        
        # Pivot data per hari
        grouped_history = {}
        for row in raw_history:
            tgl = row['tanggal'].strftime('%Y-%m-%d') if row['tanggal'] else None
            if not tgl: continue
            
            if tgl not in grouped_history:
                grouped_history[tgl] = {
                    'tanggal': tgl,
                    'masuk': None,
                    'pulang': None
                }
            
            record_data = {
                'waktu': str(row['waktu']) if row['waktu'] else None,
                'status': 'tepat_waktu' if row['status'] == 'lembur' else row['status'],
                'menit_terlambat': row['menit_terlambat'],
                'alasan': row['alasan'],
                'confidence_score': row['confidence_score'],
                'foto_absen': row['foto_absen']
            }
            
            if row['jenis'] == 'masuk':
                grouped_history[tgl]['masuk'] = record_data
            elif row['jenis'] == 'pulang':
                grouped_history[tgl]['pulang'] = record_data
                
        # Urutkan berdasarkan tanggal terbaru
        formatted_history = list(grouped_history.values())
        formatted_history.sort(key=lambda x: x['tanggal'], reverse=True)

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
