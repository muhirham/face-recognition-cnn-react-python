import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import { toast } from 'react-toastify';

function ScheduleTab() {
    const [shifts, setShifts] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [newShift, setNewShift] = useState({
        dept_id: '',
        nama_shift: '',
        jam_masuk: '08:00',
        jam_pulang: '17:00',
        toleransi_menit: 15
    });

    const [newHoliday, setNewHoliday] = useState({ tanggal: '', keterangan: '' });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Gunakan endpoint yang sesuai dengan main.py
            const [scheduleRes, holidayRes, masterRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/admin/schedule`),
                axios.get(`${API_BASE_URL}/admin/holidays`),
                axios.get(`${API_BASE_URL}/admin/master_data`)
            ]);
            setShifts(scheduleRes.data.schedules || []);
            setHolidays(holidayRes.data.holidays || []);
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
            // Gunakan endpoint /admin/schedule sesuai main.py
            await axios.post(`${API_BASE_URL}/admin/schedule`, newShift);
            toast.success("Shift kerja ditambahkan");
            setNewShift({ dept_id: '', nama_shift: '', jam_masuk: '08:00', jam_pulang: '17:00', toleransi_menit: 15 });
            fetchData();
        } catch (err) { toast.error("Gagal menambah shift"); }
    };

    const handleAddHoliday = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/admin/holidays`, newHoliday);
            toast.success("Hari libur ditambahkan");
            setNewHoliday({ tanggal: '', keterangan: '' });
            fetchData();
        } catch (err) { toast.error("Gagal menambah hari libur"); }
    };

    const handleDeleteShift = async (id) => {
        if (!window.confirm("Hapus shift ini?")) return;
        try {
            // Gunakan endpoint /admin/schedule
            await axios.delete(`${API_BASE_URL}/admin/schedule/${id}`);
            toast.success("Shift dihapus");
            fetchData();
        } catch (err) { toast.error("Gagal menghapus"); }
    };

    const handleDeleteHoliday = async (id) => {
        if (!window.confirm("Hapus tanggal merah ini?")) return;
        try {
            await axios.delete(`${API_BASE_URL}/admin/holidays/${id}`);
            toast.success("Hari libur dihapus");
            fetchData();
        } catch (err) { toast.error("Gagal menghapus"); }
    };

    if (isLoading) {
        return <div style={{padding: '40px', fontWeight: '800'}}>Memuat Pengaturan Jadwal...</div>;
    }

    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header-p">
                <h2>Master Shift & Hari Libur</h2>
                <p>Konfigurasi jam kerja per departemen dan kalender hari libur nasional.</p>
            </div>

            <div className="schedule-grid">
                {/* Shift Kerja Section */}
                <div className="schedule-card full-width">
                    <div className="card-p-header">
                        <h3>🕒 Pengaturan Shift per Departemen</h3>
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
                            <button type="submit" className="btn-save-mini">Simpan</button>
                        </form>

                        <div className="table-wrapper-p">
                            <table className="shift-table-mini">
                                <thead>
                                    <tr>
                                        <th>Departemen</th>
                                        <th>Nama Shift</th>
                                        <th>Jam Masuk</th>
                                        <th>Jam Pulang</th>
                                        <th>Toleransi</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shifts.length > 0 ? shifts.map(s => (
                                        <tr key={s.id}>
                                            <td><strong>{s.nama_dept}</strong></td>
                                            <td>{s.nama_shift}</td>
                                            <td>{s.jam_masuk.substring(0,5)}</td>
                                            <td>{s.jam_pulang.substring(0,5)}</td>
                                            <td>{s.toleransi_menit} menit</td>
                                            <td><button className="btn-del-text" onClick={() => handleDeleteShift(s.id)}>Hapus</button></td>
                                        </tr>
                                    )) : <tr><td colSpan="6" className="empty-p">Belum ada shift.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Hari Libur Section */}
                <div className="schedule-card">
                    <div className="card-p-header">
                        <h3>📅 Kalender Hari Libur (Tanggal Merah)</h3>
                    </div>
                    <div className="card-p-body">
                        <form onSubmit={handleAddHoliday} className="holiday-form">
                            <input type="date" value={newHoliday.tanggal} onChange={(e) => setNewHoliday({...newHoliday, tanggal: e.target.value})} required />
                            <input type="text" placeholder="Keterangan (mis: Libur Lebaran)" value={newHoliday.keterangan} onChange={(e) => setNewHoliday({...newHoliday, keterangan: e.target.value})} required />
                            <button type="submit">Tambah</button>
                        </form>
                        <div className="holiday-list-p">
                            {holidays.length > 0 ? holidays.map(h => (
                                <div key={h.id} className="holiday-item-p">
                                    <div className="h-meta">
                                        <span className="h-date">{new Date(h.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        <span className="h-text">{h.keterangan}</span>
                                    </div>
                                    <button onClick={() => handleDeleteHoliday(h.id)}>🗑️</button>
                                </div>
                            )) : <p className="empty-p">Belum ada hari libur.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .schedule-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
                .schedule-card { background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; overflow: hidden; }
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
                .btn-del-text { color: #ff4d4f; background: none; border: none; font-weight: 700; cursor: pointer; }

                .holiday-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
                .holiday-form input { padding: 10px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; }
                .holiday-form button { background: var(--navy-primary); color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 800; cursor: pointer; }

                .holiday-list-p { display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto; }
                .holiday-item-p { display: flex; justify-content: space-between; align-items: center; padding: 14px; background: #fff5f5; border-radius: 12px; border: 1px solid #fee2e2; }
                .h-meta { display: flex; flex-direction: column; gap: 2px; }
                .h-date { font-weight: 800; color: #991b1b; font-size: 13px; }
                .h-text { font-size: 12px; color: #991b1b; opacity: 0.8; }
                .holiday-item-p button { background: none; border: none; cursor: pointer; font-size: 14px; }

                @media (max-width: 1100px) { .schedule-grid { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    );
}

export default ScheduleTab;
