import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';

function AttendanceLogTab() {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);

    const defaultMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);



    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const res = await axios.get(`${API_BASE_URL}/admin/attendance_logs`, {
                    params: { month: selectedMonth }
                });
                setHistory(res.data.history || []);
            } catch (err) {
                console.error("Gagal load history", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [selectedMonth]);

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

    const groupedLogs = history.reduce((acc, log) => {
        const key = `${log.nama}-${log.tanggal}`;
        if (!acc[key]) {
            acc[key] = {
                id: key,
                nama: log.nama,
                kode_karyawan: log.kode_karyawan || '-',
                nama_dept: log.nama_dept || 'Umum',
                tanggal: log.tanggal,
                masuk: null,
                pulang: null,
                searchStr: `${log.nama} ${log.kode_karyawan} ${log.nama_dept} ${log.tanggal}`.toLowerCase()
            };
        }
        if (log.jenis === 'masuk') {
            acc[key].masuk = log;
            acc[key].searchStr += ` ${log.status}`;
        }
        if (log.jenis === 'pulang') {
            acc[key].pulang = log;
            acc[key].searchStr += ` ${log.status}`;
        }
        return acc;
    }, {});

    let combinedHistory = Object.values(groupedLogs);
    combinedHistory.sort((a, b) => {
        if (a.tanggal !== b.tanggal) {
            return new Date(b.tanggal) - new Date(a.tanggal);
        }
        return a.nama.localeCompare(b.nama);
    });

    const filteredHistory = combinedHistory.filter(log => 
        log.searchStr.includes(searchTerm.toLowerCase())
    );
    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
    const currentHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header-flex">
                <div className="header-text">
                    <h2>Data Absensi (Riwayat)</h2>
                    <p>Log mendetail seluruh aktivitas absensi masuk dan keluar karyawan.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--slate-muted)' }}>BULAN:</span>
                        <input 
                            type="month"
                            className="search-input"
                            style={{ width: '150px' }}
                            value={selectedMonth}
                            onChange={e => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <input 
                        type="text" className="search-input" placeholder="Cari nama, status..." 
                        value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}} 
                        style={{ width: '250px' }}
                    />
                </div>
            </div>

            <div className="data-card">
                <div className="table-wrapper">
                    <table className="premium-admin-table">
                        <thead>
                            <tr>
                                <th>Nama Karyawan</th>
                                <th>Tanggal</th>
                                <th>Detail Masuk</th>
                                <th>Detail Pulang</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentHistory.length > 0 ? (
                                currentHistory.map((log) => (
                                    <tr key={log.id}>
                                        <td data-label="Karyawan">
                                            <div style={{fontWeight: '800', color: 'var(--navy-primary)'}}>{log.nama}</div>
                                            <div style={{fontSize: '12px', color: 'var(--slate-muted)', marginTop: '2px', display: 'flex', gap: '8px'}}>
                                                <span><i className="fas fa-id-badge" style={{color: '#cbd5e1'}}></i> {log.kode_karyawan}</span>
                                                <span><i className="fas fa-building" style={{color: '#cbd5e1'}}></i> {log.nama_dept}</span>
                                            </div>
                                        </td>
                                        <td data-label="Tanggal" style={{fontWeight: '600', color: 'var(--slate-muted)'}}>{log.tanggal}</td>
                                        
                                        <td data-label="Masuk">
                                            {log.masuk ? (
                                                <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start'}}>
                                                    <div className="att-photo-circle">
                                                        {log.masuk.foto_absen ? (
                                                            <img 
                                                                src={`${API_BASE_URL}/static/attendance_photos/${log.masuk.foto_absen}`} 
                                                                alt="Masuk" onClick={() => setSelectedImage(`${API_BASE_URL}/static/attendance_photos/${log.masuk.foto_absen}`)}
                                                                className="clickable-image"
                                                            />
                                                        ) : <span className="no-pic">?</span>}
                                                    </div>
                                                    <div>
                                                        <div style={{fontWeight: '800', color: 'var(--navy-primary)', fontSize: '15px'}}>
                                                            {displayTime(log.masuk.waktu)}
                                                        </div>
                                                        <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px'}}>
                                                            <span className={`status-pill ${log.masuk.status}`}>
                                                                {log.masuk.status.replace('_', ' ')}
                                                                {log.masuk.status === 'terlambat' && log.masuk.menit_terlambat > 0 && ` (${formatDuration(log.masuk.menit_terlambat)})`}
                                                            </span>
                                                            <span className={`accuracy-val ${log.masuk.confidence_score < 75 ? 'low' : 'high'}`} style={{fontSize: '10px'}}>
                                                                {Math.round(log.masuk.confidence_score)}%
                                                            </span>
                                                        </div>
                                                        {log.masuk.alasan && (
                                                            <div style={{fontSize: '11px', color: '#64748b', marginTop: '6px', fontStyle: 'italic', maxWidth: '200px', lineHeight: '1.4'}}>
                                                                <i className="fas fa-comment-dots"></i> {log.masuk.alasan}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : <div style={{color: '#94a3b8', fontStyle: 'italic'}}>Belum Absen Masuk</div>}
                                        </td>

                                        <td data-label="Pulang">
                                            {log.pulang ? (
                                                <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start'}}>
                                                    <div className="att-photo-circle">
                                                        {log.pulang.foto_absen ? (
                                                            <img 
                                                                src={`${API_BASE_URL}/static/attendance_photos/${log.pulang.foto_absen}`} 
                                                                alt="Pulang" onClick={() => setSelectedImage(`${API_BASE_URL}/static/attendance_photos/${log.pulang.foto_absen}`)}
                                                                className="clickable-image"
                                                            />
                                                        ) : <span className="no-pic">?</span>}
                                                    </div>
                                                    <div>
                                                        <div style={{fontWeight: '800', color: 'var(--navy-primary)', fontSize: '15px'}}>
                                                            {displayTime(log.pulang.waktu)}
                                                        </div>
                                                        <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px'}}>
                                                            <span className={`status-pill ${log.pulang.status}`}>
                                                                {log.pulang.status.replace('_', ' ')}
                                                            </span>
                                                            <span className={`accuracy-val ${log.pulang.confidence_score < 75 ? 'low' : 'high'}`} style={{fontSize: '10px'}}>
                                                                {Math.round(log.pulang.confidence_score)}%
                                                            </span>
                                                        </div>
                                                        {log.pulang.alasan && (
                                                            <div style={{fontSize: '11px', color: '#64748b', marginTop: '6px', fontStyle: 'italic', maxWidth: '200px', lineHeight: '1.4'}}>
                                                                <i className="fas fa-comment-dots"></i> {log.pulang.alasan}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : <div style={{color: '#94a3b8', fontStyle: 'italic'}}>Belum Absen Pulang</div>}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="empty-state">Belum ada data riwayat absensi yang sesuai.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    
                    {filteredHistory.length > 0 && (
                        <div className="pagination-container">
                            <div className="page-info">
                                Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredHistory.length)} dari {filteredHistory.length} data
                            </div>
                            
                            <div className="page-controls">
                                <div className="rows-per-page">
                                    <label>Tampilkan:</label>
                                    <select 
                                        value={itemsPerPage} 
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>
                                
                                <div className="page-buttons">
                                    <button 
                                        className="btn-page" 
                                        onClick={() => setCurrentPage(p => p - 1)} 
                                        disabled={currentPage === 1}
                                    >
                                        Prev
                                    </button>
                                    <span className="page-current">Page {currentPage} of {totalPages}</span>
                                    <button 
                                        className="btn-page" 
                                        onClick={() => setCurrentPage(p => p + 1)} 
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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
                .btn-close-viewer:hover { background: rgba(255,255,255,0.4); }
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

                .clickable-image { transition: transform 0.2s; }
                .clickable-image:hover { transform: scale(1.1); }

                /* Pagination Container */
                .pagination-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 24px;
                    background: #f8fafc;
                    border-top: 1px solid #e2e8f0;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .page-info { font-size: 13px; color: var(--slate-muted); font-weight: 500; }

                .page-controls {
                    display: flex;
                    align-items: center;
                    gap: 24px;
                }

                .rows-per-page {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    color: var(--slate-muted);
                }
                .rows-per-page select {
                    padding: 4px 8px;
                    border-radius: 6px;
                    border: 1px solid #cbd5e1;
                    outline: none;
                    background: white;
                    cursor: pointer;
                    font-size: 13px;
                }

                .page-buttons {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .page-current { font-size: 13px; font-weight: 600; color: var(--navy-primary); }
                .btn-page {
                    padding: 6px 12px;
                    background: white;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--navy-primary);
                    cursor: pointer;
                    transition: 0.2s;
                }
                .btn-page:hover:not(:disabled) { background: #f1f5f9; border-color: #94a3b8; }
                .btn-page:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; opacity: 0.6; }
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
