import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API_BASE_URL from '../apiConfig';
import Webcam from 'react-webcam';
import './SignUp.css';

function SignUp() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        role: 'karyawan'
    });
    const [imageSrc, setImageSrc] = useState(null);
    const webcamRef = useRef(null);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const nextStep = () => {
        if (!formData.email || !formData.username || !formData.password) {
            toast.warn('Mohon isi semua data karyawan!');
            return;
        }
        setStep(2);
    };

    const capture = () => {
        const image = webcamRef.current.getScreenshot();
        setImageSrc(image);
        toast.info("Wajah berhasil ditangkap!");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!imageSrc) {
            toast.error('Scan wajah wajib dilakukan!');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/register`, {
                ...formData,
                image: imageSrc
            });
            toast.success("Pendaftaran Karyawan Berhasil!");
            setTimeout(() => navigate('/admin-dashboard'), 2000);
        } catch (error) {
            console.error('Registration error:', error);
            const msg = error.response?.data?.message || 'Gagal mendaftarkan karyawan';
            toast.error(msg);
        }
    };

    return (
        <div className="enroll-portal-wrapper">
            <div className={`enroll-card ${step === 2 ? 'expanded' : ''}`}>
                <div className="enroll-header">
                    <div className="header-brand-box">
                        <div className="imp-node">IMP</div>
                        <div className="header-text-block">
                            <h3>PENDAFTARAN KARYAWAN</h3>
                            <p>PT INTERTEL MEDIA PRIMA</p>
                        </div>
                    </div>
                    <div className="step-indicator">
                        <div className={`step-dot ${step === 1 ? 'active' : 'completed'}`}>1</div>
                        <div className="step-line"></div>
                        <div className={`step-dot ${step === 2 ? 'active' : ''}`}>2</div>
                    </div>
                </div>

                <div className="enroll-body">
                    {step === 1 ? (
                        <div className="enroll-form-section animate-fade-in">
                            <h2 className="section-title">Informasi Data Diri</h2>
                            <p className="section-subtitle">Masukkan detail informasi karyawan baru di bawah ini.</p>
                            
                            <div className="enroll-group">
                                <label>Nama Lengkap</label>
                                <input 
                                    name="username" 
                                    type="text" 
                                    placeholder="Contoh: Muhammad Irham" 
                                    onChange={handleChange} 
                                    value={formData.username} 
                                />
                            </div>
                            
                            <div className="enroll-group">
                                <label>Email Perusahaan</label>
                                <input 
                                    name="email" 
                                    type="email" 
                                    placeholder="email@intertel.com" 
                                    onChange={handleChange} 
                                    value={formData.email} 
                                />
                            </div>
                            
                            <div className="enroll-group">
                                <label>Password Akun</label>
                                <input 
                                    name="password" 
                                    type="password" 
                                    placeholder="••••••••" 
                                    onChange={handleChange} 
                                    value={formData.password} 
                                />
                            </div>

                            <div className="enroll-group">
                                <label>Tipe Otoritas</label>
                                <select name="role" onChange={handleChange} value={formData.role}>
                                    <option value="karyawan">Karyawan Biasa</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>

                            <button className="enroll-next-btn" onClick={nextStep}>
                                Lanjut: Verifikasi Wajah <span>→</span>
                            </button>
                        </div>
                    ) : (
                        <div className="face-enroll-section animate-slide-up">
                            <h2 className="section-title">Verifikasi Wajah Karyawan</h2>
                            <p className="section-subtitle">Posisikan wajah karyawan di tengah kamera untuk pendaftaran template wajah.</p>
                            
                            <div className="cam-viewport-box">
                                {!imageSrc ? (
                                    <div className="cam-active-wrapper">
                                        <Webcam 
                                            audio={false} 
                                            ref={webcamRef} 
                                            screenshotFormat="image/jpeg" 
                                            className="cam-view" 
                                            videoConstraints={{
                                                width: 1280,
                                                height: 720,
                                                facingMode: "user"
                                            }}
                                        />
                                        <div className="cam-overlay">
                                            <div className="scan-line"></div>
                                        </div>
                                        <button className="btn-capture-imp" onClick={capture}>
                                            <div className="cap-icon"></div> Tangkap Wajah
                                        </button>
                                    </div>
                                ) : (
                                    <div className="cam-preview-wrapper">
                                        <img src={imageSrc} alt="Captured" className="preview-image" />
                                        <div className="preview-indicator">Template Wajah Siap</div>
                                        <button className="btn-retake-imp" onClick={() => setImageSrc(null)}>Ulangi Scan</button>
                                    </div>
                                )}
                            </div>

                            <div className="enroll-actions-row">
                                <button className="btn-back-imp" onClick={() => setStep(1)}>Kembali</button>
                                <button className="btn-submit-imp" onClick={handleSubmit}>Simpan & Selesaikan</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="enroll-footer">
                    <button className="btn-cancel-enroll" onClick={() => navigate('/admin-dashboard')}>Batalkan Pendaftaran</button>
                </div>
            </div>
            <ToastContainer position="top-right" theme="colored" autoClose={3000} />
        </div>
    );
}

export default SignUp;
