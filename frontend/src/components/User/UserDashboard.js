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
    const [attendanceStatus, setAttendanceStatus] = useState({ masuk: false, pulang: false });
    const [todaySchedule, setTodaySchedule] = useState(null);
    const [holiday, setHoliday] = useState(null);
    const [scanStatus, setScanStatus] = useState('Siap untuk Scan');
    const [recognizedUser, setRecognizedUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [earlyCheckoutModal, setEarlyCheckoutModal] = useState({ isOpen: false, data: null, reason: '' });
    const [minConfidence, setMinConfidence] = useState(85); // Global threshold
    const autoSubmitLock = useRef(false); // Guard against auto-submit spam

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
                params: { user_id: userId }
            });
            const logs = response.data.history;
            setHistory(logs);
            
            const now = new Date();
            const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            // Check specifically for Masuk vs Pulang today
            const attendedToday = logs.filter(h => h.tanggal === localDate);
            setAttendanceStatus({
                masuk: attendedToday.some(h => h.jenis === 'masuk'),
                pulang: attendedToday.some(h => h.jenis === 'pulang')
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

    // VGA STANDARD: Force 640x480 buffer and handle manual mirroring
    const drawBoxes = useCallback((faces) => {
        const canvas = canvasRef.current;
        const video = webcamRef.current?.video;
        if (!canvas || !video) return;

        // Force VGA Standard buffer size
        const sensorW = 640;
        const sensorH = 480;

        canvas.width = sensorW;
        canvas.height = sensorH;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, sensorW, sensorH);

        faces.forEach(face => {
            const [top, right, bottom, left] = face.box;
            const name = face.name;
            const confidence = face.confidence;

            // MANUAL MIRROR: 
            const x = sensorW - right; 
            const y = top;
            const w = right - left;
            const h = bottom - top;

            ctx.strokeStyle = name === 'Unknown' ? '#ef4444' : '#f9bc2f';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);

            // Label
            ctx.fillStyle = name === 'Unknown' ? '#ef4444' : '#f9bc2f';
            ctx.font = 'bold 16px Inter, sans-serif'; 
            const confVal = typeof confidence === 'number' ? confidence.toFixed(1) : '?';
            const text = confidence ? `${name} (${confVal}%)` : name;
            const textWidth = ctx.measureText(text).width;
            
            const labelY = y > 24 ? y - 24 : y;
            ctx.fillRect(x, labelY, textWidth + 12, 22);
            ctx.fillStyle = '#0b1a2a';
            ctx.fillText(text, x + 6, labelY + 16);
        });
    }, []);

    const handleResetScan = useCallback(() => {
        setRecognizedUser(null);
        setScanStatus('Siap untuk Scan');
    }, []);

    const handleLogout = () => {
        document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        navigate('/signin');
    };

    const handleSubmitAttendance = useCallback(async (jenis = 'masuk', image = null, reason = null) => {
        if (!recognizedUser || isSubmitting) return;

        // Cek pulang awal
        if (jenis === 'pulang' && !reason && todaySchedule?.jam_pulang) {
            const now = new Date();
            const [h, m, s] = todaySchedule.jam_pulang.split(':').map(Number);
            const checkoutGate = new Date();
            checkoutGate.setHours(h, m, s || 0, 0);
            
            if (now < checkoutGate) {
                setEarlyCheckoutModal({ isOpen: true, data: { jenis, image }, reason: '' });
                return; // PAUSE submit
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
            
            // Optimistic update
            setAttendanceStatus(prev => ({
                ...prev,
                [jenis]: true
            }));

            setRecognizedUser(null);
            fetchHistory();
            setTimeout(() => setActiveTab('welcome'), 2000);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal menyimpan absensi');
        } finally {
            setIsSubmitting(false);
        }
    }, [recognizedUser, isSubmitting, fetchHistory]);

    const processFrame = useCallback(async () => {
        if (activeTab !== 'absen' || !webcamRef.current || attendanceStatus === 'Sudah Absen') return;
        
        const video = webcamRef.current.video;
        if (!video || video.readyState < 2) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        try {
            const response = await axios.post(`${API_BASE_URL}/detect_live`, { image: imageSrc });
            if (response.data.faces) {
                drawBoxes(response.data.faces);

                if (response.data.recognized) {
                    const { user } = response.data;
                    console.log(`[*] Muka Kedetect: ${user.username}, Conf: ${user.confidence}%, Min: ${minConfidence}%`);
                    
                    // Cek apakah ini emang user yang lagi login
                    const currentUsername = username || '';
                    const detectedName = user.username || '';

                    // Kalau username kosong (bug loading), kita anggap cocok aja kalau mukanya kedetect jelas
                    const isMatch = currentUsername === '' || 
                                    detectedName.toLowerCase().includes(currentUsername.toLowerCase()) || 
                                    currentUsername.toLowerCase().includes(detectedName.toLowerCase());

                    if (isMatch) {
                        setRecognizedUser(user);
                        setScanStatus(`Wajah Terdeteksi: ${user.confidence.toFixed(1)}%`);

                        // --- AUTO SUBMIT LOGIC ---
                        if (user.confidence >= minConfidence && !isSubmitting && !autoSubmitLock.current) {
                            console.log("[!] AUTO-SUBMIT TRIGGERED!");
                            autoSubmitLock.current = true; // Lock immediately (sync)
                            setTimeout(() => {
                                const currentType = document.querySelector('input[name="type"]:checked')?.value || 'masuk';
                                handleSubmitAttendance(currentType, imageSrc).finally(() => {
                                    autoSubmitLock.current = false; // Release lock after done
                                });
                            }, 500);
                        } else if (user.confidence < minConfidence) {
                            console.log(`[?] Skor ${user.confidence} belum nembus target ${minConfidence}`);
                        }
                    } else {
                        console.warn(`[!] Mismatch: Kedetect ${user.username} tapi yang login ${username}`);
                    }
                } else {
                    setRecognizedUser(null);
                    setScanStatus('Wajah tidak dikenali (Unknown)');
                }
            } else {
                const canvas = canvasRef.current;
                if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            }
        } catch (error) {
            console.error('Detection error:', error);
        }
    }, [activeTab, username, attendanceStatus, drawBoxes, minConfidence, isSubmitting, handleSubmitAttendance]);

    useEffect(() => {
        let timerId;
        const loop = async () => {
            if (activeTab === 'absen') {
                await processFrame();
                timerId = setTimeout(loop, 400); 
            }
        };
        
        if (activeTab === 'absen') {
            loop();
        }
        
        return () => {
            if (timerId) clearTimeout(timerId);
            const canvasNode = canvasRef.current;
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
                    onSubmit={handleSubmitAttendance}
                    onReset={handleResetScan}
                    minConfidence={minConfidence}
                />
            )}
            {activeTab === 'history' && (
                <HistoryTab history={history} />
            )}
            
            {earlyCheckoutModal.isOpen && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-box">
                        <h3>Konfirmasi Pulang Awal</h3>
                        <p>Anda mencoba absen pulang sebelum jam {todaySchedule?.jam_pulang?.substring(0,5)}.<br/>Silakan masukkan alasan Anda pulang awal:</p>
                        <input 
                            type="text" 
                            className="search-input"
                            style={{ width: '100%', padding: '12px', marginTop: '10px', marginBottom: '20px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}
                            placeholder="Contoh: Sakit perut, Izin ke RS, dll"
                            value={earlyCheckoutModal.reason}
                            onChange={(e) => setEarlyCheckoutModal(prev => ({ ...prev, reason: e.target.value }))}
                        />
                        <div className="modal-actions-p">
                            <button className="btn-cancel" onClick={() => {
                                setEarlyCheckoutModal({ isOpen: false, data: null, reason: '' });
                                handleResetScan();
                            }}>Batal</button>
                            <button className="btn-primary-imp" style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold' }} onClick={() => {
                                if (!earlyCheckoutModal.reason.trim()) {
                                    toast.error("Alasan tidak boleh kosong!");
                                    return;
                                }
                                const { jenis, image } = earlyCheckoutModal.data;
                                setEarlyCheckoutModal(prev => ({ ...prev, isOpen: false }));
                                handleSubmitAttendance(jenis, image, earlyCheckoutModal.reason);
                            }}>Simpan Absensi</button>
                        </div>
                    </div>
                </div>
            )}

            <ToastContainer position="top-right" theme="colored" autoClose={3000} />
        </Layout>
    );
}

export default UserDashboard;
