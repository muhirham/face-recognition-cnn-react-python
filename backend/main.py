from flask import Flask, send_from_directory
from flask_cors import CORS
from utils import UPLOAD_FOLDER
from routes.auth_routes import auth_bp
from routes.attendance_routes import attendance_bp
from routes.admin_routes import admin_bp
from routes.face_routes import face_bp
from routes.reports_routes import reports_bp
from routes.holiday_routes import holiday_bp
import os

app = Flask(__name__)
# Allow up to 64MB payloads for high-res image datasets
app.config['MAX_CONTENT_LENGTH'] = 64 * 1024 * 1024 
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(attendance_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(face_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(holiday_bp)

@app.route('/static/attendance_photos/<filename>')
def serve_photo(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    print("[*] Starting Production Server (Waitress WSGI) on 0.0.0.0:5000")
    from waitress import serve
    serve(app, host='0.0.0.0', port=5000, threads=6)