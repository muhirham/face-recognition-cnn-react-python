from flask import Blueprint, request, jsonify
from utils import get_db_connection
import random
import string
import traceback

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login_credential', methods=['POST'])
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

@auth_bp.route('/register', methods=['POST'])
def register():
    conn = get_db_connection()
    if not conn: return jsonify({'message': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        data = request.get_json()
        email = data.get('email')
        username = data.get('username')
        password = data.get('password', '123456')
        dept_id = data.get('dept_id') if data.get('dept_id') else None
        jab_id = data.get('jabatan_id') if data.get('jabatan_id') else None
        role = data.get('role', 'karyawan')
        
        if not email or not username:
            return jsonify({'message': 'Nama dan Email wajib diisi!'}), 400

        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone(): 
            return jsonify({'message': 'Email sudah terdaftar!'}), 400

        cursor.execute("""
            INSERT INTO users (username, email, password_hash, nama_lengkap, role) 
            VALUES (%s, %s, %s, %s, %s)
        """, (username, email, password, username, role))
        user_id = cursor.lastrowid
        
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

@auth_bp.route('/greeting', methods=['GET'])
def get_greeting():
    user_id = request.args.get('user_id')
    if not user_id: return jsonify({'message': 'User ID required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT username, role FROM users WHERE id = %s", (user_id,))
        base_user = cursor.fetchone()
        if not base_user: return jsonify({'message': 'User tidak ditemukan'}), 404

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
        
        cursor.execute("SELECT nilai FROM pengaturans WHERE kunci = 'min_confidence'")
        setting = cursor.fetchone()
        min_conf = int(setting['nilai']) if setting else 85
        
        response_data = {
            'username': karyawan['nama'] if karyawan else base_user['username'],
            'nama': karyawan['nama'] if karyawan else base_user['username'],
            'role': base_user['role'],
            'nama_dept': karyawan['nama_dept'] if karyawan else 'Administrator',
            'nama_jabatan': karyawan['nama_jabatan'] if karyawan else 'Super Admin',
            'min_confidence': min_conf
        }
        
        from datetime import datetime
        today_str = datetime.now().strftime('%Y-%m-%d')
        cursor.execute("SELECT keterangan FROM hari_liburs WHERE tanggal = %s", (today_str,))
        holiday = cursor.fetchone()
        response_data['holiday'] = holiday['keterangan'] if holiday else None
        
        return jsonify(response_data)
    finally:
        cursor.close()
        conn.close()
