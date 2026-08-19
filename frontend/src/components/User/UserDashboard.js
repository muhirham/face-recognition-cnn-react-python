import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../apiConfig';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Modular Components
import Layout from '../Common/Layout';
import { IconDashboard, IconWebcam, IconHistory } from '../Common/Icons';
import HomeTab from './Tabs/HomeTab';
import AbsenTab from './Tabs/AbsenTab';
import HistoryTab from './Tabs/HistoryTab';

// Theme
import '../../theme/variables.css';

function UserDashboard() {
    const [username, setUsername] = useState('');
    const [activeTab, setActiveTab] = useState('welcome');
    const [history, setHistory] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
    const [attendanceStatus, setAttendanceStatus] = useState({ masuk: false, pulang: false });
    const [todaySchedule, setTodaySchedule] = useState(null);
    const [holiday, setHoliday] = useState(null);
    const [scanStatus, setScanStatus] = useState('Siap untuk Scan');
    const [recognizedUser, setRecognizedUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reasonModal, setReasonModal] = useState({ isOpen: false, data: null, reason: '' });
    const [minConfidence, setMinConfidence] = useState(85); // Global threshold
    const [absensiType, setAbsensiType] = useState('masuk'); // Lifted from AbsenTab
    const autoSubmitLock = useRef(false); // Guard against auto-submit spam
    const currentFacesRef = useRef([]); // holds latest faces for persistent canvas rendering
    const targetFacesRef = useRef([]); // Target boxes from backend
    const earHistoryRef = useRef([]); // Silent liveness tracking

    // Refs for camera and drawing overlay
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    
    const navigate = useNavigate();

    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    };

    const fetchHistory = useCallback(async () => {
        const userId = getCookie('user_id');
        if (!userId) return;
        try {
            const response = await axios.get(`${API_BASE_URL}/attendance_history`, {
                params: { user_id: userId } // Fetch all history once, no N+1
            });
            const logs = response.data.history;
            setHistory(logs);
            
            const now = new Date();
            const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            // History is returned pivoted per-day with masuk/pulang fields
            const attendedToday = logs.filter(h => h.tanggal === localDate);
            const masukDone = attendedToday.some(h => h.masuk !== null);
            const pulangDone = attendedToday.some(h => h.pulang !== null);
            setAttendanceStatus({
                masuk: masukDone,
                pulang: pulangDone
            });
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const userId = getCookie('user_id');
            if (!userId) { navigate('/signin'); return; }
            try {
                const response = await axios.get(`${API_BASE_URL}/greeting`, { params: { user_id: userId } });
                setUsername(response.data.username);
                if (response.data.min_confidence) {
                    setMinConfidence(response.data.min_confidence);
                }
                if (response.data.schedule) {
                    setTodaySchedule(response.data.schedule);
                }
                if (response.data.holiday) {
                    setHoliday(response.data.holiday);
                }
                fetchHistory();
            } catch (error) { 
                console.error("Fetch Data Error:", error);
                navigate('/signin'); 
            }
        };
        fetchData();
    }, [navigate, fetchHistory]);

    // Draw bounding boxes — called both from detection loop AND from rAF render loop
    const drawBoxes = useCallback((faces) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const BACKEND_W = 640;
        const BACKEND_H = 480;

        // Only set dimensions if changed to avoid clearing canvas unnecessarily
        if (canvas.width !== BACKEND_W) canvas.width = BACKEND_W;
        if (canvas.height !== BACKEND_H) canvas.height = BACKEND_H;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, BACKEND_W, BACKEND_H);

        faces.forEach(face => {
            const [top, right, bottom, left] = face.box;
            const name = face.name;
            const confidence = face.confidence;

            // The backend already scaled the coordinates up to the 640x480 coordinate space.
            // Since we send UNMIRRORED images to the backend, but the video element 
            // is visually MIRRORED to the user (via CSS), we MUST flip the X coordinates!
            const BACKEND_W = 640;
            const x = BACKEND_W - right; // Flipped X
            const y = top;
            const w = (right - left);
            const h = (bottom - top);

            // Bounding box with glow
            ctx.strokeStyle = name === 'Unknown' ? '#ef4444' : '#f9bc2f';
            ctx.lineWidth = 3;
            ctx.shadowColor = name === 'Unknown' ? '#ef4444' : '#f9bc2f';
            ctx.shadowBlur = 10;
            ctx.strokeRect(x, y, w, h);
            ctx.shadowBlur = 0;

            // Label
            const confVal = typeof confidence === 'number' ? confidence.toFixed(1) : '?';
            const text = confidence > 0 ? `${name} (${confVal}%)` : name;
            ctx.font = 'bold 15px Inter, Arial, sans-serif';
            const textWidth = ctx.measureText(text).width;
            const labelH = 22;
            const labelY = y > labelH ? y - labelH : y + h;

            ctx.fillStyle = name === 'Unknown' ? '#ef4444' : '#f9bc2f';
            ctx.fillRect(x, labelY, textWidth + 12, labelH);
            ctx.fillStyle = '#0b1a2a';
            ctx.fillText(text, x + 6, labelY + 15);
        });
    }, []);

    // Persistent render loop: keeps boxes drawn even between detection requests
    // Only runs when on the absen tab to save CPU
    useEffect(() => {
        if (activeTab !== 'absen') return;
        let rafId;
        const renderLoop = () => {
            const targets = targetFacesRef.current;
            let currents = currentFacesRef.current;

            if (targets.length === 0) {
                currentFacesRef.current = [];
            } else if (currents.length !== targets.length) {
                // Instantly snap if number of faces changes
                currentFacesRef.current = JSON.parse(JSON.stringify(targets));
            } else {
                // Smooth interpolation (LERP) for each box
                targets.forEach((target, i) => {
                    const curr = currents[i];
                    const lerp = 0.25; // 25% closer per frame = very smooth tracking
                    
                    curr.box[0] += (target.box[0] - curr.box[0]) * lerp;
                    curr.box[1] += (target.box[1] - curr.box[1]) * lerp;
                    curr.box[2] += (target.box[2] - curr.box[2]) * lerp;
                    curr.box[3] += (target.box[3] - curr.box[3]) * lerp;
                    
                    curr.name = target.name;
                    curr.confidence = target.confidence;
                });
            }

            // Always call drawBoxes to ensure canvas is cleared when empty
            drawBoxes(currentFacesRef.current);
            
            rafId = requestAnimationFrame(renderLoop);
        };
        rafId = requestAnimationFrame(renderLoop);
        return () => cancelAnimationFrame(rafId);
    }, [drawBoxes, activeTab]);

    const handleResetScan = useCallback(() => {
        setRecognizedUser(null);
        earHistoryRef.current = [];
        currentFacesRef.current = [];
        targetFacesRef.current = [];
        setScanStatus('Siap untuk Scan');
        autoSubmitLock.current = false;
    }, []);

    const handleLogout = () => {
        document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        navigate('/signin');
    };

    const handleSubmitAttendance = useCallback(async (jenis = 'masuk', image = null, reason = null) => {
        if (!recognizedUser || isSubmitting) return;

        // Cek telat masuk
        if (jenis === 'masuk' && !reason && todaySchedule?.jam_masuk) {
            const now = new Date();
            const [h, m, s] = todaySchedule.jam_masuk.split(':').map(Number);
            const checkinLimit = new Date();
            checkinLimit.setHours(h, m + (todaySchedule.toleransi_menit || 0), s || 0, 0);
            
            if (now > checkinLimit) {
                setReasonModal({ isOpen: true, data: { jenis, image, type: 'late' }, reason: '' });
                return 'paused';
            }
        }

        // Cek pulang awal
        if (jenis === 'pulang' && !reason && todaySchedule?.jam_pulang) {
            const now = new Date();
            const [h, m, s] = todaySchedule.jam_pulang.split(':').map(Number);
            const checkoutGate = new Date();
            checkoutGate.setHours(h, m, s || 0, 0);
            
            if (now < checkoutGate) {
                setReasonModal({ isOpen: true, data: { jenis, image, type: 'early' }, reason: '' });
                return 'paused'; // PAUSE submit
            }
        }

        setIsSubmitting(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/submit_attendance`, {
                employee_id: recognizedUser.employee_id,
                confidence: recognizedUser.confidence,
                jenis: jenis,
                image: image,
                reason: reason
            });
            toast.success(response.data.message);
            
            setAttendanceStatus(prev => ({
                ...prev,
                [jenis]: true
            }));

            setRecognizedUser(null);
            fetchHistory();
            autoSubmitLock.current = false; // Release lock on success too
            setTimeout(() => setActiveTab('welcome'), 2000);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal menyimpan absensi');
            autoSubmitLock.current = false; // Release lock on failure so user can retry
        } finally {
            setIsSubmitting(false);
        }
    }, [recognizedUser, isSubmitting, fetchHistory, todaySchedule]);

    const processFrame = useCallback(async () => {
        const currentType = absensiType;
        if (activeTab !== 'absen' || !webcamRef.current || reasonModal.isOpen || attendanceStatus[currentType]) return;
        
        const video = webcamRef.current.video;
        if (!video || video.readyState < 2) return;

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        
        // Custom CROP logic to match object-fit: cover with 4:3 aspect ratio
        let cropW = vw;
        let cropH = vh;
        if (vw / vh > 4 / 3) {
            cropW = vh * (4 / 3);
        } else {
            cropH = vw * (3 / 4);
        }
        
        const startX = (vw - cropW) / 2;
        const startY = (vh - cropH) / 2;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 320;
        tempCanvas.height = 240;
        const tempCtx = tempCanvas.getContext('2d');
        
        // DO NOT mirror the image data here! Doing so messes up face recognition 
        // if the templates were registered unmirrored or lighting is asymmetric.
        tempCtx.drawImage(video, startX, startY, cropW, cropH, 0, 0, 320, 240);
        const imageSrc = tempCanvas.toDataURL('image/jpeg', 0.5);
        if (!imageSrc) return;

        const userId = getCookie('user_id');

        try {
            const response = await axios.post(`${API_BASE_URL}/detect_live`, { 
                image: imageSrc,
                user_id: userId
            });
            
            // Check state again after await to drop stale responses if modal opened
            if (activeTab !== 'absen' || reasonModal.isOpen) return;

            if (response.data.faces && response.data.faces.length > 0) {
                const currentUsername = username || '';

                if (response.data.faces.length > 1) {
                    // Validasi: Jika lebih dari 1 wajah terdeteksi
                    response.data.faces.forEach(face => {
                        face.name = 'Terlalu Banyak Wajah';
                        face.confidence = 0;
                    });
                    targetFacesRef.current = response.data.faces;
                    setRecognizedUser(null);
                    earHistoryRef.current = [];
                    setScanStatus('Terdeteksi banyak wajah. Mohon scan 1 wajah saja.');
                } else {
                    // Validasi: 1 wajah terdeteksi, cek kecocokan dengan akun
                    let face = response.data.faces[0];
                    let isMatch = false;

                    if (face.name !== 'Unknown') {
                        const detectedName = face.name;
                        isMatch = currentUsername === '' || 
                                  detectedName.toLowerCase().includes(currentUsername.toLowerCase()) || 
                                  currentUsername.toLowerCase().includes(detectedName.toLowerCase());
                        
                        if (!isMatch) {
                            face.name = 'Bukan Wajah Anda';
                            face.confidence = 0;
                        }
                    }

                    targetFacesRef.current = [face];

                    if (response.data.recognized && isMatch) {
                        const { user } = response.data;
                        setRecognizedUser(user);
                        
                        // --- SILENT MICRO-MOTION LIVENESS ---
                        let isAlive = false;
                        if (face.ear_value > 0) {
                            earHistoryRef.current.push(face.ear_value);
                            // Keep last 15 frames (~1-1.5 seconds of history)
                            if (earHistoryRef.current.length > 15) {
                                earHistoryRef.current.shift();
                            }
                        }

                        // We need at least 8 frames to calculate variance
                        if (earHistoryRef.current.length >= 8) {
                            const minEar = Math.min(...earHistoryRef.current);
                            const maxEar = Math.max(...earHistoryRef.current);
                            const variance = maxEar - minEar;
                            
                            // A real human eye will fluctuate slightly over 1 second.
                            // A static photo will have a variance of < 0.005.
                            if (variance > 0.005) {
                                isAlive = true;
                            }
                        }

                        if (autoSubmitLock.current) {
                            setScanStatus(`Memproses Absensi Otomatis...`);
                        } else if (!isAlive) {
                            setScanStatus(`Mendeteksi Wajah: ${user.confidence.toFixed(1)}% (Pastikan wajah sejajar)`);
                        } else {
                            setScanStatus(`Wajah Terdeteksi: ${user.confidence.toFixed(1)}%`);
                        }

                        // --- AUTO SUBMIT LOGIC ---
                        if (user.confidence >= minConfidence && isAlive && !isSubmitting && !autoSubmitLock.current) {
                            console.log("[!] AUTO-SUBMIT TRIGGERED!");
                            autoSubmitLock.current = true; // Lock immediately (sync)
                            setTimeout(async () => {
                                const currentType = absensiType;
                                const submitStatus = await handleSubmitAttendance(currentType, imageSrc);
                                if (submitStatus !== 'paused') {
                                    autoSubmitLock.current = false; // Release lock only if NOT paused
                                }
                            }, 1500);
                        } else if (user.confidence < minConfidence) {
                            console.log(`[?] Skor ${user.confidence} belum nembus target ${minConfidence}`);
                        }
                    } else {
                        setRecognizedUser(null);
                        earHistoryRef.current = [];
                        setScanStatus(face.name === 'Bukan Wajah Anda' ? 'Wajah tidak sesuai dengan akun' : 'Wajah tidak dikenali (Unknown)');
                    }
                }
            } else {
                // No face detected - clear
                targetFacesRef.current = [];
                earHistoryRef.current = [];
            }
        } catch (error) {
            console.error('Detection error:', error);
        }
    }, [activeTab, username, attendanceStatus, minConfidence, isSubmitting, handleSubmitAttendance, reasonModal.isOpen, absensiType]);

    useEffect(() => {
        let timerId;
        let isActive = true;

        const loop = async () => {
            if (activeTab === 'absen' && isActive) {
                await processFrame();
                // Check isActive again because processFrame is async and might have taken a while
                if (isActive) {
                    // Polling interval reduced for maximum real-time tracking
                    timerId = setTimeout(loop, 10); 
                }
            }
        };
        
        if (activeTab === 'absen') {
            loop();
        }
        
        const canvasNode = canvasRef.current;
        return () => {
            isActive = false; // Immediately stop the async loop from scheduling next iteration
            if (timerId) clearTimeout(timerId);
            if (canvasNode) canvasNode.getContext('2d').clearRect(0, 0, canvasNode.width, canvasNode.height);
        };
    }, [activeTab, processFrame]);

    const navItems = [
        { id: 'welcome', label: 'Dashboard', icon: <IconDashboard /> },
        { id: 'absen', label: 'Absensi Wajah', icon: <IconWebcam /> },
        { id: 'history', label: 'Riwayat Absensi', icon: <IconHistory /> }
    ];

    return (
        <Layout
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            navItems={navItems}
            portalTitle="DASHBOARD KARYAWAN"
            username={username}
            userRole="Karyawan"
            onLogout={handleLogout}
            brandTitle="E-ABSENSI"
            brandIcon="💎"
        >
            {activeTab === 'welcome' && (
                <HomeTab 
                    username={username} 
                    attendanceStatus={attendanceStatus} 
                    history={history}
                    holiday={holiday}
                    onGoToAbsen={() => setActiveTab('absen')}
                    onGoToHistory={() => setActiveTab('history')}
                />
            )}
            {activeTab === 'absen' && (
                <AbsenTab 
                    webcamRef={webcamRef} 
                    canvasRef={canvasRef} 
                    scanStatus={scanStatus}
                    attendanceStatus={attendanceStatus}
                    todaySchedule={todaySchedule}
                    recognizedUser={recognizedUser}
                    isSubmitting={isSubmitting}
                    onReset={handleResetScan}
                    minConfidence={minConfidence}
                    absensiType={absensiType}
                    setAbsensiType={setAbsensiType}
                />
            )}
            {activeTab === 'history' && (
                <HistoryTab history={history} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
            )}
            
            {reasonModal.isOpen && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-box">
                        <h3>{reasonModal.data?.type === 'late' ? 'Konfirmasi Terlambat' : 'Konfirmasi Pulang Awal'}</h3>
                        <p>{reasonModal.data?.type === 'late' 
                            ? `Anda terlambat dari jam masuk ${todaySchedule?.jam_masuk?.substring(0,5)} + batas toleransi ${todaySchedule?.toleransi_menit} menit.\nSilakan masukkan alasan keterlambatan Anda:` 
                            : `Anda mencoba absen pulang sebelum jam ${todaySchedule?.jam_pulang?.substring(0,5)}.\nSilakan masukkan alasan Anda pulang awal:`}
                        </p>
                        <input 
                            type="text" 
                            className="search-input"
                            style={{ width: '100%', padding: '14px 16px', marginBottom: '20px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '14px', outline: 'none', transition: '0.2s' }}
                            placeholder={reasonModal.data?.type === 'late' ? "Contoh: Macet di jalan, Ban bocor, dll" : "Contoh: Sakit perut, Izin ke RS, dll"}
                            onFocus={(e) => e.target.style.borderColor = '#10b981'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            value={reasonModal.reason}
                            onChange={(e) => setReasonModal(prev => ({ ...prev, reason: e.target.value }))}
                        />
                        <div className="modal-actions-p">
                            <button className="btn-cancel" onClick={() => {
                                setReasonModal({ isOpen: false, data: null, reason: '' });
                                autoSubmitLock.current = false; // RELEASE LOCK
                                handleResetScan();
                            }}>Batal</button>
                            <button className="btn-primary-imp" style={{ padding: '12px 24px', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '800' }} onClick={() => {
                                if (!reasonModal.reason.trim()) {
                                    toast.error("Alasan tidak boleh kosong!");
                                    return;
                                }
                                const { jenis, image } = reasonModal.data;
                                setReasonModal(prev => ({ ...prev, isOpen: false }));
                                handleSubmitAttendance(jenis, image, reasonModal.reason);
                            }}>Simpan Absensi</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .custom-modal-overlay {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 9999; animation: modalFadeIn 0.3s ease;
                }
                .custom-modal-box {
                    background: white; padding: 32px; border-radius: 24px;
                    width: 90%; max-width: 420px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    animation: modalSlideUp 0.3s ease; border: 1px solid #e2e8f0;
                }
                .custom-modal-box h3 {
                    font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 8px;
                }
                .custom-modal-box p {
                    font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 24px;
                }
                .modal-actions-p { display: flex; gap: 12px; justify-content: flex-end; margin-top: 10px; }
                .btn-cancel {
                    padding: 12px 20px; background: #f1f5f9; color: #475569;
                    border: none; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s;
                }
                .btn-cancel:hover { background: #e2e8f0; }
                .btn-primary-imp {
                    background: #10b981; transition: 0.2s;
                }
                .btn-primary-imp:hover { background: #059669; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16,185,129,0.3); }

                @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            <ToastContainer position="top-right" theme="colored" autoClose={3000} />
        </Layout>
    );
}

export default UserDashboard;
