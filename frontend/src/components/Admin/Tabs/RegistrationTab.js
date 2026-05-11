import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import { toast } from 'react-toastify';

function RegistrationTab() {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isCapturing, setIsCapturing] = useState(false);
    const [captureProgress, setCaptureProgress] = useState(0);
    const [capturedImages, setCapturedImages] = useState([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [hasTemplate, setHasTemplate] = useState(false);
    const [existingDataset, setExistingDataset] = useState([]);

    const webcamRef = useRef(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/admin/employees`);
            console.log("Data Karyawan Terload:", res.data.employees);
            setEmployees(res.data.employees || []);
        } catch (err) {
            console.error("Gagal load karyawan", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchExistingDataset = async (empId) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/admin/get_dataset/${empId}`);
            setExistingDataset(res.data.images || []);
        } catch (err) { console.error("Gagal load dataset", err); }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Check if selected employee already has a face template
    useEffect(() => {
        if (!selectedEmployee) {
            setHasTemplate(false);
            setExistingDataset([]);
            return;
        }
        const checkTemplate = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/admin/check_template/${selectedEmployee}`);
                setHasTemplate(res.data.exists);
                if (res.data.exists) {
                    fetchExistingDataset(selectedEmployee);
                } else {
                    setExistingDataset([]);
                }
            } catch (err) { console.error(err); }
        };
        checkTemplate();
    }, [selectedEmployee]);

    const handleDeleteDataset = async () => {
        if (!window.confirm("Hapus semua dataset wajah karyawan ini? Lu harus ambil foto ulang setelah ini cok.")) return;
        try {
            await axios.delete(`${API_BASE_URL}/admin/delete_dataset/${selectedEmployee}`);
            toast.success("Dataset berhasil dihapus!");
            setHasTemplate(false);
            setExistingDataset([]);
            setCapturedImages([]);
        } catch (err) {
            toast.error("Gagal menghapus dataset");
        }
    };

    const [captureInstruction, setCaptureInstruction] = useState('Hadap Depan');
    const [currentStep, setCurrentStep] = useState(0);
    const [isScanning, setIsScanning] = useState(false);

    const steps = [
        { label: 'Hadap Depan', icon: '👤', count: 8 },
        { label: 'Tengok Kiri', icon: '👈', count: 6 },
        { label: 'Tengok Kanan', icon: '👉', count: 6 }
    ];

    const captureStepImages = async () => {
        if (!selectedEmployee) return;
        
        setIsScanning(true);
        setIsCapturing(true);
        
        const newImages = [];
        const currentCount = steps[currentStep].count;
        toast.info(`Menscan wajah: ${steps[currentStep].label}...`);

        for (let i = 0; i < currentCount; i++) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                newImages.push(imageSrc);
                const currentTotal = capturedImages.length + newImages.length;
                setCaptureProgress((currentTotal / 20) * 100);
            }
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        setCapturedImages(prev => [...prev, ...newImages]);
        setIsScanning(false);
        setIsCapturing(false);
        
        if (currentStep < 2) {
            setCurrentStep(prev => prev + 1);
            setCaptureInstruction(steps[currentStep + 1].label);
        } else {
            toast.success("Semua sudut wajah berhasil discan!");
        }
    };

    const resetCapture = () => {
        setCapturedImages([]);
        setCurrentStep(0);
        setCaptureProgress(0);
        setCaptureInstruction(steps[0].label);
    };

    const handleRegister = async () => {
        if (capturedImages.length < 20) {
            toast.error("Dataset belum lengkap (butuh 20 foto)");
            return;
        }

        setIsRegistering(true);
        try {
            await axios.post(`${API_BASE_URL}/admin/register_face`, {
                employee_id: selectedEmployee,
                images: capturedImages
            });
            toast.success("Berhasil! Dataset Biometrik sudah masuk database.");
            setHasTemplate(true);
            resetCapture();
        } catch (err) {
            toast.error(err.response?.data?.message || "Gagal menyimpan dataset");
        } finally {
            setIsRegistering(false);
        }
    };

    if (isLoading) {
        return <div style={{padding: '40px', fontWeight: '800'}}>Memuat Sistem Kamera...</div>;
    }

    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header-p">
                <h2>Registrasi Biometrik Wajah</h2>
                <p>Daftarkan template wajah karyawan ke dalam basis data AI untuk keperluan absensi otomatis.</p>
            </div>

            <div className="registration-layout">
                {/* Left: Camera View */}
                <div className="reg-card camera-box">
                    <div className="webcam-container-p">
                        <Webcam 
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            screenshotQuality={0.8}
                            mirrored={true} 
                            forceScreenshotSourceSize={true}
                            className="webcam-p"
                            videoConstraints={{ 
                                width: { ideal: 1280 },
                                height: { ideal: 720 },
                                facingMode: "user"
                            }}
                        />
                        
                        {isScanning && <div className="laser-scan-line"></div>}

                        {(isCapturing || isScanning) && (
                            <div className="capture-overlay-active">
                                <div className="instruction-badge-p">
                                    SCANNING: {captureInstruction.toUpperCase()}
                                </div>
                                <div className="progress-p-box">
                                    <div className="p-text">Mengekstrak Fitur Wajah: {Math.round(captureProgress)}%</div>
                                    <div className="p-bar-bg">
                                        <div className="p-bar-fill" style={{ width: `${captureProgress}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isCapturing && !isScanning && (
                            <div className="camera-overlay-p">
                                <div className="face-guide"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="reg-card control-box">
                    <div className="card-p-header">
                        <h3>⚙️ Kontrol Registrasi</h3>
                    </div>
                    <div className="card-p-body">
                        <div className="form-group-p">
                            <label>Pilih Karyawan</label>
                            <select 
                                value={selectedEmployee} 
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                className="full-select"
                                disabled={isScanning || capturedImages.length > 0}
                            >
                                <option value="">-- Pilih Nama Karyawan --</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.nama} ({emp.kode_karyawan})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {hasTemplate && (
                            <div className="existing-dataset-manager">
                                <div className="template-badge-exists">
                                    ✅ Karyawan ini sudah memiliki data wajah.
                                </div>
                                {existingDataset.length > 0 && (
                                    <div className="dataset-gallery-preview">
                                        <h4>Dataset Terdaftar (CNN Ready)</h4>
                                        <div className="gallery-scroll-x">
                                            {existingDataset.map((img, i) => (
                                                <img key={i} src={`${API_BASE_URL}${img}`} alt="ds" className="gallery-thumb" />
                                            ))}
                                        </div>
                                        <button className="btn-delete-reset" onClick={handleDeleteDataset}>
                                            🗑️ Hapus & Reset Dataset
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="reg-actions-p">
                            {capturedImages.length < 20 ? (
                                <div className="step-capture-box">
                                    <div className="step-indicator-p">
                                        TAHAP {currentStep + 1} / 3: <strong>{steps[currentStep].label}</strong>
                                    </div>
                                    <button 
                                        className={`btn-reg-main ${isScanning ? 'disabled' : ''}`}
                                        onClick={captureStepImages}
                                        disabled={isScanning || !selectedEmployee}
                                    >
                                        {isScanning ? '⌛ Sedang Menscan...' : `📷 Scan Pose ${steps[currentStep].icon}`}
                                    </button>
                                    {capturedImages.length > 0 && (
                                        <button className="btn-reset-p" onClick={resetCapture}>Ulangi Dari Awal</button>
                                    )}
                                </div>
                            ) : (
                                <div className="dataset-ready-box">
                                    <div className="ready-alert">🎉 Semua Pose Berhasil Discan!</div>
                                    <div className="dataset-preview-row">
                                        {capturedImages.slice(0, 5).map((img, i) => (
                                            <img key={i} src={img} alt="preview" className="mini-thumb" />
                                        ))}
                                        <div className="thumb-more">+15</div>
                                    </div>
                                    <div className="btn-group-p">
                                        <button className="btn-retry-p" onClick={resetCapture}>Reset</button>
                                        <button 
                                            className={`btn-save-p ${isRegistering ? 'loading' : ''}`}
                                            onClick={handleRegister}
                                            disabled={isRegistering}
                                        >
                                            {isRegistering ? '💾 Menyimpan...' : 'Simpan Dataset Biometrik'}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <p className="reg-hint">Data ini akan digunakan sebagai bobot input untuk Arsitektur CNN.</p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .registration-layout { display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px; }
                .reg-card { background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; overflow: hidden; }
                
                .webcam-container-p { position: relative; width: 100%; aspect-ratio: 16/9; background: #000; overflow: hidden; border-radius: 12px; }
                .webcam-p { width: 100%; height: 100%; object-fit: cover; }
                
                .camera-overlay-p { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
                .face-guide { width: 250px; height: 320px; border: 3px dashed rgba(255,255,255,0.5); border-radius: 120px; position: relative; }
                .face-guide::before { content: 'POSISI WAJAH DI SINI'; position: absolute; bottom: -30px; left: 50%; transform: translateX(-50%); color: white; font-size: 10px; font-weight: 800; white-space: nowrap; letter-spacing: 2px; }

                .control-box .card-p-body { display: flex; flex-direction: column; gap: 24px; }
                .full-select { width: 100%; padding: 14px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-weight: 700; color: var(--navy-primary); outline: none; transition: 0.2s; }
                .full-select:focus { border-color: var(--gold-accent); }

                .template-badge-exists { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 12px; border-radius: 10px; font-size: 12px; font-weight: 600; line-height: 1.5; margin-bottom: 15px; }
                
                .dataset-gallery-preview h4 { font-size: 12px; font-weight: 800; margin-bottom: 10px; color: var(--navy-primary); text-transform: uppercase; letter-spacing: 1px; }
                .gallery-scroll-x { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; margin-bottom: 16px; scrollbar-width: thin; }
                .gallery-scroll-x::-webkit-scrollbar { height: 6px; }
                .gallery-scroll-x::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .gallery-thumb { width: 70px; height: 70px; border-radius: 10px; object-fit: cover; border: 2.5px solid #f1f5f9; flex-shrink: 0; transition: 0.2s; }
                .gallery-thumb:hover { transform: scale(1.05); border-color: var(--gold-accent); }
                
                .btn-delete-reset { width: 100%; padding: 12px; background: #fff5f5; color: #c53030; border: 2px dashed #feb2b2; border-radius: 12px; font-weight: 800; cursor: pointer; font-size: 12px; transition: 0.2s; }
                .btn-delete-reset:hover { background: #fed7d7; transform: translateY(-1px); }

                .laser-scan-line { position: absolute; width: 100%; height: 4px; background: rgba(255, 215, 0, 0.8); box-shadow: 0 0 15px var(--gold-accent); z-index: 15; top: 0; animation: laserMove 2s infinite ease-in-out; }
                @keyframes laserMove { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
                
                .step-capture-box { display: flex; flex-direction: column; }
                .step-indicator-p { font-size: 11px; font-weight: 800; color: var(--slate-muted); text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px; }
                .btn-reset-p { width: 100%; margin-top: 10px; background: none; border: none; color: var(--slate-muted); font-size: 12px; font-weight: 700; cursor: pointer; text-decoration: underline; }
                
                .ready-alert { background: #f0fdf4; color: #166534; padding: 10px; border-radius: 10px; font-weight: 800; font-size: 13px; margin-bottom: 15px; text-align: center; border: 1px solid #bbf7d0; }

                .btn-reg-main { width: 100%; padding: 16px; background: var(--navy-primary); color: white; border: none; border-radius: 14px; font-weight: 800; font-size: 16px; cursor: pointer; transition: 0.2s; box-shadow: 0 8px 20px rgba(11, 26, 42, 0.2); }
                .btn-reg-main:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(11, 26, 42, 0.3); }
                .btn-reg-main:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; }
                
                .capture-overlay-active { position: absolute; inset: 0; background: rgba(11, 26, 42, 0.7); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; backdrop-filter: blur(2px); }
                .instruction-badge-p { background: var(--gold-accent); color: var(--navy-primary); padding: 12px 24px; border-radius: 50px; font-weight: 900; font-size: 20px; margin-bottom: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); animation: pulse 1.5s infinite; }
                @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
                .progress-p-box { width: 80%; text-align: center; }
                .p-text { color: white; font-weight: 800; margin-bottom: 10px; font-size: 14px; }
                .p-bar-bg { width: 100%; height: 8px; background: rgba(255,255,255,0.2); border-radius: 10px; overflow: hidden; }
                .p-bar-fill { height: 100%; background: var(--gold-accent); transition: width 0.1s; }

                .dataset-ready-box { display: flex; flex-direction: column; gap: 16px; width: 100%; }
                .dataset-preview-row { display: flex; gap: 6px; justify-content: center; }
                .mini-thumb { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; border: 1px solid #e2e8f0; }
                .thumb-more { width: 40px; height: 40px; background: #f1f5f9; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: var(--navy-primary); }
                
                .btn-group-p { display: flex; gap: 10px; }
                .btn-retry-p { flex: 1; padding: 12px; background: #f1f5f9; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; color: var(--slate-muted); }
                .btn-save-p { flex: 2; padding: 12px; background: var(--navy-primary); color: white; border: none; border-radius: 10px; font-weight: 800; cursor: pointer; }

                .reg-hint { font-size: 12px; color: var(--slate-muted); text-align: center; margin-top: 16px; line-height: 1.6; }

                @media (max-width: 1000px) { .registration-layout { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    );
}

export default RegistrationTab;
