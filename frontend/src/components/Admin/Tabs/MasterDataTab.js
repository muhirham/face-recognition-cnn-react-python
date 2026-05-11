import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import { toast } from 'react-toastify';

function MasterDataTab() {
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [newDept, setNewDept] = useState('');
    const [newPos, setNewPos] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Gunakan endpoint master_data yang sudah ada di backend
            const res = await axios.get(`${API_BASE_URL}/admin/master_data`);
            setDepartments(res.data.departemens || []);
            setPositions(res.data.jabatans || []);
        } catch (err) {
            console.error("Gagal load master data", err);
            toast.error("Gagal memuat data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddDept = async (e) => {
        e.preventDefault();
        if (!newDept) return;
        try {
            // Sesuaikan endpoint ke /admin/departemens
            await axios.post(`${API_BASE_URL}/admin/departemens`, { nama_dept: newDept });
            toast.success("Departemen berhasil ditambahkan");
            setNewDept('');
            fetchData();
        } catch (err) { toast.error("Gagal menambah departemen"); }
    };

    const handleAddPos = async (e) => {
        e.preventDefault();
        if (!newPos) return;
        try {
            // Sesuaikan endpoint ke /admin/jabatans
            await axios.post(`${API_BASE_URL}/admin/jabatans`, { nama_jabatan: newPos });
            toast.success("Jabatan berhasil ditambahkan");
            setNewPos('');
            fetchData();
        } catch (err) { toast.error("Gagal menambah jabatan"); }
    };

    const handleDeleteDept = async (id) => {
        if (!window.confirm("Hapus departemen ini? Karyawan terkait akan kehilangan data departemen.")) return;
        try {
            await axios.delete(`${API_BASE_URL}/admin/departemens/${id}`);
            toast.success("Departemen dihapus");
            fetchData();
        } catch (err) { toast.error("Gagal menghapus"); }
    };

    const handleDeletePos = async (id) => {
        if (!window.confirm("Hapus jabatan ini?")) return;
        try {
            await axios.delete(`${API_BASE_URL}/admin/jabatans/${id}`);
            toast.success("Jabatan dihapus");
            fetchData();
        } catch (err) { toast.error("Gagal menghapus"); }
    };

    if (isLoading) {
        return <div style={{padding: '40px', fontWeight: '800'}}>Memuat Master Data...</div>;
    }

    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header-p">
                <h2>Master Departemen & Jabatan</h2>
                <p>Kelola struktur organisasi perusahaan PT Intertel Media Prima.</p>
            </div>

            <div className="master-grid-dual">
                {/* Departemen Card */}
                <div className="master-card-p">
                    <div className="card-p-header">
                        <h3>🏢 Daftar Departemen</h3>
                    </div>
                    <div className="card-p-body">
                        <form onSubmit={handleAddDept} className="mini-add-form">
                            <input 
                                type="text" placeholder="Nama Departemen Baru" 
                                value={newDept} onChange={(e) => setNewDept(e.target.value)}
                            />
                            <button type="submit">Tambah</button>
                        </form>
                        <div className="mini-list-p">
                            {departments.length > 0 ? departments.map(d => (
                                <div key={d.id} className="list-item-p">
                                    <span>{d.nama_dept}</span>
                                    <button onClick={() => handleDeleteDept(d.id)}>🗑️</button>
                                </div>
                            )) : <p className="empty-p">Belum ada data.</p>}
                        </div>
                    </div>
                </div>

                {/* Jabatan Card */}
                <div className="master-card-p">
                    <div className="card-p-header">
                        <h3>💼 Daftar Jabatan</h3>
                    </div>
                    <div className="card-p-body">
                        <form onSubmit={handleAddPos} className="mini-add-form">
                            <input 
                                type="text" placeholder="Nama Jabatan Baru" 
                                value={newPos} onChange={(e) => setNewPos(e.target.value)}
                            />
                            <button type="submit">Tambah</button>
                        </form>
                        <div className="mini-list-p">
                            {positions.length > 0 ? positions.map(p => (
                                <div key={p.id} className="list-item-p">
                                    <span>{p.nama_jabatan}</span>
                                    <button onClick={() => handleDeletePos(p.id)}>🗑️</button>
                                </div>
                            )) : <p className="empty-p">Belum ada data.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .master-grid-dual { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                .master-card-p { background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden; border: 1px solid #f1f5f9; }
                .card-p-header { padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
                .card-p-header h3 { font-size: 16px; font-weight: 800; color: var(--navy-primary); }
                .card-p-body { padding: 24px; }

                .mini-add-form { display: flex; gap: 10px; margin-bottom: 20px; }
                .mini-add-form input { flex: 1; padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; outline: none; }
                .mini-add-form button { background: var(--navy-primary); color: white; border: none; padding: 0 16px; border-radius: 10px; font-weight: 700; cursor: pointer; }

                .mini-list-p { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
                .list-item-p { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #fcfdfe; border: 1px solid #f1f5f9; border-radius: 12px; font-size: 13px; font-weight: 600; color: var(--navy-primary); }
                .list-item-p button { background: none; border: none; cursor: pointer; opacity: 0.5; transition: 0.2s; }
                .list-item-p button:hover { opacity: 1; transform: scale(1.1); }
                .empty-p { text-align: center; color: var(--slate-muted); font-size: 12px; font-style: italic; padding: 20px; }
                
                @media (max-width: 800px) { .master-grid-dual { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    );
}

export default MasterDataTab;
