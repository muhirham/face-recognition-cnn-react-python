import React from 'react';
import './Sidebar.css';
import { IconClose } from './Icons';

function Sidebar({ isOpen, onClose, activeTab, setActiveTab, navItems, brandTitle, brandIcon }) {
    return (
        <>
            {/* Overlay for Mobile */}
            <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}></div>

            <aside className={`sidebar-container ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-brand-wrapper">
                        <div className="brand-logo-circle">
                            <span className="ut-logo-text">IMP</span>
                        </div>
                        <div className="brand-text-stack">
                            <h3>PT INTERTEL</h3>
                            <p>MEDIA PRIMA</p>
                        </div>
                    </div>
                    <button className="sidebar-close-btn" onClick={onClose}>
                        <IconClose size={20} />
                    </button>
                </div>

                <nav className="sidebar-nav-premium">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            className={`nav-item-premium ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab(item.id);
                                onClose();
                            }}
                        >
                            <span className="nav-icon-box">{item.icon}</span>
                            <span className="nav-label-text">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer-minimal">
                    <div className="status-dot-pulse"></div>
                    <span>System Online</span>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
