import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import { toast } from 'react-toastify';

function MasterDepartemenTab() {
    const [departments, setDepartments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newDept, setNewDept] = useState('');
    
    // Edit State
    const [editId, setEditId] = useState(null);
    const [editName, setEditName] = useState('');
    
    // Delete Confirm State
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/admin/departemens`);
            setDepartments(res.data.departemens || []);
        } catch (err) {
            console.error("Gagal load data departemen", err);
            toast.error("Gagal memuat data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newDept) return;
        try {
            await axios.post(`${API_BASE_URL}/admin/departemens`, { nama_dept: newDept });
            toast.success("Departemen berhasil ditambahkan");
            setNewDept('');
            fetchData();
        } catch (err) { toast.error("Gagal menambah departemen"); }
    };

    const confirmDelete = (d) => {
        setDeleteConfirm({ id: d.id, name: d.nama_dept });
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            await axios.delete(`${API_BASE_URL}/admin/departemens/${deleteConfirm.id}`);
            toast.success("Departemen dihapus");
            setDeleteConfirm(null);
            fetchData();
        } catch (err) { toast.error("Gagal menghapus"); }
    };

    const handleEditClick = (d) => {
        setEditId(d.id);
        setEditName(d.nama_dept);
    };

    const handleCancelEdit = () => {
        setEditId(null);
        setEditName('');
    };

    const handleSaveEdit = async (id) => {
        if (!editName) return;
        try {
            await axios.put(`${API_BASE_URL}/admin/departemens/${id}`, { nama_dept: editName });
            toast.success("Departemen diperbarui");
            setEditId(null);
            fetchData();
        } catch (err) { toast.error("Gagal memperbarui departemen"); }
    };

    if (isLoading) {
        return <div style={{padding: '40px', fontWeight: '800'}}>Memuat Data Departemen...</div>;
    }

    const filteredDepartments = departments.filter(d => d.nama_dept.toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.ceil(filteredDepartments.length / ITEMS_PER_PAGE);
    const currentDepartments = filteredDepartments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header-p">
                <h2>Master Departemen</h2>
                <p>Kelola daftar departemen struktur organisasi perusahaan.</p>
            </div>

            <div className="master-single-card">
                <div className="master-card-p">
                    <div className="card-p-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>🏢 Daftar Departemen</h3>
                        <input 
                            type="text" className="search-input" placeholder="Cari departemen..." 
                            value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}} 
                            style={{ width: '180px', padding: '6px 10px' }}
                        />
                    </div>
                    <div className="card-p-body">
                        <form onSubmit={handleAdd} className="mini-add-form">
                            <input 
                                type="text" placeholder="Nama Departemen Baru" 
                                value={newDept} onChange={(e) => setNewDept(e.target.value)}
                            />
                            <button type="submit">Tambah</button>
                        </form>
                        <div className="mini-list-p">
                            {currentDepartments.length > 0 ? currentDepartments.map(d => (
                                <div key={d.id} className="list-item-p">
                                    {editId === d.id ? (
                                        <div style={{display: 'flex', gap: '8px', flex: 1}}>
                                            <input 
                                                type="text" 
                                                value={editName} 
                                                onChange={(e) => setEditName(e.target.value)}
                                                autoFocus
                                                className="edit-input-p"
                                            />
                                            <button onClick={() => handleSaveEdit(d.id)} className="btn-action-save">💾</button>
                                            <button onClick={handleCancelEdit} className="btn-action-cancel">❌</button>
                                        </div>
                                    ) : (
                                        <>
                                            <span>{d.nama_dept}</span>
                                            <div className="action-btns-p">
                                                <button onClick={() => handleEditClick(d)}>✏️</button>
                                                <button onClick={() => confirmDelete(d)}>🗑️</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )) : <p className="empty-p">Belum ada data yang sesuai.</p>}
                        </div>
                        
                        {totalPages > 1 && (
                            <div className="pagination-controls">
                                <span className="pagination-info">Halaman {currentPage} dari {totalPages}</span>
                                <div className="pagination-buttons">
                                    <button className="btn-page" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
                                    <button className="btn-page" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {deleteConfirm && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-box">
                        <h3>Konfirmasi Hapus</h3>
                        <p>Yakin ingin menghapus departemen <strong>{deleteConfirm.name}</strong>?<br/>Karyawan terkait mungkin akan kehilangan data departemen.</p>
                        <div className="modal-actions-p">
                            <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Batal</button>
                            <button className="btn-confirm-delete" onClick={handleDelete}>Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .master-single-card { margin-top: 20px; }
                .master-card-p { background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden; border: 1px solid #f1f5f9; }
                .card-p-header { padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
                .card-p-header h3 { font-size: 16px; font-weight: 800; color: var(--navy-primary); }
                .card-p-body { padding: 24px; }

                .mini-add-form { display: flex; gap: 10px; margin-bottom: 20px; }
                .mini-add-form input { flex: 1; padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; outline: none; }
                .mini-add-form button { background: var(--navy-primary); color: white; border: none; padding: 0 16px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
                .mini-add-form button:hover { opacity: 0.9; }

                .mini-list-p { display: flex; flex-direction: column; gap: 8px; max-height: 500px; overflow-y: auto; }
                .list-item-p { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #fcfdfe; border: 1px solid #f1f5f9; border-radius: 12px; font-size: 13px; font-weight: 600; color: var(--navy-primary); transition: all 0.2s; }
                .list-item-p:hover { background: #f1f5f9; }
                
                .action-btns-p { display: flex; gap: 6px; }
                .list-item-p button { background: none; border: none; cursor: pointer; opacity: 0.5; transition: 0.2s; font-size: 14px; }
                .list-item-p button:hover { opacity: 1; transform: scale(1.1); }

                .edit-input-p { flex: 1; padding: 6px 10px; border: 1.5px solid var(--navy-primary); border-radius: 6px; font-size: 13px; outline: none; }
                .btn-action-save { opacity: 1 !important; color: green; }
                .btn-action-cancel { opacity: 1 !important; color: red; }
                
                .empty-p { text-align: center; color: var(--slate-muted); font-size: 12px; font-style: italic; padding: 20px; }

                .custom-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s; }
                .custom-modal-box { background: white; padding: 24px 30px; border-radius: 16px; width: 400px; max-width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center; }
                .custom-modal-box h3 { margin-top: 0; color: #dc2626; font-size: 20px; margin-bottom: 12px; }
                .custom-modal-box p { color: var(--slate-muted); font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
                .modal-actions-p { display: flex; gap: 12px; justify-content: center; }
                .modal-actions-p button { padding: 10px 20px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; transition: 0.2s; }
                .btn-cancel { background: #f1f5f9; color: var(--navy-primary); }
                .btn-cancel:hover { background: #e2e8f0; }
                .btn-confirm-delete { background: #dc2626; color: white; }
                .btn-confirm-delete:hover { background: #b91c1c; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
}

export default MasterDepartemenTab;
