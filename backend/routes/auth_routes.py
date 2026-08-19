from flask import Blueprint, request, jsonify
from utils import get_db_connection, get_wib_time
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
        cursor.execute("""
            SELECT u.id, u.username, u.role, u.password_hash,
                   k.nama as nama_karyawan, k.jabatan as jabatan_karyawan, k.status_kerja
            FROM users u
            LEFT JOIN karyawans k ON u.id = k.user_id
            WHERE u.email = %s
        """, (email,))
        user = cursor.fetchone()
        
        if user:
            if user.get('status_kerja') == 'non-aktif':
                return jsonify({'message': 'Akun Anda telah dinonaktifkan. Silakan hubungi Administrator.'}), 403
                
            if user['password_hash'] == password:
                return jsonify({
                    'message': 'Login Success', 
                    'user_id': user['id'], 
                    'username': user['username'], 
                    'role': user['role'],
                    'nama_karyawan': user['nama_karyawan'] or user['username'],
                    'jabatan_karyawan': user['jabatan_karyawan'] or 'Administrator'
                })
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
        jabatan_str = data.get('jabatan', '')
        role = data.get('role', 'karyawan')
        status_kerja = data.get('status_kerja', 'aktif')
        
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
        
        kode_kry = 'EMP' + ''.join(random.choices(string.digits, k=5))
        cursor.execute("""
            INSERT INTO karyawans (user_id, dept_id, jabatan, kode_karyawan, nama, nomor_hp, status_kerja) 
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (user_id, dept_id, jabatan_str, kode_kry, username, data.get('nomor_hp', '-'), status_kerja))
        
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
                k.dept_id,
                d.nama_dept, 
                k.jabatan
            FROM karyawans k
            LEFT JOIN departemens d ON k.dept_id = d.id
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
            'nama_jabatan': karyawan['jabatan'] if karyawan else 'Super Admin',
            'min_confidence': min_conf
        }
        
        today_str = get_wib_time().strftime('%Y-%m-%d')
        cursor.execute("SELECT keterangan FROM hari_liburs WHERE tanggal = %s", (today_str,))
        holiday = cursor.fetchone()
        response_data['holiday'] = holiday['keterangan'] if holiday else None
        
        if karyawan and karyawan.get('dept_id'):
            cursor.execute("SELECT jam_masuk, jam_pulang, toleransi_menit FROM shift_kerjas WHERE dept_id = %s LIMIT 1", (karyawan['dept_id'],))
            shift = cursor.fetchone()
            if shift:
                response_data['schedule'] = {
                    'jam_masuk': str(shift['jam_masuk']),
                    'jam_pulang': str(shift['jam_pulang']),
                    'toleransi_menit': shift['toleransi_menit']
                }

        return jsonify(response_data)
    finally:
        cursor.close()
        conn.close()
