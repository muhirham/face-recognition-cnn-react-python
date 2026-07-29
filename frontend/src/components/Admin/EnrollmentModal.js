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
        jabatan: '',
        role: 'karyawan',
        nomor_hp: ''
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
            setFormData({ username: '', email: '', password: '', dept_id: '', jabatan: '', role: 'karyawan', nomor_hp: '' });
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

                <form onSubmit={handleSubmit} className="modal-body-p" autoComplete="off">
                    <h3>Data Personal Karyawan</h3>
                    <p className="sub-hint">Masukkan informasi dasar karyawan. Data wajah dapat didaftarkan nanti melalui menu pendaftaran wajah.</p>

                    <div className="form-group-p">
                        <label>NAMA LENGKAP</label>
                        <input type="text" name="username" value={formData.username} onChange={handleInputChange} placeholder="Nama Lengkap" required autoComplete="off" />
                    </div>

                    <div className="form-group-p">
                        <label>NOMOR HP</label>
                        <input type="text" name="nomor_hp" value={formData.nomor_hp} onChange={handleInputChange} placeholder="08123456789" required autoComplete="off" />
                    </div>

                    <div className="form-group-p">
                        <label>EMAIL PERUSAHAAN</label>
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="email@perusahaan.com" required autoComplete="off" />
                    </div>

                    <div className="form-group-p">
                        <label>PASSWORD AWAL</label>
                        <input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Minimal 6 karakter" required autoComplete="new-password" />
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
                            <input 
                                type="text" 
                                name="jabatan" 
                                value={formData.jabatan} 
                                onChange={handleInputChange} 
                                placeholder="Cth: Staff IT" 
                                required 
                            />
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
                .modal-overlay-p { position: fixed; inset: 0; background: rgba(11, 26, 42, 0.85); backdrop-filter: blur(12px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
                .modal-content-p { background: #ffffff; width: 100%; max-width: 580px; border-radius: 24px; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.4); transform: scale(0.95); animation: modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; border: 1px solid rgba(255,255,255,0.1); }
                
                .modal-header-p { background: linear-gradient(135deg, var(--navy-primary) 0%, #1a365d 100%); color: white; padding: 28px 32px; display: flex; align-items: center; gap: 20px; position: relative; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .header-icon { background: linear-gradient(135deg, var(--gold-accent), #f59e0b); color: var(--navy-primary); padding: 10px 14px; border-radius: 12px; font-weight: 900; font-size: 16px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); }
                .header-text h2 { font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px; color: #ffffff !important; }
                .header-text p { font-size: 12px; opacity: 0.8; margin: 4px 0 0 0; font-weight: 500; color: #ffffff !important; }
                .btn-close-p { position: absolute; right: 28px; top: 32px; background: rgba(255,255,255,0.1); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .btn-close-p:hover { background: rgba(255,255,255,0.2); transform: rotate(90deg); }

                .modal-body-p { padding: 32px; display: flex; flex-direction: column; gap: 24px; background: #fafcff; }
                .modal-body-p h3 { font-size: 18px; font-weight: 800; margin: 0; color: var(--navy-primary); }
                .sub-hint { font-size: 13px; color: #64748b; line-height: 1.6; margin-top: -16px; }

                .form-group-p { display: flex; flex-direction: column; gap: 8px; }
                .form-row-p { display: flex; gap: 20px; }
                .flex-1 { flex: 1; }
                .form-group-p label { font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
                .form-group-p input, .form-group-p select { padding: 14px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: #ffffff; font-weight: 600; font-size: 14px; color: #0f172a; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.01); }
                .form-group-p input::placeholder { color: #94a3b8; font-weight: 400; }
                .form-group-p input:focus, .form-group-p select:focus { border-color: #3b82f6; background: #ffffff; outline: none; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }

                .modal-footer-p { display: flex; gap: 16px; margin-top: 10px; }
                .btn-cancel-p { flex: 1; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; background: #ffffff; color: #64748b; font-weight: 800; cursor: pointer; transition: all 0.2s; }
                .btn-cancel-p:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
                .btn-submit-p { flex: 2; padding: 16px; border-radius: 12px; border: none; background: linear-gradient(135deg, var(--navy-primary), #1e40af); color: white; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 8px 16px rgba(30, 64, 175, 0.2); }
                .btn-submit-p:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 20px rgba(30, 64, 175, 0.3); }
                .btn-submit-p:disabled { opacity: 0.7; cursor: not-allowed; }

                @keyframes modalPop { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            `}</style>
        </div>
    );
}

export default EnrollmentModal;
