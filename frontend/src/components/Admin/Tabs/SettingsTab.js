import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import { toast } from 'react-toastify';

function SettingsTab() {
    const [settings, setSettings] = useState({ min_confidence: 85 });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/admin/settings`);
                setSettings(res.data);
            } catch (err) {
                console.error("Gagal load settings", err);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/admin/settings`, settings);
            toast.success("Pengaturan berhasil disimpan!");
        } catch (err) {
            toast.error("Gagal menyimpan pengaturan.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="settings-view animate-fade-in">
            <div className="settings-header">
                <h1>Pengaturan Sistem</h1>
                <p>Konfigurasi parameter operasional dan identitas aplikasi.</p>
            </div>

            <div className="settings-grid">
                <div className="settings-card main-profile">
                    <div className="profile-banner"></div>
                    <div className="profile-info">
                        <div className="company-logo">IMP</div>
                        <div className="text-meta">
                            <h2>PT INTERTEL MEDIA PRIMA</h2>
                            <p>Sistem Absensi Otomatis v2.1.0</p>
                        </div>
                    </div>
                    <div className="profile-details">
                        <div className="detail-item">
                            <span className="label">Status Server</span>
                            <span className="value status-online">Online</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Database</span>
                            <span className="value">MySQL (Connected)</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Lokasi Deploy</span>
                            <span className="value">Local Server / localhost</span>
                        </div>
                    </div>
                </div>

                <div className="settings-card config-options">
                    <h3>Parameter Absensi</h3>
                    <div className="config-form">
                        <div className="config-item">
                            <div className="config-text">
                                <strong>Ambang Batas Kepercayaan (Face Match)</strong>
                                <p>Minimum skor akurasi wajah untuk dinyatakan hadir.</p>
                            </div>
                            <div className="input-with-label">
                                <input 
                                    type="number" 
                                    value={settings.min_confidence} 
                                    onChange={(e) => setSettings({...settings, min_confidence: e.target.value})}
                                    className="small-input" 
                                />
                                <span className="perc-unit">%</span>
                            </div>
                        </div>
                        <div className="config-item">
                            <div className="config-text">
                                <strong>Notifikasi Dashboard</strong>
                                <p>Tampilkan alert real-time saat ada wajah terdeteksi.</p>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" defaultChecked />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    </div>
                    <button className="btn-save-settings" onClick={handleSave} disabled={isLoading}>
                        {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </div>

            <style>{`
                .settings-view { display: flex; flex-direction: column; gap: 30px; }
                .settings-header h1 { font-size: 28px; font-weight: 800; color: var(--navy-primary); }
                .settings-header p { color: var(--slate-muted); }

                .settings-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 30px; }
                
                .settings-card { 
                    background: white; border-radius: 24px; overflow: hidden;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.04);
                }

                .profile-banner { height: 100px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); }
                .profile-info { padding: 0 30px; display: flex; align-items: flex-end; gap: 20px; margin-top: -35px; }
                .company-logo { 
                    width: 80px; height: 80px; background: var(--gold-accent); border-radius: 20px;
                    display: flex; align-items: center; justify-content: center; font-weight: 900;
                    font-size: 24px; color: var(--navy-primary); border: 4px solid white;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
                .text-meta h2 { font-size: 18px; font-weight: 800; color: var(--navy-primary); }
                .text-meta p { font-size: 13px; color: var(--slate-muted); }

                .profile-details { padding: 30px; display: flex; flex-direction: column; gap: 15px; }
                .detail-item { display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
                .detail-item .label { color: var(--slate-muted); font-weight: 600; }
                .detail-item .value { color: var(--navy-primary); font-weight: 800; }
                .status-online { color: #10b981 !important; }

                .config-options { padding: 30px; }
                .config-options h3 { font-size: 18px; color: var(--navy-primary); margin-bottom: 24px; }
                .config-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .config-text strong { display: block; font-size: 14px; color: var(--navy-primary); }
                .config-text p { font-size: 12px; color: var(--slate-muted); margin-top: 4px; }
                
                .input-with-label { display: flex; align-items: center; gap: 8px; }
                .small-input { width: 70px; padding: 10px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-weight: 800; text-align: center; }
                .perc-unit { font-weight: 800; color: var(--navy-primary); }

                .btn-save-settings {
                    width: 100%; padding: 14px; background: var(--navy-primary); color: white;
                    border: none; border-radius: 14px; font-weight: 700; cursor: pointer; transition: 0.2s;
                }
                .btn-save-settings:hover { opacity: 0.9; transform: translateY(-2px); }

                /* Toggle Switch */
                .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
                .toggle-switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; }
                .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; }
                input:checked + .slider { background-color: #10b981; }
                input:checked + .slider:before { transform: translateX(20px); }
                .slider.round { border-radius: 34px; }
                .slider.round:before { border-radius: 50%; }

                @media (max-width: 1100px) {
                    .settings-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
}

export default SettingsTab;
