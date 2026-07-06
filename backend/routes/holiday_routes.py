from flask import Blueprint, request, jsonify
from utils import get_db_connection

holiday_bp = Blueprint('holiday', __name__)

@holiday_bp.route('/admin/holidays', methods=['GET'])
def get_holidays():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, DATE_FORMAT(tanggal, '%Y-%m-%d') as tanggal, keterangan FROM holidays ORDER BY tanggal DESC")
        holidays = cursor.fetchall()
        return jsonify(holidays), 200
    except Exception as e:
        return jsonify({'message': f"Error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

@holiday_bp.route('/admin/holidays', methods=['POST'])
def add_holiday():
    data = request.get_json()
    tanggal = data.get('tanggal')
    keterangan = data.get('keterangan')

    if not tanggal or not keterangan:
        return jsonify({'message': 'Data tidak lengkap'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO holidays (tanggal, keterangan) VALUES (%s, %s)", (tanggal, keterangan))
        conn.commit()
        return jsonify({'message': 'Hari libur berhasil ditambahkan'}), 201
    except Exception as e:
        return jsonify({'message': f"Error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

@holiday_bp.route('/admin/holidays/<int:id>', methods=['PUT'])
def update_holiday(id):
    data = request.get_json()
    tanggal = data.get('tanggal')
    keterangan = data.get('keterangan')

    if not tanggal or not keterangan:
        return jsonify({'message': 'Data tidak lengkap'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE holidays SET tanggal=%s, keterangan=%s WHERE id=%s", (tanggal, keterangan, id))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'message': 'Hari libur tidak ditemukan'}), 404
        return jsonify({'message': 'Hari libur berhasil diupdate'}), 200
    except Exception as e:
        return jsonify({'message': f"Error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

@holiday_bp.route('/admin/holidays/<int:id>', methods=['DELETE'])
def delete_holiday(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM holidays WHERE id=%s", (id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'message': 'Hari libur tidak ditemukan'}), 404
        return jsonify({'message': 'Hari libur berhasil dihapus'}), 200
    except Exception as e:
        return jsonify({'message': f"Error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()
