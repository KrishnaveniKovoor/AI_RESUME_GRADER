import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => setMenuOpen((prev) => !prev);

  return (
    <nav
      className="navbar navbar-expand-lg"
      style={{ background: mode === 'light' ? '#0077b6' : '#023e8a' }}
    >
      <div className="container">
        <Link className="navbar-brand text-white fw-bold" to="/dashboard" onClick={closeMenu}>
          AI Resume Grader
        </Link>

        {/* React-controlled hamburger button — no Bootstrap JS needed */}
        <button
          className="navbar-toggler border-0"
          type="button"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
          onClick={toggleMenu}
          style={{ boxShadow: 'none', outline: 'none' }}
        >
          <span className="navbar-toggler-icon" />
        </button>

        {/* Use inline style for show/hide so it works without Bootstrap JS */}
        <div
          className="navbar-collapse"
          style={{
            display: menuOpen ? 'block' : '',
          }}
          id="navbarNav"
        >
          <ul className="navbar-nav ms-auto align-items-center">
            <li className="nav-item me-2">
              <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
                <IconButton onClick={toggleTheme} size="small" sx={{ color: '#ffffff' }}>
                  {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
                </IconButton>
              </Tooltip>
            </li>
            {user ? (
              <>
                <li className="nav-item">
                  <Link
                    className="nav-link text-white"
                    to="/dashboard"
                    onClick={closeMenu}
                    style={{ fontWeight: location.pathname === '/dashboard' ? '700' : '400' }}
                  >
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className="nav-link text-white"
                    to="/history"
                    onClick={closeMenu}
                    style={{ fontWeight: location.pathname === '/history' ? '700' : '400' }}
                  >
                    History
                  </Link>
                </li>
                <li className="nav-item">
                  <button
                    className="btn btn-outline-light btn-sm"
                    onClick={() => { logout(); closeMenu(); }}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link
                    className="nav-link text-white"
                    to="/login"
                    onClick={closeMenu}
                    style={{ fontWeight: location.pathname === '/login' ? '700' : '400' }}
                  >
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className="nav-link text-white"
                    to="/register"
                    onClick={closeMenu}
                    style={{ fontWeight: location.pathname === '/register' ? '700' : '400' }}
                  >
                    Register
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
