import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';

function InjectDataTab() {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [searchEmp, setSearchEmp] = useState('');
    const [empDropdownOpen, setEmpDropdownOpen] = useState(false);

    const [mode, setMode] = useState('dataset'); // 'dataset' or 'attendance'
    const [isLoading, setIsLoading] = useState(false);

    // Dataset Mode State
    const [datasetFiles, setDatasetFiles] = useState([]);

    // Attendance Batch Mode State
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [generatedForms, setGeneratedForms] = useState([]);
    
    // Modal State
    const [activeModalIndex, setActiveModalIndex] = useState(null);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/admin/employees`);
                setEmployees(res.data.employees || []);
            } catch (err) {
                console.error("Gagal load employees", err);
            }
        };
        fetchEmployees();
    }, []);

    // --- Dataset Mode Handlers ---
    const handleDatasetFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 20) {
            alert('Maksimal 20 file foto!');
            e.target.value = '';
            setDatasetFiles([]);
            return;
        }
        setDatasetFiles(files);
    };

    const handleDatasetSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) {
            alert('Pilih karyawan terlebih dahulu.');
            return;
        }
        if (datasetFiles.length !== 20) {
            alert(`Harus memilih tepat 20 file foto. Saat ini Anda memilih ${datasetFiles.length} file.`);
            return;
        }

        setIsLoading(true);
        try {
            const base64Images = [];
            for (let file of datasetFiles) {
                const b64 = await resizeAndToBase64(file);
                base64Images.push(b64);
            }

            const payload = {
                employee_id: selectedEmployee,
                images: base64Images
            };

            const res = await axios.post(`${API_BASE_URL}/admin/register_face`, payload);
            alert(res.data.message || 'Dataset berhasil di-upload!');
            setDatasetFiles([]);
            document.getElementById('dataset-file-input').value = '';
        } catch (err) {
            console.error(err);
            alert('Gagal mengupload dataset: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    // --- Attendance Batch Mode Handlers ---
    const generateForms = () => {
        if (!startDate || !endDate) return;
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start > end) {
            alert('Tanggal mulai tidak boleh lebih dari tanggal selesai.');
            return;
        }
        
        const emp = employees.find(e => e.id.toString() === selectedEmployee.toString());
        
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
        
        const defaultMasuk = emp && emp.jam_masuk ? formatTime(emp.jam_masuk) : '08:00';
        const defaultPulang = emp && emp.jam_pulang ? formatTime(emp.jam_pulang) : '17:00';
        
        const forms = [];
        let current = new Date(start);
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            forms.push({
                tanggal: dateStr,
                masuk: {
                    waktu: defaultMasuk,
                    status: 'tepat_waktu',
                    menit_terlambat: 0,
                    alasan: '',
                    fotoFile: null,
                    fotoPreview: null
                },
                pulang: {
                    waktu: defaultPulang,
                    status: 'normal',
                    alasan: '',
                    fotoFile: null,
                    fotoPreview: null
                },
                isComplete: false
            });
            current.setDate(current.getDate() + 1);
        }
        setGeneratedForms(forms);
    };

    const handleModalChange = (type, field, value) => {
        if (activeModalIndex === null) return;
        const newForms = [...generatedForms];
        newForms[activeModalIndex][type][field] = value;

        if (type === 'masuk' && field === 'menit_terlambat' && value !== '') {
            const emp = employees.find(e => e.id.toString() === selectedEmployee.toString());
            if (emp && emp.jam_masuk) {
                const toleransi = emp.toleransi_menit || 15;
                const totalMenitTambah = parseInt(toleransi) + parseInt(value);
                const parts = emp.jam_masuk.split(':');
                if (parts.length >= 2) {
                    let d = new Date();
                    d.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
                    d.setMinutes(d.getMinutes() + totalMenitTambah);
                    const hh = d.getHours().toString().padStart(2, '0');
                    const mm = d.getMinutes().toString().padStart(2, '0');
                    newForms[activeModalIndex].masuk.waktu = `${hh}:${mm}`;
                }
            }
        }

        setGeneratedForms(newForms);
    };

    const handleModalFileChange = async (type, e) => {
        if (activeModalIndex === null) return;
        const file = e.target.files[0];
        const newForms = [...generatedForms];
        if (file) {
            newForms[activeModalIndex][type].fotoFile = file;
            newForms[activeModalIndex][type].fotoPreview = URL.createObjectURL(file);
        } else {
            newForms[activeModalIndex][type].fotoFile = null;
            newForms[activeModalIndex][type].fotoPreview = null;
        }
        setGeneratedForms(newForms);
    };
    
    const saveModalData = () => {
        if (activeModalIndex !== null) {
            const newForms = [...generatedForms];
            newForms[activeModalIndex].isComplete = true;
            setGeneratedForms(newForms);
            setActiveModalIndex(null);
        }
    };

    const handleBatchSubmit = async () => {
        if (!selectedEmployee) {
            alert('Pilih karyawan terlebih dahulu.');
            return;
        }
        if (generatedForms.length === 0) {
            alert('Generate baris form terlebih dahulu.');
            return;
        }

        setIsLoading(true);
        try {
            const records = [];
            for (let form of generatedForms) {
                // Proses Masuk
                let fotoMasukB64 = null;
                if (form.masuk.fotoFile) fotoMasukB64 = await resizeAndToBase64(form.masuk.fotoFile);
                records.push({
                    karyawan_id: selectedEmployee,
                    tanggal: form.tanggal,
                    waktu: form.masuk.waktu,
                    jenis: 'masuk',
                    status: form.masuk.status,
                    menit_terlambat: form.masuk.status === 'terlambat' ? form.masuk.menit_terlambat : 0,
                    alasan: form.masuk.status === 'terlambat' ? form.masuk.alasan : '',
                    foto_b64: fotoMasukB64
                });

                // Proses Pulang
                let fotoPulangB64 = null;
                if (form.pulang.fotoFile) fotoPulangB64 = await resizeAndToBase64(form.pulang.fotoFile);
                records.push({
                    karyawan_id: selectedEmployee,
                    tanggal: form.tanggal,
                    waktu: form.pulang.waktu,
                    jenis: 'pulang',
                    status: form.pulang.status === 'normal' ? 'tepat_waktu' : form.pulang.status,
                    menit_terlambat: 0,
                    alasan: form.pulang.status === 'pulang_awal' ? form.pulang.alasan : '',
                    foto_b64: fotoPulangB64
                });
            }

            const res = await axios.post(`${API_BASE_URL}/admin/batch-inject-attendance`, { records });
            alert(res.data.message || 'Batch Inject Absensi Berhasil!');
            setGeneratedForms([]);
        } catch (err) {
            console.error(err);
            alert('Gagal batch inject: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    // Utils
    const resizeAndToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 640;
                const MAX_HEIGHT = 480;

                if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                    const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
            img.onerror = reject;
        };
        reader.onerror = error => reject(error);
    });


    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header-flex">
                <div className="header-text">
                    <h2>Inject Data Sistem</h2>
                    <p>Fasilitas bypass untuk upload dataset wajah secara batch & injeksi data absensi historis.</p>
                </div>
            </div>

            <div className="inject-wrapper">
                <div className="inject-sidebar">
                    <h3 style={{marginTop: 0, color: 'var(--navy-primary)', fontSize: '14px', marginBottom: '16px'}}>MODE INJEKSI</h3>
                    
                    <button 
                        className={`mode-btn ${mode === 'dataset' ? 'active' : ''}`}
                        onClick={() => setMode('dataset')}
                    >
                        <i className="fas fa-images"></i> Upload Dataset Wajah
                    </button>
                    <button 
                        className={`mode-btn ${mode === 'attendance' ? 'active' : ''}`}
                        onClick={() => setMode('attendance')}
                    >
                        <i className="fas fa-calendar-alt"></i> Batch Inject Absensi
                    </button>

                    <div style={{marginTop: '32px', position: 'relative'}}>
                        <label style={{fontSize: '11px', fontWeight: '800', color: 'var(--slate-muted)', display: 'block', marginBottom: '8px'}}>PILIH KARYAWAN TARGET</label>
                        <div className="custom-search-select">
                            <input 
                                type="text" 
                                className="search-input" 
                                style={{width: '100%', padding: '12px', boxSizing: 'border-box', cursor: 'text'}}
                                placeholder="Cari nama / kode..." 
                                value={empDropdownOpen ? searchEmp : (selectedEmployee ? employees.find(e => e.id.toString() === selectedEmployee.toString())?.nama + ' (' + employees.find(e => e.id.toString() === selectedEmployee.toString())?.kode_karyawan + ')' : '')}
                                onFocus={() => { setEmpDropdownOpen(true); setSearchEmp(''); }}
                                onChange={e => setSearchEmp(e.target.value)}
                                onBlur={() => setTimeout(() => setEmpDropdownOpen(false), 200)}
                            />
                            <i className="fas fa-chevron-down" style={{position: 'absolute', right: '12px', top: '38px', color: '#94a3b8', pointerEvents: 'none'}}></i>
                            {empDropdownOpen && (
                                <div className="dropdown-options">
                                    {employees.filter(emp => emp.nama.toLowerCase().includes(searchEmp.toLowerCase()) || emp.kode_karyawan.toLowerCase().includes(searchEmp.toLowerCase())).length === 0 && (
                                        <div className="dropdown-option" style={{color: '#94a3b8'}}>Tidak ditemukan...</div>
                                    )}
                                    {employees.filter(emp => emp.nama.toLowerCase().includes(searchEmp.toLowerCase()) || emp.kode_karyawan.toLowerCase().includes(searchEmp.toLowerCase())).map(emp => (
                                        <div 
                                            key={emp.id} 
                                            className="dropdown-option"
                                            onClick={() => { setSelectedEmployee(emp.id); setEmpDropdownOpen(false); }}
                                        >
                                            {emp.nama} ({emp.kode_karyawan})
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="inject-content">
                    {mode === 'dataset' && (
                        <div className="mode-panel">
                            <h3 className="panel-title"><i className="fas fa-images"></i> Upload Dataset Wajah (20 Foto)</h3>
                            <p className="panel-desc">Gunakan mode ini untuk mendaftarkan wajah karyawan tanpa perlu menggunakan webcam. Anda harus memilih tepat 20 foto wajah yang jelas dari karyawan target.</p>
                            
                            <form onSubmit={handleDatasetSubmit} className="dataset-form">
                                <div className="file-upload-box">
                                    <i className="fas fa-cloud-upload-alt upload-icon"></i>
                                    <p style={{margin: '12px 0 20px', fontWeight: '600'}}>Pilih 20 Foto Dataset (.jpg, .jpeg, .png)</p>
                                    <input 
                                        type="file" 
                                        id="dataset-file-input"
                                        multiple 
                                        accept="image/*"
                                        onChange={handleDatasetFileChange}
                                        className="file-input-native"
                                    />
                                    {datasetFiles.length > 0 && (
                                        <div className="file-count-badge">
                                            {datasetFiles.length} / 20 File Terpilih
                                        </div>
                                    )}
                                </div>
                                <button type="submit" className="btn-execute" disabled={isLoading}>
                                    {isLoading ? 'Sedang Memproses...' : 'Eksekusi Upload Dataset'}
                                </button>
                            </form>
                        </div>
                    )}

                    {mode === 'attendance' && (
                        <div className="mode-panel">
                            <h3 className="panel-title"><i className="fas fa-calendar-alt"></i> Batch Inject Absensi (Multi-Hari)</h3>
                            <p className="panel-desc">Gunakan mode ini untuk mengisi absensi masuk dan pulang untuk beberapa hari sekaligus (misal 5 hari).</p>
                            
                            <div className="date-range-selector">
                                <div className="date-field">
                                    <label>TANGGAL MULAI</label>
                                    <input type="date" className="search-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </div>
                                <div className="date-field">
                                    <label>TANGGAL SELESAI</label>
                                    <input type="date" className="search-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                                <button onClick={generateForms} className="btn-generate">Generate Baris</button>
                            </div>

                            {generatedForms.length > 0 && (
                                <div className="batch-forms-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Tanggal</th>
                                                <th>Status Masuk</th>
                                                <th>Status Pulang</th>
                                                <th>Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {generatedForms.map((form, idx) => (
                                                <tr key={idx}>
                                                    <td style={{fontWeight: '700', color: 'var(--navy-primary)'}}>{form.tanggal}</td>
                                                    <td>
                                                        <span className={`status-badge ${form.masuk.status === 'tepat_waktu' ? 'success' : 'danger'}`}>
                                                            {form.masuk.status === 'tepat_waktu' ? 'Tepat Waktu' : 'Terlambat'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge ${form.pulang.status === 'normal' ? 'success' : form.pulang.status === 'pulang_awal' ? 'danger' : 'info'}`}>
                                                            {form.pulang.status === 'normal' ? 'Normal' : form.pulang.status === 'pulang_awal' ? 'Pulang Awal' : 'Lembur'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button 
                                                            className="btn-action edit"
                                                            onClick={() => setActiveModalIndex(idx)}
                                                        >
                                                            <i className={`fas ${form.isComplete ? 'fa-edit' : 'fa-pencil-alt'}`}></i> 
                                                            {form.isComplete ? 'Edit Data' : 'Isi Data'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <button onClick={handleBatchSubmit} className="btn-execute" disabled={isLoading} style={{marginTop: '20px'}}>
                                        {isLoading ? 'Sedang Memproses Batch...' : 'Eksekusi Batch Inject'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for Editing Day Data */}
            {activeModalIndex !== null && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{maxWidth: '800px'}}>
                        <div className="modal-header">
                            <h3 style={{margin: 0, color: 'var(--navy-primary)'}}>
                                Inject Absensi: {generatedForms[activeModalIndex].tanggal}
                            </h3>
                            <button className="close-btn" onClick={() => setActiveModalIndex(null)}>&times;</button>
                        </div>
                        
                        <div className="modal-body" style={{display: 'flex', gap: '24px'}}>
                            {/* Panel Masuk */}
                            <div className="att-panel">
                                <h4 className="att-panel-title">INJEKSI MASUK</h4>
                                
                                <div className="form-group">
                                    <label>Jam Masuk</label>
                                    <input type="time" className="search-input" value={generatedForms[activeModalIndex].masuk.waktu} onChange={e => handleModalChange('masuk', 'waktu', e.target.value)} />
                                </div>
                                
                                <div className="form-group">
                                    <label>Status Masuk</label>
                                    <select className="search-input" value={generatedForms[activeModalIndex].masuk.status} onChange={e => handleModalChange('masuk', 'status', e.target.value)}>
                                        <option value="tepat_waktu">Tepat Waktu</option>
                                        <option value="terlambat">Terlambat</option>
                                    </select>
                                </div>

                                {generatedForms[activeModalIndex].masuk.status === 'terlambat' && (
                                    <>
                                        <div className="form-group animate-fade-in">
                                            <label>Menit Terlambat</label>
                                            <input type="number" className="search-input" placeholder="Misal: 30" value={generatedForms[activeModalIndex].masuk.menit_terlambat} onChange={e => handleModalChange('masuk', 'menit_terlambat', e.target.value)} />
                                        </div>
                                        <div className="form-group animate-fade-in">
                                            <label>Alasan Terlambat</label>
                                            <input type="text" className="search-input" placeholder="Masukkan alasan..." value={generatedForms[activeModalIndex].masuk.alasan} onChange={e => handleModalChange('masuk', 'alasan', e.target.value)} />
                                        </div>
                                    </>
                                )}

                                <div className="form-group">
                                    <label>Foto Bukti (Opsional)</label>
                                    <input type="file" accept="image/*" className="search-input" style={{padding: '8px'}} onChange={e => handleModalFileChange('masuk', e)} />
                                    {generatedForms[activeModalIndex].masuk.fotoPreview && (
                                        <img src={generatedForms[activeModalIndex].masuk.fotoPreview} alt="Preview Masuk" className="foto-preview" />
                                    )}
                                </div>
                            </div>

                            {/* Panel Pulang */}
                            <div className="att-panel">
                                <h4 className="att-panel-title">INJEKSI PULANG</h4>
                                
                                <div className="form-group">
                                    <label>Jam Pulang</label>
                                    <input type="time" className="search-input" value={generatedForms[activeModalIndex].pulang.waktu} onChange={e => handleModalChange('pulang', 'waktu', e.target.value)} />
                                </div>
                                
                                <div className="form-group">
                                    <label>Status Pulang</label>
                                    <select className="search-input" value={generatedForms[activeModalIndex].pulang.status} onChange={e => handleModalChange('pulang', 'status', e.target.value)}>
                                        <option value="normal">Normal</option>
                                        <option value="pulang_awal">Pulang Awal</option>
                                        <option value="lembur">Lembur</option>
                                    </select>
                                </div>

                                {generatedForms[activeModalIndex].pulang.status === 'pulang_awal' && (
                                    <div className="form-group animate-fade-in">
                                        <label>Alasan Pulang Awal</label>
                                        <input type="text" className="search-input" placeholder="Masukkan alasan..." value={generatedForms[activeModalIndex].pulang.alasan} onChange={e => handleModalChange('pulang', 'alasan', e.target.value)} />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Foto Bukti (Opsional)</label>
                                    <input type="file" accept="image/*" className="search-input" style={{padding: '8px'}} onChange={e => handleModalFileChange('pulang', e)} />
                                    {generatedForms[activeModalIndex].pulang.fotoPreview && (
                                        <img src={generatedForms[activeModalIndex].pulang.fotoPreview} alt="Preview Pulang" className="foto-preview" />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer" style={{marginTop: '24px', textAlign: 'right'}}>
                            <button className="btn-action edit" onClick={saveModalData} style={{padding: '12px 24px', fontSize: '14px'}}>
                                <i className="fas fa-save"></i> Simpan Data Hari Ini
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .inject-wrapper { display: flex; gap: 24px; min-height: 500px; }
                
                .inject-sidebar { 
                    width: 250px; flex-shrink: 0; background: white; padding: 24px; 
                    border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); 
                }
                .inject-content { 
                    flex: 1; background: white; border-radius: 20px; 
                    box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden;
                }

                .mode-btn {
                    display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 16px;
                    border: none; background: transparent; text-align: left;
                    font-size: 14px; font-weight: 600; color: var(--slate-muted); cursor: pointer;
                    border-radius: 12px; transition: 0.2s; margin-bottom: 8px;
                }
                .mode-btn:hover { background: #f8fafc; color: var(--navy-primary); }
                .mode-btn.active { background: #f0fdf4; color: #10b981; }

                .mode-panel { padding: 32px; }
                .panel-title { font-size: 20px; font-weight: 800; color: var(--navy-primary); margin-top: 0; display: flex; align-items: center; gap: 12px; }
                .panel-desc { color: var(--slate-muted); line-height: 1.6; margin-bottom: 32px; font-size: 14px; }

                .file-upload-box {
                    border: 2px dashed #cbd5e1; border-radius: 16px; padding: 40px;
                    text-align: center; background: #f8fafc; margin-bottom: 24px;
                    display: flex; flex-direction: column; align-items: center;
                }
                .upload-icon { font-size: 48px; color: #94a3b8; }
                .file-input-native { font-size: 14px; }
                .file-count-badge {
                    margin-top: 16px; display: inline-block; padding: 6px 16px;
                    background: #dcfce7; color: #166534; font-weight: 700; border-radius: 99px; font-size: 12px;
                }

                .btn-execute {
                    width: 100%; padding: 16px; background: var(--navy-primary); color: white;
                    border: none; border-radius: 12px; font-size: 15px; font-weight: 700;
                    cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(10, 37, 64, 0.2);
                }
                .btn-execute:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(10, 37, 64, 0.3); }
                .btn-execute:disabled { background: #94a3b8; cursor: not-allowed; transform: none; box-shadow: none; }
                
                .custom-search-select { position: relative; }
                .dropdown-options { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 4px; max-height: 200px; overflow-y: auto; z-index: 100; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
                .dropdown-option { padding: 10px 12px; font-size: 13px; cursor: pointer; transition: background 0.1s; }
                .dropdown-option:hover { background: #f1f5f9; color: var(--navy-primary); }

                .date-range-selector { display: flex; gap: 16px; align-items: flex-end; padding: 20px; background: #f8fafc; border-radius: 12px; margin-bottom: 24px; }
                .date-field { display: flex; flex-direction: column; gap: 6px; }
                .date-field label { font-size: 11px; font-weight: 800; color: var(--slate-muted); }
                .btn-generate { padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; height: 38px; }

                .batch-forms-container { display: flex; flex-direction: column; gap: 16px; }
                
                .data-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                .data-table th { background: #f8fafc; padding: 14px 16px; text-align: left; font-size: 12px; color: var(--slate-muted); border-bottom: 2px solid #e2e8f0; }
                .data-table td { padding: 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; vertical-align: middle; }
                
                .status-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; }
                .status-badge.success { background: #dcfce7; color: #166534; }
                .status-badge.danger { background: #fee2e2; color: #991b1b; }
                .status-badge.info { background: #dbeafe; color: #1e40af; }
                
                .btn-action.edit { background: #e0e7ff; color: #4338ca; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
                .btn-action.edit:hover { background: #c7d2fe; }

                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; display: flex; align-items: center; justify-content: center; }
                .modal-content { background: white; padding: 32px; border-radius: 24px; width: 90%; max-width: 500px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); max-height: 90vh; overflow-y: auto; }
                .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .close-btn { background: none; border: none; font-size: 28px; color: #64748b; cursor: pointer; padding: 0; line-height: 1; transition: color 0.2s; }
                
                .att-panel { flex: 1; background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; }
                .att-panel-title { margin-top: 0; margin-bottom: 16px; font-size: 14px; color: var(--navy-primary); letter-spacing: 1px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
                
                .form-group { margin-bottom: 16px; }
                .form-group label { display: block; font-size: 12px; font-weight: 700; color: var(--slate-muted); margin-bottom: 8px; }
                .foto-preview { margin-top: 12px; width: 100%; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; }
                
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

export default InjectDataTab;
