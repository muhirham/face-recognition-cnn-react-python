import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../apiConfig';
import { toast } from 'react-toastify';

function EditEmployeeModal({ isOpen, onClose, employee, onSuccess }) {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'karyawan',
        jabatan_id: '',
        dept_id: ''
    });
    const [masterData, setMasterData] = useState({ departemens: [], jabatans: [] });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchMaster = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/admin/master_data`);
                setMasterData(res.data);
            } catch (err) {
                console.error("Gagal ambil master data", err);
            }
        };
        if (isOpen) fetchMaster();
    }, [isOpen]);

    useEffect(() => {
        if (employee) {
            setFormData({
                username: employee.username || '',
                email: employee.email || '',
                password: '',
                role: employee.role || 'karyawan',
                jabatan_id: employee.jabatan_id || '',
                dept_id: employee.dept_id || ''
            });
        }
    }, [employee]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.put(`${API_BASE_URL}/admin/employees/${employee.user_id}`, formData);
            toast.success("Data karyawan berhasil diperbarui");
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Gagal memperbarui data");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container animate-slide-up">
                <div className="modal-header">
                    <h2>Edit Data Karyawan</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-grid">
                        <div className="input-group">
                            <label>Username / Nama Lengkap</label>
                            <input 
                                type="text" 
                                value={formData.username}
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>Email</label>
                            <input 
                                type="email" 
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>Departemen</label>
                            <select 
                                value={formData.dept_id}
                                onChange={(e) => setFormData({...formData, dept_id: e.target.value})}
                                required
                            >
                                <option value="">-- Pilih Departemen --</option>
                                {masterData.departemens.map(d => (
                                    <option key={d.id} value={d.id}>{d.nama_dept}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Jabatan</label>
                            <select 
                                value={formData.jabatan_id}
                                onChange={(e) => setFormData({...formData, jabatan_id: e.target.value})}
                                required
                            >
                                <option value="">-- Pilih Jabatan --</option>
                                {masterData.jabatans.map(j => (
                                    <option key={j.id} value={j.id}>{j.nama_jabatan}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group full-width">
                            <label>Role Akses</label>
                            <select 
                                value={formData.role}
                                onChange={(e) => setFormData({...formData, role: e.target.value})}
                            >
                                <option value="karyawan">Karyawan (Hanya Absen)</option>
                                <option value="admin">Admin (Akses Dashboard)</option>
                            </select>
                        </div>
                        <div className="input-group full-width">
                            <label>Reset Password (Opsional)</label>
                            <input 
                                type="password" 
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                placeholder="Kosongkan jika tidak ingin mengubah password"
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(12px);
                    display: flex; align-items: center; justify-content: center; z-index: 2000;
                }
                .modal-container {
                    background: #ffffff; width: 100%; max-width: 550px; border-radius: 24px;
                    overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                .modal-header {
                    padding: 24px 30px; background: linear-gradient(to right, #f8fafc, #ffffff); 
                    border-bottom: 1px solid #e2e8f0;
                    display: flex; justify-content: space-between; align-items: center;
                }
                .modal-header h2 { font-size: 20px; font-weight: 800; color: var(--navy-primary); margin: 0; }
                .close-btn { 
                    background: none; border: none; font-size: 28px; color: var(--slate-muted); 
                    cursor: pointer; transition: color 0.2s; 
                }
                .close-btn:hover { color: #dc2626; }

                .modal-body { padding: 30px; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .full-width { grid-column: span 2; }

                .input-group label { display: block; font-size: 11px; font-weight: 800; color: var(--slate-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
                .input-group input, .input-group select {
                    width: 100%; padding: 14px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0;
                    font-size: 14px; font-weight: 600; color: var(--navy-primary); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    background-color: #f8fafc;
                }
                .input-group input:focus, .input-group select:focus { 
                    border-color: var(--gold-accent); outline: none; background-color: #ffffff;
                    box-shadow: 0 0 0 4px rgba(249, 188, 47, 0.15); 
                }

                .modal-footer { margin-top: 32px; display: flex; gap: 12px; justify-content: flex-end; }
                .btn-secondary { 
                    background: #f1f5f9; color: var(--slate-muted); border: none; padding: 12px 24px; 
                    border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s;
                }
                .btn-secondary:hover { background: #e2e8f0; color: var(--navy-primary); }
                
                .btn-primary { 
                    background: linear-gradient(135deg, var(--navy-primary) 0%, #1e3a5f 100%); 
                    color: white; border: none; padding: 12px 30px; border-radius: 12px; 
                    font-weight: 700; cursor: pointer; transition: 0.3s;
                    box-shadow: 0 4px 12px rgba(11, 26, 42, 0.2);
                }
                .btn-primary:hover { 
                    transform: translateY(-2px); box-shadow: 0 8px 20px rgba(11, 26, 42, 0.3); 
                }
                .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }

                @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } .full-width { grid-column: span 1; } }
            `}</style>
        </div>
    );
}

export default EditEmployeeModal;
