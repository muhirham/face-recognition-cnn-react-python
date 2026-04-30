import mysql.connector
from config import Config

db_config = {
    'host': Config.MYSQL_HOST,
    'user': Config.MYSQL_USER,
    'password': Config.MYSQL_PASSWORD,
    'database': Config.MYSQL_DB
}

def migrate():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # Add menit_terlambat to absensis
        print("Adding menit_terlambat column to absensis stable...")
        cursor.execute("ALTER TABLE absensis ADD COLUMN menit_terlambat INT DEFAULT 0 AFTER status")
        
        conn.commit()
        print("Migration successful!")
        
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    migrate()
