from flask import Blueprint, request, jsonify
from utils import get_db_connection, get_wib_time
from datetime import datetime, timedelta
import calendar

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/admin/reports/daily', methods=['GET'])
def report_daily():
    date_str = request.args.get('date', get_wib_time().strftime('%Y-%m-%d'))
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                k.kode_karyawan, k.nama, d.nama_dept,
                a.waktu, a.jenis, a.status, a.menit_terlambat, a.alasan, a.foto_absen,
                COALESCE(s.jam_masuk, s2.jam_masuk, s_default.jam_masuk) as jam_masuk, 
                COALESCE(s.jam_pulang, s2.jam_pulang, s_default.jam_pulang) as jam_pulang
            FROM absensis a
            JOIN karyawans k ON a.karyawan_id = k.id
            LEFT JOIN departemens d ON k.dept_id = d.id
            LEFT JOIN shift_kerjas s ON a.shift_id = s.id
            LEFT JOIN shift_kerjas s2 ON k.dept_id = s2.dept_id
            LEFT JOIN (SELECT * FROM shift_kerjas WHERE dept_id IS NULL LIMIT 1) s_default ON 1=1
            WHERE a.tanggal = %s
            ORDER BY a.waktu ASC
        """, (date_str,))
        
        raw_logs = cursor.fetchall()
        for row in raw_logs:
            row['waktu'] = str(row['waktu']) if row['waktu'] else None
            row['jam_masuk'] = str(row['jam_masuk']) if row.get('jam_masuk') else None
            row['jam_pulang'] = str(row['jam_pulang']) if row.get('jam_pulang') else None
            if row['status'] == 'lembur':
                row['status'] = 'tepat_waktu'
            
        return jsonify({'date': date_str, 'data': raw_logs})
    finally:
        cursor.close()
        conn.close()

@reports_bp.route('/admin/reports/monthly', methods=['GET'])
def report_monthly():
    now = get_wib_time()
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
                
        # Get holidays in this month from the 'holidays' table (Master Data Holiday)
        cursor.execute("""
            SELECT DAY(tanggal) as hol_day 
            FROM holidays 
            WHERE YEAR(tanggal) = %s AND MONTH(tanggal) = %s 
        """, (year, month))
        holiday_days = [row['hol_day'] for row in cursor.fetchall()]
        
        # Calculate effective days by excluding holidays that fall on weekdays
        cursor.execute("""
            SELECT COUNT(*) as hol_count 
            FROM holidays 
            WHERE YEAR(tanggal) = %s AND MONTH(tanggal) = %s 
              AND DAYOFWEEK(tanggal) NOT IN (1, 7)
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
        
        # Get daily records for matrix view
        cursor.execute("""
            SELECT karyawan_id, DAY(tanggal) as day_of_month, status 
            FROM absensis 
            WHERE YEAR(tanggal) = %s AND MONTH(tanggal) = %s AND jenis = 'masuk'
        """, (year, month))
        daily_records = cursor.fetchall()
        
        attendance_map = {}
        for rec in daily_records:
            emp_id = rec['karyawan_id']
            day = rec['day_of_month']
            status = rec['status']
            if emp_id not in attendance_map:
                attendance_map[emp_id] = {}
            attendance_map[emp_id][day] = status

        for row in data:
            emp_id = row['id']
            row['hadir'] = int(row['hadir'] or 0)
            row['total_terlambat'] = int(row['total_terlambat'] or 0)
            row['akumulasi_menit_telat'] = int(row['akumulasi_menit_telat'] or 0)
            row['alfa'] = max(0, effective_days - row['hadir'])
            row['daily_status'] = attendance_map.get(emp_id, {})

        return jsonify({
            'month': month, 'year': year, 
            'effective_days': effective_days, 
            'num_days': num_days,
            'holidays': holiday_days,
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
                a.tanggal, a.waktu as absen_masuk, a.menit_terlambat as durasi_terlambat, a.alasan,
                COALESCE(s.jam_masuk, s2.jam_masuk, s_default.jam_masuk) as jadwal_masuk
            FROM absensis a
            JOIN karyawans k ON a.karyawan_id = k.id
            LEFT JOIN departemens d ON k.dept_id = d.id
            LEFT JOIN shift_kerjas s ON a.shift_id = s.id
            LEFT JOIN shift_kerjas s2 ON k.dept_id = s2.dept_id
            LEFT JOIN (SELECT * FROM shift_kerjas WHERE dept_id IS NULL LIMIT 1) s_default ON 1=1
            WHERE a.status = 'terlambat' AND a.jenis = 'masuk'
        """
        params = []
        if month and year:
            sql += " AND YEAR(a.tanggal) = %s AND MONTH(a.tanggal) = %s "
            params.extend([year, month])
            
        sql += " ORDER BY a.tanggal DESC, a.waktu DESC"
        
        cursor.execute(sql, tuple(params))
        data = cursor.fetchall()
        for row in data:
            row['tanggal'] = row['tanggal'].strftime('%Y-%m-%d') if row['tanggal'] else None
            row['absen_masuk'] = str(row['absen_masuk']) if row['absen_masuk'] else None
            row['jadwal_masuk'] = str(row['jadwal_masuk']) if row['jadwal_masuk'] else None
            row['durasi_terlambat'] = int(row['durasi_terlambat'] or 0)
            
        return jsonify({'month': month, 'year': year, 'data': data})
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
                k.kode_karyawan, k.nama, d.nama_dept, k.jabatan as nama_jabatan, k.status_kerja
            FROM karyawans k
            LEFT JOIN departemens d ON k.dept_id = d.id
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
                k.kode_karyawan, k.nama, d.nama_dept,
                a.tanggal, a.waktu as absen_pulang, a.alasan,
                COALESCE(s.jam_pulang, s2.jam_pulang, s_default.jam_pulang) as jadwal_pulang
            FROM absensis a
            JOIN karyawans k ON a.karyawan_id = k.id
            LEFT JOIN departemens d ON k.dept_id = d.id
            LEFT JOIN shift_kerjas s ON a.shift_id = s.id
            LEFT JOIN shift_kerjas s2 ON k.dept_id = s2.dept_id
            LEFT JOIN (SELECT * FROM shift_kerjas WHERE dept_id IS NULL LIMIT 1) s_default ON 1=1
            WHERE a.status = 'pulang_awal' AND a.jenis = 'pulang'
        """
        params = []
        if month and year:
            sql += " AND YEAR(a.tanggal) = %s AND MONTH(a.tanggal) = %s "
            params.extend([year, month])
            
        sql += " ORDER BY a.tanggal DESC, a.waktu DESC"
        
        cursor.execute(sql, tuple(params))
        data = cursor.fetchall()
        for row in data:
            row['tanggal'] = row['tanggal'].strftime('%Y-%m-%d') if row['tanggal'] else None
            row['absen_pulang'] = str(row['absen_pulang']) if row['absen_pulang'] else None
            row['jadwal_pulang'] = str(row['jadwal_pulang']) if row['jadwal_pulang'] else None
            
            if row['absen_pulang'] and row['jadwal_pulang']:
                try:
                    t_absen = datetime.strptime(row['absen_pulang'], '%H:%M:%S')
                    t_jadwal = datetime.strptime(row['jadwal_pulang'], '%H:%M:%S')
                    diff = (t_jadwal - t_absen).total_seconds() / 60
                    row['durasi_pulang_awal'] = int(diff) if diff > 0 else 0
                except:
                    row['durasi_pulang_awal'] = 0
            else:
                row['durasi_pulang_awal'] = 0
            
        return jsonify({'month': month, 'year': year, 'data': data})
    finally:
        cursor.close()
        conn.close()
