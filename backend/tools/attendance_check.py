import mysql.connector

# Database Configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'absensi_cnn'
}

def check_logs():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        print("=== Latest Attendance Records ===")
        # Querying the 'absensis' table with correct column names (tanggal, waktu)
        query = "SELECT * FROM absensis ORDER BY tanggal DESC, waktu DESC LIMIT 10"
        cursor.execute(query)
        rows = cursor.fetchall()
        
        if not rows:
            print("No attendance logs found in the database.")
        else:
            for row in rows:
                print(f"ID: {row['id']} | EmpID: {row['karyawan_id']} | Date: {row['tanggal']} | Time: {row['waktu']} | Type: {row['jenis']} | Status: {row['status']}")

    except Exception as e:
        print(f"Error reading logs: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    check_logs()
