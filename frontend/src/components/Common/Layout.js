import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import './Layout.css';
import '../../theme/variables.css';

function Layout({ children, activeTab, setActiveTab, navItems, portalTitle, username, userRole, onLogout, brandIcon, brandTitle }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="layout-wrapper">
            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                navItems={navItems}
                brandIcon={brandIcon}
                brandTitle={brandTitle}
            />

            <div className="layout-main-content">
                <Header 
                    onMenuClick={() => setIsSidebarOpen(true)}
                    portalTitle={portalTitle}
                    username={username}
                    userRole={userRole}
                    onLogout={onLogout}
                />
                
                <section className="layout-view-area">
                    {children}
                </section>
            </div>
        </div>
    );
}

export default Layout;
