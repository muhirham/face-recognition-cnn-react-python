import React from 'react';

function HistoryTab({ history }) {
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
                                    <td colSpan="5" className="empty-state">Belum ada data riwayat absensi.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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

                /* Smart Flex Card View for Mobile */
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
