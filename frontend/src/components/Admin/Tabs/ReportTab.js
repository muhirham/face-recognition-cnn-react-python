import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import { toast } from 'react-toastify';

function ReportTab() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        start_date: firstDayOfMonth,
        end_date: today
    });
    
    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState('Semua');
    
    // Data States
    const [summary, setSummary] = useState([]);
    const [stats, setStats] = useState({
        total_karyawan: 0,
        total_terlambat: 0,
        total_alfa: 0,
        avg_attendance_rate: 0
    });
    const [isLoading, setIsLoading] = useState(false);
    const [workdays, setWorkdays] = useState(0);

    const fetchSummary = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/reports/summary`, {
                params: filters
            });
            setSummary(response.data.summary);
            setStats(response.data.stats);
            setWorkdays(response.data.workdays);
        } catch (error) {
            toast.error("Gagal mengambil laporan");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    const departments = ['Semua', ...new Set(summary.map(s => s.departemen).filter(d => d && d !== '-'))];

    // Filter and Sort Logic
    const filteredData = summary
        .filter(row => {
            const matchesSearch = row.nama.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDept = deptFilter === 'Semua' || row.departemen === deptFilter;
            return matchesSearch && matchesDept;
        })
        .sort((a, b) => a.persentase - b.persentase); // Worst performers first

    const formatDuration = (minutes) => {
        if (!minutes || minutes <= 0) return '';
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}j ${m}m` : `${h}j`;
    };

    const handleExportCSV = () => {
        const headers = ["Nama", "Departemen", "Hadir", "Terlambat", "Alpa", "Total Menit Terlambat", "Persentase"];
        const rows = filteredData.map(s => [
            `"${s.nama}"`, 
            `"${s.departemen || '-'}"`, 
            s.tepat_waktu, 
            s.terlambat, 
            s.alfa, 
            formatDuration(s.total_menit_terlambat) || '0m',
            `"${s.persentase}%"`
        ]);

        // Add UTF-8 BOM and 'sep=,' for better Excel compatibility
        const BOM = "\uFEFF";
        const separatorLine = "sep=,\n";
        const csvContent = BOM + separatorLine + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Analisis_Absensi_${filters.start_date}_sd_${filters.end_date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="report-analytics-view animate-fade-in">
            <div className="report-header">
                <h1>Analisis Kehadiran Karyawan</h1>
                <p>Wawasan mendalam mengenai kedisiplinan dan produktivitas tim.</p>
            </div>

            {/* Summary Cards Row */}
            <div className="stats-cards-grid">
                <div className="stat-card">
                    <div className="stat-icon users">👥</div>
                    <div className="stat-info">
                        <span className="label">Total Karyawan</span>
                        <h2 className="value">{stats.total_karyawan}</h2>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon rate">📈</div>
                    <div className="stat-info">
                        <span className="label">Rata-rata Kehadiran</span>
                        <h2 className="value">{stats.avg_attendance_rate}%</h2>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning">⚠️</div>
                    <div className="stat-info">
                        <span className="label">Total Terlambat</span>
                        <h2 className="value">{stats.total_terlambat}</h2>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon danger">❌</div>
                    <div className="stat-info">
                        <span className="label">Total Alpa (Global)</span>
                        <h2 className="value">{stats.total_alfa}</h2>
                    </div>
                </div>
            </div>

            <div className="control-panel-card">
                <div className="filter-row-top">
                    <div className="search-box">
                        <input 
                            type="text" 
                            placeholder="Cari nama karyawan..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="dept-select">
                        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="date-inputs">
                        <input type="date" value={filters.start_date} onChange={(e) => setFilters({...filters, start_date: e.target.value})} title="Mulai" />
                        <span>sd</span>
                        <input type="date" value={filters.end_date} onChange={(e) => setFilters({...filters, end_date: e.target.value})} title="Selesai" />
                    </div>
                    <button className="btn-refresh" onClick={fetchSummary} disabled={isLoading}>
                        {isLoading ? '...' : '🔄'}
                    </button>
                    <button className="btn-download" onClick={handleExportCSV}>Ekspor CSV</button>
                </div>
            </div>

            <div className="rekap-section-card">
                <div className="rekap-header">
                    <h2>Rekapitulasi Performa</h2>
                    <span className="workday-info">Periode: <strong>{workdays} Hari Kerja</strong></span>
                </div>
                
                <div className="table-wrapper">
                    <table className="premium-analytics-table">
                        <thead>
                            <tr>
                                <th>Nama Karyawan</th>
                                <th>Departemen</th>
                                <th>Hadir</th>
                                <th>Terlambat</th>
                                <th>Durasi Telat</th>
                                <th>Alpa</th>
                                <th>Persentase</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length > 0 ? filteredData.map((row) => (
                                <tr key={row.karyawan_id}>
                                    <td className="name-cell"><strong>{row.nama}</strong></td>
                                    <td><span className="dept-pill">{row.departemen || '-'}</span></td>
                                    <td className="num-cell">{row.tepat_waktu}</td>
                                    <td className="num-cell warning-text">{row.terlambat}</td>
                                    <td className="num-cell">
                                        {row.total_menit_terlambat > 0 ? (
                                            <span className="late-badge">{formatDuration(row.total_menit_terlambat)}</span>
                                        ) : '-'}
                                    </td>
                                    <td className="num-cell danger-text">{row.alfa}</td>
                                    <td>
                                        <div className="progress-container">
                                            <div className="progress-bar-bg">
                                                <div 
                                                    className={`progress-fill ${row.persentase < 50 ? 'bad' : row.persentase < 80 ? 'mid' : 'good'}`} 
                                                    style={{width: `${row.persentase}%`}}
                                                ></div>
                                            </div>
                                            <span className="percent-text">{row.persentase}%</span>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="empty-state">Data tidak ditemukan.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .report-analytics-view { display: flex; flex-direction: column; gap: 24px; }
                .report-header h1 { font-size: 26px; font-weight: 800; color: var(--navy-primary); }
                .report-header p { color: var(--slate-muted); font-size: 14px; }

                /* Stats Cards */
                .stats-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
                .stat-card { 
                    background: white; padding: 20px; border-radius: 20px; display: flex; align-items: center; gap: 15px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f1f5f9;
                }
                .stat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
                .stat-icon.users { background: #eff6ff; }
                .stat-icon.rate { background: #f0fdf4; }
                .stat-icon.warning { background: #fffbeb; }
                .stat-icon.danger { background: #fef2f2; }
                .stat-info .label { font-size: 11px; font-weight: 700; color: var(--slate-muted); text-transform: uppercase; }
                .stat-info .value { font-size: 22px; font-weight: 800; color: var(--navy-primary); }

                /* Filter Control Panel */
                .control-panel-card { background: white; padding: 20px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
                .filter-row-top { display: flex; gap: 15px; align-items: center; flex-wrap: wrap; }
                
                .search-box { flex: 2; min-width: 200px; }
                .search-box input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0; font-weight: 600; }
                
                .dept-select select { padding: 12px; border-radius: 12px; border: 1.5px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: var(--navy-primary); }
                
                .date-inputs { display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 10px; border-radius: 12px; border: 1.5px solid #e2e8f0; }
                .date-inputs input { border: none; background: transparent; font-weight: 700; font-size: 12px; color: var(--navy-primary); cursor: pointer; }
                
                .btn-refresh { background: #f1f5f9; border: none; padding: 10px; border-radius: 12px; cursor: pointer; font-size: 18px; }
                .btn-download { background: var(--navy-primary); color: white; border: none; padding: 12px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; margin-left: auto; }

                /* Premium Table Layout */
                .rekap-section-card { background: white; padding: 24px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
                .rekap-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .workday-info { font-size: 13px; color: var(--slate-muted); }
                .workday-info strong { color: var(--navy-primary); }

                .premium-analytics-table { width: 100%; border-collapse: collapse; }
                .premium-analytics-table th { text-align: left; padding: 16px; font-size: 12px; color: var(--slate-muted); text-transform: uppercase; border-bottom: 2px solid #f1f5f9; }
                .premium-analytics-table td { padding: 16px; border-bottom: 1px solid #f8fafc; font-size: 14px; }
                
                .dept-pill { background: #f1f5f9; color: var(--navy-light); padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; }
                .num-cell { font-weight: 800; text-align: center; }
                .warning-text { color: #f59e0b; }
                .danger-text { color: #ef4444; }

                /* Progress Bar Styling */
                .progress-container { display: flex; align-items: center; gap: 12px; min-width: 140px; }
                .progress-bar-bg { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
                .progress-fill { height: 100%; border-radius: 4px; transition: width 1s ease-out; }
                .progress-fill.good { background: #10b981; }
                .progress-fill.mid { background: #f59e0b; }
                .progress-fill.bad { background: #ef4444; }
                .percent-text { font-size: 12px; font-weight: 800; color: var(--navy-primary); width: 35px; text-align: right; }

                .empty-state { text-align: center; padding: 40px !important; color: var(--slate-muted); font-style: italic; }

                @media (max-width: 1024px) {
                    .filter-row-top { flex-direction: column; align-items: stretch; }
                    .date-inputs { justify-content: center; }
                    .btn-download { margin-left: 0; }
                }
            `}</style>
        </div>
    );
}

export default ReportTab;
