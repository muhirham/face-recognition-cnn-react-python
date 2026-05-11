import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import { toast } from 'react-toastify';

function UserTab() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/admin/users`);
            setUsers(res.data.users || []);
        } catch (err) {
            console.error("Gagal load users", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/admin/users`, { ...newAdmin, role: 'admin' });
            toast.success("Administrator baru ditambahkan");
            setNewAdmin({ username: '', password: '' });
            fetchUsers();
        } catch (err) { toast.error("Gagal menambah admin"); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Hapus akses administrator ini?")) return;
        try {
            await axios.delete(`${API_BASE_URL}/admin/users/${id}`);
            toast.success("Akses dihapus");
            fetchUsers();
        } catch (err) { toast.error("Gagal menghapus"); }
    };

    if (isLoading) {
        return <div style={{padding: '40px', fontWeight: '800'}}>Memuat Data Administrator...</div>;
    }

    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header-p">
                <h2>Master Administrator</h2>
                <p>Kelola akun pengguna yang memiliki akses penuh ke panel kontrol sistem.</p>
            </div>

            <div className="users-grid-p">
                {/* Form Tambah Admin */}
                <div className="users-card-p side-form">
                    <div className="card-p-header">
                        <h3>➕ Tambah Administrator</h3>
                    </div>
                    <div className="card-p-body">
                        <form onSubmit={handleAddAdmin} className="vertical-form-p">
                            <div className="form-group-mini">
                                <label>Username</label>
                                <input 
                                    type="text" value={newAdmin.username} 
                                    onChange={(e) => setNewAdmin({...newAdmin, username: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div className="form-group-mini">
                                <label>Password</label>
                                <input 
                                    type="password" value={newAdmin.password} 
                                    onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})} 
                                    required 
                                />
                            </div>
                            <button type="submit" className="btn-submit-p">Simpan Admin</button>
                        </form>
                    </div>
                </div>

                {/* Daftar Admin */}
                <div className="users-card-p main-list">
                    <div className="card-p-header">
                        <h3>🔑 Daftar Akun Terdaftar</h3>
                    </div>
                    <div className="card-p-body">
                        <div className="admin-list-scroll">
                            {users.length > 0 ? users.map(u => (
                                <div key={u.id} className="admin-item-p">
                                    <div className="item-left">
                                        <div className="admin-avatar">👤</div>
                                        <div className="admin-meta">
                                            <span className="u-name">{u.username}</span>
                                            <span className="u-role">System Administrator</span>
                                        </div>
                                    </div>
                                    <button className="btn-del-mini" onClick={() => handleDelete(u.id)}>Hapus Akses</button>
                                </div>
                            )) : <p className="empty-p">Belum ada administrator.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .users-grid-p { display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; }
                .users-card-p { background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; overflow: hidden; }
                .card-p-header { padding: 18px 24px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
                .card-p-header h3 { font-size: 15px; font-weight: 800; color: var(--navy-primary); }
                .card-p-body { padding: 24px; }

                .vertical-form-p { display: flex; flex-direction: column; gap: 16px; }
                .form-group-mini { display: flex; flex-direction: column; gap: 6px; }
                .form-group-mini label { font-size: 11px; font-weight: 800; color: var(--slate-muted); text-transform: uppercase; }
                .form-group-mini input { padding: 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 14px; outline: none; }
                .btn-submit-p { background: var(--navy-primary); color: white; border: none; padding: 14px; border-radius: 10px; font-weight: 800; cursor: pointer; transition: 0.2s; }
                .btn-submit-p:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }

                .admin-list-scroll { display: flex; flex-direction: column; gap: 12px; }
                .admin-item-p { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #fcfdfe; border: 1px solid #f1f5f9; border-radius: 16px; }
                .item-left { display: flex; align-items: center; gap: 14px; }
                .admin-avatar { width: 40px; height: 40px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
                .admin-meta { display: flex; flex-direction: column; }
                .u-name { font-weight: 800; color: var(--navy-primary); font-size: 15px; }
                .u-role { font-size: 11px; color: var(--slate-muted); font-weight: 700; }
                .btn-del-mini { background: #fff5f5; color: #ff4d4f; border: none; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; }
                .btn-del-mini:hover { background: #ff4d4f; color: white; }

                @media (max-width: 900px) { .users-grid-p { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    );
}

export default UserTab;
