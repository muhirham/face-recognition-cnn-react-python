from flask import Blueprint, request, jsonify
from utils import get_db_connection
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/admin/attendance_logs', methods=['GET'])
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
        formatted_logs = []
        for row in raw_logs:
            row['tanggal'] = row['tanggal'].strftime('%Y-%m-%d') if row['tanggal'] else None
            row['waktu'] = str(row['waktu']) if row['waktu'] else None
            formatted_logs.append(row)
        return jsonify({'history': formatted_logs})
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/admin/stats', methods=['GET'])
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

@admin_bp.route('/admin/employees', methods=['GET'])
def get_employees():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                k.id, 
                k.user_id,
                k.nama, 
                u.username, 
                u.email, 
                u.role, 
                k.kode_karyawan, 
                k.dept_id,
                k.jabatan_id,
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

@admin_bp.route('/admin/employees/<int:user_id>', methods=['PUT', 'DELETE'])
def manage_employee(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'DELETE':
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()
            from utils import load_face_cache
            load_face_cache()
            return jsonify({'message': 'Karyawan berhasil dihapus'})
            
        elif request.method == 'PUT':
            data = request.get_json()
            if 'password' in data and data['password'].strip():
                cursor.execute("""
                    UPDATE users SET username = %s, email = %s, role = %s, password_hash = %s WHERE id = %s
                """, (data['username'], data['email'], data['role'], data['password'], user_id))
            else:
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

@admin_bp.route('/admin/schedule', methods=['GET', 'POST'])
def manage_schedule():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.method == 'POST':
            data = request.get_json()
            dept_id = data.get('dept_id')
            if not dept_id: return jsonify({'message': 'Pilih Departemen!'}), 400
                
            cursor.execute("SELECT id FROM shift_kerjas WHERE dept_id = %s", (dept_id,))
            if cursor.fetchone():
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

@admin_bp.route('/admin/schedule/<int:id>', methods=['DELETE'])
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

@admin_bp.route('/admin/holidays', methods=['GET', 'POST'])
def manage_holidays():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.method == 'POST':
            data = request.get_json()
            cursor.execute("INSERT INTO hari_liburs (tanggal, keterangan) VALUES (%s, %s)", (data['tanggal'], data['keterangan']))
            conn.commit()
            return jsonify({'message': 'Hari libur berhasil ditambah'})
        cursor.execute("SELECT * FROM hari_liburs ORDER BY tanggal ASC")
        return jsonify({'holidays': cursor.fetchall()})
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/admin/holidays/<int:id>', methods=['DELETE'])
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

@admin_bp.route('/admin/report', methods=['GET'])
def get_report():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
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

@admin_bp.route('/admin/master_data', methods=['GET'])
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

@admin_bp.route('/admin/departemens', methods=['GET', 'POST'])
def manage_departemens():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.method == 'POST':
            data = request.get_json()
            cursor.execute("INSERT INTO departemens (nama_dept) VALUES (%s)", (data['nama_dept'],))
            conn.commit()
            return jsonify({'message': 'Departemen berhasil ditambah'})
        
        cursor.execute("SELECT id, nama_dept FROM departemens")
        return jsonify({'departemens': cursor.fetchall()})
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/admin/departemens/<int:id>', methods=['PUT', 'DELETE'])
def manage_dept_item(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'DELETE':
            cursor.execute("DELETE FROM departemens WHERE id = %s", (id,))
            conn.commit()
            return jsonify({'message': 'Departemen berhasil dihapus'})
        
        elif request.method == 'PUT':
            data = request.get_json()
            cursor.execute("UPDATE departemens SET nama_dept = %s WHERE id = %s", (data['nama_dept'], id))
            conn.commit()
            return jsonify({'message': 'Departemen berhasil diperbarui'})
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/admin/jabatans', methods=['GET', 'POST'])
def manage_jabatans():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.method == 'POST':
            data = request.get_json()
            cursor.execute("INSERT INTO jabatans (nama_jabatan) VALUES (%s)", (data['nama_jabatan'],))
            conn.commit()
            return jsonify({'message': 'Jabatan berhasil ditambah'})
            
        cursor.execute("SELECT id, nama_jabatan FROM jabatans")
        return jsonify({'jabatans': cursor.fetchall()})
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/admin/jabatans/<int:id>', methods=['PUT', 'DELETE'])
def manage_jabatan_item(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'DELETE':
            cursor.execute("DELETE FROM jabatans WHERE id = %s", (id,))
            conn.commit()
            return jsonify({'message': 'Jabatan berhasil dihapus'})
            
        elif request.method == 'PUT':
            data = request.get_json()
            cursor.execute("UPDATE jabatans SET nama_jabatan = %s WHERE id = %s", (data['nama_jabatan'], id))
            conn.commit()
            return jsonify({'message': 'Jabatan berhasil diperbarui'})
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/admin/users', methods=['GET', 'POST'])
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

@admin_bp.route('/admin/users/<int:id>', methods=['DELETE'])
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

@admin_bp.route('/admin/settings', methods=['GET', 'POST'])
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
