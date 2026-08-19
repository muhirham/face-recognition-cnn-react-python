import React, { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../apiConfig';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

    const getBase64ImageFromUrl = async (imageUrl) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            };
            img.onerror = error => reject(error);
            img.src = imageUrl;
        });
    };

    const handlePrint = async () => {
        if (!reportData || reportData.length === 0) {
            toast.error("Tidak ada data untuk dicetak.");
            return;
        }

        const orientation = 'landscape';
        const doc = new jsPDF({ orientation });
        
        try {
            const logoDataUrl = await getBase64ImageFromUrl('/imprima.png');
            // Menambahkan logo (x: 14, y: 15, width: 35, height: 12)
            doc.addImage(logoDataUrl, 'PNG', 14, 15, 35, 12);
        } catch (e) {
            console.error("Gagal load logo untuk PDF", e);
        }

        // Kop Surat (Header)
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("PT INTERTEL MEDIA PRIMA", 55, 19);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Jl. RS. Fatmawati Raya No.15, RT.10/RW.2, Gandaria Sel., Kec. Cilandak", 55, 24);
        doc.text("Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12420", 55, 29);

        // Garis Pembatas (Double line style)
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setLineWidth(0.5);
        doc.line(14, 33, pageWidth - 14, 33);
        doc.setLineWidth(1.0);
        doc.line(14, 34.5, pageWidth - 14, 34.5);
        
        // Judul Laporan
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const headerInfo = getReportHeader();
        const centerX = pageWidth / 2;
        doc.text(headerInfo.title.toUpperCase(), centerX, 45, null, null, "center");
        
        let subTitle = "";
        const monthNamesPDF = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        if (activeReport === 'daily') subTitle = `(Tanggal: ${selectedDate})`;
        else if (['monthly', 'late', 'early'].includes(activeReport)) {
            const mNamePDF = monthNamesPDF[parseInt(selectedMonth) - 1];
            subTitle = `(Periode: ${mNamePDF} ${selectedYear})`;
        }
        
        if (subTitle) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(subTitle, centerX, 51, null, null, "center");
        }

        // Define columns and rows based on report type
        let head = [[]];
        let body = [];
        let customOptions = {
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            styles: { fontSize: 9, cellPadding: 2 }
        };
        
        const dataArr = reportData.data || [];

        if (activeReport === 'daily') {
            const grouped = dataArr.reduce((acc, row) => {
                if (!acc[row.kode_karyawan]) {
                    acc[row.kode_karyawan] = { ...row, masuk: null, pulang: null, foto_gabung: row.foto_absen };
                }
                if (row.jenis === 'masuk' && !acc[row.kode_karyawan].masuk) acc[row.kode_karyawan].masuk = row;
                if (row.jenis === 'pulang' && !acc[row.kode_karyawan].pulang) {
                    acc[row.kode_karyawan].pulang = row;
                    if (row.foto_absen) acc[row.kode_karyawan].foto_gabung = row.foto_absen;
                }
                return acc;
            }, {});
            const combinedData = Object.values(grouped);

            for (let row of combinedData) {
                if (row.foto_gabung) {
                    try {
                        row.base64 = await getBase64ImageFromUrl(`${API_BASE_URL}/static/attendance_photos/${row.foto_gabung}`);
                    } catch(e) {}
                }
            }

            head = [['Foto', 'Kode', 'Nama', 'Departemen', 'Jdwl Masuk', 'Absen Masuk', 'Status Masuk (Catatan)', 'Jdwl Pulang', 'Absen Pulang', 'Status Pulang (Catatan)']];
            body = combinedData.map(r => {
                const jdwlMasuk = r.masuk ? (r.masuk.jam_masuk || '-') : '-';
                const absenMasuk = r.masuk ? r.masuk.waktu : '-';
                const stMasuk = r.masuk ? `${r.masuk.status.replace('_', ' ')} ${r.masuk.alasan ? `\n(${r.masuk.alasan})` : ''}` : '-';
                
                const jdwlPulang = r.pulang ? (r.pulang.jam_pulang || '-') : '-';
                const absenPulang = r.pulang ? r.pulang.waktu : '-';
                const stPulang = r.pulang ? `${r.pulang.status.replace('_', ' ')} ${r.pulang.alasan ? `\n(${r.pulang.alasan})` : ''}` : '-';
                
                return [
                    '', 
                    r.kode_karyawan, 
                    r.nama, 
                    r.nama_dept || '-', 
                    jdwlMasuk, absenMasuk, stMasuk,
                    jdwlPulang, absenPulang, stPulang
                ];
            });

            customOptions.bodyStyles = { minCellHeight: 14 };
            customOptions.didDrawCell = function(data) {
                if (data.column.index === 0 && data.cell.section === 'body') {
                    const rowData = combinedData[data.row.index];
                    if (rowData && rowData.base64) {
                        try {
                            doc.addImage(rowData.base64, 'PNG', data.cell.x + 2, data.cell.y + 2, 10, 10);
                        } catch(e) {}
                    }
                }
            };
            customOptions.columnStyles = { 
                0: {cellWidth: 15},
                4: {cellWidth: 20}, // Jdwl Masuk
                5: {cellWidth: 25}, // 
                6: {cellWidth: 40}, // Status Masuk
                7: {cellWidth: 20}, // Jdwl Pulang
                8: {cellWidth: 25}, // Aktual Pulang
                9: {cellWidth: 40}  // Status Pulang
            };
        } else if (activeReport === 'monthly') {
            const daysHead = Array.from({length: reportData.num_days || 0}, (_, i) => (i + 1).toString());
            head = [['No', 'Kode', 'Nama', 'Departemen', ...daysHead, 'H', 'T', 'A']];
            body = dataArr.map((r, index) => {
                const rowData = [index + 1, r.kode_karyawan, r.nama, r.nama_dept || '-'];
                for (let i = 1; i <= (reportData.num_days || 0); i++) {
                    const dateObj = new Date(reportData.year, reportData.month - 1, i);
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    const isHoliday = reportData.holidays && reportData.holidays.includes(i);
                    
                    if (isWeekend || isHoliday) {
                        rowData.push('-');
                    } else {
                        const status = r.daily_status && r.daily_status[i];
                        if (status === 'tepat_waktu' || status === 'pulang_awal') rowData.push('V');
                        else if (status === 'terlambat') rowData.push('T');
                        else rowData.push('X');
                    }
                }
                rowData.push(r.hadir, r.total_terlambat, r.alfa);
                return rowData;
            });
            customOptions.styles.fontSize = 6;
            customOptions.styles.cellPadding = 1;
            customOptions.styles.halign = 'center';
            customOptions.headStyles.halign = 'center';
            customOptions.columnStyles = { 
                0: {cellWidth: 8, halign: 'center'}, 
                1: {cellWidth: 15, halign: 'left'}, 
                2: {cellWidth: 25, halign: 'left'} 
            };
            customOptions.didParseCell = function(data) {
                if (data.section === 'body') {
                    if (data.cell.raw === 'T') {
                        data.cell.styles.textColor = [217, 119, 6]; // Amber-600
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.cell.raw === 'X') {
                        data.cell.styles.textColor = [239, 68, 68]; // Red-500
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            };
        } else if (activeReport === 'late') {
            head = [['No', 'ID Karyawan', 'Nama Lengkap', 'Departemen', 'Tanggal', 'Jadwal Masuk', 'Absen Masuk', 'Durasi Terlambat', 'Keterangan']];
            body = dataArr.map((r, i) => {
                const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                const formattedDate = new Date(r.tanggal).toLocaleDateString('id-ID', dateOptions);
                const formatDuration = (m) => {
                    if (!m || m <= 0) return '-';
                    if (m < 60) return `${m} menit`;
                    const hours = Math.floor(m / 60);
                    const mins = m % 60;
                    return mins === 0 ? `${hours} jam` : `${hours} jam ${mins} menit`;
                };
                return [
                    i+1, 
                    r.kode_karyawan, 
                    r.nama, 
                    r.nama_dept || '-', 
                    formattedDate,
                    r.jadwal_masuk || '-',
                    r.absen_masuk || '-',
                    formatDuration(r.durasi_terlambat),
                    r.alasan || '-'
                ];
            });
            customOptions.columnStyles = { 
                0: {cellWidth: 10},
                4: {cellWidth: 35}, // Tanggal
                7: {cellWidth: 20}  // Durasi
            };
        } else if (activeReport === 'early') {
            head = [['No', 'ID Karyawan', 'Nama Lengkap', 'Unit Kerja', 'Tanggal', 'Jadwal Shift', 'Jam Pulang', 'Durasi Pulang Awal', 'Keterangan']];
            body = dataArr.map((r, i) => {
                const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                const formattedDate = new Date(r.tanggal).toLocaleDateString('id-ID', dateOptions);
                const formatDuration = (m) => {
                    if (!m || m <= 0) return '-';
                    if (m < 60) return `${m} menit`;
                    const hours = Math.floor(m / 60);
                    const mins = m % 60;
                    return mins === 0 ? `${hours} jam` : `${hours} jam ${mins} menit`;
                };
                return [
                    i+1, 
                    r.kode_karyawan, 
                    r.nama, 
                    r.nama_dept || '-', 
                    formattedDate,
                    r.jadwal_pulang || '-',
                    r.absen_pulang || '-',
                    formatDuration(r.durasi_pulang_awal),
                    r.alasan || '-'
                ];
            });
            customOptions.columnStyles = { 
                0: {cellWidth: 10},
                4: {cellWidth: 35}, // Tanggal
                7: {cellWidth: 25}  // Durasi Pulang Awal
            };
        } else if (activeReport === 'employees') {
            head = [['No', 'Kode', 'Nama', 'Departemen', 'Jabatan', 'Status']];
            body = dataArr.map((r, i) => [
                i+1, r.kode_karyawan, r.nama, r.nama_dept || '-', 
                r.nama_jabatan || '-', r.status_kerja
            ]);
        }

        autoTable(doc, {
            startY: subTitle ? 56 : 50,
            head: head,
            body: body,
            ...customOptions
        });

        // Add Footer for signature
        const finalY = doc.lastAutoTable.finalY || 200;
        const pageHeight = doc.internal.pageSize.getHeight();
        
        let footerY = finalY + 15;
        // if footer exceeds page, add a new page
        if (footerY + 40 > pageHeight) {
            doc.addPage();
            footerY = 20;
        }
        
        // Format footer date
        const footerDate = new Date(activeReport === 'daily' ? selectedDate : Date.now());
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = footerDate.toLocaleDateString('id-ID', options);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        const rightAlignX = doc.internal.pageSize.getWidth() - 14; // right margin
        
        const getCookie = (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        };

        const signerName = getCookie('nama_karyawan') ? decodeURIComponent(getCookie('nama_karyawan')) : 'Admin / HRD';
        const signerRole = getCookie('jabatan_karyawan') ? decodeURIComponent(getCookie('jabatan_karyawan')) : 'Administrator';
        
        doc.text(`Jakarta, ${dateString}`, rightAlignX, footerY, null, null, "right");
        doc.text("Mengetahui,", rightAlignX, footerY + 5, null, null, "right");
        doc.text(signerRole, rightAlignX, footerY + 10, null, null, "right");
        
        doc.setFont("helvetica", "bold");
        doc.text(signerName, rightAlignX, footerY + 30, null, null, "right");

        doc.save(`Laporan_${activeReport}_${Date.now()}.pdf`);
    };

    const renderDailyTable = (data) => {
        const grouped = data.reduce((acc, row) => {
            if (!acc[row.kode_karyawan]) {
                acc[row.kode_karyawan] = { ...row, masuk: null, pulang: null, foto_gabung: row.foto_absen };
            }
            if (row.jenis === 'masuk' && !acc[row.kode_karyawan].masuk) acc[row.kode_karyawan].masuk = row;
            if (row.jenis === 'pulang' && !acc[row.kode_karyawan].pulang) {
                acc[row.kode_karyawan].pulang = row;
                if (row.foto_absen) acc[row.kode_karyawan].foto_gabung = row.foto_absen;
            }
            return acc;
        }, {});
        const combinedData = Object.values(grouped);

        return (
        <table className="report-table">
            <thead>
                <tr>
                    <th>Foto</th>
                    <th>Kode</th>
                    <th>Nama Karyawan</th>
                    <th>Departemen</th>
                    <th>Jadwal Masuk</th>
                    <th>Absen Masuk</th>
                    <th>Status & Catatan Absen Masuk</th>
                    <th>Jadwal Pulang</th>
                    <th>Absen Pulang</th>
                    <th>Status & Catatan Absen Pulang</th>
                </tr>
            </thead>
            <tbody>
                {combinedData.map((row, i) => (
                    <tr key={i}>
                        <td>
                            {row.foto_gabung ? (
                                <img src={`${API_BASE_URL}/static/attendance_photos/${row.foto_gabung}`} alt="absen" className="absen-thumbnail" />
                            ) : (
                                <div className="absen-thumbnail" style={{backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px'}}>-</div>
                            )}
                        </td>
                        <td>{row.kode_karyawan}</td>
                        <td style={{fontWeight: '700'}}>{row.nama}</td>
                        <td>{row.nama_dept || '-'}</td>
                        
                        <td style={{color: 'var(--slate-muted)'}}>{row.masuk && row.masuk.jam_masuk ? row.masuk.jam_masuk : '-'}</td>
                        <td>{row.masuk ? <strong>{row.masuk.waktu}</strong> : <span style={{color: '#94a3b8'}}>-</span>}</td>
                        <td>
                            {row.masuk ? (
                                <div>
                                    <span className={`status-pill ${row.masuk.status}`} style={{fontSize: '10px'}}>{row.masuk.status.replace('_', ' ')}</span>
                                    {row.masuk.alasan && <div style={{fontStyle: 'italic', fontSize: '11px', marginTop: '4px', color: '#64748b'}}>{row.masuk.alasan}</div>}
                                </div>
                            ) : '-'}
                        </td>

                        <td style={{color: 'var(--slate-muted)'}}>{row.pulang && row.pulang.jam_pulang ? row.pulang.jam_pulang : '-'}</td>
                        <td>{row.pulang ? <strong>{row.pulang.waktu}</strong> : <span style={{color: '#94a3b8'}}>-</span>}</td>
                        <td>
                            {row.pulang ? (
                                <div>
                                    <span className={`status-pill ${row.pulang.status}`} style={{fontSize: '10px'}}>{row.pulang.status.replace('_', ' ')}</span>
                                    {row.pulang.alasan && <div style={{fontStyle: 'italic', fontSize: '11px', marginTop: '4px', color: '#64748b'}}>{row.pulang.alasan}</div>}
                                </div>
                            ) : '-'}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        );
    };

    const renderMonthlyTable = (data) => {
        const days = Array.from({length: reportData.num_days}, (_, i) => i + 1);
        
        return (
            <table className="report-table matrix-table">
                <thead>
                    <tr>
                        <th className="sticky-col" style={{minWidth: '25px', zIndex: 3}}>No</th>
                        <th className="sticky-col" style={{left: '25px', minWidth: '120px', zIndex: 3}}>Karyawan</th>
                        <th className="sticky-col" style={{left: '145px', minWidth: '80px', zIndex: 3}}>Departemen</th>
                        {days.map(d => <th key={d}>{d}</th>)}
                        <th>Hadir</th>
                        <th>Telat</th>
                        <th>Alfa</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i}>
                            <td className="sticky-col" style={{minWidth: '25px'}}>{i + 1}</td>
                            <td className="sticky-col" style={{left: '25px', minWidth: '120px'}}>
                                <strong>{row.nama}</strong><br/>
                                <span style={{fontSize: '9px', color: '#64748b'}}>{row.kode_karyawan}</span>
                            </td>
                            <td className="sticky-col" style={{left: '145px', minWidth: '80px'}}>{row.nama_dept || '-'}</td>
                            {days.map(d => {
                                const dateObj = new Date(reportData.year, reportData.month - 1, d);
                                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                                const isHoliday = reportData.holidays && reportData.holidays.includes(d);
                                const cellClass = (isWeekend || isHoliday) ? 'bg-gray-100' : '';
                                
                                let icon = '';
                                if (isWeekend || isHoliday) {
                                    icon = <span style={{color: '#94a3b8'}}>-</span>;
                                } else {
                                    const status = row.daily_status && row.daily_status[d];
                                    if (status === 'tepat_waktu' || status === 'pulang_awal') {
                                        icon = <span style={{color: '#10b981', fontWeight: 'bold'}}>V</span>;
                                    } else if (status === 'terlambat') {
                                        icon = <span style={{color: '#d97706', fontWeight: 'bold'}}>T</span>;
                                    } else {
                                        icon = <span style={{color: '#ef4444', fontWeight: 'bold'}}>X</span>;
                                    }
                                }
                                
                                return <td key={d} className={cellClass}><span className="status-icon">{icon}</span></td>;
                            })}
                            <td><strong>{row.hadir}</strong></td>
                            <td style={{color: '#f59e0b'}}><strong>{row.total_terlambat}</strong></td>
                            <td style={{color: row.alfa > 0 ? '#ef4444' : 'inherit'}}><strong>{row.alfa}</strong></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    const renderLateTable = (data) => (
        <table className="report-table">
            <thead>
                <tr>
                    <th>No</th>
                    <th>ID Karyawan</th>
                    <th>Nama Lengkap</th>
                    <th>Departemen</th>
                    <th>Tanggal</th>
                    <th>Jadwal Masuk</th>
                    <th>Absen Masuk</th>
                    <th>Durasi Terlambat</th>
                    <th>Keterangan</th>
                </tr>
            </thead>
            <tbody>
                {data.map((row, i) => {
                    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                    const formattedDate = new Date(row.tanggal).toLocaleDateString('id-ID', dateOptions);
                    
                    const formatDuration = (m) => {
                        if (!m || m <= 0) return '-';
                        if (m < 60) return `${m} menit`;
                        const hours = Math.floor(m / 60);
                        const mins = m % 60;
                        return mins === 0 ? `${hours} jam` : `${hours} jam ${mins} menit`;
                    };

                    return (
                        <tr key={i}>
                            <td>{i+1}</td>
                            <td>{row.kode_karyawan}</td>
                            <td style={{fontWeight: '700'}}>{row.nama}</td>
                            <td>{row.nama_dept || '-'}</td>
                            <td>{formattedDate}</td>
                            <td style={{color: 'var(--slate-muted)'}}>{row.jadwal_masuk || '-'}</td>
                            <td><strong>{row.absen_masuk || '-'}</strong></td>
                            <td style={{color: '#ef4444', fontWeight: 'bold'}}>{formatDuration(row.durasi_terlambat)}</td>
                            <td>{row.alasan || '-'}</td>
                        </tr>
                    );
                })}
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
                    <th>No</th>
                    <th>ID Karyawan</th>
                    <th>Nama Lengkap</th>
                    <th>Unit Kerja</th>
                    <th>Tanggal</th>
                    <th>Jadwal Shift</th>
                    <th>Jam Pulang</th>
                    <th>Durasi Pulang Awal</th>
                    <th>Keterangan</th>
                </tr>
            </thead>
            <tbody>
                {data.map((row, i) => {
                    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                    const formattedDate = new Date(row.tanggal).toLocaleDateString('id-ID', dateOptions);
                    
                    const formatDuration = (m) => {
                        if (!m || m <= 0) return '-';
                        if (m < 60) return `${m} menit`;
                        const hours = Math.floor(m / 60);
                        const mins = m % 60;
                        return mins === 0 ? `${hours} jam` : `${hours} jam ${mins} menit`;
                    };

                    return (
                        <tr key={i}>
                            <td>{i+1}</td>
                            <td>{row.kode_karyawan}</td>
                            <td style={{fontWeight: '700'}}>{row.nama}</td>
                            <td>{row.nama_dept || '-'}</td>
                            <td>{formattedDate}</td>
                            <td style={{color: 'var(--slate-muted)'}}>{row.jadwal_pulang || '-'}</td>
                            <td style={{color: '#f59e0b'}}><strong>{row.absen_pulang || '-'}</strong></td>
                            <td style={{color: '#ef4444', fontWeight: 'bold'}}>{formatDuration(row.durasi_pulang_awal)}</td>
                            <td>{row.alasan || '-'}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    const getReportHeader = () => {
        switch(activeReport) {
            case 'daily':
                return { title: 'Laporan Kehadiran', desc: 'Menyajikan data riwayat presensi karyawan.' };
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
                        <div className="kop-surat">
                            <div className="kop-logo">
                                {/* Using the imprima logo, it should be in public/imprima.png */}
                                <img src="/imprima.png" alt="Logo IMP" />
                            </div>
                            <div className="kop-text">
                                <h1>PT INTERTEL MEDIA PRIMA</h1>
                                <p>Jl. RS. Fatmawati Raya No.15, RT.10/RW.2, Gandaria Sel., Kec. Cilandak</p>
                                <p>Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12420</p>
                            </div>
                        </div>
                        <hr className="kop-divider" />
                        
                        <h3 className="report-title-print">
                            {(() => {
                                const mNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                                const mName = reportData.month ? mNames[parseInt(reportData.month) - 1] : "";
                                if (activeReport === 'daily') return `LAPORAN KEHADIRAN (${reportData.date})`;
                                if (activeReport === 'monthly') return `REKAPITULASI ABSENSI BULANAN (Periode: ${mName} ${reportData.year})`;
                                if (activeReport === 'late') return `EVALUASI KETERLAMBATAN KARYAWAN (Periode: ${mName} ${reportData.year})`;
                                if (activeReport === 'early') return `LAPORAN KARYAWAN PULANG AWAL (Periode: ${mName} ${reportData.year})`;
                                if (activeReport === 'employees') return `MASTER DATA KARYAWAN AKTIF`;
                                return "";
                            })()}
                        </h3>
                        {activeReport === 'monthly' && (
                            <p style={{ textAlign: 'center', marginBottom: '20px' }}>Total Hari Efektif (Tanpa Libur/Weekend): <strong>{reportData.effective_days} Hari</strong></p>
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
