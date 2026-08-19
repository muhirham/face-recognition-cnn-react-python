import mysql.connector

c = mysql.connector.connect(host='localhost', user='root', database='facial_login_db')
cur = c.cursor(dictionary=True)
cur.execute("""
    SELECT 
        k.kode_karyawan, k.nama,
        a.waktu, a.jenis, a.status,
        COALESCE(s.jam_pulang, s2.jam_pulang, s_default.jam_pulang) as jam_pulang
    FROM absensis a
    JOIN karyawans k ON a.karyawan_id = k.id
    LEFT JOIN shift_kerjas s ON a.shift_id = s.id
    LEFT JOIN shift_kerjas s2 ON k.dept_id = s2.dept_id
    LEFT JOIN (SELECT * FROM shift_kerjas WHERE dept_id IS NULL LIMIT 1) s_default ON 1=1
    WHERE a.tanggal = '2026-08-03'
""")
res = cur.fetchall()
for r in res:
    print(r)
