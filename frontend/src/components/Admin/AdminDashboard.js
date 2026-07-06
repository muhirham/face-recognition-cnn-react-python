import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../apiConfig';
import { useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Layout from '../Common/Layout';
import { 
    IconDashboard, 
    IconHistory, 
    IconUsers, 
    IconSettings, 
    IconWebcam, 
    IconDatabase,
    IconCalendar,
    IconFileText,
    IconAlertCircle,
    IconArrowRightCircle,
    IconClipboard
} from '../Common/Icons';

// Tabs
import OverviewTab from './Tabs/OverviewTab';
import EmployeeTab from './Tabs/EmployeeTab';
import MasterDepartemenTab from './Tabs/MasterDepartemenTab';
import MasterJabatanTab from './Tabs/MasterJabatanTab';
import RegistrationTab from './Tabs/RegistrationTab';
import ScheduleTab from './Tabs/ScheduleTab';
import HolidayTab from './Tabs/HolidayTab';
import AttendanceLogTab from './Tabs/AttendanceLogTab';
import SettingsTab from './Tabs/SettingsTab';
import ReportsTab from './Tabs/ReportsTab';

function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [username, setUsername] = useState('Admin');
    const [stats, setStats] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const userId = document.cookie.split('; ').find(row => row.startsWith('user_id='))?.split('=')[1];
        if (!userId) { navigate('/signin'); return; }
        
        // Fetch Admin Name
        const fetchAdmin = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/greeting`, { params: { user_id: userId } });
                if (res.data.nama) setUsername(res.data.nama);
            } catch (err) { console.error(err); }
        };

        const fetchStats = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/admin/stats`);
                setStats(res.data);
            } catch (err) { console.error(err); }
        };

        fetchAdmin();
        fetchStats();
        
        // Refresh stats every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [navigate]);

    const handleLogout = () => {
        document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        navigate('/signin');
    };

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <IconDashboard /> },
        { id: 'history', label: 'Log Absensi', icon: <IconHistory /> },
        { 
            id: 'master_group', 
            label: 'Data Master', 
            icon: <IconDatabase />,
            subItems: [
                { id: 'employees', label: 'Master Karyawan', icon: <IconUsers /> },
                { id: 'master_departemen', label: 'Master Departemen', icon: <IconDatabase /> },
                { id: 'master_jabatan', label: 'Master Jabatan', icon: <IconDatabase /> },
                { id: 'schedule', label: 'Master Shift Kerja', icon: <IconCalendar /> },
                { id: 'master_holidays', label: 'Master Hari Libur', icon: <IconAlertCircle /> },
            ]
        },
        { id: 'registration', label: 'Pendaftaran Wajah', icon: <IconWebcam /> },
        { 
            id: 'reports_group', 
            label: 'Laporan', 
            icon: <IconFileText />,
            subItems: [
                { id: 'report_daily', label: 'Laporan Harian', icon: <IconCalendar /> },
                { id: 'report_late', label: 'Laporan Keterlambatan', icon: <IconAlertCircle /> },
                { id: 'report_early', label: 'Laporan Pulang Awal', icon: <IconArrowRightCircle /> },
                { id: 'report_employees', label: 'Data Karyawan', icon: <IconClipboard /> },
                { id: 'report_monthly', label: 'Rekap Bulanan', icon: <IconFileText /> },
            ]
        },
        { id: 'settings', label: 'Pengaturan Sistem', icon: <IconSettings /> },
    ];

    return (
        <Layout
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            navItems={navItems}
            portalTitle="ADMINISTRATOR PANEL"
            username={username}
            userRole="Super Admin"
            onLogout={handleLogout}
            brandTitle="IMP"
            brandIcon="💎"
        >
            {activeTab === 'dashboard' && <OverviewTab stats={stats} />}
            {activeTab === 'history' && <AttendanceLogTab />}
            {activeTab === 'employees' && <EmployeeTab />}
            {activeTab === 'master_departemen' && <MasterDepartemenTab />}
            {activeTab === 'master_jabatan' && <MasterJabatanTab />}
            {activeTab === 'schedule' && <ScheduleTab />}
            {activeTab === 'master_holidays' && <HolidayTab />}
            {activeTab === 'registration' && <RegistrationTab />}
            {activeTab === 'report_daily' && <ReportsTab reportType="daily" />}
            {activeTab === 'report_monthly' && <ReportsTab reportType="monthly" />}
            {activeTab === 'report_late' && <ReportsTab reportType="late" />}
            {activeTab === 'report_early' && <ReportsTab reportType="early" />}
            {activeTab === 'report_employees' && <ReportsTab reportType="employees" />}
            {activeTab === 'settings' && <SettingsTab />}

            <ToastContainer position="top-right" theme="colored" autoClose={3000} />
        </Layout>
    );
}

export default AdminDashboard;
