import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import Webcam from 'react-webcam';
import { toast } from 'react-toastify';

function RegistrationTab({ employees, onRefresh }) {
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCamActive, setIsCamActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const webcamRef = useRef(null);

    // Filter employees based on search
    const filteredEmployees = employees.filter(emp => 
        emp.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.kode_karyawan.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const viewArea = document.querySelector('.layout-view-area');
        if (viewArea) {
            viewArea.style.overflow = 'hidden';
            viewArea.style.padding = '16px 24px';
        }
        return () => {
            if (viewArea) viewArea.style.overflow = 'auto';
        };
    }, []);

    const capture = () => {
        const image = webcamRef.current.getScreenshot();
        setCapturedImage(image);
        toast.info("Wajah berhasil ditangkap!");
    };

    const handleSaveTemplate = async () => {
        if (!selectedEmployee || !capturedImage) return;

        setIsSaving(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/admin/register_face`, {
                karyawan_id: selectedEmployee.karyawan_id,
                image: capturedImage
            });
            toast.success(response.data.message);
            setCapturedImage(null);
            setIsCamActive(false);
            onRefresh(); 
        } catch (error) {
            toast.error(error.response?.data?.message || "Gagal menyimpan template");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="registration-tab-container animate-fade-in">
            <div className="registration-header-block">
                <h1>Pendaftaran Wajah Karyawan</h1>
                <p>Registrasi template wajah untuk verifikasi kehadiran otomatis.</p>
            </div>

            {/* Row 1: Search Section */}
            <div className="search-section-box">
                <div className="search-header">
                    <p className="label-bold">Pilih Karyawan</p>
                    <div className="search-input-wrapper">
                        <span className="search-icon">🔍</span>
                        <input 
                            type="text" 
                            placeholder="Cari berdasarkan nama atau kode karyawan..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <div className="search-results-dropdown">
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map(emp => (
                                        <div 
                                            key={emp.user_id} 
                                            className="search-item"
                                            onClick={() => {
                                                setSelectedEmployee(emp);
                                                setSearchQuery('');
                                            }}
                                        >
                                            <span className="emp-name">{emp.username}</span>
                                            <span className="emp-code">{emp.kode_karyawan}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-result">Tidak ditemukan</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 2: Main Grid */}
            <div className="registration-main-grid">
                {/* Info Panel */}
                <div className="info-panel-card">
                    <div className="panel-header">
                        <h3>Info Karyawan</h3>
                    </div>
                    {selectedEmployee ? (
                        <div className="info-content-list">
                            <div className="info-row">
                                <span className="i-label">KODE KARYAWAN:</span>
                                <span className="i-val">{selectedEmployee.kode_karyawan}</span>
                            </div>
                            <div className="info-row">
                                <span className="i-label">NAMA LENGKAP:</span>
                                <span className="i-val bold">{selectedEmployee.username}</span>
                            </div>
                            <div className="info-row">
                                <span className="i-label">EMAIL:</span>
                                <span className="i-val">{selectedEmployee.email}</span>
                            </div>
                            <div className="info-row">
                                <span className="i-label">JABATAN:</span>
                                <span className="i-val">Staff Operasional</span>
                            </div>
                            <div className="info-row">
                                <span className="i-label">STATUS KERJA:</span>
                                <span className="status-badge-imp active">
                                    <div className="dot"></div> {selectedEmployee.status_kerja}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-info-state">
                            <p>Silakan pilih karyawan terlebih dahulu.</p>
                        </div>
                    )}
                </div>

                {/* Camera Panel */}
                <div className="camera-panel-card">
                    <div className="panel-header">
                        <h3>Preview Kamera</h3>
                    </div>
                    <div className="camera-viewport-container">
                        {!isCamActive ? (
                            <div className="camera-placeholder">
                                <div className="placeholder-icon">📷</div>
                                <button className="btn-start-cam" onClick={() => setIsCamActive(true)}>Mulai Kamera</button>
                            </div>
                        ) : !capturedImage ? (
                            <div className="webcam-live-box">
                                <div className="registration-mirror-wrapper">
                                    <Webcam 
                                        audio={false} 
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        className="webcam-raw"
                                        videoConstraints={{
                                            width: 640,
                                            height: 480,
                                            facingMode: "user"
                                        }}
                                    />
                                    <div className="webcam-overlay-ui">
                                        <div className="focus-bracket top-left"></div>
                                        <div className="focus-bracket top-right"></div>
                                        <div className="focus-bracket bottom-left"></div>
                                        <div className="focus-bracket bottom-right"></div>
                                        <div className="scan-bar"></div>
                                    </div>
                                </div>
                                <button className="btn-capture-imp absolute-center" onClick={capture}>
                                    <span className="ic">📸</span> Ambil Foto Wajah
                                </button>
                            </div>
                        ) : (
                            <div className="webcam-live-box">
                                <img src={capturedImage} alt="Captured" className="result-img mirrored" />
                                <div className="result-controls-row absolute-bottom">
                                    <button className="btn-retake-vertical" onClick={() => setCapturedImage(null)}>
                                        <span className="icon">🔄</span> Scan Ulang
                                    </button>
                                    <button 
                                        className="btn-save-vertical" 
                                        onClick={handleSaveTemplate}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Menyimpan...' : '✅ Simpan Template'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 3: Footer Status */}
            <div className="registration-status-footer">
                <div className="registration-status-node">
                    <span className="s-label">BIOMETRIC STATUS:</span>
                    <div className={`s-info-box ${selectedEmployee?.has_template > 0 ? 'success' : 'warning'}`}>
                        <span className="i-icon">{selectedEmployee?.has_template > 0 ? '✅' : '⚠️'}</span>
                        <p>
                            {selectedEmployee?.has_template > 0 
                                ? 'Template wajah sudah terdaftar.' 
                                : 'Belum ada template aktif.'}
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                .registration-tab-container { display: flex; flex-direction: column; gap: 16px; height: 100%; color: var(--navy-primary); overflow-y: auto; padding-bottom: 20px; }
                .registration-header-block h1 { font-size: 24px; font-weight: 800; margin-bottom: 2px; }
                .registration-header-block p { font-size: 13px; color: var(--slate-muted); }

                /* Search Section */
                .search-section-box { background: white; padding: 12px 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
                .search-input-wrapper { position: relative; width: 100%; max-width: 500px; }
                .search-input-wrapper input { 
                    width: 100%; padding: 10px 14px 10px 36px; border-radius: 10px; border: 2px solid #f1f5f9;
                    font-size: 13px; font-weight: 600;
                }
                .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; z-index: 10; }

                .search-results-dropdown {
                    position: absolute; top: calc(100% + 5px); left: 0; right: 0; background: white; z-index: 999;
                    border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    max-height: 200px; overflow-y: auto; border: 1px solid #f1f5f9;
                }
                .search-item { 
                    padding: 10px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;
                    border-bottom: 1px solid #f8fafc; transition: 0.2s;
                }
                .search-item:hover { background: #f0f7ff; }
                .search-item .emp-name { font-weight: 700; font-size: 13px; color: var(--navy-primary); }
                .search-item .emp-code { font-size: 10px; font-weight: 600; color: var(--slate-muted); background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
                .no-result { padding: 12px; text-align: center; color: var(--slate-muted); font-size: 12px; }
                
                /* Main Grid */
                .registration-main-grid { display: grid; grid-template-columns: 350px 1fr; gap: 16px; }
                .info-panel-card, .camera-panel-card { 
                    background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); 
                    display: flex; flex-direction: column; overflow: hidden;
                }
                .panel-header { padding: 12px 20px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; }
                .panel-header h3 { font-size: 14px; font-weight: 800; }

                .info-content-list { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
                .info-row { display: flex; align-items: center; justify-content: flex-start; gap: 12px; }
                .i-label { font-size: 10px; font-weight: 800; color: var(--slate-muted); text-transform: uppercase; width: 110px; flex-shrink: 0; }
                .i-val { font-size: 14px; font-weight: 600; color: var(--navy-primary); word-break: break-all; }
                .i-val.bold { font-weight: 900; }

                /* Camera Styles */
                .camera-viewport-container { padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
                .camera-placeholder, .webcam-live-box, .captured-result-box { 
                    width: 520px; 
                    height: 390px;
                    border-radius: 10px; background: #0b1a2a; 
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    position: relative; overflow: hidden;
                    border: 4px solid #f1f5f9;
                }
                .placeholder-icon { font-size: 48px; opacity: 0.2; color: white; margin-bottom: 20px; }
                
                .btn-start-cam { 
                    background: rgba(255,255,255,0.1); color: white; border: 1.5px solid rgba(255,255,255,0.2); 
                    padding: 8px 20px; border-radius: 100px; font-weight: 700; cursor: pointer;
                }

                .btn-capture-imp.absolute-center { 
                    position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%);
                    background: var(--gold-accent); color: var(--navy-primary); padding: 12px 40px; border-radius: 100px;
                    border: 2px solid rgba(0,0,0,0.1); font-weight: 800; font-size: 15px; cursor: pointer;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.4); z-index: 50; transition: 0.2s;
                    display: flex; align-items: center; gap: 8px;
                }
                .btn-capture-imp.absolute-center:hover { transform: translateX(-50%) scale(1.05); }

                .registration-mirror-wrapper { position: absolute; inset: 0; transform: scaleX(-1); }
                .webcam-raw { width: 100%; height: 100%; object-fit: cover; }
                
                .result-img { width: 100%; height: 100%; object-fit: cover; }
                .result-img.mirrored { transform: scaleX(-1); }
                
                .result-controls-row.absolute-bottom { 
                    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
                    width: 90%; display: flex; gap: 12px; z-index: 50;
                }
                .btn-retake-vertical, .btn-save-vertical { flex: 1; padding: 10px; border-radius: 10px; font-weight: 800; cursor: pointer; font-size: 13px; }
                .btn-retake-vertical { background: #f8fafc; color: var(--navy-primary); border: 1.5px solid #e2e8f0; }
                .btn-save-vertical { background: var(--navy-primary); color: white; border: none; }
                .btn-save-vertical:disabled { opacity: 0.5; }

                /* Status Footer */
                .registration-status-footer { background: #fdfcf6; padding: 12px 24px; border-radius: 12px; border: 1px solid #fef3c7; }
                .registration-status-node { display: flex; align-items: center; gap: 16px; }
                .s-label { font-size: 12px; font-weight: 900; color: #92400e; }
                .status-badge-imp { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; width: fit-content; padding: 4px 12px; border-radius: 100px; }
                .status-badge-imp.active { color: #065f46; background: #ecfdf5; border: 1px solid #d1fae5; }
                .status-badge-imp .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
                .s-info-box { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #b45309; }
                .s-info-box.success { color: #065f46; }
            `}</style>
        </div>
    );
}

export default RegistrationTab;
