import React, { useState } from 'react';
import API_BASE_URL from '../../../apiConfig';

function HistoryTab({ history, selectedMonth, setSelectedMonth }) {
    const [selectedImage, setSelectedImage] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const formatDuration = (minutes) => {
        if (!minutes || minutes <= 0) return '';
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}j ${m}m` : `${h}j`;
    };

    const formatDate = (dateString) => {
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', options);
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = history.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(history.length / itemsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const renderTableCell = (data) => {
        if (!data) return <span className="empty-dash">-</span>;
        
        return (
            <div className="tbl-cell-content">
                {data.foto_absen && (
                    <img 
                        src={`${API_BASE_URL}/static/attendance_photos/${data.foto_absen}`} 
                        alt="Face" 
                        className="tbl-avatar"
                        onClick={() => setSelectedImage(`${API_BASE_URL}/static/attendance_photos/${data.foto_absen}`)}
                        title="Klik untuk perbesar"
                    />
                )}
                <div className="tbl-info">
                    <div className="tbl-time-row">
                        <strong>{data.waktu ? data.waktu.substring(0, 5) : '--:--'}</strong>
                        <span className={`tbl-badge ${data.status}`}>
                            {data.status.replace('_', ' ')}
                            {data.status === 'terlambat' && data.menit_terlambat > 0 && ` (${formatDuration(data.menit_terlambat)})`}
                        </span>
                    </div>
                    {(data.alasan || data.confidence_score) && (
                        <div className="tbl-sub">
                            {data.confidence_score && (
                                <span className={`tbl-acc ${data.confidence_score < 75 ? 'low' : 'high'}`} title="Akurasi Wajah">
                                    🎯 {data.confidence_score}%
                                </span>
                            )}
                            {data.alasan && (
                                <span className="tbl-reason" title={data.alasan}>
                                    "{data.alasan.length > 25 ? data.alasan.substring(0, 25) + '...' : data.alasan}"
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header">
                <div>
                    <h2>Riwayat Absensi</h2>
                    <p>Rekap data kehadiran harian Anda.</p>
                </div>
                <div className="month-picker-container">
                    <span>BULAN:</span>
                    <input 
                        type="month"
                        className="search-input"
                        value={selectedMonth}
                        onChange={(e) => {
                            setSelectedMonth(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
            </div>

            <div className="data-table-card">
                <div className="table-responsive">
                    <table className="modern-data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '160px' }}>Tanggal</th>
                                <th>Absen Masuk</th>
                                <th>Absen Pulang</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length > 0 ? (
                                currentItems.map((log, index) => (
                                    <tr key={index}>
                                        <td className="td-date">
                                            <strong>{formatDate(log.tanggal)}</strong>
                                        </td>
                                        <td>{renderTableCell(log.masuk)}</td>
                                        <td>{renderTableCell(log.pulang)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="empty-state">
                                        Belum ada data riwayat absensi.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {history.length > 0 && (
                    <div className="pagination-container">
                        <div className="page-info">
                            Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, history.length)} dari {history.length} data
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
                                    onClick={() => handlePageChange(currentPage - 1)} 
                                    disabled={currentPage === 1}
                                >
                                    Prev
                                </button>
                                <span className="page-current">Page {currentPage} of {totalPages}</span>
                                <button 
                                    className="btn-page" 
                                    onClick={() => handlePageChange(currentPage + 1)} 
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
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
                .tab-view-container { display: flex; flex-direction: column; gap: 24px; width: 100%; margin: 0 auto; }
                .section-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
                .section-header h2 { font-size: 24px; font-weight: 800; color: var(--navy-primary); margin-bottom: 4px; }
                .section-header p { color: var(--slate-muted); margin: 0; }
                
                .month-picker-container { display: flex; align-items: center; gap: 8px; }
                .month-picker-container span { font-size: 13px; font-weight: 700; color: var(--slate-muted); }
                .month-picker-container input { width: 150px; padding: 10px 16px; border-radius: 10px; border: 1px solid #cbd5e1; outline: none; }


                .data-table-card {
                    background: #ffffff;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    overflow: hidden;
                }

                .table-responsive {
                    width: 100%;
                    overflow-x: auto;
                }

                .modern-data-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .modern-data-table th {
                    background: #f8fafc;
                    padding: 16px 20px;
                    text-align: left;
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--slate-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 1px solid #e2e8f0;
                }
                .modern-data-table td {
                    padding: 14px 20px;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }
                .modern-data-table tr:hover td {
                    background-color: #fcfdfe;
                }
                .modern-data-table tr:last-child td {
                    border-bottom: none;
                }

                .td-date strong {
                    font-size: 14px;
                    color: var(--navy-primary);
                }
                .empty-dash { color: #94a3b8; }

                /* Cell Content */
                .tbl-cell-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .tbl-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 1px solid #cbd5e1;
                    cursor: pointer;
                    transition: 0.2s;
                    flex-shrink: 0;
                }
                .tbl-avatar:hover { transform: scale(1.1); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                
                .tbl-info { display: flex; flex-direction: column; gap: 4px; }
                
                .tbl-time-row { display: flex; align-items: center; gap: 8px; }
                .tbl-time-row strong { font-size: 14px; font-weight: 800; color: var(--navy-primary); }
                
                .tbl-badge {
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .tbl-badge.tepat_waktu { background: #dcfce7; color: #059669; }
                .tbl-badge.terlambat { background: #fee2e2; color: #dc2626; }
                .tbl-badge.pulang_awal { background: #ffedd5; color: #ea580c; }
                .tbl-badge.lembur { background: #dbeafe; color: #2563eb; }

                .tbl-sub { display: flex; align-items: center; gap: 8px; font-size: 11px; }
                .tbl-acc { font-weight: 600; }
                .tbl-acc.high { color: #059669; }
                .tbl-acc.low { color: #ea580c; }
                .tbl-reason { color: #64748b; font-style: italic; background: #f8fafc; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; }

                /* Pagination Container */
                .pagination-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
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

                .empty-state { padding: 40px !important; text-align: center; color: var(--slate-muted); font-style: italic; }

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
                    .modern-data-table, .modern-data-table tbody, .modern-data-table tr, .modern-data-table td { display: block; width: 100%; }
                    .modern-data-table thead { display: none; }
                    .modern-data-table tr { padding: 12px; border-bottom: 8px solid #f1f5f9; }
                    .modern-data-table td {
                        display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
                        padding: 12px 0; border-bottom: 1px dashed #e2e8f0; text-align: left;
                    }
                    .modern-data-table td:first-child { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 4px; }
                    .modern-data-table td::before {
                        content: attr(data-label); font-weight: 800; font-size: 10px;
                        color: var(--slate-muted); text-transform: uppercase; margin-bottom: 2px;
                    }
                    .modern-data-table td:last-child { border-bottom: none; }
                    
                    .section-header { flex-direction: column; align-items: flex-start; gap: 12px; }
                    .month-picker-container { width: 100%; }
                    .month-picker-container input { flex: 1; }

                    .pagination-container { flex-direction: column; align-items: stretch; gap: 16px; }
                    .page-controls { flex-direction: column; align-items: stretch; gap: 16px; }
                    .rows-per-page { justify-content: space-between; }
                    .page-buttons { justify-content: space-between; }
                }
            `}</style>
        </div>
    );
}

export default HistoryTab;
