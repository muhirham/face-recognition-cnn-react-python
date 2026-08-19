import React, { useState, useCallback } from 'react';
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import API_BASE_URL from '../apiConfig';
import 'react-toastify/dist/ReactToastify.css';
import './SignIn.css';

function SignIn() {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const setCookie = (name, value, days) => {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
    };

    const handleCredentialSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/login_credential`, credentials);
            const { user_id, username, role, nama_karyawan, jabatan_karyawan } = response.data;
            
            toast.success(`Selamat Datang, ${username}!`);
            
            setCookie('user_id', user_id, 7);
            setCookie('username', username, 7);
            setCookie('role', role, 7);
            if(nama_karyawan) setCookie('nama_karyawan', nama_karyawan, 7);
            if(jabatan_karyawan) setCookie('jabatan_karyawan', jabatan_karyawan, 7);

            setTimeout(() => {
                if (role === 'admin') navigate('/admin-dashboard');
                else navigate('/dashboard');
            }, 1000);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Email atau Password salah!');
        } finally {
            setIsLoading(false);
        }
    };

    const particlesInit = useCallback(async engine => {
        await loadSlim(engine);
    }, []);

    const particlesOptions = {
        background: { color: { value: "transparent" } },
        fpsLimit: 60,
        interactivity: {
            events: {
                onHover: { enable: true, mode: "grab" },
                resize: true,
            },
            modes: { grab: { distance: 150, links: { opacity: 0.3 } } },
        },
        particles: {
            color: { value: "#bfa060" }, // gold accent
            links: { color: "#ffffff", distance: 150, enable: true, opacity: 0.4, width: 1.5 },
            move: { direction: "none", enable: true, outModes: { default: "bounce" }, random: false, speed: 1.2, straight: false },
            number: { density: { enable: true, area: 800 }, value: 80 },
            opacity: { value: 0.7 },
            shape: { type: "circle" },
            size: { value: { min: 2, max: 4 } },
        },
        detectRetina: true,
    };

    return (
        <div className="academic-portal-wrapper" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
                <Particles id="tsparticles-login" init={particlesInit} options={particlesOptions} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
            </div>

            <div className="academic-login-card" style={{ zIndex: 1 }}>
                {/* Left Panel: Branding */}
                <div className="login-brand-panel">
                    <div className="brand-glass-icon">
                        💎
                    </div>
                    <h1>Sistem Absensi<br/>Pengenalan Wajah</h1>
                    <p>PT Intertel Media Prima.<br/>Autentikasi presensi cerdas berbasis biometrik dengan keamanan tingkat tinggi.</p>
                </div>

                {/* Right Panel: Form */}
                <div className="login-card-body">
                    <span className="login-subtitle">Secure Login</span>

                    <form className="formal-login-form" onSubmit={handleCredentialSubmit}>
                        <div className="formal-group">
                            <input 
                                type="email" 
                                placeholder="Username (Email)" 
                                value={credentials.email} 
                                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })} 
                                required 
                            />
                        </div>

                        <div className="formal-group password-field">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Password" 
                                value={credentials.password} 
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} 
                                required 
                            />
                            <button 
                                type="button" 
                                className="pwd-eye-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>

                        <button type="submit" className="formal-submit-btn" disabled={isLoading}>
                            {isLoading ? 'Memproses...' : 'Login'}
                        </button>
                        
                        <div className="login-form-extras">
                            <label className="checkbox-container">
                                <input type="checkbox" /> Ingat Saya
                            </label>
                            <span className="forgot-link">Lupa Password?</span>
                        </div>
                    </form>

                    <div className="login-error-placeholder">
                        {/* Area for error messages like in reference */}
                    </div>

                    <div className="login-footer">
                        <p className="copyright-text">© Pt Intertel Media Prima</p>
                    </div>
                </div>
            </div>
            <ToastContainer position="top-right" theme="colored" />
        </div>
    );
}

export default SignIn;
