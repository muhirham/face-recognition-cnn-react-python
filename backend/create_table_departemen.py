import mysql.connector
from config import Config

def create_table():
    db_config = {
        'host': Config.MYSQL_HOST,
        'user': Config.MYSQL_USER,
        'password': Config.MYSQL_PASSWORD,
        'database': Config.MYSQL_DB
    }
    
    try:
        db = mysql.connector.connect(**db_config)
        cursor = db.cursor()
        
        sql = """
        CREATE TABLE IF NOT EXISTS jadwal_departemen (
            id INT AUTO_INCREMENT PRIMARY KEY,
            departemen VARCHAR(50) NOT NULL,
            hari ENUM('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu') NOT NULL,
            jam_masuk TIME NOT NULL,
            jam_pulang TIME NOT NULL,
            toleransi INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uni_dept_hari (departemen, hari)
        )
        """
        
        cursor.execute(sql)
        db.commit()
        print("Table 'jadwal_departemen' created successfully.")
        
    except Exception as e:
        print(f"Error creating table: {e}")
    finally:
        if db: db.close()

if __name__ == "__main__":
    create_table()
