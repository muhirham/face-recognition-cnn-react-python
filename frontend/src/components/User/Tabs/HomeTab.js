import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

function HomeTab({ username, attendanceStatus, history, holiday, onGoToAbsen, onGoToHistory }) {
    const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const now = new Date();
    const localDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentMonthString = localDateString.substring(0, 7); // YYYY-MM
    
    const [selectedSummaryMonth, setSelectedSummaryMonth] = useState(currentMonthString);

    const todayHistory = history.find(h => h.tanggal === localDateString);
    const masukLog = todayHistory ? todayHistory.masuk : null;
    const pulangLog = todayHistory ? todayHistory.pulang : null;

    // Filter history for Quick Stats (Current Month Only)
    const currentMonthHistory = history.filter(h => h.tanggal && h.tanggal.startsWith(currentMonthString));
    const uniqueDays = [...new Set(currentMonthHistory.map(item => item.tanggal))].length;
    const lateCount = currentMonthHistory.filter(h => h.masuk && h.masuk.status === 'terlambat').length;
    const missingPulangCount = currentMonthHistory.filter(h => h.masuk && !h.pulang).length;
    
    // Filter history for Summary Chart (Selected Month)
    const summaryMonthHistory = history.filter(h => h.tanggal && h.tanggal.startsWith(selectedSummaryMonth));
    const summaryUniqueDays = [...new Set(summaryMonthHistory.map(item => item.tanggal))].length;
    const summaryLateCount = summaryMonthHistory.filter(h => h.masuk && h.masuk.status === 'terlambat').length;
    const summaryOnTimeCount = summaryMonthHistory.filter(h => h.masuk && h.masuk.status !== 'terlambat').length;
    const summaryMissingPulang = summaryMonthHistory.filter(h => h.masuk && !h.pulang).length;

    // Chart Data
    const chartData = {
        labels: ['Tepat Waktu', 'Terlambat', 'Belum Absen Pulang'],
        datasets: [
            {
                data: summaryUniqueDays === 0 ? [0, 0, 0] : [summaryOnTimeCount, summaryLateCount, summaryMissingPulang],
                backgroundColor: ['#10b981', '#ef4444', '#cbd5e1'],
                borderWidth: 0,
                cutout: '75%',
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleFont: { size: 14, family: "'Inter', sans-serif", weight: 'bold' },
                bodyFont: { size: 13, family: "'Inter', sans-serif" },
                padding: 12,
                cornerRadius: 8,
                displayColors: true,
                boxPadding: 6,
                usePointStyle: true,
                callbacks: {
                    label: function(context) {
                        return ` ${context.label}: ${context.raw} Hari`;
                    }
                }
            }
        }
    };
    
    // Get last 3 history items
    const recentHistory = history.slice(0, 3);

    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Generate month options (Last 6 months)
    const monthOptions = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        return { val, label };
    });

    return (
        <div className="tab-view-container animate-fade-in">
            <div className="new-hero-banner">
                <div className="hero-text-content">
                    <h1>Halo, <span className="hero-name">{username || 'Karyawan'}</span> 👋</h1>
                    <p>Tetap disiplin dan catat kehadiran Anda setiap hari. Kehadiran Anda adalah bagian dari produktivitas tim.</p>
                    <div className="hero-badge">⭐ Disiplin hari ini, prestasi esok hari.</div>
                </div>
                <div className="hero-illustration">
                    <img src="/bg.png" alt="Office Illustration" />
                </div>
            </div>

            <div className="mobile-content-wrapper">
                {/* QUICK STATS */}
                <div className="new-quick-stats">
                    <div className="stat-box bg-white">
                        <div className="stat-icon-wrapper green-bg"><i className="fas fa-user-check"></i></div>
                        <div>
                            <div className="s-label text-slate">TOTAL HADIR (BULAN INI)</div>
                            <div className="s-val text-navy">{uniqueDays} <span className="s-sub">Hari</span></div>
                        </div>
                    </div>
                    <div className="stat-box bg-white">
                        <div className="stat-icon-wrapper red-bg"><i className="fas fa-clock"></i></div>
                        <div>
                            <div className="s-label text-slate">TERLAMBAT (BULAN INI)</div>
                            <div className="s-val text-navy">{lateCount} <span className="s-sub">Kali</span></div>
                        </div>
                    </div>
                    <div className="stat-box bg-white">
                        <div className="stat-icon-wrapper yellow-bg"><i className="fas fa-sign-out-alt"></i></div>
                        <div>
                            <div className="s-label text-slate">BELUM ABSEN PULANG</div>
                            <div className="s-val text-navy">{missingPulangCount} <span className="s-sub">Kali</span></div>
                        </div>
                    </div>
                </div>

                {/* MAIN GRID */}
                <div className="new-main-grid">
                    
                    {/* 1. Status Hari Ini */}
                    <div className="grid-card status-card">
                        <div className="card-header-flex">
                            <div className="header-title">
                                <div className="c-icon bg-light-navy text-navy"><i className="fas fa-calendar-check"></i></div>
                                STATUS HARI INI
                            </div>
                            <div className="header-link" style={{ cursor: 'default', color: '#64748b' }}><i className="far fa-calendar-alt"></i> TANGGAL &nbsp;&nbsp;<strong style={{color: '#0f172a'}}>{today}</strong></div>
                        </div>
                        
                        <div className="s-row bg-slate-50">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fas fa-sign-in-alt text-navy"></i>
                                <span className="s-title text-slate">MASUK</span>
                            </div>
                            <span className="s-value-bold text-navy">{masukLog ? masukLog.waktu : '--:--:--'}</span>
                            <span className={`s-pill ${masukLog ? (masukLog.status === 'terlambat' ? 'pill-red' : 'pill-green') : 'pill-gray'}`}>
                                {masukLog ? (masukLog.status === 'terlambat' ? 'Terlambat' : 'Tepat Waktu') : 'Belum Absen'}
                                {masukLog && masukLog.status !== 'terlambat' && ' ✓'}
                            </span>
                        </div>

                        <div className="s-row bg-slate-50">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fas fa-sign-out-alt text-navy"></i>
                                <span className="s-title text-slate">PULANG</span>
                            </div>
                            <span className="s-value-bold text-navy">{pulangLog ? pulangLog.waktu : '--:--:--'}</span>
                            <span className={`s-pill ${pulangLog ? 'pill-navy' : 'pill-gray'}`}>
                                {pulangLog ? 'Selesai' : 'Belum Absen'}
                            </span>
                        </div>

                        <button className="primary-action-btn" onClick={onGoToAbsen}>
                            <i className="fas fa-expand-arrows-alt"></i> ABSENSI WAJAH
                        </button>
                    </div>

                    {/* 2. Riwayat Absensi Terbaru */}
                    <div className="grid-card history-card">
                        <div className="card-header-flex">
                            <div className="header-title"><span className="c-icon text-navy" style={{background: '#e2e8f0'}}><i className="fas fa-history"></i></span> RIWAYAT ABSENSI TERBARU</div>
                            <span className="header-link" onClick={onGoToHistory} style={{ cursor: 'pointer' }}>Lihat Semua ❯</span>
                        </div>
                        <div className="history-list">
                            {recentHistory.map((item, idx) => (
                                <div className="h-item" key={idx}>
                                    <div className="h-date-box">
                                        <span className="h-day">{item.tanggal.split('-')[2]}</span>
                                        <span className="h-mo">{new Date(item.tanggal).toLocaleString('id-ID', { month: 'short' })}</span>
                                    </div>
                                    <div className="h-details-flex">
                                        <div className="h-det-row">
                                            <span className="h-label">Masuk</span>
                                            <span className="h-time">{item.masuk ? item.masuk.waktu : '--:--:--'}</span>
                                            {item.masuk ? <span className="h-dot green"></span> : <span className="h-dot gray"></span>}
                                            <span className={`h-pill ${item.masuk && item.masuk.status !== 'terlambat' ? 'success' : item.masuk ? 'danger' : 'neutral'}`}>
                                                {item.masuk ? item.masuk.status.replace('_', ' ').toUpperCase() : 'Belum Absen'}
                                            </span>
                                        </div>
                                        <div className="h-det-row">
                                            <span className="h-label">Pulang</span>
                                            <span className="h-time">{item.pulang ? item.pulang.waktu : '--:--:--'}</span>
                                            {item.pulang ? <span className="h-dot green"></span> : <span className="h-dot gray"></span>}
                                            <span className={`h-pill ${item.pulang ? 'success' : 'neutral'}`}>
                                                {item.pulang ? 'SELESAI' : 'Belum Absen'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-arrow">❯</div>
                                </div>
                            ))}
                            {recentHistory.length === 0 && <div className="h-empty">Belum ada riwayat absensi.</div>}
                        </div>
                    </div>

                    {/* 3. Ringkasan Bulan Ini */}
                    <div className="grid-card summary-card">
                        <div className="card-header-flex">
                            <div className="header-title"><span className="c-icon bg-light-navy text-navy"><i className="fas fa-chart-pie"></i></span> RINGKASAN BULAN INI</div>
                            <select className="month-selector search-input" style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', fontWeight: 'bold' }} value={selectedSummaryMonth} onChange={(e) => setSelectedSummaryMonth(e.target.value)}>
                                {monthOptions.map(opt => <option key={opt.val} value={opt.val}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div className="summary-content" style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', overflowY: 'auto' }}>
                            <div className="doughnut-chart-container" style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
                                {/* Text is behind canvas (z-index 1) */}
                                <div className="doughnut-inner-text" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', width: '100%', zIndex: 1 }}>
                                    <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--navy-primary)', lineHeight: '1' }}>{summaryUniqueDays}</div>
                                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', marginTop: '2px' }}>Total Hari</div>
                                </div>
                                {/* Canvas is in front (z-index 2) so tooltip draws over text */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2 }}>
                                    <Doughnut data={chartData} options={chartOptions} />
                                </div>
                            </div>
                            <div className="chart-legend" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 0 }}>
                                <div className="l-item" style={{ fontSize: '11px' }}>
                                    <span className="l-dot green" style={{ width: '8px', height: '8px' }}></span> <span className="l-text">Tepat Waktu</span>
                                    <span className="l-val">{summaryOnTimeCount} <span className="l-pct" style={{ fontSize: '10px' }}>({summaryUniqueDays > 0 ? Math.round((summaryOnTimeCount/summaryUniqueDays)*100) : 0}%)</span></span>
                                </div>
                                <div className="l-item" style={{ fontSize: '11px' }}>
                                    <span className="l-dot red" style={{ width: '8px', height: '8px' }}></span> <span className="l-text">Terlambat</span>
                                    <span className="l-val">{summaryLateCount} <span className="l-pct" style={{ fontSize: '10px' }}>({summaryUniqueDays > 0 ? Math.round((summaryLateCount/summaryUniqueDays)*100) : 0}%)</span></span>
                                </div>
                                <div className="l-item" style={{ fontSize: '11px' }}>
                                    <span className="l-dot gray" style={{ width: '8px', height: '8px' }}></span> <span className="l-text">Belum Absen Pulang</span>
                                    <span className="l-val">{summaryMissingPulang} <span className="l-pct" style={{ fontSize: '10px' }}>({summaryUniqueDays > 0 ? Math.round((summaryMissingPulang/summaryUniqueDays)*100) : 0}%)</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECURITY FOOTER */}
                <div className="new-security-footer">
                    <div className="sec-item clock-item">
                        <div className="sec-icon-big">🕒</div>
                        <div className="sec-text-stack">
                            <span className="sec-label">WAKTU SISTEM SERVER</span>
                            <span className="sec-val">{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            <span className="sec-sub">{today}</span>
                        </div>
                    </div>
                    <div className="sec-divider"></div>
                    <div className="sec-item">
                        <div className="sec-icon-big blue-shield">🛡️</div>
                        <div className="sec-text-stack">
                            <span className="sec-val">AES-256 ENCRYPTED</span>
                            <span className="sec-sub">Keamanan Data Aktif <span className="sec-dot"></span></span>
                        </div>
                    </div>
                    <div className="sec-divider"></div>
                    <div className="sec-item">
                        <div className="sec-icon-big yellow-finger">👆</div>
                        <div className="sec-text-stack">
                            <span className="sec-val">BIOMETRIC ACTIVE</span>
                            <span className="sec-sub">Pengenalan Wajah Aktif <span className="sec-dot"></span></span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .tab-view-container { 
                    display: flex; flex-direction: column; gap: 12px; 
                    animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); 
                    height: 100%;
                    max-height: 100%;
                    overflow: hidden;
                    box-sizing: border-box;
                }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

                /* UTILITY CLASSES */
                .text-navy { color: var(--navy-primary) !important; }
                .text-slate { color: #64748b !important; }
                .text-red { color: #ef4444 !important; }
                .text-gold { color: var(--gold-accent) !important; }
                .bg-white { background: white !important; }
                .bg-light-navy { background: #e2e8f0 !important; }
                
                /* HERO BANNER */
                .new-hero-banner {
                    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                    border-radius: 16px;
                    padding: 32px 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.03);
                    border: 1px solid #e2e8f0;
                    position: relative;
                    overflow: hidden;
                    min-height: 220px;
                }
                .hero-text-content { flex: 1; z-index: 2; position: relative; max-width: 60%; }
                .hero-text-content h1 { font-size: 28px; color: var(--navy-primary); margin-bottom: 8px; font-weight: 800; letter-spacing: -0.5px; }
                .hero-name { color: var(--navy-primary); }
                .hero-text-content p { color: #64748b; font-size: 14px; margin-bottom: 16px; max-width: 80%; line-height: 1.5; }
                .hero-badge {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: white; border: 1px solid #e2e8f0; color: #475569;
                    padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.02);
                }
                .hero-illustration {
                    position: absolute; right: 0; bottom: 0; height: 100%; width: 50%;
                    display: flex; align-items: flex-end; justify-content: flex-end; z-index: 1;
                    pointer-events: none;
                }
                .hero-illustration img {
                    height: 90%;
                    width: 100%;
                    object-fit: contain;
                    object-position: right bottom;
                    mix-blend-mode: multiply;
                    padding-right: 24px;
                    padding-bottom: 12px;
                }

                /* QUICK STATS */
                .new-quick-stats { display: flex; gap: 12px; }
                .stat-box {
                    flex: 1; background: white; border-radius: 16px; padding: 16px 20px;
                    border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.02);
                    display: flex; flex-direction: column; position: relative;
                }
                .stat-icon-wrapper {
                    width: 48px; height: 48px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 24px; margin-bottom: 12px;
                }
                .green-bg { background: #dcfce7; color: #16a34a; }
                .red-bg { background: #fee2e2; color: #ef4444; }
                .yellow-bg { background: #fef9c3; color: #eab308; }
                .stat-info { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
                .s-label { font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 0.5px; }
                .s-val { font-size: 24px; font-weight: 900; color: var(--navy-primary); }
                .s-sub { font-size: 12px; font-weight: 600; color: #94a3b8; }
                .stat-trend {
                    position: absolute; top: 16px; right: 16px;
                    font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px;
                }
                .trend-green { background: #f0fdf4; color: #16a34a; }
                .trend-red { background: #fef2f2; color: #ef4444; }
                .trend-text { background: transparent; color: #94a3b8; padding: 0; }
                .t-sub { font-size: 10px; font-weight: 600; color: currentColor; opacity: 0.7; }

                /* MAIN GRID */
                .new-main-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    flex: 1;
                    min-height: 0;
                }
                .grid-card {
                    background: white; border-radius: 16px; padding: 24px;
                    border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.02);
                    display: flex; flex-direction: column; gap: 16px;
                    overflow: hidden;
                }
                .card-header-flex { display: flex; justify-content: space-between; align-items: center; }
                .header-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: var(--navy-primary); }
                .c-icon { background: #f1f5f9; padding: 6px; border-radius: 6px; font-size: 14px; }
                .header-link { font-size: 12px; font-weight: 700; color: #64748b; cursor: pointer; }

                /* 1. Status Grid */
                .status-grid { display: flex; flex-direction: column; gap: 12px; }
                .s-row { display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 12px 16px; border-radius: 10px; }
                .s-title { width: 100px; font-size: 11px; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 6px; }
                .s-mini-icon { color: #94a3b8; }
                .s-value { flex: 1; font-size: 14px; font-weight: 700; color: var(--navy-primary); }
                .s-value-bold { flex: 1; font-size: 15px; font-weight: 800; color: var(--navy-primary); }
                .s-pill { font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 6px; }
                .s-pill.success { background: #dcfce7; color: #16a34a; }
                .s-pill.neutral { background: #e2e8f0; color: #64748b; }
                
                .primary-action-btn {
                    background: var(--gold-accent); color: var(--navy-primary);
                    border: none; padding: 14px; border-radius: 12px;
                    font-size: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
                }
                .panduan-link { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; color: #64748b; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer; }

                /* 2. History */
                .history-list { display: flex; flex-direction: column; gap: 12px; flex: 1; overflow-y: auto; padding-right: 8px; }
                .history-list::-webkit-scrollbar { width: 4px; }
                .history-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .h-item { display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
                .h-item:last-child { border-bottom: none; padding-bottom: 0; }
                .h-date-box { width: 48px; height: 48px; background: #f8fafc; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .h-day { font-size: 16px; font-weight: 900; color: var(--navy-primary); line-height: 1; }
                .h-mo { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
                .h-details-flex { flex: 1; display: flex; flex-direction: column; gap: 6px; }
                .h-det-row { display: flex; align-items: center; font-size: 12px; gap: 8px; }
                .h-label { width: 45px; font-weight: 600; color: #64748b; }
                .h-time { font-weight: 800; color: var(--navy-primary); width: 60px; }
                .h-dot { width: 6px; height: 6px; border-radius: 50%; }
                .h-dot.green { background: #16a34a; }
                .h-dot.gray { background: #cbd5e1; }
                .h-pill { font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
                .h-pill.success { background: #dcfce7; color: #16a34a; }
                .h-pill.danger { background: #fee2e2; color: #ef4444; }
                .h-pill.neutral { background: #f1f5f9; color: #94a3b8; }
                .h-arrow { color: #cbd5e1; font-weight: 900; font-size: 12px; }

                /* 3. Summary (Chart) */
                .month-selector { border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 700; color: var(--navy-primary); }
                .summary-content { display: flex; flex-direction: column; gap: 20px; align-items: center; }
                .doughnut-chart-container { position: relative; width: 140px; height: 140px; }
                .doughnut-chart {
                    width: 100%; height: 100%; border-radius: 50%;
                    background: conic-gradient(#16a34a 0% 50%, #ef4444 50% 100%);
                    display: flex; align-items: center; justify-content: center;
                }
                .doughnut-inner {
                    width: 110px; height: 110px; background: white; border-radius: 50%;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                }
                .d-num { font-size: 32px; font-weight: 900; color: var(--navy-primary); line-height: 1; }
                .d-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-align: center; margin-top: 4px; }
                
                .chart-legend { display: flex; flex-direction: column; gap: 10px; width: 100%; }
                .l-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
                .l-dot { width: 8px; height: 8px; border-radius: 50%; }
                .l-dot.green { background: #16a34a; }
                .l-dot.red { background: #ef4444; }
                .l-dot.gray { background: #cbd5e1; }
                .l-text { flex: 1; font-weight: 600; color: #475569; }
                .l-val { font-weight: 800; color: var(--navy-primary); }
                .l-pct { color: #94a3b8; font-weight: 600; }
                .summary-footer-tip { background: #fffbeb; padding: 12px; border-radius: 10px; font-size: 11px; font-weight: 600; color: #b45309; line-height: 1.4; display: flex; gap: 8px; }
                
                /* SECURITY FOOTER */
                .new-security-footer {
                    background: var(--navy-primary); border-radius: 16px; padding: 24px 40px;
                    display: flex; align-items: center; justify-content: space-between;
                    color: white; 
                }
                .sec-item { display: flex; align-items: center; gap: 16px; }
                .sec-icon-big { font-size: 32px; }
                .sec-text-stack { display: flex; flex-direction: column; gap: 4px; }
                .sec-label { font-size: 10px; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; }
                .sec-val { font-size: 24px; font-weight: 900; color: var(--gold-accent); letter-spacing: 1px; }
                .sec-sub { font-size: 12px; font-weight: 600; color: #cbd5e1; display: flex; align-items: center; gap: 6px; }
                .sec-dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; }
                .sec-divider { width: 1px; height: 50px; background: rgba(255,255,255,0.1); }
                
                /* Overrides for smaller security items */
                .sec-item:not(.clock-item) .sec-val { font-size: 14px; color: white; letter-spacing: 0; }

                /* MOBILE RESPONSIVE - READABLE FONTS & VERTICAL SCROLL */
                @media (max-width: 1024px) {
                    .new-main-grid { grid-template-columns: 1fr; }
                    .new-security-footer { flex-direction: column; gap: 20px; align-items: flex-start; padding: 24px; }
                    .sec-divider { display: none; }
                }
                /* Chart Legend Styling */
                .chart-legend { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
                .l-item { display: flex; align-items: center; font-size: 13px; font-weight: 600; }
                .l-dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; flex-shrink: 0; }
                .l-dot.green { background: #10b981; }
                .l-dot.red { background: #ef4444; }
                .l-dot.gray { background: #cbd5e1; }
                .l-text { flex: 1; color: #475569; }
                .l-val { font-weight: 800; color: var(--navy-primary); display: flex; align-items: center; gap: 4px; }
                .l-pct { font-size: 11px; font-weight: 600; color: #94a3b8; }

                @media (max-width: 768px) {
                    .tab-view-container { 
                        padding: 0; 
                        background: transparent; 
                        gap: 16px; 
                        overflow-y: auto; 
                    }
                    
                    /* Hero Banner Mobile */
                    .new-hero-banner { 
                        display: flex;
                        flex-direction: column; 
                        flex-shrink: 0; /* PREVENT SHRINKING */
                        padding: 24px 20px 0 20px; 
                        gap: 16px; 
                        background: var(--navy-primary);
                        border: none;
                        border-radius: 16px;
                        color: white;
                        align-items: flex-start;
                        overflow: hidden;
                        height: auto;
                    }
                    .hero-text-content { 
                        flex: none;
                        width: 100%;
                        max-width: 100%;
                        z-index: 2; 
                        padding-bottom: 0;
                    }
                    .hero-text-content h1 { font-size: 20px; color: white; margin: 0 0 8px 0; line-height: 1.3; font-weight: 700; }
                    .hero-name { color: var(--gold-accent); font-weight: 800; display: inline; }
                    .hero-text-content p { color: rgba(255,255,255,0.85); font-size: 12px; margin: 0 0 16px 0; max-width: 100%; line-height: 1.5; }
                    .hero-badge {
                        background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); color: white;
                        padding: 8px 12px; font-size: 11px; font-weight: 600;
                        border-radius: 8px;
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                    }
                    
                    .hero-illustration { 
                        position: relative;
                        flex: none;
                        width: 100%;
                        height: auto;
                        display: flex;
                        align-items: flex-end;
                        justify-content: center;
                        margin: 0;
                        padding: 0;
                    }
                    .hero-illustration img {
                        display: block;
                        width: 80%;
                        max-height: 140px;
                        height: auto;
                        object-fit: contain;
                        object-position: bottom center;
                        mix-blend-mode: normal;
                        margin: 0 auto;
                    }
                    
                    .mobile-content-wrapper {
                        display: flex;
                        flex-direction: column;
                        background: transparent;
                        border-radius: 0;
                        padding: 0;
                        gap: 16px;
                        position: relative;
                        z-index: 10;
                        margin-top: 0;
                    }
                    
                    /* Quick Stats - Side by Side to match mockup */
                    .new-quick-stats { 
                        display: flex; 
                        flex-direction: row; 
                        gap: 8px; 
                        width: 100%;
                    }
                    
                    .stat-box { 
                        flex: 1;
                        padding: 10px 8px;
                        border-radius: 12px;
                        min-width: 0;
                    }
                    .stat-icon-wrapper { width: 24px; height: 24px; font-size: 12px; margin-bottom: 6px; }
                    .s-label { font-size: 8px; font-weight: 700; }
                    .s-val { font-size: 16px; margin-top: 2px; }
                    .s-sub { display: none; }
                    .stat-trend { position: static; display: inline-block; margin-top: 6px; padding: 2px 6px; font-size: 8px; }
                    
                    .new-main-grid {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    
                    .summary-card { display: none; } /* Hide Doughnut on mobile */
                    
                    .grid-card { padding: 12px; gap: 8px; border-radius: 16px; }
                    .header-title { font-size: 13px; }
                    .c-icon { padding: 6px; font-size: 14px; }
                    .header-link { font-size: 12px; }

                    .s-row { padding: 10px 12px; gap: 8px; border-radius: 8px; }
                    .s-title { width: 90px; font-size: 11px; }
                    .s-value { font-size: 12px; }
                    .s-value-bold { font-size: 13px; }
                    .s-pill { font-size: 10px; padding: 4px 8px; }
                    
                    .primary-action-btn { padding: 12px; font-size: 13px; border-radius: 10px; }
                    .panduan-link { padding: 10px 12px; font-size: 12px; display: flex; }
                    
                    .history-list { display: flex; flex-direction: column; gap: 8px; }
                    .h-item { gap: 12px; padding-bottom: 8px; }
                    .h-date-box { width: 42px; height: 42px; border-radius: 10px; }
                    .h-day { font-size: 14px; }
                    .h-mo { font-size: 9px; }
                    .h-det-row { font-size: 11px; gap: 6px; }
                    .h-label { width: 40px; font-size: 9px; }
                    .h-time { width: 55px; }
                    .h-pill { font-size: 8px; padding: 2px 6px; }
                    .h-arrow { font-size: 11px; }

                    .new-security-footer { 
                        display: flex;
                        flex-direction: row; 
                        gap: 8px; 
                        align-items: center; 
                        justify-content: space-between;
                        padding: 16px; 
                        margin-bottom: 0;
                        border-radius: 16px;
                    }
                    .sec-divider { display: none; }
                    .clock-item { display: none; } /* Hide clock on mobile */
                    .sec-icon-big { font-size: 18px; }
                    .sec-label, .sec-sub { display: none; } /* Only icons and text */
                    .sec-val { font-size: 11px !important; }
                }
            `}</style>
        </div>
    );
}

export default HomeTab;
