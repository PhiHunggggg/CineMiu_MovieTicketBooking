import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const pageTitles = {
    '/admin/dashboard': 'Tổng quan',
    '/admin/showtimes': 'Quản lý lịch chiếu',
    '/admin/halls': 'Trạng thái phòng',
    '/admin/ticket-prices': 'Quản lý giá vé',
    '/admin/movies': 'Quản lý phim',
    '/admin/cinemas': 'Chi nhánh rạp',
    '/admin/users': 'Người dùng',
    '/admin/bookings': 'Quản lý đặt vé',
    '/admin/concessions': 'Bắp nước',
    '/admin/vouchers': 'Khuyến mãi',
    '/admin/reviews': 'Đánh giá',
    '/admin/notifications': 'Thông báo',
    '/admin/revenue': 'Thống kê',
    '/admin/system': 'Hệ thống',
};

function MenuLink({ to, icon, children, end = false, trailingIcon = '' }) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
            <i className={`nav-icon fas ${icon}`} />
            <span>{children}</span>
            {trailingIcon ? <i className={`nav-trailing fas ${trailingIcon}`} /> : null}
        </NavLink>
    );
}

export default function MainLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const {
        user,
        logout,
        isAdmin,
        isCinemaManager,
        canCheckInTickets,
    } = useAuth();

    const displayName = user?.fullName || user?.email || 'Quản trị viên';
    const initials = displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
    const roleLabel = isAdmin()
        ? 'Quản trị hệ thống'
        : isCinemaManager()
            ? 'Quản lý rạp'
            : 'Nhân viên';
    const currentTitle = pageTitles[location.pathname] || 'Quản trị';

    const closeMobileSidebar = () => setMobileSidebarOpen(false);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div
            className={[
                'admin-layout',
                sidebarCollapsed ? 'sidebar-collapsed' : '',
                mobileSidebarOpen ? 'mobile-sidebar-open' : '',
            ].filter(Boolean).join(' ')}
        >
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <Link to="/admin/dashboard" className="brand-link" onClick={closeMobileSidebar}>
                        <span className="brand-icon"><i className="fas fa-ticket" /></span>
                        <span className="brand-copy">
                            <strong>Đặt Vé Rạp Phim</strong>
                            <small>Admin console</small>
                        </span>
                    </Link>
                </div>

                <div className="sidebar-user">
                    <span className="user-avatar">{initials || 'AD'}</span>
                    <span className="user-info">
                        <strong>{displayName}</strong>
                        <small>{roleLabel}</small>
                    </span>
                </div>

                <nav className="sidebar-nav" onClick={closeMobileSidebar}>
                    <MenuLink to="/admin/dashboard" icon="fa-gauge-high" end>Tổng quan</MenuLink>

                    {(isCinemaManager() || isAdmin()) && (
                        <>
                            <p className="nav-divider">Quản lý rạp</p>
                            <MenuLink to="/admin/showtimes" icon="fa-calendar-days">Lịch chiếu</MenuLink>
                            <MenuLink to="/admin/halls" icon="fa-door-open">Trạng thái phòng</MenuLink>
                            <MenuLink to="/admin/ticket-prices" icon="fa-tags">Giá vé</MenuLink>
                        </>
                    )}

                    {canCheckInTickets() && !isAdmin() && (
                        <>
                            <p className="nav-divider">Vận hành</p>
                            <MenuLink to="/admin/bookings" icon="fa-qrcode">Check-in vé</MenuLink>
                        </>
                    )}

                    {isAdmin() && (
                        <>
                            <p className="nav-divider">Quản trị</p>
                            <MenuLink to="/admin/movies" icon="fa-film">Phim</MenuLink>
                            <MenuLink to="/admin/cinemas" icon="fa-building">Chi nhánh rạp</MenuLink>
                            <MenuLink to="/admin/users" icon="fa-users">Người dùng</MenuLink>
                            <MenuLink to="/admin/bookings" icon="fa-ticket">Đặt vé</MenuLink>
                            <MenuLink to="/admin/concessions" icon="fa-utensils">Bắp nước</MenuLink>
                            <MenuLink to="/admin/vouchers" icon="fa-percent">Khuyến mãi</MenuLink>
                            <MenuLink to="/admin/reviews" icon="fa-star">Đánh giá</MenuLink>
                            <MenuLink to="/admin/notifications" icon="fa-bell">Thông báo</MenuLink>
                            <MenuLink to="/admin/revenue" icon="fa-chart-pie">Thống kê</MenuLink>
                            <MenuLink to="/admin/system" icon="fa-gears">Hệ thống</MenuLink>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <button type="button" className="logout-btn" onClick={handleLogout}>
                        <i className="fas fa-arrow-right-from-bracket" />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </aside>

            <button
                type="button"
                className="sidebar-overlay"
                onClick={closeMobileSidebar}
                aria-label="Đóng menu"
            />

            <div className="admin-main">
                <header className="admin-header">
                    <div className="header-left">
                        <button
                            type="button"
                            className="menu-toggle"
                            onClick={() => setSidebarCollapsed((current) => !current)}
                            aria-label="Thu gọn menu"
                        >
                            <i className="fas fa-bars" />
                        </button>
                        <button
                            type="button"
                            className="mobile-menu-toggle"
                            onClick={() => setMobileSidebarOpen(true)}
                            aria-label="Mở menu"
                        >
                            <i className="fas fa-bars" />
                        </button>
                        <div className="breadcrumb">
                            <span>Trang chủ</span>
                            <i className="fas fa-chevron-right" />
                            <strong>{currentTitle}</strong>
                        </div>
                    </div>

                    <div className="header-right">
                        <Link className="header-icon" to="/admin/notifications" aria-label="Thông báo">
                            <i className="fas fa-bell" />
                        </Link>
                        <div className="user-dropdown">
                            <span className="user-avatar small">{initials || 'AD'}</span>
                            <span className="header-user-name">{displayName}</span>
                            <i className="fas fa-chevron-down" />
                            <div className="dropdown-menu">
                                <div className="dropdown-header">
                                    <strong>{displayName}</strong>
                                    <small>{user?.email}</small>
                                </div>
                                <button type="button" onClick={handleLogout}>
                                    <i className="fas fa-arrow-right-from-bracket" />
                                    Đăng xuất
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
