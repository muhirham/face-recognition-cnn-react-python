import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import { toast } from 'react-toastify';
import EnrollmentModal from '../EnrollmentModal';
import EditEmployeeModal from '../EditEmployeeModal';

function EmployeeTab() {
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showEnrollment, setShowEnrollment] = useState(false);
    const [editEmployee, setEditEmployee] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const fetchEmployees = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/admin/employees`);
            setEmployees(res.data.employees || []);
        } catch (err) {
            console.error("Gagal load karyawan", err);
            toast.error("Gagal mengambil data karyawan");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const confirmDelete = (emp) => {
        setDeleteConfirm({ id: emp.id, name: emp.nama });
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            await axios.delete(`${API_BASE_URL}/admin/employees/${deleteConfirm.id}`);
            toast.success("Karyawan berhasil dihapus");
            setDeleteConfirm(null);
            fetchEmployees();
        } catch (error) {
            toast.error("Gagal menghapus karyawan");
        }
    };

    if (isLoading) {
        return <div style={{ padding: '40px', fontWeight: '800' }}>Memuat Data Karyawan...</div>;
    }

    const filteredEmployees = employees.filter(emp => 
        (emp.nama && emp.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp.kode_karyawan && emp.kode_karyawan.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
    const currentEmployees = filteredEmployees.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header-flex">
                <div className="header-text">
                    <h2>Master Data Karyawan</h2>
                    <p>Manajemen data profil, departemen, dan jabatan seluruh personil.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <input 
                        type="text" className="search-input" placeholder="Cari NIP atau Nama..." 
                        value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}} 
                    />
                    <button className="btn-add-primary" onClick={() => setShowEnrollment(true)}>
                        <span>+</span> Tambah Karyawan
                    </button>
                </div>
            </div>

            <div className="data-card">
                <div className="table-wrapper">
                    <table className="premium-admin-table">
                        <thead>
                            <tr>
                                <th>NIP</th>
                                <th>Nama</th>
                                <th>Departemen</th>
                                <th>Jabatan</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'center' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentEmployees.length > 0 ? (
                                currentEmployees.map((emp) => (
                                    <tr key={emp.id}>
                                        <td className="bold">{emp.kode_karyawan || 'N/A'}</td>
                                        <td>{emp.nama || emp.username || 'Tanpa Nama'}</td>
                                        <td>{emp.nama_dept || '-'}</td>
                                        <td>{emp.nama_jabatan || '-'}</td>
                                        <td>
                                            <span className={`status-tag-simple ${(emp.status_kerja || 'aktif') === 'aktif' ? 'active' : 'inactive'}`}>
                                                {(emp.status_kerja || 'AKTIF').toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-btns-flex">
                                                <button className="btn-edit-icon" onClick={() => setEditEmployee(emp)}>✏️</button>
                                                <button className="btn-delete-icon" onClick={() => confirmDelete(emp)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="empty-state">Belum ada data karyawan yang sesuai.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    
                    {totalPages > 1 && (
                        <div className="pagination-controls">
                            <span className="pagination-info">Menampilkan halaman {currentPage} dari {totalPages}</span>
                            <div className="pagination-buttons">
                                <button className="btn-page" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
                                <button className="btn-page" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showEnrollment && (
                <EnrollmentModal
                    isOpen={showEnrollment}
                    onClose={() => setShowEnrollment(false)}
                    onSuccess={() => { setShowEnrollment(false); fetchEmployees(); }}
                />
            )}

            {editEmployee && (
                <EditEmployeeModal
                    isOpen={!!editEmployee}
                    employee={editEmployee}
                    onClose={() => setEditEmployee(null)}
                    onSuccess={() => { setEditEmployee(null); fetchEmployees(); }}
                />
            )}

            {deleteConfirm && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal-box">
                        <h3>Konfirmasi Hapus</h3>
                        <p>Yakin ingin menghapus karyawan <strong>{deleteConfirm.name}</strong>?<br/>Seluruh data presensi dan wajah mungkin akan ikut terhapus.</p>
                        <div className="modal-actions-p">
                            <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Batal</button>
                            <button className="btn-confirm-delete" onClick={handleDelete}>Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .tab-view-container { display: flex; flex-direction: column; gap: 24px; }
                .section-header-flex { display: flex; justify-content: space-between; align-items: flex-end; }
                .header-text h2 { font-size: 24px; font-weight: 800; color: var(--navy-primary); }
                .header-text p { color: var(--slate-muted); }

                .btn-add-primary {
                    background: var(--navy-primary); color: white; border: none;
                    padding: 12px 24px; border-radius: 12px; font-weight: 800;
                    cursor: pointer; display: flex; align-items: center; gap: 10px;
                    box-shadow: 0 4px 12px rgba(11, 26, 42, 0.2); transition: 0.2s;
                }
                .btn-add-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(11, 26, 42, 0.3); }

                .data-card {
                    background: white; border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden;
                }

                .premium-admin-table { width: 100%; border-collapse: collapse; }
                .premium-admin-table th {
                    background: #f8fafc; padding: 18px 24px; text-align: left;
                    font-size: 11px; font-weight: 800; color: var(--slate-muted);
                    text-transform: uppercase; border-bottom: 2px solid #f1f5f9;
                }
                .premium-admin-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
                .premium-admin-table td.bold { font-weight: 800; color: var(--navy-primary); }
                
                .status-tag-simple { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; }
                .status-tag-simple.active { background: #dcfce7; color: #166534; }
                .status-tag-simple.inactive { background: #fee2e2; color: #991b1b; }

                .action-btns-flex { display: flex; justify-content: center; gap: 8px; }
                .btn-edit-icon, .btn-delete-icon {
                    width: 34px; height: 34px; border-radius: 8px; border: none;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: 0.2s; font-size: 14px;
                }
                .btn-edit-icon { background: #f0f7ff; color: #007bff; }
                .btn-edit-icon:hover { background: #007bff; color: white; }
                .btn-delete-icon { background: #fff5f5; color: #ff4d4f; }
                .btn-delete-icon:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
                
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

export default EmployeeTab;
