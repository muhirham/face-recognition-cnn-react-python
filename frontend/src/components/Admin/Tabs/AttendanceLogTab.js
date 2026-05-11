import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';

function AttendanceLogTab() {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/admin/attendance_logs`);
                setHistory(res.data.history || []);
            } catch (err) {
                console.error("Gagal load history", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, []);

    // Helper to format time for display
    const displayTime = (timeStr) => {
        if (!timeStr) return '--:--';
        const parts = timeStr.split(':');
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    };

    const formatDuration = (minutes) => {
        if (!minutes || minutes <= 0) return '';
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}j ${m}m` : `${h}j`;
    };

    if (isLoading) {
        return <div style={{padding: '40px', fontWeight: '800'}}>Memuat Data Riwayat Absensi...</div>;
    }

    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header-flex">
                <div className="header-text">
                    <h2>Data Absensi (Riwayat)</h2>
                    <p>Log mendetail seluruh aktivitas absensi masuk dan keluar karyawan.</p>
                </div>
            </div>

            <div className="data-card">
                <div className="table-wrapper">
                    <table className="premium-admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '80px' }}>Foto</th>
                                <th>Nama Karyawan</th>
                                <th>Tanggal</th>
                                <th>Waktu</th>
                                <th>Tipe</th>
                                <th>Status</th>
                                <th>Akurasi (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? (
                                history.map((log) => (
                                    <tr key={log.id}>
                                        <td data-label="Foto">
                                            <div className="att-photo-circle">
                                                {log.foto_absen ? (
                                                    <img src={`${API_BASE_URL}/static/attendance_photos/${log.foto_absen}`} alt="Face" />
                                                ) : (
                                                    <span className="no-pic">?</span>
                                                )}
                                            </div>
                                        </td>
                                        <td data-label="Nama"><strong>{log.nama}</strong></td>
                                        <td data-label="Tanggal">{log.tanggal}</td>
                                        <td data-label="Waktu">{displayTime(log.waktu)}</td>
                                        <td data-label="Tipe">{log.jenis ? log.jenis.toUpperCase() : '-'}</td>
                                        <td data-label="Status">
                                            <span className={`status-pill ${log.status}`}>
                                                {log.status ? log.status.replace('_', ' ') : '-'}
                                                {log.status === 'terlambat' && log.menit_terlambat > 0 && (
                                                    <span className="late-duration"> ({formatDuration(log.menit_terlambat)})</span>
                                                )}
                                            </span>
                                        </td>
                                        <td data-label="Akurasi">
                                            <span className={`accuracy-val ${log.confidence_score < 75 ? 'low' : 'high'}`}>
                                                {log.confidence_score ? Math.round(log.confidence_score) : 0}%
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="empty-state">Belum ada data riwayat absensi yang tercatat.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .tab-view-container { display: flex; flex-direction: column; gap: 24px; }
                .section-header-flex { display: flex; justify-content: space-between; align-items: flex-end; }
                .header-text h2 { font-size: 24px; font-weight: 800; color: var(--navy-primary); }
                .header-text p { color: var(--slate-muted); }

                .data-card {
                    background: white; border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden;
                }

                .premium-admin-table { width: 100%; border-collapse: collapse; }
                .premium-admin-table th {
                    background: #f8fafc; padding: 18px 24px; text-align: left;
                    font-size: 12px; font-weight: 700; color: var(--slate-muted);
                    text-transform: uppercase; letter-spacing: 0.1em;
                    border-bottom: 2px solid #f1f5f9;
                }
                .premium-admin-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: var(--navy-primary); }
                .premium-admin-table tr:hover td { background-color: #fcfdfe; }
                
                .status-pill { padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; display: inline-block; }
                .status-pill.tepat_waktu { background: #dcfce7; color: #166534; }
                .status-pill.terlambat { background: #fee2e2; color: #991b1b; }
                .status-pill.pulang_awal { background: #ffedd5; color: #d97706; }
                .status-pill.lembur { background: #dbeafe; color: #2563eb; }
                .status-pill.sakit { background: #e0f2fe; color: #075985; }
                .status-pill.alfa { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
                
                .accuracy-val { font-weight: 800; }
                .accuracy-val.high { color: #10b981; }
                .accuracy-val.low { color: #f59e0b; }

                .empty-state { padding: 60px !important; text-align: center; color: var(--slate-muted); font-style: italic; }

                .att-photo-circle { 
                    width: 42px; height: 42px; border-radius: 50%; overflow: hidden; 
                    background: #f1f5f9; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    display: flex; align-items: center; justify-content: center;
                }
                .att-photo-circle img { width: 100%; height: 100%; object-fit: cover; }
                .att-photo-circle .no-pic { font-size: 14px; font-weight: 800; color: #cbd5e1; }

                @media (max-width: 1024px) {
                    .premium-admin-table, .premium-admin-table tbody, .premium-admin-table tr, .premium-admin-table td { display: block; width: 100%; }
                    .premium-admin-table thead { display: none; }
                    .premium-admin-table tr { padding: 16px; border-bottom: 8px solid #f1f5f9; }
                    .premium-admin-table td { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8fafc; }
                    .premium-admin-table td::before { content: attr(data-label); font-weight: 800; font-size: 10px; color: var(--slate-muted); }
                }
            `}</style>
        </div>
    );
}

export default AttendanceLogTab;
