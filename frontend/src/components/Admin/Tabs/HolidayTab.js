import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import { toast } from 'react-toastify';
import './HolidayTab.css';

function HolidayTab() {
    const [holidays, setHolidays] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteConfirmHoliday, setDeleteConfirmHoliday] = useState(null);
    const [editingHoliday, setEditingHoliday] = useState(null);

    const [newHoliday, setNewHoliday] = useState({ tanggal: '', keterangan: '' });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/admin/holidays`);
            if (Array.isArray(res.data)) {
                setHolidays(res.data);
            } else if (res.data && Array.isArray(res.data.holidays)) {
                setHolidays(res.data.holidays);
            } else {
                setHolidays([]);
            }
        } catch (err) {
            console.error("Gagal load holiday data", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddHoliday = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/admin/holidays`, newHoliday);
            toast.success("Hari libur ditambahkan");
            setNewHoliday({ tanggal: '', keterangan: '' });
            fetchData();
        } catch (err) { toast.error("Gagal menambah hari libur"); }
    };

    const handleSyncHolidays = async () => {
        setIsLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/admin/holidays/sync`);
            toast.success(res.data.message || "Sinkronisasi berhasil");
            fetchData();
        } catch (err) { 
            toast.error("Gagal sinkronisasi libur nasional");
            setIsLoading(false);
        }
    };

    const handleDeleteHoliday = async () => {
        if (!deleteConfirmHoliday) return;
        try {
            await axios.delete(`${API_BASE_URL}/admin/holidays/${deleteConfirmHoliday}`);
            toast.success("Hari libur dihapus");
            setDeleteConfirmHoliday(null);
            fetchData();
        } catch (err) { toast.error("Gagal menghapus"); }
    };

    const handleUpdateHoliday = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_BASE_URL}/admin/holidays/${editingHoliday.id}`, editingHoliday);
            toast.success("Hari libur berhasil diupdate");
            setEditingHoliday(null);
            fetchData();
        } catch (err) { toast.error("Gagal update hari libur"); }
    };

    if (isLoading) {
        return <div style={{padding: '40px', fontWeight: '800'}}>Memuat Master Hari Libur...</div>;
    }

    const holidayList = Array.isArray(holidays) ? holidays : [];
    const totalPages = Math.ceil(holidayList.length / itemsPerPage);
    const currentHolidays = holidayList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header-p">
                <h2>Master Hari Libur</h2>
                <p>Kelola tanggal merah dan hari libur nasional atau cuti bersama. Sistem tidak akan menghitung keterlambatan atau ketidakhadiran pada tanggal-tanggal berikut.</p>
            </div>

            <div className="holiday-grid">
                <div className="holiday-card">
                    <div className="card-p-header">
                        <h3>📅 Tambah Hari Libur</h3>
                    </div>
                    <div className="card-p-body">
                        <form onSubmit={handleAddHoliday} className="holiday-form">
                            <div className="input-group">
                                <label>Pilih Tanggal</label>
                                <input type="date" value={newHoliday.tanggal} onChange={(e) => setNewHoliday({...newHoliday, tanggal: e.target.value})} required />
                            </div>
                            <div className="input-group">
                                <label>Keterangan Libur</label>
                                <input type="text" placeholder="Misal: Idul Fitri, Hari Kemerdekaan" value={newHoliday.keterangan} onChange={(e) => setNewHoliday({...newHoliday, keterangan: e.target.value})} required />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="submit" className="btn-add-holiday" style={{ flex: 1 }}>Simpan Libur</button>
                                <button type="button" onClick={handleSyncHolidays} className="btn-add-holiday" style={{ flex: 1, backgroundColor: '#10b981' }}>🔄 Auto Sync</button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="holiday-card">
                    <div className="card-p-header">
                        <h3>Daftar Hari Libur (Terbaru)</h3>
                    </div>
                    <div className="card-p-body list-body">
                        <div className="holiday-list-p">
                            {currentHolidays.length > 0 ? currentHolidays.map(h => (
                                <div key={h.id} className="holiday-item-p">
                                    <div className="h-meta">
                                        <span className="h-date">{new Date(h.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        <span className="h-text">{h.keterangan}</span>
                                    </div>
                                    <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                        <button className="btn-edit-icon" onClick={() => setEditingHoliday({...h})} style={{background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px'}} title="Edit">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                        <button className="btn-del-icon" onClick={() => setDeleteConfirmHoliday(h.id)} title="Hapus">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state">
                                    <p>Belum ada daftar hari libur. Silahkan tambahkan di samping.</p>
                                </div>
                            )}
                        </div>
                        
                        {holidayList.length > 0 && (
                            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span className="pagination-info">Halaman {currentPage} dari {totalPages}</span>
                                    <select 
                                        value={itemsPerPage} 
                                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                        style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                    >
                                        <option value={10}>10 Baris</option>
                                        <option value={20}>20 Baris</option>
                                    </select>
                                </div>
                                <div className="pagination-buttons">
                                    <button className="btn-page" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{marginRight: '5px', padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer'}}>Prev</button>
                                    <button className="btn-page" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer'}}>Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {deleteConfirmHoliday && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-box">
                        <div className="modal-icon-danger">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </div>
                        <h3>Konfirmasi Hapus Libur</h3>
                        <p>Yakin ingin menghapus hari libur ini?<br/>Hari tersebut akan kembali dianggap sebagai hari kerja normal.</p>
                        <div className="modal-actions-p">
                            <button className="btn-cancel" onClick={() => setDeleteConfirmHoliday(null)}>Batal</button>
                            <button className="btn-confirm-delete" onClick={handleDeleteHoliday}>Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            {editingHoliday && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-box" style={{maxWidth: '400px', textAlign: 'left'}}>
                        <div className="modal-header-p" style={{borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px', textAlign: 'center'}}>
                            <h3 style={{margin: 0, color: '#1e293b'}}>Edit Hari Libur</h3>
                        </div>
                        <form onSubmit={handleUpdateHoliday}>
                            <div className="input-group" style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Tanggal</label>
                                <input type="date" value={editingHoliday.tanggal} onChange={(e) => setEditingHoliday({...editingHoliday, tanggal: e.target.value})} required style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1'}} />
                            </div>
                            <div className="input-group" style={{marginBottom: '20px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>Keterangan Libur</label>
                                <input type="text" value={editingHoliday.keterangan} onChange={(e) => setEditingHoliday({...editingHoliday, keterangan: e.target.value})} required style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1'}} />
                            </div>
                            <div className="modal-actions-p" style={{display: 'flex', justifyContent: 'center', gap: '10px'}}>
                                <button type="button" className="btn-cancel" onClick={() => setEditingHoliday(null)}>Batal</button>
                                <button type="submit" className="btn-confirm" style={{backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer'}}>Simpan Perubahan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HolidayTab;
