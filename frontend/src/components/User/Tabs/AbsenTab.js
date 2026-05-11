import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';

function AbsenTab({ webcamRef, canvasRef, scanStatus, attendanceStatus, todaySchedule, recognizedUser, isSubmitting, onSubmit, onReset, minConfidence }) {
    const [absensiType, setAbsensiType] = useState('masuk');
    const canSubmit = recognizedUser && recognizedUser.confidence >= (minConfidence || 85);

    // Smart logic to determine if current tab is locked
    const isModeDone = absensiType === 'masuk' ? attendanceStatus.masuk : attendanceStatus.pulang;
    
    // Time validation for Checkout (Pulang)
    const [isEarlyCheckout, setIsEarlyCheckout] = useState(false);
    useEffect(() => {
        if (absensiType === 'pulang' && todaySchedule && todaySchedule.jam_pulang) {
            const now = new Date();
            const [h, m, s] = todaySchedule.jam_pulang.split(':').map(Number);
            const checkoutGate = new Date();
            checkoutGate.setHours(h, m, s || 0, 0);

            if (now < checkoutGate) {
                setIsEarlyCheckout(true);
            } else {
                setIsEarlyCheckout(false);
            }
        } else {
            setIsEarlyCheckout(false);
        }
    }, [absensiType, todaySchedule]);

    const isLocked = isModeDone || isEarlyCheckout;

    const getLockMessage = () => {
        if (isModeDone) {
            return {
                title: "Absensi Selesai",
                desc: `Anda sudah melakukan absensi ${absensiType} hari ini.`
            };
        }
        if (isEarlyCheckout) {
            return {
                title: "Belum Jam Pulang",
                desc: `Sistem absen pulang baru dibuka jam ${todaySchedule.jam_pulang.substring(0, 5)}. Harap bersabar.`
            };
        }
        return null;
    };

    const lockMsg = getLockMessage();

    // Aggressive scroll lock on mount, unlock on unmount
    useEffect(() => {
        const viewArea = document.querySelector('.layout-view-area');
        const rootElements = [document.body, document.documentElement];
        
        if (viewArea) {
            viewArea.style.overflow = 'hidden';
            viewArea.style.padding = '0'; 
            viewArea.scrollTop = 0;
        }

        rootElements.forEach(el => {
            el.style.overflow = 'hidden';
            el.style.height = '100%';
        });

        return () => {
            if (viewArea) {
                viewArea.style.overflow = 'auto';
                viewArea.style.padding = '32px';
            }
            rootElements.forEach(el => {
                el.style.overflow = '';
                el.style.height = '';
            });
        };
    }, []);

    return (
        <div className="static-absen-container animate-fade-in">
            <div className="absen-centered-card">
                {/* Formal Header */}
                <div className="absen-card-header">
                    <div className="header-brand-box">
                        <span className="brand-logo">IMP</span>
                        <div className="brand-v-divider"></div>
                        <h3>Absensi Wajah</h3>
                    </div>
                    <div className="header-status-pill">
                        <div className={`status-dot ${isLocked ? 'locked' : 'active'}`}></div>
                        <span>{isLocked ? 'Sistem Terkunci' : 'Kamera Aktif'}</span>
                    </div>
                </div>

                <div className="absen-card-body">
                    {/* Mode Selector */}
                    <div className="absen-mode-selector">
                        <p className="selection-label">Jenis Absensi</p>
                        <div className="radio-group">
                            <label className={`radio-item ${absensiType === 'masuk' ? 'selected' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="type" 
                                    value="masuk" 
                                    checked={absensiType === 'masuk'}
                                    onChange={(e) => setAbsensiType(e.target.value)}
                                />
                                <span className="custom-radio"></span>
                                Masuk
                            </label>
                            <label className={`radio-item ${absensiType === 'pulang' ? 'selected' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="type" 
                                    value="pulang" 
                                    checked={absensiType === 'pulang'}
                                    onChange={(e) => setAbsensiType(e.target.value)}
                                />
                                <span className="custom-radio"></span>
                                Pulang
                            </label>
                        </div>
                    </div>

                    {/* Camera Section with Smart Blocking */}
                    <div className="absen-camera-section">
                        <div className="preview-label">Preview Kamera</div>
                        <div className="camera-viewport-wrapper">
                            {isLocked ? (
                                <div className="blocked-view-overlay">
                                    <div className="lock-icon">{isEarlyCheckout ? '🕒' : '🔒'}</div>
                                    <h3>{lockMsg?.title}</h3>
                                    <p>{lockMsg?.desc}</p>
                                </div>
                            ) : (
                                <>
                                <div className="webcam-mirror-wrapper">
                                    <Webcam 
                                        audio={false} 
                                        ref={webcamRef} 
                                        screenshotFormat="image/jpeg" 
                                        className="webcam-source"
                                        videoConstraints={{
                                            width: 640,
                                            height: 480,
                                            facingMode: "user"
                                        }}
                                    />
                                </div>
                                <canvas ref={canvasRef} className="scan-canvas-overlay" />
                                <div className="kiosk-frame"></div>
                                <div className="scanner-line"></div>
                                <div className="live-status-badge">{scanStatus}</div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Action & Result Area */}
                    {!isLocked && !recognizedUser && (
                        <div className="absen-actions">
                            <button className="btn-secondary" onClick={() => window.location.reload()}>Mulai Kamera</button>
                            <button className="btn-primary-imp" onClick={onReset}>Scan Wajah</button>
                        </div>
                    )}

                    {/* Manual Validation Block */}
                    {!isLocked && recognizedUser && (
                        <div className="absen-validation-block animate-slide-up">
                            <div className="validation-header">
                                <div className="user-avatar-placeholder">👤</div>
                                <div className="user-meta">
                                    <h4>{recognizedUser.username}</h4>
                                    <p className={`confidence-tag ${canSubmit ? 'high' : 'low'}`}>
                                        Akurasi: {recognizedUser.confidence.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                            
                            {!canSubmit && (
                                <div className="threshold-warning">
                                    ⚠️ Akurasi di bawah batas minimal (85%). Silakan pindah ke posisi dengan cahaya lebih baik.
                                </div>
                            )}

                            <div className="validation-buttons">
                                <button className="btn-reset-light" onClick={onReset}>Scan Ulang</button>
                                <button 
                                    className={`btn-submit-main ${canSubmit && !isSubmitting ? 'active' : 'disabled'}`}
                                    onClick={() => {
                                        if (canSubmit && !isSubmitting) {
                                            const image = webcamRef.current.getScreenshot();
                                            onSubmit(absensiType, image);
                                        }
                                    }}
                                    disabled={!canSubmit || isSubmitting}
                                >
                                    {isSubmitting ? 'Menyimpan...' : `Simpan Absensi ${absensiType.toUpperCase()}`}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Result Card (Academic Match) */}
                    {isModeDone && (
                        <div className="absen-result-footer animate-slide-up">
                            <div className="result-info">
                                <div className="info-node">
                                    <span className="n-label">Hasil:</span>
                                    <span className="n-val text-success">Absensi Berhasil</span>
                                </div>
                                <div className="info-node">
                                    <span className="n-label">Status:</span>
                                    <span className="n-pill success">Selesai {absensiType.replace('_', ' ').toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .static-absen-container {
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    height: calc(100vh - 80px);
                    width: 100%;
                    padding: 40px 20px;
                    overflow-y: auto;
                    background: #f8fafc;
                    position: relative;
                    scrollbar-width: none;
                }
                .static-absen-container::-webkit-scrollbar { display: none; }

                .absen-centered-card {
                    background: white;
                    width: 95%;
                    max-width: 800px;
                    border-radius: 20px;
                    box-shadow: 0 40px 80px -12px rgba(0,0,0,0.2);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    flex-shrink: 0;
                    margin-bottom: 20px; 
                    animation: cardEntrance 0.6s cubic-bezier(0.23, 1, 0.32, 1);
                }

                @keyframes cardEntrance {
                    from { opacity: 0; transform: scale(0.95) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }

                .absen-card-header {
                    background: var(--navy-primary);
                    padding: 16px 32px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: white;
                    flex-shrink: 0;
                }

                .header-brand-box { display: flex; align-items: center; gap: 12px; }
                .brand-logo { font-weight: 950; color: var(--gold-accent); font-size: 18px; letter-spacing: -1px; }
                .brand-v-divider { width: 1px; height: 16px; background: rgba(255,255,255,0.2); }
                .header-brand-box h3 { font-size: 14px; font-weight: 800; letter-spacing: 0.5px; }

                .header-status-pill {
                    background: rgba(255,255,255,0.1);
                    padding: 4px 12px;
                    border-radius: 100px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                }

                .status-dot { width: 6px; height: 6px; border-radius: 50%; }
                .status-dot.active { background: #10b981; box-shadow: 0 0 10px #10b981; animation: pulse 2s infinite; }
                .status-dot.locked { background: #ef4444; }

                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }

                .absen-card-body { 
                    padding: 20px 32px 12px 32px; 
                    overflow-y: auto; 
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    scrollbar-width: none;
                }
                .absen-card-body::-webkit-scrollbar { display: none; }

                .absen-mode-selector { margin-bottom: 16px; flex-shrink: 0; }
                .selection-label { font-size: 11px; font-weight: 800; color: var(--slate-muted); text-transform: uppercase; margin-bottom: 8px; }
                
                .radio-group { display: flex; gap: 12px; }
                .radio-item {
                    display: flex; align-items: center; gap: 8px; cursor: pointer;
                    font-weight: 700; color: var(--navy-primary); font-size: 13px;
                    padding: 8px 16px; border-radius: 10px; border: 2px solid #f1f5f9;
                }
                .radio-item:hover { background: #f8fafc; }
                .radio-item.selected { border-color: var(--gold-accent); background: rgba(249, 188, 47, 0.05); }

                .absen-camera-section { 
                    margin-bottom: 20px; 
                    flex: 1; 
                    display: flex; 
                    flex-direction: column; 
                    min-height: 0;
                    align-items: center;
                }
                .preview-label { font-size: 11px; font-weight: 800; color: var(--slate-muted); margin-bottom: 8px; flex-shrink: 0; align-self: flex-start; }
                
                .camera-viewport-wrapper {
                    /* FIXED DIMENSIONS AS SUGGESTED FOR MAXIMUM COORDINATE STABILITY */
                    width: 640px; 
                    height: 480px;
                    background: #000; 
                    border-radius: 12px;
                    position: relative; 
                    overflow: hidden; 
                    border: 4px solid #e2e8f0;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                .webcam-mirror-wrapper {
                    position: absolute; inset: 0;
                    transform: scaleX(-1);
                }
                .webcam-source { width: 100%; height: 100%; object-fit: cover; }
                .scan-canvas-overlay { 
                    position: absolute; top: 0; left: 0; 
                    width: 100%; height: 100%; 
                    z-index: 5; 
                    object-fit: cover; 
                    pointer-events: none; 
                }
                .scanner-line { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: var(--gold-accent); box-shadow: 0 0 15px var(--gold-accent); z-index: 10; animation: scanAnim 3s linear infinite; }
                @keyframes scanAnim { 0% { top: 0; } 100% { top: 100%; } }

                .blocked-view-overlay {
                    width: 100%; height: 100%; background: #0f172a;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    color: white; text-align: center; padding: 40px;
                }
                .lock-icon { font-size: 48px; margin-bottom: 20px; opacity: 0.5; }
                .blocked-view-overlay h3 { font-size: 20px; font-weight: 800; margin-bottom: 12px; color: var(--gold-accent); }
                .blocked-view-overlay p { font-size: 14px; opacity: 0.7; line-height: 1.6; }

                .absen-actions { display: flex; gap: 16px; }
                .btn-secondary { flex: 1; padding: 14px; border-radius: 12px; border: 2px solid #e2e8f0; font-weight: 700; cursor: pointer; background: white; }
                .btn-primary-imp { flex: 1.5; padding: 14px; border-radius: 12px; background: var(--navy-primary); color: white; border: none; font-weight: 800; cursor: pointer; box-shadow: 0 4px 12px rgba(11, 26, 42, 0.3); }

                .absen-result-footer { margin-top: 16px; padding: 16px 24px; background: #f0fdf4; border-radius: 16px; border: 1px solid #bbf7d0; flex-shrink: 0; }
                .result-info { display: flex; justify-content: space-between; align-items: center; }
                .info-node { display: flex; flex-direction: column; gap: 4px; }
                .n-label { font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; }
                .n-val { font-size: 16px; font-weight: 800; }
                .n-pill { padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 800; }
                .n-pill.success { background: #dcfce7; color: #166534; }

                /* Validation Styles */
                .absen-validation-block { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 20px; }
                .validation-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
                .user-avatar-placeholder { width: 50px; height: 50px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; }
                .user-meta h4 { font-size: 18px; font-weight: 800; color: var(--navy-primary); }
                .confidence-tag { font-size: 13px; font-weight: 700; margin-top: 4px; }
                .confidence-tag.high { color: #10b981; }
                .confidence-tag.low { color: #ef4444; }

                .threshold-warning { background: #fffbeb; color: #92400e; padding: 12px; border-radius: 8px; font-size: 12px; font-weight: 600; margin-bottom: 16px; border: 1px solid #fef3c7; }

                .validation-buttons { display: flex; gap: 12px; }
                .btn-reset-light { flex: 1; padding: 12px; border-radius: 10px; border: 1.5px solid #cbd5e1; background: white; font-weight: 600; cursor: pointer; }
                .btn-submit-main { flex: 2; padding: 12px; border-radius: 10px; border: none; font-weight: 800; cursor: pointer; transition: all 0.2s; }
                .btn-submit-main.active { background: #10b981; color: white; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
                .btn-submit-main.active:hover { transform: translateY(-2px); }
                .btn-submit-main.disabled { background: #94a3b8; color: #f1f5f9; cursor: not-allowed; }

                .live-status-badge {
                    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
                    background: rgba(11, 26, 42, 0.8); backdrop-filter: blur(4px);
                    color: white; padding: 8px 20px; border-radius: 100px;
                    font-size: 12px; font-weight: 800; z-index: 10;
                    border: 1px solid rgba(255,255,255,0.1);
                    pointer-events: none; white-space: nowrap;
                }

                @media (max-width: 650px) {
                    .static-absen-container {
                        height: calc(100vh - 60px);
                        padding: 20px 10px;
                    }
                    .absen-centered-card { 
                        max-width: 100%; 
                        border-radius: 12px; 
                        height: auto; 
                        margin-bottom: 20px; 
                    }
                    .absen-card-body { padding: 20px; }
                    .radio-group { flex-direction: column; gap: 8px; }
                }
            `}</style>
        </div>
    );
}

export default AbsenTab;
