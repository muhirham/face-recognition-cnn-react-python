from flask import Blueprint, request, jsonify, send_from_directory
from utils import get_db_connection, get_face_encodings, load_face_cache
import os
import base64
import numpy as np
import cv2
import json
import traceback

face_bp = Blueprint('face', __name__)

@face_bp.route('/admin/register_face', methods=['POST'])
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
        
        cursor.execute("SELECT nama, kode_karyawan FROM karyawans WHERE id = %s", (employee_id,))
        emp = cursor.fetchone()
        if not emp: return jsonify({'message': 'Karyawan tidak ditemukan'}), 404
        
        emp_name = emp['nama'].lower()
        emp_code = emp['kode_karyawan']
        folder_name = f"{emp_name} ({emp_code})"

        cursor.execute("DELETE FROM face_templates WHERE karyawan_id = %s", (employee_id,))
        
        saved_count = 0
        for i, img_base64 in enumerate(images):
            try:
                header, encoded = img_base64.split(",", 1)
                image_bytes = base64.b64decode(encoded)

                np_img = np.frombuffer(image_bytes, np.uint8)
                img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
                encoding = get_face_encodings(img)
                
                if encoding is not None:
                    vector_json = json.dumps(encoding.tolist())
                    cursor.execute("""
                        INSERT INTO face_templates (karyawan_id, embedding_vector, status) 
                        VALUES (%s, %s, 'aktif')
                    """, (employee_id, vector_json))
                    saved_count += 1
            except Exception as e:
                print(f"Error processing image {i}: {e}")

        conn.commit()
        load_face_cache()
        return jsonify({
            'message': f'Berhasil! {saved_count} Vektor berhasil disimpan di Database',
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

@face_bp.route('/admin/reset_face', methods=['POST'])
def reset_face():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        data = request.get_json()
        emp_id = data.get('karyawan_id')
        cursor.execute("DELETE FROM face_templates WHERE karyawan_id = %s", (emp_id,))
        conn.commit()
        load_face_cache()
        return jsonify({'message': 'Data wajah berhasil dihapus'})
    finally:
        cursor.close()
        conn.close()

@face_bp.route('/admin/check_template/<int:employee_id>')
def check_template(employee_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM face_templates WHERE karyawan_id = %s LIMIT 1", (employee_id,))
        exists = cursor.fetchone() is not None
        return jsonify({'exists': exists})
    finally:
        cursor.close()
        conn.close()

@face_bp.route('/dataset/<path:filename>')
def serve_dataset(filename):
    return send_from_directory('dataset', filename)

@face_bp.route('/admin/get_dataset/<int:employee_id>')
def get_dataset(employee_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT nama, kode_karyawan FROM karyawans WHERE id = %s", (employee_id,))
        emp = cursor.fetchone()
        
        if not emp: return jsonify({'images': []})
        
        folder_name = f"{emp['nama'].lower()} ({emp['kode_karyawan']})"
        dataset_dir = os.path.join('dataset', folder_name)
        
        if not os.path.exists(dataset_dir):
            return jsonify({'images': []})
        
        images = [f for f in os.listdir(dataset_dir) if f.endswith('.jpg')]
        image_urls = [f"/dataset/{folder_name}/{img}" for img in sorted(images)]
        
        return jsonify({'images': image_urls})
    finally:
        cursor.close()
        conn.close()

@face_bp.route('/admin/delete_dataset/<int:employee_id>', methods=['DELETE'])
def delete_dataset(employee_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("DELETE FROM face_templates WHERE karyawan_id = %s", (employee_id,))
        conn.commit()
        load_face_cache()
        return jsonify({'message': 'Dataset dan template berhasil dihapus'})
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
