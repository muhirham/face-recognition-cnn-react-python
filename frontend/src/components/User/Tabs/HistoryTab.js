import React, { useState } from 'react';
import API_BASE_URL from '../../../apiConfig';

function HistoryTab({ history }) {
    const [selectedImage, setSelectedImage] = useState(null);

    const formatDuration = (minutes) => {
        if (!minutes || minutes <= 0) return '';
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}j ${m}m` : `${h}j`;
    };

    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header">
                <h2>Riwayat Absensi</h2>
                <p>Seluruh data kehadiran Anda yang tercatat oleh sistem.</p>
            </div>

            <div className="history-card">
                <div className="table-responsive">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th style={{ width: '80px' }}>Foto</th>
                                <th>Tanggal</th>
                                <th>Waktu</th>
                                <th>Tipe</th>
                                <th>Status Kehadiran</th>
                                <th>Akurasi (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? (
                                history.map((log, index) => (
                                    <tr key={index}>
                                        <td data-label="Foto">
                                            <div className="att-photo-circle">
                                                {log.foto_absen ? (
                                                    <img 
                                                        src={`${API_BASE_URL}/static/attendance_photos/${log.foto_absen}`} 
                                                        alt="Face" 
                                                        onClick={() => setSelectedImage(`${API_BASE_URL}/static/attendance_photos/${log.foto_absen}`)}
                                                        className="clickable-image"
                                                    />
                                                ) : (
                                                    <span className="no-pic">?</span>
                                                )}
                                            </div>
                                        </td>
                                        <td data-label="Tanggal">{log.tanggal}</td>
                                        <td data-label="Waktu"><strong>{log.waktu}</strong></td>
                                        <td data-label="Tipe">{log.jenis}</td>
                                        <td data-label="Status">
                                            <span className={`status-badge ${log.status}`}>
                                                {log.status.replace('_', ' ')}
                                                {log.status === 'terlambat' && log.menit_terlambat > 0 && (
                                                    <span className="delay-text"> ({formatDuration(log.menit_terlambat)})</span>
                                                )}
                                            </span>
                                        </td>
                                        <td data-label="Akurasi">
                                            <span className={`acc-val ${log.confidence_score < 75 ? 'low' : 'high'}`}>
                                                {log.confidence_score}%
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="empty-state">Belum ada data riwayat absensi.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Image Viewer Modal */}
            {selectedImage && (
                <div className="image-viewer-overlay" onClick={() => setSelectedImage(null)}>
                    <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-close-viewer" onClick={() => setSelectedImage(null)}>✕</button>
                        <img src={selectedImage} alt="Enlarged Face" />
                    </div>
                </div>
            )}

            <style>{`
                .tab-view-container { display: flex; flex-direction: column; gap: 24px; width: 100%; }
                .section-header h2 { font-size: 24px; font-weight: 800; color: var(--navy-primary); }
                .section-header p { color: var(--slate-muted); }

                .history-card {
                    background: var(--white);
                    border-radius: var(--border-radius);
                    box-shadow: var(--card-shadow);
                    overflow: hidden;
                    width: 100%;
                }

                .premium-table { width: 100%; border-collapse: collapse; }
                .premium-table th {
                    background: #f8fafc; padding: 18px 24px; text-align: left;
                    font-size: 12px; font-weight: 700; color: var(--slate-muted);
                    text-transform: uppercase; letter-spacing: 0.05em;
                    border-bottom: 2px solid #f1f5f9;
                }
                .premium-table td { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: var(--navy-primary); transition: background 0.2s; }
                .premium-table tr:hover td { background-color: #fcfdfe; }
                .premium-table tr:last-child td { border-bottom: none; }

                .status-badge {
                    display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 999px;
                    font-weight: 700; font-size: 11px; text-transform: uppercase;
                }
                .status-badge.tepat_waktu { background: #dcfce7; color: #059669; }
                .status-badge.terlambat { background: #fee2e2; color: #dc2626; }
                .status-badge.pulang_awal { background: #ffedd5; color: #d97706; }
                .status-badge.lembur { background: #dbeafe; color: #2563eb; }
                
                .acc-val { font-weight: 800; }
                .acc-val.high { color: #059669; }
                .acc-val.low { color: #d97706; }

                .empty-state { padding: 60px !important; text-align: center; color: var(--slate-muted); font-style: italic; }

                .att-photo-circle { 
                    width: 42px; height: 42px; border-radius: 50%; overflow: hidden; 
                    background: #f1f5f9; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    display: flex; align-items: center; justify-content: center;
                }
                .att-photo-circle img { width: 100%; height: 100%; object-fit: cover; }
                .no-pic { font-weight: 800; color: var(--slate-muted); font-size: 14px; }
                
                .clickable-image { cursor: pointer; transition: transform 0.2s; }
                .clickable-image:hover { transform: scale(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }

                /* Image Viewer Modal Styles */
                .image-viewer-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(5px);
                    display: flex; align-items: center; justify-content: center; z-index: 3000;
                    animation: fadeIn 0.2s;
                }
                .image-viewer-content {
                    position: relative; max-width: 90%; max-height: 90vh;
                    background: transparent; display: flex; align-items: center; justify-content: center;
                }
                .image-viewer-content img {
                    max-width: 100%; max-height: 85vh; border-radius: 16px;
                    box-shadow: 0 25px 50px rgba(0,0,0,0.5); object-fit: contain;
                    border: 2px solid rgba(255,255,255,0.1);
                }
                .btn-close-viewer {
                    position: absolute; top: -40px; right: 0;
                    background: rgba(255,255,255,0.2); color: white; border: none;
                    width: 32px; height: 32px; border-radius: 50%;
                    font-size: 16px; font-weight: bold; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: 0.2s;
                }
                .btn-close-viewer:hover { background: #ef4444; transform: scale(1.1); }

                @media (max-width: 768px) {
                    .premium-table, .premium-table tbody, .premium-table tr, .premium-table td { display: block; width: 100%; }
                    .premium-table thead { display: none; }
                    
                    .premium-table tr { padding: 12px; border-bottom: 8px solid #f1f5f9; }
                    .premium-table td {
                        display: flex; justify-content: space-between; align-items: center;
                        padding: 12px 8px; border-bottom: 1px solid #f8fafc; text-align: right;
                    }
                    .premium-table td::before {
                        content: attr(data-label); font-weight: 800; font-size: 10px;
                        color: var(--slate-muted); text-transform: uppercase;
                    }
                    .premium-table td:last-child { border-bottom: none; }
                }
            `}</style>
        </div>
    );
}

export default HistoryTab;
