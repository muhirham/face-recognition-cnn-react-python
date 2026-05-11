import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../apiConfig';
import { toast } from 'react-toastify';

function EnrollmentModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        dept_id: '',
        jabatan_id: '',
        role: 'karyawan'
    });
    const [masterData, setMasterData] = useState({ departemens: [], jabatans: [] });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchMaster = async () => {
                try {
                    const res = await axios.get(`${API_BASE_URL}/admin/master_data`);
                    setMasterData(res.data);
                } catch (err) {
                    toast.error("Gagal mengambil master data");
                }
            };
            fetchMaster();
        }
    }, [isOpen]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/register`, formData);
            toast.success(response.data.message);
            onSuccess();
            onClose();
            setFormData({ username: '', email: '', password: '', dept_id: '', jabatan_id: '', role: 'karyawan' });
        } catch (error) {
            toast.error(error.response?.data?.message || "Gagal mendaftarkan karyawan");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay-p animate-fade-in">
            <div className="modal-content-p animate-slide-up">
                <div className="modal-header-p">
                    <div className="header-icon">IMP</div>
                    <div className="header-text">
                        <h2>Pendaftaran Karyawan</h2>
                        <p>Manajemen Akses Media Prima</p>
                    </div>
                    <button className="btn-close-p" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body-p">
                    <h3>Data Personal Karyawan</h3>
                    <p className="sub-hint">Masukkan informasi dasar karyawan. Data wajah dapat didaftarkan nanti melalui menu pendaftaran wajah.</p>

                    <div className="form-group-p">
                        <label>NAMA LENGKAP</label>
                        <input type="text" name="username" value={formData.username} onChange={handleInputChange} placeholder="Nama Lengkap" required />
                    </div>

                    <div className="form-group-p">
                        <label>EMAIL PERUSAHAAN</label>
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="email@perusahaan.com" required />
                    </div>

                    <div className="form-group-p">
                        <label>PASSWORD AWAL</label>
                        <input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Minimal 6 karakter" required />
                    </div>

                    <div className="form-row-p">
                        <div className="form-group-p flex-1">
                            <label>DEPARTEMEN</label>
                            <select name="dept_id" value={formData.dept_id} onChange={handleInputChange} required>
                                <option value="">-- Pilih --</option>
                                {masterData.departemens.map(d => (
                                    <option key={d.id} value={d.id}>{d.nama_dept}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group-p flex-1">
                            <label>JABATAN</label>
                            <select name="jabatan_id" value={formData.jabatan_id} onChange={handleInputChange} required>
                                <option value="">-- Pilih --</option>
                                {masterData.jabatans.map(j => (
                                    <option key={j.id} value={j.id}>{j.nama_jabatan}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group-p">
                        <label>LEVEL OTORITAS</label>
                        <select name="role" value={formData.role} onChange={handleInputChange}>
                            <option value="karyawan">Karyawan</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>

                    <div className="modal-footer-p">
                        <button type="button" className="btn-cancel-p" onClick={onClose}>Batal</button>
                        <button type="submit" className="btn-submit-p" disabled={isSaving}>
                            {isSaving ? 'Memproses...' : 'Daftarkan Karyawan'}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .modal-overlay-p { position: fixed; inset: 0; background: rgba(11, 26, 42, 0.8); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
                .modal-content-p { background: white; width: 100%; max-width: 550px; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.3); }
                
                .modal-header-p { background: var(--navy-primary); color: white; padding: 24px; display: flex; align-items: center; gap: 16px; position: relative; }
                .header-icon { background: var(--gold-accent); color: var(--navy-primary); padding: 8px 12px; border-radius: 8px; font-weight: 900; }
                .header-text h2 { font-size: 18px; font-weight: 800; margin: 0; }
                .header-text p { font-size: 11px; opacity: 0.7; margin: 0; }
                .btn-close-p { position: absolute; right: 24px; top: 24px; background: none; border: none; color: white; font-size: 24px; cursor: pointer; }

                .modal-body-p { padding: 32px; display: flex; flex-direction: column; gap: 20px; }
                .modal-body-p h3 { font-size: 20px; font-weight: 800; margin: 0; }
                .sub-hint { font-size: 12px; color: var(--slate-muted); line-height: 1.6; margin-top: -10px; }

                .form-group-p { display: flex; flex-direction: column; gap: 8px; }
                .form-row-p { display: flex; gap: 20px; }
                .flex-1 { flex: 1; }
                .form-group-p label { font-size: 11px; font-weight: 800; color: var(--navy-primary); }
                .form-group-p input, .form-group-p select { padding: 14px; border-radius: 12px; border: 1.5px solid #eef2f6; background: #f8fafc; font-weight: 700; font-size: 14px; }
                .form-group-p input:focus, .form-group-p select:focus { border-color: var(--navy-primary); background: white; outline: none; }

                .modal-footer-p { display: flex; gap: 16px; margin-top: 20px; }
                .btn-cancel-p { flex: 1; padding: 14px; border-radius: 12px; border: none; background: #f1f5f9; color: var(--slate-muted); font-weight: 800; cursor: pointer; }
                .btn-submit-p { flex: 2; padding: 14px; border-radius: 12px; border: none; background: var(--navy-primary); color: white; font-weight: 800; cursor: pointer; }

                @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </div>
    );
}

export default EnrollmentModal;
