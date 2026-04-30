import React from 'react';

function HomeTab({ username, attendanceStatus, history, onGoToAbsen }) {
    const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const now = new Date();
    const localDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayLog = history.find(h => h.tanggal === localDateString);

    // Count unique dates for "Total Hadir" (one session per day)
    const uniqueDays = [...new Set(history.map(item => item.tanggal))].length;

    return (
        <div className="tab-view-container animate-fade-in">
            {/* Header Greeting Section */}
            <div className="greeting-card-premium">
                <h1>Halo, <span className="gradient-name">{username}!</span> 👋</h1>
                <p>Silakan lakukan absensi tepat waktu hari ini untuk mencatat kehadiran Anda di sistem.</p>
            </div>

            <div className="home-content-flex">
                {/* Status Card (1:1 Reference Match) */}
                <div className="premium-status-card">
                    <div className="p-card-header">
                        <h3 className="p-card-title">Status Hari Ini</h3>
                    </div>
                    
                    <div className="p-card-body">
                        <div className="p-info-row">
                            <span className="p-label">Tanggal:</span>
                            <span className="p-value">{today}</span>
                        </div>
                        <div className="p-info-row">
                            <span className="p-label">Masuk:</span>
                            <div className="p-value-group">
                                <span className="p-value">{todayLog ? todayLog.waktu : '--:--:--'}</span>
                                {todayLog && <span className={`p-pill ${todayLog.status}`}>{todayLog.status.replace('_', ' ')}</span>}
                            </div>
                        </div>

                        <div className="attendance-status-badge">
                            {attendanceStatus.pulang ? (
                                <div className="p-badge success">Absensi Selesai</div>
                            ) : attendanceStatus.masuk ? (
                                <div className="p-badge success">Sudah Masuk</div>
                            ) : (
                                <div className="p-badge pending">Belum Absen</div>
                            )}
                        </div>

                        <button className="p-main-button" onClick={onGoToAbsen}>
                            Menuju Absensi Wajah
                        </button>
                    </div>
                </div>

                {/* Secondary Cards Column */}
                <div className="stats-column">
                    <div className="stat-card-mini">
                        <div className="mini-icon-box">📊</div>
                        <div className="mini-data">
                            <span className="mini-label">Total Hadir</span>
                            <span className="mini-val">{uniqueDays}</span>
                        </div>
                    </div>
                    <div className="stat-card-mini">
                        <div className="mini-icon-box">⚡</div>
                        <div className="mini-data">
                            <span className="mini-label">Status Kerja</span>
                            <span className="mini-val highlight">Aktif</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .tab-view-container { display: flex; flex-direction: column; gap: 40px; animation: fadeIn 0.5s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                .greeting-card-premium h1 { font-size: 32px; font-weight: 900; color: var(--navy-primary); margin-bottom: 10px; }
                .gradient-name { color: var(--navy-primary); }
                .greeting-card-premium p { color: var(--slate-muted); font-size: 16px; font-weight: 500; }

                .home-content-flex { display: flex; gap: 32px; flex-wrap: wrap; }

                /* 1:1 Status Card Styling */
                .premium-status-card {
                    background: var(--white);
                    border-radius: 20px;
                    box-shadow: var(--card-shadow);
                    overflow: hidden;
                    width: 100%;
                    max-width: 480px;
                    border: 1px solid rgba(0,0,0,0.03);
                }

                .p-card-header { padding: 30px 40px 10px 40px; }
                .p-card-title { font-size: 22px; font-weight: 800; color: var(--navy-primary); }

                .p-card-body { padding: 20px 40px 40px 40px; display: flex; flex-direction: column; gap: 24px; }

                .p-info-row { display: flex; align-items: center; gap: 12px; font-size: 16px; }
                .p-label { color: var(--slate-muted); min-width: 90px; font-weight: 500; }
                .p-value { font-weight: 700; color: var(--navy-primary); }
                
                .p-value-group { display: flex; align-items: center; gap: 12px; }

                .p-pill {
                    padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase;
                }
                .p-pill.tepat_waktu { background: #dcfce7; color: #166534; }
                .p-pill.terlambat { background: #fee2e2; color: #991b1b; }

                .attendance-status-badge { margin: 10px 0; }
                .p-badge { display: inline-block; padding: 10px 24px; border-radius: 12px; font-weight: 800; font-size: 14px; }
                .p-badge.success { background: var(--success); color: white; }
                .p-badge.pending { background: #ea580c; color: white; }

                .p-main-button {
                    background-color: var(--navy-primary);
                    color: white; border: none; padding: 18px; border-radius: 14px;
                    font-weight: 800; font-size: 16px; cursor: pointer;
                    transition: var(--transition-smooth);
                    box-shadow: 0 10px 20px rgba(11, 26, 42, 0.2);
                }
                .p-main-button:hover { background-color: var(--navy-light); transform: translateY(-3px); box-shadow: 0 15px 25px rgba(11, 26, 42, 0.3); }

                /* Stats Cards Styling */
                .stats-column { display: flex; flex-direction: column; gap: 20px; flex: 1; min-width: 280px; }
                .stat-card-mini {
                    background: white; padding: 28px; border-radius: 18px; display: flex; align-items: center; gap: 20px;
                    box-shadow: var(--card-shadow); border: 1px solid rgba(0,0,0,0.02);
                }
                .mini-icon-box { 
                    width: 50px; height: 50px; background: #f1f5f9; border-radius: 14px;
                    display: flex; align-items: center; justify-content: center; font-size: 20px;
                }
                .mini-data { display: flex; flex-direction: column; }
                .mini-label { font-size: 12px; color: var(--slate-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
                .mini-val { font-size: 24px; font-weight: 900; color: var(--navy-primary); }
                .mini-val.highlight { color: var(--success); }

                @media (max-width: 768px) {
                    .tab-view-container { gap: 24px; }
                    .premium-status-card { max-width: 100%; }
                    .p-card-inner { padding: 30px; }
                    .greeting-card-premium h1 { font-size: 26px; }
                }
            `}</style>
        </div>
    );
}

export default HomeTab;
