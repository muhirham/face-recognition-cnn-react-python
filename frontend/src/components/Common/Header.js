import React from 'react';
import './Header.css';
import { IconLogout, IconMenu } from './Icons';

function Header({ onMenuClick, portalTitle, username, userRole, onLogout }) {
    return (
        <header className="premium-header-container">
            <div className="header-left-section">
                <button className="mobile-drawer-trigger" onClick={onMenuClick}>
                    <IconMenu size={24} />
                </button>
                <div className="branding-node">
                    <span className="node-logo">IMP</span>
                    <div className="node-divider"></div>
                    <h2 className="node-title">{portalTitle || 'DASHBOARD KARYAWAN'}</h2>
                </div>
            </div>

            <div className="header-right-section">
                <div className="user-greeting">
                    <span>Halo, <strong>{username}</strong> <span className="role-sub">({userRole})</span></span>
                </div>
                <button className="header-exit-btn" onClick={onLogout}>
                    <IconLogout size={16} />
                    <span>Logout</span>
                </button>
            </div>
        </header>
    );
}

export default Header;
