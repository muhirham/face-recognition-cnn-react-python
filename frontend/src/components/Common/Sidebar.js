import React, { useState } from 'react';
import './Sidebar.css';
import { IconClose } from './Icons';

function Sidebar({ isOpen, onClose, activeTab, setActiveTab, navItems, brandTitle, brandIcon }) {
    const [expandedGroups, setExpandedGroups] = useState({ reports_group: true }); // keep reports open by default if needed, or false
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
                    {navItems.map((item) => {
                        if (item.subItems) {
                            const isExpanded = expandedGroups[item.id];
                            // Check if any sub-item is active
                            const isGroupActive = item.subItems.some(sub => sub.id === activeTab);
                            return (
                                <div key={item.id} className="nav-group-wrapper">
                                    <button 
                                        className={`nav-item-premium nav-group-header ${isGroupActive ? 'group-active' : ''}`}
                                        onClick={() => setExpandedGroups(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                    >
                                        <span className="nav-icon-box">{item.icon}</span>
                                        <span className="nav-label-text">{item.label}</span>
                                        <span className={`nav-chevron ${isExpanded ? 'expanded' : ''}`}>▼</span>
                                    </button>
                                    
                                    {isExpanded && (
                                        <div className="nav-group-children animate-fade-in-down">
                                            {item.subItems.map(subItem => (
                                                <button
                                                    key={subItem.id}
                                                    className={`nav-item-sub ${activeTab === subItem.id ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setActiveTab(subItem.id);
                                                        onClose();
                                                    }}
                                                >
                                                    <span className="nav-icon-box-small">{subItem.icon}</span>
                                                    <span className="nav-label-text-small">{subItem.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
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
                        );
                    })}
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
