from flask import Blueprint, request, jsonify
from utils import get_db_connection
from datetime import datetime, timedelta
import calendar

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/admin/reports/daily', methods=['GET'])
def report_daily():
    date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                k.kode_karyawan, k.nama, d.nama_dept,
                a.waktu, a.jenis, a.status, a.menit_terlambat, a.alasan
            FROM absensis a
            JOIN karyawans k ON a.karyawan_id = k.id
            LEFT JOIN departemens d ON k.dept_id = d.id
            WHERE a.tanggal = %s
            ORDER BY a.waktu ASC
        """, (date_str,))
        
        raw_logs = cursor.fetchall()
        for row in raw_logs:
            row['waktu'] = str(row['waktu']) if row['waktu'] else None
            
        return jsonify({'date': date_str, 'data': raw_logs})
    finally:
        cursor.close()
        conn.close()

@reports_bp.route('/admin/reports/monthly', methods=['GET'])
def report_monthly():
    now = datetime.now()
    month = int(request.args.get('month', now.month))
    year = int(request.args.get('year', now.year))
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Calculate effective working days
        num_days = calendar.monthrange(year, month)[1]
        working_days = 0
        for day in range(1, num_days + 1):
            date_obj = datetime(year, month, day)
            if date_obj.weekday() < 5: # Monday = 0 ... Friday = 4 (Saturday=5, Sunday=6)
                working_days += 1
                
        # Get holidays in this month
        cursor.execute("""
            SELECT COUNT(*) as hol_count 
            FROM hari_liburs 
            WHERE YEAR(tanggal) = %s AND MONTH(tanggal) = %s 
              AND DAYOFWEEK(tanggal) NOT IN (1, 7) -- MySQL: 1=Sunday, 7=Saturday
        """, (year, month))
        holiday_count = cursor.fetchone()['hol_count']
        
        effective_days = max(0, working_days - holiday_count)
        
        # Get Attendance Aggregation
        cursor.execute("""
            SELECT 
                k.id, k.kode_karyawan, k.nama, d.nama_dept,
                COUNT(DISTINCT a.tanggal) as hadir,
                SUM(CASE WHEN a.status = 'terlambat' THEN 1 ELSE 0 END) as total_terlambat,
                SUM(a.menit_terlambat) as akumulasi_menit_telat
            FROM karyawans k
            LEFT JOIN departemens d ON k.dept_id = d.id
            LEFT JOIN absensis a ON a.karyawan_id = k.id AND YEAR(a.tanggal) = %s AND MONTH(a.tanggal) = %s
            GROUP BY k.id
        """, (year, month))
        
        data = cursor.fetchall()
        for row in data:
            # Cast decimal/type issues
            row['hadir'] = int(row['hadir'] or 0)
            row['total_terlambat'] = int(row['total_terlambat'] or 0)
            row['akumulasi_menit_telat'] = int(row['akumulasi_menit_telat'] or 0)
            row['alfa'] = max(0, effective_days - row['hadir'])

        return jsonify({
            'month': month, 'year': year, 
            'effective_days': effective_days, 
            'data': data
        })
    finally:
        cursor.close()
        conn.close()

@reports_bp.route('/admin/reports/late', methods=['GET'])
def report_late():
    month = request.args.get('month')
    year = request.args.get('year')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Default query gets all-time if month/year not provided, else filters
        sql = """
            SELECT 
                k.kode_karyawan, k.nama, d.nama_dept,
                COUNT(a.id) as frekuensi_telat,
                SUM(a.menit_terlambat) as total_menit
            FROM absensis a
            JOIN karyawans k ON a.karyawan_id = k.id
            LEFT JOIN departemens d ON k.dept_id = d.id
            WHERE a.status = 'terlambat'
        """
        params = []
        if month and year:
            sql += " AND YEAR(a.tanggal) = %s AND MONTH(a.tanggal) = %s "
            params.extend([year, month])
            
        sql += " GROUP BY k.id ORDER BY total_menit DESC"
        
        cursor.execute(sql, tuple(params))
        data = cursor.fetchall()
        for row in data:
            row['frekuensi_telat'] = int(row['frekuensi_telat'] or 0)
            row['total_menit'] = int(row['total_menit'] or 0)
            
        return jsonify({'data': data})
    finally:
        cursor.close()
        conn.close()

@reports_bp.route('/admin/reports/employees', methods=['GET'])
def report_employees():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                k.kode_karyawan, k.nama, d.nama_dept, j.nama_jabatan, k.status_kerja
            FROM karyawans k
            LEFT JOIN departemens d ON k.dept_id = d.id
            LEFT JOIN jabatans j ON k.jabatan_id = j.id
            ORDER BY d.nama_dept ASC, k.nama ASC
        """)
        return jsonify({'data': cursor.fetchall()})
    finally:
        cursor.close()
        conn.close()

@reports_bp.route('/admin/reports/early', methods=['GET'])
def report_early():
    month = request.args.get('month')
    year = request.args.get('year')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = """
            SELECT 
                k.kode_karyawan, k.nama,
                a.tanggal, a.waktu, a.alasan
            FROM absensis a
            JOIN karyawans k ON a.karyawan_id = k.id
            WHERE a.status = 'pulang_awal'
        """
        params = []
        if month and year:
            sql += " AND YEAR(a.tanggal) = %s AND MONTH(a.tanggal) = %s "
            params.extend([year, month])
            
        sql += " ORDER BY a.tanggal DESC, a.waktu DESC"
        
        cursor.execute(sql, tuple(params))
        data = cursor.fetchall()
        for row in data:
            row['tanggal'] = row['tanggal'].strftime('%Y-%m-%d')
            row['waktu'] = str(row['waktu'])
            
        return jsonify({'data': data})
    finally:
        cursor.close()
        conn.close()
