@echo off
echo =======================================================
echo     SISTEM ABSENSI FACIAL RECOGNITION (PRODUCTION)
echo =======================================================
echo.

:: 1. Cek apakah module serve (Node.js) sudah terinstall
echo [*] Mengecek dependency frontend (serve)...
call npm list -g serve >nul 2>&1
if %errorlevel% neq 0 (
    echo [-] Menginstall module 'serve' secara global...
    call npm install -g serve
)

:: 2. Build Frontend (Jika folder build belum ada)
if not exist "frontend\build\" (
    echo [*] Membangun (Build) Frontend React ke versi Production...
    cd frontend
    call npm run build
    cd ..
    echo [+] Frontend berhasil di-build!
) else (
    echo [+] Frontend sudah di-build sebelumnya.
)

:: 3. Jalankan Backend (Waitress WSGI - Production Ready)
echo [*] Menyalakan Backend (Waitress WSGI) di Port 5000...
start "Backend API Absensi" cmd /c "cd backend & venv\Scripts\python main.py"

:: 4. Jalankan Frontend Build
echo [*] Menyalakan Frontend UI di Port 3000...
start "Frontend UI Absensi" cmd /c "cd frontend & serve -s build -l 3000"

echo.
echo =======================================================
echo [SUCCESS] SISTEM BERHASIL DIJALANKAN!
echo Buka Browser dan akses: http://localhost:3000
echo =======================================================
pause
