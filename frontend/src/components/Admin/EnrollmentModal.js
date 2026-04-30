import React, { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../apiConfig';
import { toast } from 'react-toastify';

function EnrollmentModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        role: 'karyawan',
        jabatan: '',
        departemen: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target.className === 'modal-overlay') {
            onClose();
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.username || !formData.password) {
            alert('Mohon isi semua data karyawan!');
            return;
        }

        setIsSubmitting(true);
        try {
            await axios.post(`${API_BASE_URL}/register`, {
                ...formData
            });
            toast.success('Karyawan ' + formData.username + ' berhasil didaftarkan!');
            onSuccess();
            onClose();
            // Reset state
            setFormData({ email: '', username: '', password: '', role: 'karyawan', jabatan: '', departemen: '' });
        } catch (error) {
            const msg = error.response?.data?.message || 'Gagal mendaftarkan karyawan';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="enroll-modal-card">
                <div className="modal-header">
                    <div className="modal-brand">
                        <div className="modal-logo">IMP</div>
                        <div className="modal-titles">
                            <h3>Pendaftaran Karyawan</h3>
                            <p>Manajemen Akses Media Prima</p>
                        </div>
                    </div>
                    <button className="close-x" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="m-section animate-fade-in">
                        <h4 className="m-subtitle">Data Personal Karyawan</h4>
                        <p className="m-desc">Masukkan informasi dasar karyawan. Data wajah dapat didaftarkan nanti melalui menu pendaftaran wajah.</p>
                        
                        <div className="m-input-group">
                            <label>Nama Lengkap</label>
                            <input 
                                name="username" 
                                type="text" 
                                placeholder="Nama Lengkap" 
                                value={formData.username} 
                                onChange={handleChange} 
                            />
                        </div>
                        <div className="m-input-group">
                            <label>Email Perusahaan</label>
                            <input 
                                name="email" 
                                type="email" 
                                placeholder="email@intertel.com" 
                                value={formData.email} 
                                onChange={handleChange} 
                            />
                        </div>
                        <div className="m-input-group">
                            <label>Password Awal</label>
                            <div className="password-wrapper">
                                <input 
                                    name="password" 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    value={formData.password} 
                                    onChange={handleChange} 
                                />
                                <button 
                                    type="button" 
                                    className="pwd-toggle" 
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>
                        <div className="m-input-row">
                            <div className="m-input-group flex-1">
                                <label>Departemen</label>
                                <input 
                                    name="departemen" 
                                    type="text" 
                                    placeholder="Contoh: Operasional" 
                                    value={formData.departemen} 
                                    onChange={handleChange} 
                                />
                            </div>
                            <div className="m-input-group flex-1">
                                <label>Jabatan</label>
                                <input 
                                    name="jabatan" 
                                    type="text" 
                                    placeholder="Contoh: Staff" 
                                    value={formData.jabatan} 
                                    onChange={handleChange} 
                                />
                            </div>
                        </div>

                        <div className="m-input-group">
                            <label>Level Otoritas</label>
                            <select name="role" value={formData.role} onChange={handleChange}>
                                <option value="karyawan">Karyawan</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </div>
                        
                        <div className="m-footer-actions">
                            <button className="m-secondary-btn" onClick={onClose}>Batal</button>
                            <button className="m-primary-btn" onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? 'Menyimpan...' : 'Daftarkan Karyawan'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(11, 26, 42, 0.8); backdrop-filter: blur(8px);
                    display: flex; align-items: center; justify-content: center; z-index: 2000;
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                .enroll-modal-card {
                    background: white; width: 95%; max-width: 600px; border-radius: 24px;
                    box-shadow: 0 50px 100px rgba(0,0,0,0.5); overflow: hidden;
                    animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

                .modal-header {
                    background: var(--navy-primary); padding: 28px 40px; display: flex; 
                    justify-content: space-between; align-items: center; color: white;
                }
                .modal-brand { display: flex; align-items: center; gap: 16px; }
                .modal-logo {
                    background: var(--gold-accent); color: var(--navy-primary);
                    width: 44px; height: 44px; border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; font-size: 18px;
                }
                .modal-titles h3 { font-size: 16px; font-weight: 800; }
                .modal-titles p { font-size: 11px; opacity: 0.6; }
                .close-x { background: transparent; border: none; color: white; font-size: 28px; cursor: pointer; opacity: 0.5; }
                .close-x:hover { opacity: 1; }

                .modal-body { padding: 40px; }
                
                .m-subtitle { font-size: 20px; font-weight: 800; color: var(--navy-primary); margin-bottom: 10px; }
                .m-desc { font-size: 14px; color: var(--slate-muted); margin-bottom: 28px; line-height: 1.6; }
                
                .m-input-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
                .m-input-group label { font-size: 11px; font-weight: 800; color: var(--slate-muted); text-transform: uppercase; }
                .m-input-group input, .m-input-group select {
                    padding: 12px 16px; border-radius: 10px; border: 2px solid #f1f5f9;
                    font-size: 14px; font-weight: 600; background: #f8fafc;
                    transition: all 0.2s;
                    width: 100%;
                }
                .m-input-group input:focus { border-color: var(--navy-primary); background: white; outline: none; box-shadow: 0 0 0 4px rgba(11, 26, 42, 0.05); }

                .m-input-row { display: flex; gap: 12px; margin-bottom: 0px; }
                .flex-1 { flex: 1; }

                .password-wrapper { position: relative; display: flex; align-items: center; }
                .pwd-toggle {
                    position: absolute; right: 12px; background: transparent; border: none;
                    cursor: pointer; font-size: 16px; padding: 4px; opacity: 0.5;
                }
                .pwd-toggle:hover { opacity: 1; }

                .m-footer-actions { display: flex; gap: 12px; margin-top: 24px; }
                .m-primary-btn {
                    flex: 2; padding: 14px; background: var(--navy-primary); color: white;
                    border: none; border-radius: 10px; font-weight: 800; cursor: pointer;
                    transition: 0.2s;
                }
                .m-primary-btn:hover { background: #1a365d; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(11, 26, 42, 0.2); }
                .m-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

                .m-secondary-btn { flex: 1; padding: 14px; background: #f1f5f9; border-radius: 10px; font-weight: 700; cursor: pointer; border: none; color: #64748b; }
            `}</style>
        </div>
    );
}

export default EnrollmentModal;
