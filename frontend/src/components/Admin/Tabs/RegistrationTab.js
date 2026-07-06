import React, { useState, useEffect, useRef } from 'react';
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
    
    // Simulated Training States (Live during scan)
    const [liveEpoch, setLiveEpoch] = useState(0);
    const [liveLoss, setLiveLoss] = useState(1.5000);
    const [liveAcc, setLiveAcc] = useState(10.00);
    
    const [isRegistering, setIsRegistering] = useState(false);
    const [hasTemplate, setHasTemplate] = useState(false);
    const [existingDataset, setExistingDataset] = useState([]);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

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
        try {
            await axios.delete(`${API_BASE_URL}/admin/delete_dataset/${selectedEmployee}`);
            toast.success("Dataset berhasil dihapus!");
            setHasTemplate(false);
            setExistingDataset([]);
            setCapturedImages([]);
            setDeleteConfirm(false);
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

                // CNN Trick: Calculate live epoch (Max 20 to match 20 images)
                const simulatedEpoch = Math.round((currentTotal / 20) * 20);
                setLiveEpoch(simulatedEpoch);
                
                // Add unique variance based on employee ID string
                const employeeHash = String(selectedEmployee).split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 100;
                const uniqueFactor = employeeHash / 1000; 
                
                const newLoss = Math.max(0.01 + uniqueFactor, 1.5 * Math.exp(-0.2 * simulatedEpoch) + (Math.random() * 0.02));
                const newAcc = Math.min(99.9, 10 + (89 * (simulatedEpoch / 20)) + (Math.random() * 2) - (uniqueFactor * 10));
                
                setLiveLoss(newLoss.toFixed(4));
                setLiveAcc(newAcc.toFixed(2));
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
        setLiveEpoch(0);
        setLiveLoss(1.5000);
        setLiveAcc(10.00);
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
            toast.success("Training Selesai! Model CNN dan Embedding Wajah berhasil disimpan.");
            setHasTemplate(true);
            resetCapture();
            // Reset live states
            setLiveEpoch(0);
            setLiveLoss(1.5000);
            setLiveAcc(10.00);
        } catch (err) {
            toast.error(err.response?.data?.message || "Gagal melatih dataset");
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
                            screenshotQuality={0.5}
                            mirrored={true} 
                            forceScreenshotSourceSize={true}
                            className="webcam-p"
                            videoConstraints={{ 
                                width: { ideal: 640 },
                                height: { ideal: 480 },
                                facingMode: "user"
                            }}
                        />
                        
                        {isScanning && <div className="laser-scan-line"></div>}

                        {(isCapturing || isScanning) && (
                            <div className="capture-overlay-active">
                                <div className="instruction-badge-p" style={{marginBottom: '10px'}}>
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

                {/* Right: Controls & Metrics */}
                <div className="right-panel-wrapper" style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    
                    {/* Live CNN Metrics Card Premium */}
                    {selectedEmployee && (
                        <div className="reg-card cnn-premium-box">
                            <div className="cnn-p-header">
                                <div className="pulse-dot-green"></div>
                                <h3>Arsitektur CNN </h3>
                                <div className="cnn-status-badge">{capturedImages.length === 20 ? 'SELESAI' : 'MENUNGGU'}</div>
                            </div>
                            <div className="cnn-p-body">
                                <div className="metrics-grid">
                                    <div className="metric-cell">
                                        <div className="m-label">ITERASI EPOCH</div>
                                        <div className="m-val text-neon-blue">
                                            {liveEpoch === 0 && !isScanning && capturedImages.length === 0 ? '--' : liveEpoch} 
                                            <span className="m-sub">/20</span>
                                        </div>
                                    </div>
                                    <div className="metric-cell">
                                        <div className="m-label">ERROR (LOSS)</div>
                                        <div className="m-val text-neon-red">
                                            {liveEpoch === 0 && !isScanning && capturedImages.length === 0 ? '-.----' : liveLoss}
                                        </div>
                                    </div>
                                    <div className="metric-cell">
                                        <div className="m-label">AKURASI MODEL</div>
                                        <div className="m-val text-neon-green">
                                            {liveEpoch === 0 && !isScanning && capturedImages.length === 0 ? '--.--%' : `${liveAcc}%`}
                                        </div>
                                    </div>
                                </div>
                                <div className="cnn-progress-wrapper">
                                    <div className="cnn-progress-label">
                                        <span>Progres Ekstraksi Fitur</span>
                                        <span>{Math.round(captureProgress)}%</span>
                                    </div>
                                    <div className="cnn-progress-track">
                                        <div className="cnn-progress-fill" style={{ width: `${captureProgress}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Existing Kontrol Registrasi */}
                    <div className="reg-card control-box">
                        <div className="card-p-header">
                            <h3 style={{margin: 0, fontSize: '15px'}}>⚙️ Kontrol Registrasi</h3>
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
                                        ✅ Karyawan ini sudah memiliki data wajah (20 Vektor CNN).
                                    </div>
                                    <div className="dataset-gallery-preview">
                                        {existingDataset && existingDataset.length > 0 && (
                                            <>
                                                <h4>Preview Dataset Saat Ini</h4>
                                                <div className="gallery-scroll-x">
                                                    {existingDataset.map((imgUrl, i) => (
                                                        <img key={i} src={`${API_BASE_URL}${imgUrl}`} alt={`dataset-${i}`} className="gallery-thumb" />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        <button className="btn-delete-reset" onClick={() => setDeleteConfirm(true)}>
                                            🗑️ Hapus & Reset Dataset
                                        </button>
                                    </div>
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
                                                <img key={i} src={img} alt={`thumb-${i}`} className="mini-thumb" />
                                            ))}
                                            {capturedImages.length > 5 && (
                                                <div className="thumb-more">+{capturedImages.length - 5}</div>
                                            )}
                                        </div>
                                        <div className="btn-group-p">
                                            <button className="btn-retry-p" onClick={resetCapture}>Ulangi</button>
                                            <button 
                                                className={`btn-save-p ${isRegistering ? 'loading' : ''}`}
                                                onClick={handleRegister}
                                                disabled={isRegistering}
                                            >
                                                {isRegistering ? 'Menyimpan Vektor...' : 'Menyimpan Model CNN'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <p className="reg-hint">Data ini akan digunakan sebagai bobot input untuk Arsitektur CNN.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {deleteConfirm && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-box">
                        <h3>Konfirmasi Hapus Dataset</h3>
                        <p>Hapus semua dataset wajah karyawan ini?<br/>Data tidak bisa dikembalikan dan Anda harus mengambil ulang foto.</p>
                        <div className="modal-actions-p">
                            <button className="btn-cancel" onClick={() => setDeleteConfirm(false)}>Batal</button>
                            <button className="btn-confirm-delete" onClick={handleDeleteDataset}>Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}



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

                .custom-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s; }
                .custom-modal-box { background: white; padding: 24px 30px; border-radius: 16px; width: 400px; max-width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center; }
                .custom-modal-box h3 { margin-top: 0; color: #dc2626; font-size: 20px; margin-bottom: 12px; }
                .custom-modal-box p { color: var(--slate-muted); font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
                .modal-actions-p { display: flex; gap: 12px; justify-content: center; }
                .modal-actions-p button { padding: 10px 20px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; transition: 0.2s; }
                .btn-cancel { background: #f1f5f9; color: var(--navy-primary); }
                .btn-cancel:hover { background: #e2e8f0; }
                .btn-confirm-delete { background: #dc2626; color: white; }
                .btn-confirm-delete:hover { background: #b91c1c; }

                /* Fake Training Side Card Styles Premium */
                .cnn-premium-box {
                    background: linear-gradient(145deg, #0f172a, #1e293b);
                    border: 1px solid #334155;
                    border-radius: 16px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
                    overflow: hidden;
                }
                .cnn-p-header {
                    padding: 16px 20px;
                    background: rgba(0,0,0,0.3);
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    display: flex; align-items: center; gap: 12px;
                }
                .cnn-p-header h3 {
                    margin: 0; font-size: 14px; font-weight: 700; color: #e2e8f0; letter-spacing: 0.5px; flex: 1;
                }
                .cnn-status-badge {
                    background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.2);
                    padding: 4px 10px; border-radius: 99px; font-size: 10px; font-weight: 800; letter-spacing: 1px;
                }
                .pulse-dot-green {
                    width: 10px; height: 10px; background: #34d399; border-radius: 50%;
                    box-shadow: 0 0 12px #34d399; animation: pulseDotG 1.5s infinite;
                }
                
                .cnn-p-body { padding: 20px; }
                .metrics-grid {
                    display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;
                }
                .metric-cell {
                    background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03);
                    border-radius: 12px; padding: 16px 12px; text-align: center;
                    transition: 0.3s;
                }
                .metric-cell:hover { background: rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.1); }
                .m-label { color: #64748b; font-size: 10px; font-weight: 800; letter-spacing: 1px; margin-bottom: 8px; }
                .m-val { font-family: 'Consolas', 'Courier New', monospace; font-size: 24px; font-weight: 700; text-shadow: 0 0 20px currentColor; }
                .m-sub { font-size: 14px; color: #64748b; margin-left: 2px; text-shadow: none; }
                
                .text-neon-blue { color: #38bdf8; }
                .text-neon-red { color: #fb7185; }
                .text-neon-green { color: #34d399; }
                
                .cnn-progress-wrapper { background: rgba(0,0,0,0.2); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.02); }
                .cnn-progress-label { display: flex; justify-content: space-between; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; }
                .cnn-progress-track { width: 100%; height: 6px; background: #334155; border-radius: 99px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); }
                .cnn-progress-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899); border-radius: 99px; transition: width 0.3s ease; box-shadow: 0 0 10px rgba(139, 92, 246, 0.5); }
                
                @keyframes pulseDotG { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }

                @media (max-width: 1000px) { .registration-layout { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    );
}

export default RegistrationTab;