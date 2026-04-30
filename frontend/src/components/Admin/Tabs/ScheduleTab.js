import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import { toast } from 'react-toastify';

function ScheduleTab({ employees }) {
    const [schedules, setSchedules] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // Get unique departments from employees list
    const departments = [...new Set(employees.map(emp => emp.departemen).filter(Boolean))];

    // Form states
    const [formData, setFormData] = useState({
        departemen: '',
        hari: 'Senin',
        jam_masuk: '08:00',
        jam_pulang: '17:00',
        toleransi_keterlambatan: 15
    });

    const fetchSchedules = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/schedules`);
            setSchedules(response.data.schedules);
        } catch (error) {
            toast.error("Gagal mengambil data jadwal");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
    }, []);

    const [isManualDept, setIsManualDept] = useState(false);
    const [selectedDays, setSelectedDays] = useState(['Senin']);

    const handleDayToggle = (day) => {
        if (selectedDays.includes(day)) {
            if (selectedDays.length > 1) {
                setSelectedDays(selectedDays.filter(d => d !== day));
            }
        } else {
            setSelectedDays([...selectedDays, day]);
        }
    };

    const setWorkWeek = (type) => {
        if (type === 'mon-fri') setSelectedDays(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
        if (type === 'mon-sat') setSelectedDays(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']);
    };

    const handleAddSchedule = async (e) => {
        e.preventDefault();
        const finalDept = isManualDept ? formData.departemen : formData.departemen;
        if (!finalDept) {
            toast.warning("Pilih atau ketik departemen terlebih dahulu");
            return;
        }

        try {
            const payload = { ...formData, hari: selectedDays };
            const response = await axios.post(`${API_BASE_URL}/admin/schedules`, payload);
            toast.success(response.data.message);
            setShowAddForm(false);
            setIsManualDept(false);
            fetchSchedules();
        } catch (error) {
            toast.error(error.response?.data?.message || "Gagal menyimpan jadwal");
        }
    };

    const handleDeleteDept = async () => {
        if (!selectedDept) return;
        if (window.confirm(`Hapus SELURUH jadwal untuk divisi "${selectedDept}"? Tindakan ini tidak dapat dibatalkan.`)) {
            try {
                await axios.delete(`${API_BASE_URL}/admin/schedules/department/${selectedDept}`);
                toast.success(`Jadwal divisi ${selectedDept} dikosongkan`);
                setSelectedDept('');
                fetchSchedules();
            } catch (error) {
                toast.error("Gagal menghapus jadwal divisi");
            }
        }
    };

    const handleEdit = (row) => {
        // Format the time strings back to HH:mm for input[type="time"]
        const formatTime = (timeStr) => {
            const parts = timeStr.split(':');
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        };

        setFormData({
            departemen: row.departemen,
            hari: row.hari,
            jam_masuk: formatTime(row.jam_masuk),
            jam_pulang: formatTime(row.jam_pulang),
            toleransi_keterlambatan: row.toleransi_keterlambatan
        });
        setSelectedDays([row.hari]); // Focus only on the day being edited
        setIsManualDept(false);
        setShowAddForm(true);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Hapus jadwal divisi ini?")) {
            try {
                await axios.delete(`${API_BASE_URL}/admin/schedules/${id}`);
                toast.success("Jadwal dihapus");
                fetchSchedules();
            } catch (error) {
                toast.error("Gagal menghapus jadwal");
            }
        }
    };

    // Helper to format time for display
    const displayTime = (timeStr) => {
        if (!timeStr) return '--:--';
        const parts = timeStr.split(':');
        const h = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        return `${h}:${m}`;
    };

    // Filtered schedules for display
    const filteredSchedules = selectedDept 
        ? schedules.filter(s => s.departemen === selectedDept)
        : schedules;

    return (
        <div className="schedule-tab-container animate-fade-in">
            <div className="schedule-header-block">
                <h1>Pengaturan Jadwal Divisi</h1>
                <p>Kelola waktu operasional per departemen. Perubahan berlaku otomatis untuk semua anggota divisi.</p>
            </div>

            <div className="schedule-actions-bar">
                <div className="search-group">
                    <label className="input-label">Filter Divisi</label>
                    <div className="select-wrapper">
                        <select 
                            value={selectedDept} 
                            onChange={(e) => setSelectedDept(e.target.value)}
                        >
                            <option value="">Semua Divisi</option>
                            {departments.map((dept, idx) => (
                                <option key={`filter-${dept}-${idx}`} value={dept}>{dept}</option>
                            ))}
                        </select>
                        <span className="select-icon">🏢</span>
                    </div>
                </div>
                
                {selectedDept && (
                    <button className="btn-purge-dept" onClick={handleDeleteDept}>
                        🗑️ Hapus Satu Divisi
                    </button>
                )}

                <button 
                    className="btn-add-schedule" 
                    onClick={() => {
                        setFormData({
                            departemen: selectedDept || '',
                            hari: 'Senin',
                            jam_masuk: '08:00',
                            jam_pulang: '17:00',
                            toleransi_keterlambatan: 15
                        });
                        setIsManualDept(false);
                        setShowAddForm(!showAddForm);
                    }}
                >
                    <span className="plus-ic">+</span> Atur Jadwal Baru
                </button>
            </div>

            {showAddForm && (
                <div className="inline-action-card animate-slide-down">
                    <h3>Atur / Update Jadwal Divisi</h3>
                    <form onSubmit={handleAddSchedule} className="inline-form">
                        <div className="form-item">
                            <label>Divisi / Departemen</label>
                            {!isManualDept ? (
                                <select 
                                    value={formData.departemen} 
                                    onChange={(e) => {
                                        if (e.target.value === '__NEW__') {
                                            setIsManualDept(true);
                                            setFormData({...formData, departemen: ''});
                                        } else {
                                            setFormData({...formData, departemen: e.target.value});
                                        }
                                    }}
                                >
                                    <option value="">-- Pilih Divisi --</option>
                                    {departments.map((dept, idx) => (
                                        <option key={`form-dept-${dept}-${idx}`} value={dept}>{dept}</option>
                                    ))}
                                    <option value="Office">Office</option>
                                    <option value="Security">Security</option>
                                    <option value="Production">Production</option>
                                    <option value="__NEW__">+ Ketik Divisi Baru...</option>
                                </select>
                            ) : (
                                <div className="manual-input-box">
                                    <input 
                                        type="text" 
                                        placeholder="Ketik Nama Divisi..."
                                        value={formData.departemen}
                                        onChange={(e) => setFormData({...formData, departemen: e.target.value})}
                                        autoFocus
                                    />
                                    <button type="button" className="btn-back-select" onClick={() => setIsManualDept(false)}>↩</button>
                                </div>
                            )}
                        </div>
                        <div className="form-item span-2">
                            <label>Pilih Hari Kerja</label>
                            <div className="day-selector-grid">
                                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(day => (
                                    <button 
                                        key={day}
                                        type="button"
                                        className={`day-toggle-btn ${selectedDays.includes(day) ? 'active' : ''}`}
                                        onClick={() => handleDayToggle(day)}
                                    >
                                        {day.substring(0, 3)}
                                    </button>
                                ))}
                            </div>
                            <div className="day-shortcuts">
                                <button type="button" onClick={() => setWorkWeek('mon-fri')}>Senin - Jumat</button>
                                <button type="button" onClick={() => setWorkWeek('mon-sat')}>Senin - Sabtu</button>
                            </div>
                        </div>
                        <div className="form-item">
                            <label>Jam Masuk</label>
                            <input 
                                type="time" 
                                value={formData.jam_masuk}
                                onChange={(e) => setFormData({...formData, jam_masuk: e.target.value})}
                            />
                        </div>
                        <div className="form-item">
                            <label>Jam Pulang</label>
                            <input 
                                type="time" 
                                value={formData.jam_pulang}
                                onChange={(e) => setFormData({...formData, jam_pulang: e.target.value})}
                            />
                        </div>
                        <div className="form-item">
                            <label>Toleransi (menit)</label>
                            <input 
                                type="number" 
                                placeholder="0"
                                value={formData.toleransi_keterlambatan}
                                onChange={(e) => setFormData({...formData, toleransi_keterlambatan: e.target.value})}
                            />
                        </div>
                        <div className="form-buttons">
                            <button type="button" className="btn-cancel" onClick={() => setShowAddForm(false)}>Batal</button>
                            <button type="submit" className="btn-save">Simpan Perubahan</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="schedule-list-card">
                <div className="card-header">
                    <h3>Daftar Shift Kerja Operasional</h3>
                    {!selectedDept && <span className="view-badge">Master Data Shift</span>}
                </div>
                
                <div className="table-responsive">
                    <table className="schedule-table">
                        <thead>
                            <tr>
                                <th>Divisi / Departemen</th>
                                <th>Hari</th>
                                <th>Jam Masuk</th>
                                <th>Jam Pulang</th>
                                <th>Toleransi</th>
                                <th className="text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="6" className="text-center">Memuat data shift...</td></tr>
                            ) : filteredSchedules.length > 0 ? (
                                filteredSchedules.map(row => (
                                    <tr key={`row-${row.id}`}>
                                        <td className="bold">{row.departemen}</td>
                                        <td><div className="day-badge">{row.hari}</div></td>
                                        <td><span className="time-val">{displayTime(row.jam_masuk)}</span></td>
                                        <td><span className="time-val">{displayTime(row.jam_pulang)}</span></td>
                                        <td>{row.toleransi_keterlambatan} menit</td>
                                        <td>
                                            <div className="action-btns text-center">
                                                <button className="btn-edit-tiny" title="Edit" onClick={() => handleEdit(row)}>✏️</button>
                                                <button className="btn-delete-tiny" title="Hapus" onClick={() => handleDelete(row.id)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" className="text-center">Belum ada pengaturan shift untuk divisi ini.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .schedule-tab-container { display: flex; flex-direction: column; gap: 20px; color: var(--navy-primary); }
                .schedule-header-block h1 { font-size: 26px; font-weight: 900; margin-bottom: 4px; }
                .schedule-header-block p { color: var(--slate-muted); font-size: 14px; }

                .schedule-actions-bar {
                    background: white; padding: 20px 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                    display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap;
                }
                .search-group { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 250px; }
                .input-label { font-size: 11px; font-weight: 900; color: var(--slate-muted); text-transform: uppercase; }
                
                .select-wrapper { position: relative; width: 100%; }
                .select-wrapper select {
                    width: 100%; padding: 12px 16px 12px 40px; border-radius: 12px; border: 2px solid #f1f5f9;
                    font-size: 14px; font-weight: 700; background: #fafbfc; appearance: none;
                }
                .select-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 16px; opacity: 0.5; }

                .btn-add-schedule {
                    background: var(--navy-primary); color: white; border: none; padding: 14px 28px; border-radius: 12px;
                    font-weight: 800; font-size: 14px; cursor: pointer; transition: 0.2s;
                }
                .btn-add-schedule:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(11,26,42,0.2); }

                .inline-action-card {
                    background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 24px;
                }
                .inline-action-card h3 { font-size: 16px; font-weight: 800; margin-bottom: 20px; color: var(--navy-primary); }
                .inline-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 20px; align-items: flex-start; }
                .form-item { display: flex; flex-direction: column; gap: 8px; }
                .form-item.span-2 { grid-column: span 2; }
                .form-item label { font-size: 11px; font-weight: 800; color: var(--slate-muted); text-transform: uppercase; }
                
                .day-selector-grid { display: flex; gap: 6px; flex-wrap: wrap; }
                .day-toggle-btn {
                    flex: 1; padding: 10px 0; border: 2px solid #e2e8f0; background: white; border-radius: 8px;
                    font-size: 11px; font-weight: 800; color: var(--slate-muted); cursor: pointer; transition: 0.2s;
                    min-width: 50px;
                }
                .day-toggle-btn.active { background: var(--navy-primary); color: white; border-color: var(--navy-primary); }
                .day-shortcuts { display: flex; gap: 10px; margin-top: 8px; }
                .day-shortcuts button {
                    background: none; border: none; color: #3b82f6; font-size: 11px; font-weight: 800;
                    cursor: pointer; text-decoration: underline; padding: 0;
                }
                .form-item input, .form-item select {
                    padding: 10px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 14px; font-weight: 700;
                }
                .form-buttons { display: flex; gap: 12px; }
                .btn-save { background: var(--gold-accent); color: var(--navy-primary); border: none; padding: 10px 20px; border-radius: 10px; font-weight: 800; cursor: pointer; }
                .btn-cancel { background: white; color: var(--slate-muted); border: 1.5px solid #e2e8f0; padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; }

                .manual-input-box { display: flex; gap: 8px; width: 100%; }
                .manual-input-box input { flex: 1; }
                .btn-back-select { 
                    background: #f1f5f9; border: none; border-radius: 100px; padding: 0 12px; 
                    font-size: 18px; cursor: pointer; color: var(--slate-muted); transition: 0.2s;
                }
                .btn-back-select:hover { background: #e2e8f0; color: var(--navy-primary); }

                .btn-purge-dept {
                    background: #fff1f2; color: #e11d48; border: 1.5px solid #fecdd3;
                    padding: 12px 20px; border-radius: 12px; font-weight: 800; font-size: 13px;
                    cursor: pointer; transition: 0.2s;
                }
                .btn-purge-dept:hover { background: #e11d48; color: white; border-color: #e11d48; transform: translateY(-2px); }

                .schedule-list-card {
                    background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); overflow: hidden;
                }
                .card-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
                .card-header h3 { font-size: 16px; font-weight: 800; }
                .view-badge { padding: 4px 12px; background: #f1f5f9; color: var(--slate-muted); border-radius: 100px; font-size: 11px; font-weight: 800; }

                .table-responsive { overflow-x: auto; }
                .schedule-table { width: 100%; border-collapse: collapse; }
                .schedule-table th { text-align: left; padding: 16px 24px; background: #fafbfc; font-size: 11px; font-weight: 900; color: var(--slate-muted); text-transform: uppercase; }
                .schedule-table td { padding: 16px 24px; border-bottom: 1px solid #f8fafc; font-size: 14px; font-weight: 600; }
                .schedule-table tr:last-child td { border-bottom: none; }
                .schedule-table td.bold { font-weight: 800; color: var(--navy-primary); }
                .text-center { text-align: center; }
                
                .day-badge { background: #eff6ff; color: #1e40af; padding: 4px 12px; border-radius: 100px; width: fit-content; font-size: 12px; font-weight: 800; }
                .time-val { font-family: 'JetBrains Mono', monospace; font-weight: 800; color: var(--navy-primary); background: #f1f5f9; padding: 2px 8px; border-radius: 4px; }
                .btn-delete-tiny, .btn-edit-tiny { background: none; border: none; cursor: pointer; font-size: 16px; opacity: 0.4; transition: 0.2s; }
                .btn-delete-tiny:hover, .btn-edit-tiny:hover { opacity: 1; transform: scale(1.2); }

                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-down { animation: slideDown 0.3s ease-out; }
            `}</style>
        </div>
    );
}

export default ScheduleTab;
