import mysql.connector

# Database Configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'absensi_cnn'
}

def verify_database():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        print("=== Database Table List ===")
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        for (table,) in tables:
            print(f"- {table}")
        
        # Check core tables
        required_tables = ['users', 'karyawans', 'absensis', 'face_templates']
        print("\n=== Table Structures ===")
        for table in required_tables:
            if any(table in t for t in tables):
                print(f"\nStructure of '{table}':")
                cursor.execute(f"DESCRIBE {table}")
                for col in cursor.fetchall():
                    print(col)
            else:
                print(f"\n[WARNING] Table '{table}' is missing!")

    except Exception as e:
        print(f"Connection Error: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    verify_database()
