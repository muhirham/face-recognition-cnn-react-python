import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../apiConfig';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import Layout from '../Common/Layout';
import { 
    IconDashboard, 
    IconWebcam, 
    IconHistory, 
    IconUsers, 
    IconLogout, 
    IconReport, 
    IconSettings, 
    IconDatabase 
} from '../Common/Icons';

// Tabs
import OverviewTab from './Tabs/OverviewTab';
import EmployeeTab from './Tabs/EmployeeTab';
import MasterDataTab from './Tabs/MasterDataTab';
import RegistrationTab from './Tabs/RegistrationTab';
import ScheduleTab from './Tabs/ScheduleTab';
import UserTab from './Tabs/UserTab';
import AttendanceLogTab from './Tabs/AttendanceLogTab';
import SettingsTab from './Tabs/SettingsTab';

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
        { id: 'employees', label: 'Master Karyawan', icon: <IconUsers /> },
        { id: 'master_data', label: 'Master Dept & Jabatan', icon: <IconDatabase /> },
        { id: 'schedule', label: 'Master Shift Kerja', icon: <IconDatabase /> },
        { id: 'users', label: 'Master Administrator', icon: <IconUsers /> },
        { id: 'registration', label: 'Pendaftaran Wajah', icon: <IconWebcam /> },
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
            {activeTab === 'master_data' && <MasterDataTab />}
            {activeTab === 'schedule' && <ScheduleTab />}
            {activeTab === 'users' && <UserTab />}
            {activeTab === 'registration' && <RegistrationTab />}
            {activeTab === 'settings' && <SettingsTab />}

            <ToastContainer position="top-right" theme="colored" autoClose={3000} />
        </Layout>
    );
}

export default AdminDashboard;
