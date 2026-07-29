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
        jabatan: '',
        dept_id: '',
        nomor_hp: ''
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
                jabatan: employee.jabatan || '',
                dept_id: employee.dept_id || '',
                nomor_hp: employee.nomor_hp || ''
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
                
                <form onSubmit={handleSubmit} className="modal-body" autoComplete="off">
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
                            <label>Nomor HP</label>
                            <input 
                                type="text" 
                                value={formData.nomor_hp}
                                onChange={(e) => setFormData({...formData, nomor_hp: e.target.value})}
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
                            <input 
                                type="text" 
                                value={formData.jabatan}
                                onChange={(e) => setFormData({...formData, jabatan: e.target.value})}
                                placeholder="Cth: Manager IT"
                                required
                            />
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
                                autoComplete="new-password"
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
                    background: rgba(11, 26, 42, 0.85); backdrop-filter: blur(12px);
                    display: flex; align-items: center; justify-content: center; z-index: 2000;
                }
                .modal-container {
                    background: #ffffff; width: 100%; max-width: 580px; border-radius: 24px;
                    overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.4); transform: scale(0.95);
                    animation: modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .modal-header {
                    padding: 28px 32px; background: linear-gradient(135deg, var(--navy-primary) 0%, #1a365d 100%); 
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    display: flex; justify-content: space-between; align-items: center;
                }
                .modal-header h2 { font-size: 20px; font-weight: 800; color: #ffffff !important; margin: 0; letter-spacing: -0.5px; }
                .close-btn { 
                    background: rgba(255,255,255,0.1); border: none; font-size: 18px; color: white; 
                    width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: all 0.2s; 
                }
                .close-btn:hover { background: rgba(255,255,255,0.2); transform: rotate(90deg); }

                .modal-body { padding: 32px; background: #fafcff; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                .full-width { grid-column: span 2; }

                .input-group label { display: block; font-size: 11px; font-weight: 800; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
                .input-group input, .input-group select {
                    width: 100%; padding: 14px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0;
                    font-size: 14px; font-weight: 600; color: #0f172a; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.01);
                    background-color: #ffffff;
                }
                .input-group input::placeholder { color: #94a3b8; font-weight: 400; }
                .input-group input:focus, .input-group select:focus { 
                    border-color: #3b82f6; outline: none; background-color: #ffffff;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); 
                }

                .modal-footer { margin-top: 32px; display: flex; gap: 16px; justify-content: flex-end; }
                .btn-secondary { 
                    flex: 1; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; background: #ffffff; 
                    color: #64748b; font-weight: 800; cursor: pointer; transition: all 0.2s;
                }
                .btn-secondary:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
                
                .btn-primary { 
                    flex: 2; padding: 16px; border-radius: 12px; border: none; 
                    background: linear-gradient(135deg, var(--navy-primary), #1e40af); 
                    color: white; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 8px 16px rgba(30, 64, 175, 0.2);
                }
                .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 20px rgba(30, 64, 175, 0.3); }
                .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

                @keyframes modalPop { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } .full-width { grid-column: span 1; } }
            `}</style>
        </div>
    );
}

export default EditEmployeeModal;
