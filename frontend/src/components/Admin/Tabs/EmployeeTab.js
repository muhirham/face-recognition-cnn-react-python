import React from 'react';

function EmployeeTab({ employees, onAdd, onDelete, onResetFace, onEdit }) {
    return (
        <div className="tab-view-container animate-fade-in">
            <div className="section-header-flex">
                <div className="header-text">
                    <h2>Manajemen Karyawan</h2>
                    <p>Kelola data karyawan, pendaftaran wajah, dan otoritas akses.</p>
                </div>
                <button className="add-employee-btn" onClick={onAdd}>
                    + Tambah Karyawan
                </button>
            </div>

            <div className="data-card">
                <div className="table-wrapper">
                    <table className="premium-admin-table">
                        <thead>
                            <tr>
                                <th>Kode</th>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Departemen</th>
                                <th>Email</th>
                                <th>Status Kerja</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp) => (
                                <tr key={emp.user_id}>
                                    <td data-label="Kode"><code>{emp.kode_karyawan || '-'}</code></td>
                                    <td data-label="Username"><strong>{emp.username}</strong></td>
                                    <td data-label="Role">
                                        <span className={`role-badge ${emp.role}`}>
                                            {emp.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td data-label="Departemen"><span className="dept-text">{emp.departemen || '-'}</span></td>
                                    <td data-label="Email">{emp.email}</td>
                                    <td data-label="Status">
                                        <span className={`badge-pill active`}>{emp.status_kerja || 'TERDAFTAR'}</span>
                                    </td>
                                    <td data-label="Aksi" className="actions-cell">
                                        <div className="action-buttons">
                                            <button className="btn-edit" onClick={() => onEdit(emp)}>Edit</button>
                                            {emp.role === 'karyawan' && (
                                                <button className="btn-reset" onClick={() => onResetFace(emp.karyawan_id)}>Reset Wajah</button>
                                            )}
                                            <button className="btn-delete" onClick={() => onDelete(emp.user_id)}>Hapus</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .tab-view-container { display: flex; flex-direction: column; gap: 24px; }
                .section-header-flex { display: flex; justify-content: space-between; align-items: flex-end; }
                .header-text h2 { font-size: 24px; font-weight: 800; color: var(--navy-primary); }
                .header-text p { color: var(--slate-muted); }

                .add-employee-btn {
                    background-color: var(--gold-accent); color: var(--navy-primary);
                    border: none; padding: 12px 24px; border-radius: 12px;
                    font-weight: 700; font-size: 14px; cursor: pointer;
                    transition: var(--transition-smooth);
                    box-shadow: 0 4px 10px rgba(249, 188, 47, 0.2);
                }
                .add-employee-btn:hover { background-color: var(--gold-hover); transform: translateY(-2px); }

                .data-card {
                    background: var(--white); border-radius: var(--border-radius);
                    box-shadow: var(--card-shadow); overflow: hidden;
                }

                .premium-admin-table { width: 100%; border-collapse: collapse; }
                .premium-admin-table th {
                    background: #f8fafc; padding: 18px 24px; text-align: left;
                    font-size: 12px; font-weight: 700; color: var(--slate-muted);
                    text-transform: uppercase; letter-spacing: 0.1em;
                    border-bottom: 2px solid #f1f5f9;
                }
                .premium-admin-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: var(--navy-primary); }
                .premium-admin-table tr:hover td { background-color: #fcfdfe; }
                .premium-admin-table tr:last-child td { border-bottom: none; }

                .badge-pill { padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
                .badge-pill.active { background: #dcfce7; color: #059669; }
                
                .role-badge { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; }
                .role-badge.admin { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
                .role-badge.karyawan { background: #f5f3ff; color: #5b21b6; border: 1px solid #ddd6fe; }
                
                .dept-text { font-weight: 700; color: var(--navy-light); }

                .actions-cell { text-align: right; }
                .action-buttons { display: flex; gap: 8px; justify-content: flex-end; }
                
                .btn-reset { 
                    background: transparent; border: 1.5px solid var(--navy-light); color: var(--navy-light);
                    padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; transition: 0.2s;
                }
                .btn-reset:hover { background: var(--navy-light); color: white; }

                .btn-edit { 
                    background: transparent; border: 1.5px solid var(--navy-primary); color: var(--navy-primary);
                    padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; transition: 0.2s;
                }
                .btn-edit:hover { background: var(--navy-primary); color: white; }

                .btn-delete { 
                    background: transparent; border: 1.5px solid var(--error); color: var(--error);
                    padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; transition: 0.2s;
                }
                .btn-delete:hover { background: var(--error); color: white; }

                code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: 700; color: var(--navy-light); }

                @media (max-width: 768px) {
                    .section-header-flex { flex-direction: column; align-items: flex-start; gap: 16px; }
                    .add-employee-btn { width: 100%; }

                    .premium-admin-table, .premium-admin-table tbody, .premium-admin-table tr, .premium-admin-table td { display: block; width: 100%; }
                    .premium-admin-table thead { display: none; }
                    .premium-admin-table tr { padding: 16px; border-bottom: 8px solid #f1f5f9; }
                    .premium-admin-table td { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8fafc; }
                    .premium-admin-table td::before { content: attr(data-label); font-weight: 800; font-size: 10px; color: var(--slate-muted); }
                    .action-buttons { width: 100%; margin-top: 10px; }
                    .btn-reset, .btn-delete { flex: 1; }
                }
            `}</style>
        </div>
    );
}

export default EmployeeTab;
