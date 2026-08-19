import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import { toast } from 'react-toastify';

function ScheduleTab() {
    const [shifts, setShifts] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteConfirmShift, setDeleteConfirmShift] = useState(null);

    const [searchTermShift, setSearchTermShift] = useState('');
    const [currentPageShift, setCurrentPageShift] = useState(1);
    const [itemsPerPageShift, setItemsPerPageShift] = useState(10);

    const [newShift, setNewShift] = useState({
        dept_id: '',
        nama_shift: '',
        jam_masuk: '08:00',
        jam_pulang: '17:00',
        toleransi_menit: 15
    });
    const [isEditing, setIsEditing] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Gunakan endpoint yang sesuai dengan main.py
            const [scheduleRes, masterRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/admin/schedule`),
                axios.get(`${API_BASE_URL}/admin/master_data`)
            ]);
            setShifts(scheduleRes.data.schedules || []);
            setDepartments(masterRes.data.departemens || []);
        } catch (err) {
            console.error("Gagal load schedule data", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddShift = async (e) => {
        e.preventDefault();
        try {
            // Gunakan endpoint /admin/schedule sesuai main.py (ini berfungsi sebagai upsert/update juga jika dept_id sudah ada)
            await axios.post(`${API_BASE_URL}/admin/schedule`, newShift);
            toast.success(isEditing ? "Shift kerja diperbarui" : "Shift kerja ditambahkan");
            setNewShift({ dept_id: '', nama_shift: '', jam_masuk: '08:00', jam_pulang: '17:00', toleransi_menit: 15 });
            setIsEditing(false);
            fetchData();
        } catch (err) { toast.error("Gagal menyimpan shift"); }
    };

    const handleEditClick = (shift) => {
        const formatTime = (timeStr) => {
            if (!timeStr) return null;
            const parts = timeStr.split(':');
            if (parts.length >= 2) {
                const hh = parts[0].padStart(2, '0');
                const mm = parts[1].padStart(2, '0');
                return `${hh}:${mm}`;
            }
            return timeStr;
        };

        setNewShift({
            dept_id: shift.dept_id,
            nama_shift: shift.nama_shift || '',
            jam_masuk: shift.jam_masuk ? formatTime(shift.jam_masuk) : '08:00',
            jam_pulang: shift.jam_pulang ? formatTime(shift.jam_pulang) : '17:00',
            toleransi_menit: shift.toleransi_menit || 15
        });
        setIsEditing(true);
        // Scroll ke atas agar user lihat formnya
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setNewShift({ dept_id: '', nama_shift: '', jam_masuk: '08:00', jam_pulang: '17:00', toleransi_menit: 15 });
        setIsEditing(false);
    };

    const handleDeleteShift = async () => {
        if (!deleteConfirmShift) return;
        try {
            await axios.delete(`${API_BASE_URL}/admin/schedule/${deleteConfirmShift}`);
            toast.success("Shift dihapus");
            setDeleteConfirmShift(null);
            fetchData();
        } catch (err) { toast.error("Gagal menghapus"); }
    };

    if (isLoading) {
        return <div style={{padding: '40px', fontWeight: '800'}}>Memuat Pengaturan Jadwal...</div>;
    }

    const filteredShifts = shifts.filter(s => 
        (s.nama_dept && s.nama_dept.toLowerCase().includes(searchTermShift.toLowerCase())) ||
        (s.nama_shift && s.nama_shift.toLowerCase().includes(searchTermShift.toLowerCase()))
    );
    const totalPagesShift = Math.ceil(filteredShifts.length / itemsPerPageShift);
    const currentShifts = filteredShifts.slice((currentPageShift - 1) * itemsPerPageShift, currentPageShift * itemsPerPageShift);

    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header-p">
                <h2>Master Shift Kerja</h2>
                <p>Konfigurasi jam kerja dan batas toleransi keterlambatan untuk setiap departemen.</p>
            </div>

            <div className="schedule-grid">
                {/* Shift Kerja Section */}
                <div className="schedule-card full-width">
                    <div className="card-p-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>🕒 Pengaturan Shift per Departemen</h3>
                        <input 
                            type="text" className="search-input" placeholder="Cari departemen/shift..." 
                            value={searchTermShift} onChange={e => {setSearchTermShift(e.target.value); setCurrentPageShift(1);}} 
                            style={{ width: '200px', padding: '6px 10px' }}
                        />
                    </div>
                    <div className="card-p-body">
                        <form onSubmit={handleAddShift} className="shift-horizontal-form">
                            <select 
                                value={newShift.dept_id} 
                                onChange={(e) => setNewShift({...newShift, dept_id: e.target.value})}
                                required
                            >
                                <option value="">Pilih Departemen</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.nama_dept}</option>)}
                            </select>
                            <input 
                                type="text" placeholder="Nama Shift (pagi/siang)" 
                                value={newShift.nama_shift} 
                                onChange={(e) => setNewShift({...newShift, nama_shift: e.target.value})} 
                                required 
                            />
                            <div className="time-group">
                                <label>Masuk</label>
                                <input type="time" value={newShift.jam_masuk} onChange={(e) => setNewShift({...newShift, jam_masuk: e.target.value})} required />
                            </div>
                            <div className="time-group">
                                <label>Pulang</label>
                                <input type="time" value={newShift.jam_pulang} onChange={(e) => setNewShift({...newShift, jam_pulang: e.target.value})} required />
                            </div>
                            <input 
                                type="number" placeholder="Toleransi (menit)" 
                                value={newShift.toleransi_menit} 
                                onChange={(e) => setNewShift({...newShift, toleransi_menit: e.target.value})} 
                                style={{ width: '100px' }}
                            />
                            <button type="submit" className="btn-save-mini">{isEditing ? 'Update' : 'Simpan'}</button>
                            {isEditing && (
                                <button type="button" className="btn-save-mini" style={{background: '#f1f5f9', color: 'var(--navy-primary)'}} onClick={handleCancelEdit}>Batal</button>
                            )}
                        </form>

                        <div className="table-wrapper-p">
                            <table className="shift-table-mini">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                                        <th>Departemen</th>
                                        <th>Nama Shift</th>
                                        <th>Jam Masuk</th>
                                        <th>Jam Pulang</th>
                                        <th>Toleransi</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentShifts.length > 0 ? currentShifts.map((s, index) => (
                                        <tr key={s.id}>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>
                                                {(currentPageShift - 1) * itemsPerPageShift + index + 1}
                                            </td>
                                            <td><strong>{s.nama_dept}</strong></td>
                                            <td>{s.nama_shift}</td>
                                            <td>{s.jam_masuk.substring(0,5)}</td>
                                            <td>{s.jam_pulang.substring(0,5)}</td>
                                            <td>{s.toleransi_menit} menit</td>
                                            <td>
                                                <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                                                    <button className="btn-edit-text" onClick={() => handleEditClick(s)} title="Edit Shift">
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button className="btn-del-text" onClick={() => setDeleteConfirmShift(s.id)} title="Hapus Shift">
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan="7" className="empty-p">Belum ada shift yang sesuai.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        
                        {filteredShifts.length > 0 && (
                            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span className="pagination-info">Halaman {currentPageShift} dari {totalPagesShift}</span>
                                    <select 
                                        value={itemsPerPageShift} 
                                        onChange={(e) => { setItemsPerPageShift(Number(e.target.value)); setCurrentPageShift(1); }}
                                        style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                    >
                                        <option value={10}>10 Baris</option>
                                        <option value={20}>20 Baris</option>
                                    </select>
                                </div>
                                <div className="pagination-buttons">
                                    <button className="btn-page" disabled={currentPageShift === 1} onClick={() => setCurrentPageShift(p => p - 1)}>Prev</button>
                                    <button className="btn-page" disabled={currentPageShift === totalPagesShift} onClick={() => setCurrentPageShift(p => p + 1)}>Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {deleteConfirmShift && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-box">
                        <h3>Konfirmasi Hapus Shift</h3>
                        <p>Yakin ingin menghapus shift ini?<br/>Karyawan di departemen ini akan kembali ke jam kerja default jika ada.</p>
                        <div className="modal-actions-p">
                            <button className="btn-cancel" onClick={() => setDeleteConfirmShift(null)}>Batal</button>
                            <button className="btn-confirm-delete" onClick={handleDeleteShift}>Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}



            <style>{`
                .schedule-grid { display: flex; flex-direction: column; gap: 24px; }
                .schedule-card { background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; overflow: hidden; width: 100%; }
                .card-p-header { padding: 18px 24px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
                .card-p-header h3 { font-size: 15px; font-weight: 800; color: var(--navy-primary); }
                .card-p-body { padding: 24px; }

                .shift-horizontal-form { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; align-items: flex-end; background: #f8fafc; padding: 16px; border-radius: 12px; }
                .shift-horizontal-form select, .shift-horizontal-form input { padding: 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; }
                .time-group { display: flex; flex-direction: column; gap: 4px; }
                .time-group label { font-size: 10px; font-weight: 800; color: var(--slate-muted); text-transform: uppercase; }
                .btn-save-mini { background: var(--navy-primary); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 800; cursor: pointer; }

                .shift-table-mini { width: 100%; border-collapse: collapse; font-size: 13px; }
                .shift-table-mini th { text-align: left; padding: 12px; color: var(--slate-muted); border-bottom: 2px solid #f1f5f9; }
                .shift-table-mini td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
                .btn-del-text { color: #ef4444; background: none; border: none; font-size: 16px; cursor: pointer; transition: 0.2s; }
                .btn-del-text:hover { color: #dc2626; transform: scale(1.1); }
                .btn-edit-text { color: var(--navy-primary); background: none; border: none; font-size: 16px; cursor: pointer; transition: 0.2s; }
                .btn-edit-text:hover { color: var(--gold-accent); transform: scale(1.1); }



                .custom-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s; }
                .custom-modal-box { background: white; padding: 24px 30px; border-radius: 16px; width: 400px; max-width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center; }
                .custom-modal-box h3 { margin-top: 0; color: #dc2626; font-size: 20px; margin-bottom: 12px; }
                .custom-modal-box p { color: var(--slate-muted); font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
                .modal-actions-p { display: flex; gap: 12px; justify-content: center; }
                .modal-actions-p button { padding: 10px 20px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; transition: 0.2s; }
                .btn-cancel { background: #f1f5f9; color: var(--navy-primary); }
                .btn-cancel:hover { background: #e2e8f0; }
                .btn-confirm-delete { background: #dc2626; color: white; }
                .btn-confirm-delete:hover { background: #b91c1c; }


            `}</style>
        </div>
    );
}

export default ScheduleTab;
