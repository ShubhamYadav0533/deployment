import React from "react";
import { FiCloud, FiZap } from "react-icons/fi";

function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-icon">
            <FiCloud size={24} />
          </div>
          <div className="logo-text">
            <h1>CloudDeploy</h1>
            <span className="logo-subtitle">Deployment Control Panel</span>
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="header-badge">
          <FiZap size={14} />
          <span>Live</span>
          <span className="live-dot"></span>
        </div>
      </div>
    </header>
  );
}

export default Header;
