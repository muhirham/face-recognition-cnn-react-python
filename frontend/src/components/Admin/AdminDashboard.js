import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import API_BASE_URL from '../../apiConfig';
import 'react-toastify/dist/ReactToastify.css';

// Modular Components
import Layout from '../Common/Layout';
import { 
    IconDashboard, IconUsers, IconHistory, 
    IconReport, IconSettings, IconDatabase, IconWebcam 
} from '../Common/Icons';
import OverviewTab from './Tabs/OverviewTab';
import EmployeeTab from './Tabs/EmployeeTab';
import ReportTab from './Tabs/ReportTab';
import RegistrationTab from './Tabs/RegistrationTab';
import ScheduleTab from './Tabs/ScheduleTab';
import AttendanceLogTab from './Tabs/AttendanceLogTab';
import SettingsTab from './Tabs/SettingsTab';
import EnrollmentModal from './EnrollmentModal';
import EditEmployeeModal from './EditEmployeeModal';

// Theme
import '../../theme/variables.css';

function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({ total_employees: 0, present_today: 0, attendance_rate: 0 });
    const [employees, setEmployees] = useState([]);
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const navigate = useNavigate();

    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    };

    const checkAdmin = () => {
        const role = getCookie('role');
        if (role !== 'admin') { navigate('/signin'); }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const statsRes = await axios.get(`${API_BASE_URL}/admin/stats`);
            setStats(statsRes.data);

            const empRes = await axios.get(`${API_BASE_URL}/admin/employees`);
            setEmployees(empRes.data.employees);

            const histRes = await axios.get(`${API_BASE_URL}/admin/all_history`);
            setHistory(histRes.data.history);
        } catch (error) {
            toast.error("Gagal mengambil data dari server");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAdmin();
        fetchData();
    }, []);

    const handleDeleteEmployee = async (userId) => {
        if (window.confirm("Hapus karyawan ini?")) {
            try {
                await axios.delete(`${API_BASE_URL}/admin/employees/${userId}`);
                toast.success("Karyawan dihapus");
                fetchData();
            } catch (error) { toast.error("Gagal menghapus"); }
        }
    };

    const handleResetFace = async (karyawanId) => {
        if (window.confirm("Reset data wajah? Karyawan harus mendaftar ulang wajah.")) {
            try {
                await axios.post(`${API_BASE_URL}/admin/reset_face`, { karyawan_id: karyawanId });
                toast.success("Data wajah berhasil di-reset");
            } catch (error) { toast.error("Gagal reset wajah"); }
        }
    };

    const exportToCSV = () => {
        const headers = ["Nama", "Tanggal", "Waktu", "Jenis", "Status"];
        const rows = history.map(h => [h.nama, h.tanggal, h.waktu, h.jenis, h.status]);
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Laporan_Absensi_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    const handleLogout = () => {
        document.cookie = "user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        navigate('/signin');
    };

    const navItems = [
        { id: 'overview', label: 'Dashboard', icon: <IconDashboard /> },
        { id: 'reports', label: 'Laporan Absensi', icon: <IconReport /> },
        { id: 'employees', label: 'Data Karyawan', icon: <IconUsers /> },
        { id: 'registration', label: 'Pendaftaran Wajah', icon: <IconWebcam /> },
        { id: 'schedule', label: 'Jadwal Kerja', icon: <IconHistory /> },
        { id: 'attendance_data', label: 'Data Absensi', icon: <IconDatabase /> },
        { id: 'settings', label: 'Pengaturan', icon: <IconSettings /> }
    ];

    return (
        <Layout
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            navItems={navItems}
            portalTitle="Sistem Absensi Otomatis Berbasis Pengenalan Wajah"
            username="Administrator"
            userRole="Admin"
            onLogout={handleLogout}
            brandTitle="PT INTERTEL"
            brandIcon="IMP"
        >
            {isLoading ? (
                <div className="loading-container">Memuat data...</div>
            ) : (
                <>
                    {activeTab === 'overview' && <OverviewTab stats={stats} />}
                    {activeTab === 'employees' && (
                        <EmployeeTab 
                            employees={employees} 
                            onAdd={() => setShowEnrollModal(true)} 
                            onDelete={handleDeleteEmployee}
                            onResetFace={handleResetFace}
                            onEdit={(emp) => {
                                setSelectedEmployee(emp);
                                setShowEditModal(true);
                            }}
                        />
                    )}
                    {activeTab === 'reports' && <ReportTab />}
                    {activeTab === 'attendance_data' && <AttendanceLogTab history={history} />}
                    {activeTab === 'settings' && <SettingsTab />}
                    {activeTab === 'registration' && (
                        <RegistrationTab 
                            employees={employees} 
                            onRefresh={fetchData} 
                        />
                    )}
                    {activeTab === 'schedule' && (
                        <ScheduleTab employees={employees} />
                    )}
                </>
            )}
            
            <EnrollmentModal 
                isOpen={showEnrollModal} 
                onClose={() => setShowEnrollModal(false)}
                onSuccess={() => {
                    toast.success("Karyawan baru berhasil didaftarkan!");
                    fetchData();
                }}
            />

            <EditEmployeeModal 
                isOpen={showEditModal}
                employee={selectedEmployee}
                onClose={() => setShowEditModal(false)}
                onSuccess={() => fetchData()}
            />
            
            <ToastContainer position="top-right" theme="colored" autoClose={3000} />

            <style>{`
                .loading-container { display: flex; align-items: center; justify-content: center; height: 100%; font-weight: 700; color: var(--navy-primary); }
            `}</style>
        </Layout>
    );
}

export default AdminDashboard;
