import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import { toast } from 'react-toastify';

function MasterDatasetTab() {
    const [datasets, setDatasets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [previewDataset, setPreviewDataset] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const fetchDatasets = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/admin/datasets`);
            setDatasets(res.data.datasets || []);
        } catch (err) {
            console.error(err);
            toast.error('Gagal memuat data dataset wajah');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDatasets();
    }, []);

    const confirmDelete = (karyawanId, nama) => {
        setDeleteConfirm({ id: karyawanId, nama: nama });
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            const res = await axios.delete(`${API_BASE_URL}/admin/datasets/${deleteConfirm.id}`);
            toast.success(res.data.message);
            setDeleteConfirm(null);
            fetchDatasets();
        } catch (err) {
            toast.error('Gagal menghapus dataset');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const filteredDatasets = datasets.filter(ds => 
        (ds.nama && ds.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ds.kode_karyawan && ds.kode_karyawan.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const totalPages = Math.ceil(filteredDatasets.length / itemsPerPage);
    const currentDatasets = filteredDatasets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header-flex">
                <div className="header-text">
                    <h2>Master Data Citra (Dataset)</h2>
                    <p>Manajemen dataset wajah karyawan (Face Recognition Templates).</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <input 
                        type="text" className="search-input" placeholder="Cari NIP atau Nama..." 
                        value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}} 
                    />
                </div>
            </div>

            <div className="data-card">
                <div className="table-wrapper">
                    {isLoading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Memuat dataset...</div>
                    ) : (
                        <>
                            <table className="premium-admin-table">
                                <thead>
                                    <tr>
                                        <th>Nama Karyawan</th>
                                        <th>NIP</th>
                                        <th>Departemen</th>
                                        <th>Total Citra Wajah</th>
                                        <th>Terakhir Rekam</th>
                                        <th style={{ textAlign: 'center' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentDatasets.length > 0 ? currentDatasets.map((ds) => (
                                        <tr key={ds.karyawan_id}>
                                            <td className="bold">
                                                <span style={{ fontSize: '14px', color: '#0f172a' }}>{ds.nama}</span>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>{ds.kode_karyawan}</span>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: '13px', color: '#64748b' }}>{ds.nama_dept || '-'}</span>
                                            </td>
                                            <td>
                                                <span style={{
                                                    background: ds.total_citra > 0 ? '#dcfce7' : '#fee2e2',
                                                    color: ds.total_citra > 0 ? '#166534' : '#991b1b',
                                                    padding: '6px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: '800'
                                                }}>
                                                    {ds.total_citra} Gambar
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '13px', color: '#475569' }}>{formatDate(ds.terakhir_perekaman)}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button 
                                                        className="btn-primary-sm" 
                                                        onClick={() => setPreviewDataset(ds)}
                                                        disabled={ds.total_citra === 0}
                                                        style={{ background: ds.total_citra === 0 ? '#cbd5e1' : '#3b82f6', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: ds.total_citra === 0 ? 'not-allowed' : 'pointer' }}
                                                    >
                                                        Lihat Preview
                                                    </button>
                                                    <button 
                                                        className="btn-danger-sm" 
                                                        onClick={() => confirmDelete(ds.karyawan_id, ds.nama)}
                                                        disabled={ds.total_citra === 0}
                                                    >
                                                        Hapus Dataset
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="7" className="empty-state">
                                                Belum ada dataset wajah yang terdaftar atau sesuai pencarian.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            
                            {filteredDatasets.length > 0 && (
                                <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span className="pagination-info" style={{ fontSize: '13px', color: '#64748b' }}>Menampilkan halaman {currentPage} dari {totalPages}</span>
                                        <select 
                                            value={itemsPerPage} 
                                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                                        >
                                            <option value={10}>10 Baris</option>
                                            <option value={20}>20 Baris</option>
                                            <option value={50}>50 Baris</option>
                                        </select>
                                    </div>
                                    <div className="pagination-buttons" style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            className="btn-page" 
                                            disabled={currentPage === 1} 
                                            onClick={() => setCurrentPage(p => p - 1)}
                                            style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: currentPage === 1 ? '#f8fafc' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                                        >Prev</button>
                                        <button 
                                            className="btn-page" 
                                            disabled={currentPage === totalPages} 
                                            onClick={() => setCurrentPage(p => p + 1)}
                                            style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: currentPage === totalPages ? '#f8fafc' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                                        >Next</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            {previewDataset && (
                <div className="preview-modal-overlay">
                    <div className="preview-modal-content">
                        <div className="preview-modal-header">
                            <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>Preview Dataset: {previewDataset.nama} ({previewDataset.kode_karyawan})</h3>
                            <button className="preview-close-btn" onClick={() => setPreviewDataset(null)}>&times;</button>
                        </div>
                        <div className="preview-modal-body">
                            <div className="gallery-grid">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <div key={i} className="gallery-item">
                                        <img 
                                            src={`${API_BASE_URL}/static/datasets/${previewDataset.kode_karyawan}/${i + 1}.jpg`} 
                                            alt={`Img ${i + 1}`}
                                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }}
                                        />
                                        <div className="gallery-number">{i + 1}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-box">
                        <h3>Konfirmasi Hapus</h3>
                        <p>Yakin ingin <strong>MENGHAPUS SEMUA DATASET WAJAH</strong> milik <strong>{deleteConfirm.nama}</strong>?<br/>
                        <span style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', display: 'block' }}>*Tindakan ini permanen dan Karyawan harus mendaftar ulang wajahnya.</span></p>
                        <div className="modal-actions-p">
                            <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Batal</button>
                            <button className="btn-confirm-delete" onClick={handleDelete}>Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .tab-view-container { display: flex; flex-direction: column; gap: 24px; }
                .preview-modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(11, 26, 42, 0.85); backdrop-filter: blur(8px);
                    display: flex; align-items: center; justify-content: center; z-index: 2000;
                }
                .preview-modal-content {
                    background: #f8fafc; width: 100%; max-width: 800px; border-radius: 16px;
                    overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.4);
                    animation: slideUp 0.3s ease-out forwards;
                }
                .preview-modal-header {
                    background: linear-gradient(135deg, var(--navy-primary) 0%, #1a365d 100%);
                    padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;
                }
                .preview-close-btn {
                    background: none; border: none; color: white; font-size: 24px; cursor: pointer; opacity: 0.8;
                }
                .preview-close-btn:hover { opacity: 1; transform: scale(1.1); }
                .preview-modal-body {
                    padding: 24px; max-height: 70vh; overflow-y: auto;
                }
                .gallery-grid {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 16px;
                }
                .gallery-item {
                    position: relative; border-radius: 8px; overflow: hidden; background: #e2e8f0; aspect-ratio: 1;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 2px solid white;
                }
                .gallery-item img {
                    width: 100%; height: 100%; object-fit: cover;
                }
                .gallery-number {
                    position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white;
                    font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold;
                }
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                
                .header-flex { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
                .header-flex h2 { font-size: 24px; font-weight: 800; color: var(--navy-primary); margin: 0 0 4px 0; }
                .subtitle { color: var(--slate-muted); font-size: 14px; margin: 0; }            
                
                .data-card {
                    background: white; border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden;
                }

                .premium-admin-table { width: 100%; border-collapse: collapse; }
                .premium-admin-table th {
                    background: #f8fafc; padding: 18px 24px; text-align: left;
                    font-size: 13px; font-weight: 700; color: #475569; letter-spacing: 0.5px;
                    border-bottom: 2px solid #f1f5f9; white-space: nowrap;
                }
                .premium-admin-table td {
                    padding: 16px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle;
                }
                .premium-admin-table tr:hover { background: #fcfdfe; }
                
                .search-input {
                    padding: 12px 20px; border-radius: 12px; border: 1px solid #e2e8f0;
                    background: white; font-weight: 600; width: 250px;
                }

                .btn-danger-sm {
                    background: #fee2e2; color: #ef4444; border: none; padding: 8px 16px;
                    border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; transition: 0.2s;
                }
                .btn-danger-sm:hover:not(:disabled) { background: #ef4444; color: white; }
                .btn-danger-sm:disabled { opacity: 0.5; cursor: not-allowed; }

                /* Custom Delete Modal Classes (matching MasterDepartemenTab) */
                .custom-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2500; animation: fadeIn 0.2s; }
                .custom-modal-box { background: white; padding: 24px 30px; border-radius: 16px; width: 400px; max-width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center; }
                .custom-modal-box h3 { margin-top: 0; color: #dc2626; font-size: 20px; margin-bottom: 12px; }
                .custom-modal-box p { color: var(--slate-muted); font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
                .modal-actions-p { display: flex; gap: 12px; justify-content: center; }
                .modal-actions-p button { padding: 10px 20px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; transition: 0.2s; }
                .btn-cancel { background: #f1f5f9; color: var(--navy-primary); }
                .btn-cancel:hover { background: #e2e8f0; }
                .btn-confirm-delete { background: #dc2626; color: white; }
                .btn-confirm-delete:hover { background: #b91c1c; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
}

export default MasterDatasetTab;
