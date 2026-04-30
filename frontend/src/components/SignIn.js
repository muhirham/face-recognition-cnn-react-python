import React, { useState } from 'react';
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
            const { user_id, username, role } = response.data;
            
            toast.success(`Selamat Datang, ${username}!`);
            
            setCookie('user_id', user_id, 7);
            setCookie('username', username, 7);
            setCookie('role', role, 7);

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

    return (
        <div className="academic-portal-wrapper">
            <div className="academic-login-card">
                {/* Reference-Matched Header Tabs */}
                <div className="login-card-header">
                    <div className="header-branding">
                        <div className="ut-circle-logo">IMP</div>
                        <span className="instansi-name">PT INTERTEL MEDIA PRIMA</span>
                    </div>
                    <nav className="header-nav">
                        <button className="nav-link active">Beranda</button>
                        <button className="nav-link">Tentang Kami</button>
                    </nav>
                </div>

                <div className="login-card-body">
                    <div className="academic-titles">
                        <h1>Sistem Absensi Otomatis <br/> Berbasis Pengenalan Wajah</h1>
                        <p className="login-subtitle">Login Pengguna</p>
                    </div>

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
