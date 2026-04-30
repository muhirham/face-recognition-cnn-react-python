import React, { useEffect } from 'react';

function OverviewTab({ stats }) {
    // Lock scroll specifically for this tab to achieve the "Static" kiosk feel
    useEffect(() => {
        const viewArea = document.querySelector('.layout-view-area');
        if (viewArea) {
            viewArea.style.overflow = 'hidden';
            viewArea.style.padding = '24px 32px';
        }
        return () => {
            if (viewArea) viewArea.style.overflow = 'auto';
        };
    }, []);

    const notifications = stats.notifications || [];
    const recentHistory = stats.recent_history || [];
    const weeklyStats = stats.weekly_stats || [
        { label: '01', value: 0 }, { label: '10', value: 0 }, { label: '20', value: 0 },
        { label: '100', value: 0 }, { label: '50', value: 0 }, { label: '200', value: 0 }, { label: '100', value: 0 }
    ];

    // Find max value for chart scaling
    const maxVal = Math.max(...weeklyStats.map(s => s.value), 10);

    return (
        <div className="admin-overview-container animate-fade-in">
            <div className="academic-admin-header">
                <h1>Dashboard Admin</h1>
            </div>

            {/* Row 1: Ringkasan Hari Ini */}
            <div className="summary-row">
                <p className="row-label">Ringkasan Hari Ini</p>
                <div className="summary-cards-grid">
                    <div className="card-item">
                        <div className="card-icon-circle blue">👥</div>
                        <div className="card-info">
                            <span className="info-label">Total Karyawan</span>
                            <span className="info-val">{stats.total_employees || 0}</span>
                        </div>
                    </div>
                    <div className="card-item">
                        <div className="card-icon-circle green">🏢</div>
                        <div className="card-info">
                            <div className="label-with-badge">
                                <span className="info-label">Hadir Hari Ini</span>
                                <span className="badge green">OK</span>
                            </div>
                            <span className="info-val">{stats.present_today || 0}</span>
                        </div>
                    </div>
                    <div className="card-item">
                        <div className="card-icon-circle red">⏰</div>
                        <div className="card-info">
                            <div className="label-with-badge">
                                <span className="info-label">Terlambat Hari Ini</span>
                                <span className="badge red">{stats.late_today > 0 ? 'NEW' : 'OK'}</span>
                            </div>
                            <span className="info-val">{stats.late_today || 0}</span>
                            <span className="sub-label red">Terlambat</span>
                        </div>
                    </div>
                    <div className="card-item">
                        <div className="card-icon-circle gold">❌</div>
                        <div className="card-info">
                            <span className="info-label">Tidak Hadir</span>
                            <span className="info-val">{stats.absent_today || 0}</span>
                            <span className="sub-label gold">Alpa</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Performance Grid */}
            <div className="performance-row">
                <div className="chart-container">
                    <p className="row-label">Grafik Kehadiran (7 Hari)</p>
                    <div className="bar-chart-mock">
                        <div className="bars">
                            {weeklyStats.map((s, idx) => (
                                <div 
                                    key={idx} 
                                    className={`bar-val ${idx === weeklyStats.length - 1 ? 'active' : ''}`} 
                                    style={{ height: `${(s.value / maxVal) * 100}%` }}
                                    title={`${s.value} Hadir`}
                                ></div>
                            ))}
                        </div>
                        <div className="trend-line"></div>
                        <div className="chart-labels">
                            {weeklyStats.map((s, idx) => (
                                <span key={idx}>{s.label}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="notif-container">
                    <p className="row-label">Notifikasi Terbaru</p>
                    <div className="notif-list">
                        {notifications.length > 0 ? (
                            notifications.map((notif, idx) => (
                                <div key={idx} className="notif-card">
                                    <span className="notif-icon">⚠️</span>
                                    <p>{notif.text}</p>
                                    {notif.priority && <span className="prio-tag">Prioritas</span>}
                                </div>
                            ))
                        ) : (
                            <div className="notif-empty">📌 Tidak ada notifikasi baru</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 3: Live Table */}
            <div className="table-row">
                <div className="table-header-box">
                    <p className="row-label white">Tabel Absensi Terbaru</p>
                    <div className="table-search-bar">
                        <span className="search-icon">🔍</span>
                        <input type="text" placeholder="Search" />
                    </div>
                </div>
                <div className="formal-table-wrapper">
                    <table className="absensi-table">
                        <thead>
                            <tr>
                                <th>Nama</th>
                                <th>Tanggal</th>
                                <th>Waktu</th>
                                <th>Tipe</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentHistory.length > 0 ? (
                                recentHistory.map((row, i) => (
                                    <tr key={i}>
                                        <td className="bold">{row.nama}</td>
                                        <td>{row.tanggal}</td>
                                        <td>{row.waktu}</td>
                                        <td style={{ textTransform: 'capitalize' }}>{row.jenis}</td>
                                        <td>
                                            <span className={`status-tag ${row.status === 'terlambat' ? 'late' : 'on-time'}`}>
                                                <div className="s-dot"></div> {row.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--slate-muted)' }}>
                                        Belum ada data absensi hari ini.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .admin-overview-container {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    height: 100%;
                    color: var(--navy-primary);
                }

                .academic-admin-header h1 { font-size: 28px; font-weight: 800; margin-bottom: 5px; }

                .row-label { font-size: 14px; font-weight: 800; margin-bottom: 12px; }
                .row-label.white { color: white; margin-bottom: 0; }

                /* Row 1 */
                .summary-cards-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
                .card-item {
                    background: white; padding: 20px; border-radius: 16px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.03);
                    display: flex; align-items: center; gap: 16px;
                }
                .card-icon-circle {
                    width: 48px; height: 48px; border-radius: 12px;
                    display: flex; align-items: center; justify-content: center; font-size: 20px;
                }
                .card-icon-circle.blue { background: #f0f7ff; }
                .card-icon-circle.green { background: #f0fdf4; }
                .card-icon-circle.red { background: #fef2f2; }
                .card-icon-circle.gold { background: #fffcf0; }

                .card-info { display: flex; flex-direction: column; flex: 1; }
                .info-label { font-size: 11px; font-weight: 800; color: var(--slate-muted); text-transform: uppercase; }
                .info-val { font-size: 24px; font-weight: 900; line-height: 1.2; }
                
                .label-with-badge { display: flex; justify-content: space-between; align-items: center; width: 100%; }
                .badge { padding: 2px 6px; border-radius: 100px; font-size: 9px; font-weight: 900; }
                .badge.green { background: #dcfce7; color: #166534; }
                .badge.red { background: #fee2e2; color: #991b1b; }

                .sub-label { font-size: 10px; font-weight: 800; margin-top: 4px; padding: 2px 8px; border-radius: 4px; width: fit-content; }
                .sub-label.red { background: #fee2e2; color: #991b1b; }
                .sub-label.gold { background: #fef3c7; color: #92400e; }

                /* Row 2 */
                .performance-row { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; height: 260px; }
                .chart-container, .notif-container { 
                    background: white; padding: 20px; border-radius: 16px; 
                    box-shadow: 0 10px 25px rgba(0,0,0,0.03);
                }

                .bar-chart-mock { position: relative; height: 160px; display: flex; flex-direction: column; justify-content: space-between; padding-top: 20px; }
                .bars { display: flex; align-items: flex-end; justify-content: space-between; height: 100px; padding: 0 20px; }
                .bar-val { width: 40px; background: #e2e8f0; border-radius: 4px; transition: height 1s; }
                .bar-val.active { background: var(--navy-primary); }
                .chart-labels { display: flex; justify-content: space-between; padding: 10px 20px 0; font-size: 10px; font-weight: 700; color: var(--slate-muted); }
                .trend-line { position: absolute; top: 40%; left: 0; width: 100%; height: 2px; background: var(--gold-accent); opacity: 0.5; }

                .notif-list { display: flex; flex-direction: column; gap: 12px; }
                .notif-card { 
                    background: #fffcf0; padding: 12px 16px; border-radius: 8px; 
                    display: flex; align-items: center; gap: 12px; font-size: 12px; font-weight: 600;
                    border: 1px solid #fde68a;
                }
                .prio-tag { background: #f97316; color: white; font-size: 9px; padding: 2px 6px; border-radius: 4px; }

                /* Row 3 */
                .table-row { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.03); flex: 1; display: flex; flex-direction: column; }
                .table-header-box { background: var(--navy-primary); padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
                .table-search-bar { background: white; border-radius: 8px; padding: 6px 12px; display: flex; align-items: center; gap: 8px; }
                .table-search-bar input { border: none; outline: none; font-size: 12px; color: var(--navy-primary); width: 120px; }
                
                .formal-table-wrapper { flex: 1; overflow-y: auto; }
                .absensi-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
                .absensi-table th { padding: 16px 24px; background: #f8fafc; color: var(--slate-muted); font-size: 11px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; }
                .absensi-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; }
                .absensi-table tr:hover { background: #fcfcfc; }
                .absensi-table td.bold { font-weight: 800; }

                .status-tag { display: flex; align-items: center; gap: 8px; font-weight: 700; width: fit-content; }
                .status-tag.late { color: #ef4444; }
                .status-tag.on-time { color: #10b981; }
                .s-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }

                @media (max-width: 1200px) {
                    .summary-cards-grid { grid-template-columns: repeat(2, 1fr); }
                    .performance-row { grid-template-columns: 1fr; height: auto; }
                    .chart-container, .notif-container { height: 260px; }
                    .admin-overview-container { overflow-y: auto; }
                }
            `}</style>
        </div>
    );
}

export default OverviewTab;
