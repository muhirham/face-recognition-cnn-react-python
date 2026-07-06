import React, { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import { toast } from 'react-toastify';
import './ReportsTab.css';

function ReportsTab({ reportType }) {
    const activeReport = reportType;
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Filter states
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    React.useEffect(() => {
        setReportData(null);
    }, [reportType]);

    const fetchReport = async () => {
        setIsLoading(true);
        setReportData(null);
        try {
            let endpoint = '';
            let params = {};

            switch (activeReport) {
                case 'daily':
                    endpoint = '/admin/reports/daily';
                    params = { date: selectedDate };
                    break;
                case 'monthly':
                    endpoint = '/admin/reports/monthly';
                    params = { month: selectedMonth, year: selectedYear };
                    break;
                case 'late':
                    endpoint = '/admin/reports/late';
                    params = { month: selectedMonth, year: selectedYear };
                    break;
                case 'employees':
                    endpoint = '/admin/reports/employees';
                    break;
                case 'early':
                    endpoint = '/admin/reports/early';
                    params = { month: selectedMonth, year: selectedYear };
                    break;
                default:
                    break;
            }

            const response = await axios.get(`${API_BASE_URL}${endpoint}`, { params });
            setReportData(response.data);
            toast.success("Laporan berhasil di-generate!");
        } catch (error) {
            console.error("Error generating report", error);
            toast.error("Gagal menarik data laporan.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const renderDailyTable = (data) => (
        <table className="report-table">
            <thead>
                <tr>
                    <th>Waktu</th>
                    <th>Kode Karyawan</th>
                    <th>Nama</th>
                    <th>Departemen</th>
                    <th>Jenis</th>
                    <th>Status</th>
                    <th>Terlambat (m)</th>
                    <th>Alasan</th>
                </tr>
            </thead>
            <tbody>
                {data.map((row, i) => (
                    <tr key={i}>
                        <td>{row.waktu}</td>
                        <td>{row.kode_karyawan}</td>
                        <td>{row.nama}</td>
                        <td>{row.nama_dept || '-'}</td>
                        <td>{row.jenis}</td>
                        <td><span className={`status-pill ${row.status}`}>{row.status.replace('_', ' ')}</span></td>
                        <td>{row.menit_terlambat}</td>
                        <td>{row.alasan || '-'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderMonthlyTable = (data) => (
        <table className="report-table">
            <thead>
                <tr>
                    <th>Kode Karyawan</th>
                    <th>Nama</th>
                    <th>Departemen</th>
                    <th>Total Hadir</th>
                    <th>Alfa (Mangkir)</th>
                    <th>Frekuensi Telat</th>
                    <th>Akumulasi Telat (m)</th>
                </tr>
            </thead>
            <tbody>
                {data.map((row, i) => (
                    <tr key={i}>
                        <td>{row.kode_karyawan}</td>
                        <td>{row.nama}</td>
                        <td>{row.nama_dept || '-'}</td>
                        <td><strong>{row.hadir}</strong> hari</td>
                        <td style={{color: row.alfa > 0 ? '#ef4444' : 'inherit'}}><strong>{row.alfa}</strong> hari</td>
                        <td>{row.total_terlambat} kali</td>
                        <td>{row.akumulasi_menit_telat} menit</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderLateTable = (data) => (
        <table className="report-table">
            <thead>
                <tr>
                    <th>Peringkat</th>
                    <th>Kode Karyawan</th>
                    <th>Nama</th>
                    <th>Departemen</th>
                    <th>Frekuensi Telat</th>
                    <th>Total Menit Keterlambatan</th>
                </tr>
            </thead>
            <tbody>
                {data.map((row, i) => (
                    <tr key={i}>
                        <td>#{i+1}</td>
                        <td>{row.kode_karyawan}</td>
                        <td>{row.nama}</td>
                        <td>{row.nama_dept || '-'}</td>
                        <td>{row.frekuensi_telat} kali</td>
                        <td style={{color: '#ef4444', fontWeight: 'bold'}}>{row.total_menit} menit</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderEmployeesTable = (data) => (
        <table className="report-table">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Kode Karyawan</th>
                    <th>Nama</th>
                    <th>Departemen</th>
                    <th>Jabatan</th>
                    <th>Status Kerja</th>
                </tr>
            </thead>
            <tbody>
                {data.map((row, i) => (
                    <tr key={i}>
                        <td>{i+1}</td>
                        <td>{row.kode_karyawan}</td>
                        <td>{row.nama}</td>
                        <td>{row.nama_dept || '-'}</td>
                        <td>{row.nama_jabatan || '-'}</td>
                        <td><span className={`status-pill ${row.status_kerja === 'aktif' ? 'tepat_waktu' : 'terlambat'}`}>{row.status_kerja}</span></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderEarlyTable = (data) => (
        <table className="report-table">
            <thead>
                <tr>
                    <th>Tanggal</th>
                    <th>Waktu Pulang</th>
                    <th>Kode Karyawan</th>
                    <th>Nama</th>
                    <th>Alasan Pulang Awal</th>
                </tr>
            </thead>
            <tbody>
                {data.map((row, i) => (
                    <tr key={i}>
                        <td>{row.tanggal}</td>
                        <td style={{color: '#f59e0b', fontWeight: 'bold'}}>{row.waktu}</td>
                        <td>{row.kode_karyawan}</td>
                        <td>{row.nama}</td>
                        <td><em>"{row.alasan || 'Tidak ada alasan'}"</em></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const getReportHeader = () => {
        switch(activeReport) {
            case 'daily':
                return { title: 'Laporan Kehadiran Harian', desc: 'Menyajikan data riwayat presensi harian karyawan.' };
            case 'monthly':
                return { title: 'Rekapitulasi Absensi Bulanan', desc: 'Laporan akumulasi kehadiran, keterlambatan, dan tingkat absensi karyawan per bulan.' };
            case 'late':
                return { title: 'Evaluasi Keterlambatan Karyawan', desc: 'Analisis dan rekapitulasi durasi keterlambatan karyawan untuk evaluasi kedisiplinan.' };
            case 'early':
                return { title: 'Laporan Pulang Awal Karyawan', desc: 'Daftar karyawan yang melakukan proses pulang sebelum jam kerja operasional berakhir beserta alasan.' };
            case 'employees':
                return { title: 'Master Data Karyawan Aktif', desc: 'Informasi struktur dan daftar karyawan aktif dalam perusahaan.' };
            default:
                return { title: 'Laporan Sistem', desc: 'Pusat laporan data sistem.' };
        }
    };

    const headerText = getReportHeader();

    return (
        <div className="tab-view-container animate-fade-in report-container">
            <div className="section-header-p no-print">
                <h2>{headerText.title}</h2>
                <p>{headerText.desc}</p>
            </div>

            <div className="report-layout no-print" style={{ gridTemplateColumns: '1fr' }}>

                <div className="report-content-panel">
                    <div className="report-filters">
                        {activeReport === 'daily' && (
                            <div className="filter-group">
                                <label>Pilih Tanggal</label>
                                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                            </div>
                        )}
                        {['monthly', 'late', 'early'].includes(activeReport) && (
                            <>
                                <div className="filter-group">
                                    <label>Bulan</label>
                                    <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label>Tahun</label>
                                    <input type="number" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} />
                                </div>
                            </>
                        )}
                        <div className="filter-actions">
                            <button className="btn-primary-imp" onClick={fetchReport} disabled={isLoading}>
                                {isLoading ? 'Memproses...' : 'Tampilkan Laporan'}
                            </button>
                            {reportData && (
                                <button className="btn-secondary" onClick={handlePrint}>🖨️ Cetak PDF</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Area - Only this part should ideally be printed clearly */}
            {reportData && (
                <div className="print-area">
                    <div className="print-header">
                        <h2>PT INTERTEL MEDIA PRIMA</h2>
                        <h3>
                            {activeReport === 'daily' && `LAPORAN KEHADIRAN HARIAN (${reportData.date})`}
                            {activeReport === 'monthly' && `REKAPITULASI ABSENSI BULANAN (Bulan ${reportData.month}/${reportData.year})`}
                            {activeReport === 'late' && `EVALUASI KETERLAMBATAN KARYAWAN (Bulan ${reportData.month}/${reportData.year})`}
                            {activeReport === 'early' && `LAPORAN KARYAWAN PULANG AWAL (Bulan ${reportData.month}/${reportData.year})`}
                            {activeReport === 'employees' && `MASTER DATA KARYAWAN AKTIF`}
                        </h3>
                        {activeReport === 'monthly' && (
                            <p>Total Hari Efektif (Tanpa Libur/Weekend): <strong>{reportData.effective_days} Hari</strong></p>
                        )}
                    </div>
                    
                    {reportData.data && reportData.data.length > 0 ? (
                        <div className="table-responsive">
                            {activeReport === 'daily' && renderDailyTable(reportData.data)}
                            {activeReport === 'monthly' && renderMonthlyTable(reportData.data)}
                            {activeReport === 'late' && renderLateTable(reportData.data)}
                            {activeReport === 'early' && renderEarlyTable(reportData.data)}
                            {activeReport === 'employees' && renderEmployeesTable(reportData.data)}
                        </div>
                    ) : (
                        <div className="empty-state">Tidak ada data untuk periode ini.</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ReportsTab;
