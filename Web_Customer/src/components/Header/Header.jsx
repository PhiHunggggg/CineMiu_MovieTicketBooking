import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { loyaltyApi } from '../../services/api';
import { getUserEmail, getUserId } from '../../utils/authUser';
import './Header.css';

export default function Header() {
  const location = useLocation();
  const { user, isLoggedIn, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [membership, setMembership] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

    useEffect(() => {
        const userId = getUserId(user);
        const email = getUserEmail(user);

        if (!isLoggedIn || (!userId && !email)) {
            return;
        }

        let cancelled = false;

        const request = userId
            ? loyaltyApi.getByUser(userId)
            : loyaltyApi.getByEmail(email);

        request
            .then((data) => {
                if (!cancelled) {
                    setMembership(data);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setMembership(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isLoggedIn, user]);

  const navLinks = [
    { path: '/', label: 'Trang chủ' },
    { path: '/bookings', label: 'Đặt vé' },
    { path: '/movies', label: 'Phim' },
    { path: '/cinemas', label: 'Rạp phim' },
    { path: '/promotions', label: 'Khuyến mãi' },
    { path: '/my-tickets', label: 'Vé của tôi' },
  ];

  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  };

  return (
    <header className="header" id="main-header">
      <div className="header__container container">
            <Link to="/" className="header__logo" id="logo-link">
                <span className="header__logo-icon" aria-hidden="true">🐱</span>
                <span className="header__logo-text">
                    CINE<span className="header__logo-accent">MIU</span>
                </span>
            </Link>

        <nav className={`header__nav ${menuOpen ? 'header__nav--open' : ''}`} id="main-nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`header__nav-link ${location.pathname === link.path ? 'header__nav-link--active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="header__actions">
          {isLoggedIn ? (
            <div className="header__user" ref={dropdownRef}>
              <button
                className="header__user-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                id="user-menu-btn"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="header__user-avatar" />
                ) : (
                  <span className="header__user-initials">{getInitials(user?.fullName)}</span>
                )}
                <span className="header__user-name">{user?.fullName?.split(' ').pop()}</span>
                <svg className={`header__user-chevron ${dropdownOpen ? 'header__user-chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="header__dropdown" id="user-dropdown">
                  <div className="header__dropdown-header">
                    <div className="header__dropdown-avatar">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" />
                      ) : (
                        <span>{getInitials(user?.fullName)}</span>
                      )}
                    </div>
                    <div>
                      <p className="header__dropdown-name">{user?.fullName}</p>
                      <p className="header__dropdown-email">{user?.email}</p>
                    </div>
                  </div>
                  <div className="header__dropdown-divider" />
                  <div className="header__dropdown-stats">
                    <div className="header__dropdown-stat">
                      <span className="header__dropdown-stat-icon">🌟</span>
                      <span>{(membership?.totalPoints ?? 0).toLocaleString('vi-VN')} điểm</span>
                    </div>
                    <div className="header__dropdown-stat">
                      <span className="header__dropdown-stat-icon">🏆</span>
                      <span>Hạng {membership?.tierName || 'Standard'}</span>
                    </div>
                  </div>
                  <div className="header__dropdown-divider" />
                  <Link to="/profile" className="header__dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <span>🐱</span>Tài khoản của tôi
                  </Link>
                  <Link to="/my-tickets" className="header__dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <span>🎫</span>Vé của tôi
                  </Link>
                  <div className="header__dropdown-divider" />
                                  <button className="header__dropdown-item header__dropdown-item--danger" onClick={() => { setMembership(null); logout(); setDropdownOpen(false); }} id="logout-btn">
                    <span>🚪</span>Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="header__auth-btns">
              <Link to="/login" className="header__auth-login" id="login-btn">
                Đăng nhập
              </Link>
              <Link to="/register" className="header__auth-register" id="register-btn">
                Đăng ký
              </Link>
            </div>
          )}

          <button
            className="header__menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            id="menu-toggle"
          >
            <span className={`header__hamburger ${menuOpen ? 'header__hamburger--open' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
