import mysql.connector
import os
import base64
import uuid
import cv2
import numpy as np
import face_recognition
import json
from datetime import datetime
import time
import threading
from config import Config

db_config = {
    'host': Config.MYSQL_HOST,
    'user': Config.MYSQL_USER,
    'password': Config.MYSQL_PASSWORD,
    'database': Config.MYSQL_DB
}

UPLOAD_FOLDER = 'static/attendance_photos'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def cleanup_old_photos(days=90):
    try:
        now = time.time()
        count = 0
        for filename in os.listdir(UPLOAD_FOLDER):
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(filepath):
                if os.stat(filepath).st_mtime < now - (days * 86400):
                    os.remove(filepath)
                    count += 1
        if count > 0:
            print(f"[*] Cleanup: Dihapus {count} foto absensi usang (> {days} hari)")
    except Exception as e:
        print(f"[!] Cleanup Error: {e}")

# Run cleanup in background once when utils is loaded
threading.Thread(target=cleanup_old_photos, daemon=True).start()

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        return None

def save_attendance_photo(image_base64, employee_id):
    try:
        header, encoded = image_base64.split(",", 1)
        data = base64.b64decode(encoded)
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

# --- IN-MEMORY CACHE FOR FACE TEMPLATES ---
KNOWN_FACES_CACHE = []
CACHE_LOADED = False

def load_face_cache():
    global KNOWN_FACES_CACHE, CACHE_LOADED
    conn = get_db_connection()
    if not conn:
        print("[!] Gagal load cache: DB tidak connect")
        return
    cursor = conn.cursor(dictionary=True)
    try:
        print("[*] Memuat vektor wajah ke dalam Cache Memori (RAM)...")
        cursor.execute("""
            SELECT k.id as employee_id, k.nama, f.embedding_vector 
            FROM face_templates f
            JOIN karyawans k ON f.karyawan_id = k.id
            WHERE f.status = 'aktif'
        """)
        rows = cursor.fetchall()
        temp_cache = []
        for r in rows:
            try:
                vec = np.array(json.loads(r['embedding_vector']))
                temp_cache.append({
                    'employee_id': r['employee_id'],
                    'nama': r['nama'],
                    'embedding_vector': vec
                })
            except Exception as e:
                pass
        KNOWN_FACES_CACHE = temp_cache
        CACHE_LOADED = True
        print(f"[*] Sukses memuat {len(KNOWN_FACES_CACHE)} vektor wajah ke Cache.")
    except Exception as e:
        print(f"[!] Exception load_face_cache: {e}")
    finally:
        cursor.close()
        conn.close()

def get_all_templates():
    global CACHE_LOADED, KNOWN_FACES_CACHE
    if not CACHE_LOADED:
        load_face_cache()
    return KNOWN_FACES_CACHE
