import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const pageTitles = {
    '/admin/dashboard': 'Tổng quan toàn hệ thống',
    '/admin/branch': 'Tổng quan chi nhánh',
    '/admin/movies': 'Quản lý phim',
    '/admin/cinemas': 'Quản lý chi nhánh rạp',
    '/admin/managers': 'Tài khoản Cinema Manager',
    '/admin/users': 'Khách hàng',
    '/admin/bookings': 'Đặt vé',
    '/admin/concessions': 'Combo bắp nước',
    '/admin/vouchers': 'Khuyến mãi',
    '/admin/promotions': 'Khuyến mãi',
    '/admin/revenue': 'Báo cáo - Thống kê',
    '/admin/reports': 'Báo cáo - Thống kê',
    '/admin/showtimes': 'Lịch chiếu chi nhánh',
    '/admin/halls': 'Phòng chiếu chi nhánh',
    '/admin/seats': 'Ghế ngồi chi nhánh',
    '/admin/ticket-prices': 'Giá vé chi nhánh',
    '/admin/reviews': 'Đánh giá',
    '/admin/notifications': 'Thông báo',
    '/admin/system': 'Hệ thống',
};

function MenuLink({ to, icon, children, end = false, badge }) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
            <i className={`nav-icon fas ${icon}`} />
            <span>{children}</span>
            {badge ? <small className="nav-badge">{badge}</small> : null}
        </NavLink>
    );
}

function NavGroup({ title, children }) {
    return (
        <>
            <p className="nav-divider">{title}</p>
            {children}
        </>
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
        isTicketStaff,
        canCheckInTickets,
    } = useAuth();

    const displayName = user?.fullName || user?.email || 'Quản trị viên';
    const initials = useMemo(() => displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase(), [displayName]);

    const roleLabel = isAdmin()
        ? 'Super Admin toàn chuỗi'
        : isCinemaManager()
            ? 'Cinema Manager chi nhánh'
            : isTicketStaff()
                ? 'Nhân viên soát vé'
                : 'Nhân viên';
    const currentTitle = pageTitles[location.pathname] || 'Quản trị';
    const brandSubtitle = isAdmin()
        ? 'Quản trị toàn bộ hệ thống rạp'
        : isCinemaManager()
            ? 'Vận hành rạp được phân công'
            : 'Vận hành bán vé';

    const closeMobileSidebar = () => setMobileSidebarOpen(false);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div
            className={[
                'admin-layout',
                'admin-redesign-shell',
                sidebarCollapsed ? 'sidebar-collapsed' : '',
                mobileSidebarOpen ? 'mobile-sidebar-open' : '',
            ].filter(Boolean).join(' ')}
        >
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <Link to="/" className="brand-link" onClick={closeMobileSidebar}>
                        <span className="brand-icon"><i className="fas fa-ticket" /></span>
                        <span className="brand-copy">
                            <strong>CineMiu Admin</strong>
                            <small>{brandSubtitle}</small>
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
                    {isAdmin() && (
                        <>
                            <MenuLink to="/admin/dashboard" icon="fa-gauge-high" end>Tổng quan</MenuLink>

                            <NavGroup title="Quản trị toàn chuỗi">
                                <MenuLink to="/admin/movies" icon="fa-film">Phim</MenuLink>
                                <MenuLink to="/admin/cinemas" icon="fa-building">Chi nhánh rạp</MenuLink>
                                <MenuLink to="/admin/managers" icon="fa-user-tie">Tài khoản Cinema Manager</MenuLink>
                            </NavGroup>

                            <NavGroup title="Kinh doanh & khách hàng">
                                <MenuLink to="/admin/bookings" icon="fa-ticket">Toàn bộ vé</MenuLink>
                                <MenuLink to="/admin/concessions" icon="fa-burger">Combo bắp nước</MenuLink>
                                <MenuLink to="/admin/vouchers" icon="fa-percent">Khuyến mãi</MenuLink>
                                <MenuLink to="/admin/users" icon="fa-users">Khách hàng</MenuLink>
                            </NavGroup>

                            <NavGroup title="Báo cáo & hệ thống">
                                <MenuLink to="/admin/revenue" icon="fa-chart-line">Báo cáo - Thống kê</MenuLink>
                                <MenuLink to="/admin/reviews" icon="fa-star">Đánh giá</MenuLink>
                                <MenuLink to="/admin/notifications" icon="fa-bell">Thông báo</MenuLink>
                                <MenuLink to="/admin/system" icon="fa-shield-halved">Hệ thống</MenuLink>
                            </NavGroup>
                        </>
                    )}

                    {isCinemaManager() && (
                        <>
                            <MenuLink to="/admin/branch" icon="fa-gauge-high" end>Tổng quan chi nhánh</MenuLink>

                            <NavGroup title="Quản lý tại rạp">
                                <MenuLink to="/admin/halls" icon="fa-door-open">Phòng chiếu</MenuLink>
                                <MenuLink to="/admin/seats" icon="fa-chair">Ghế ngồi</MenuLink>
                                <MenuLink to="/admin/showtimes" icon="fa-calendar-days">Lịch chiếu</MenuLink>
                                <MenuLink to="/admin/ticket-prices" icon="fa-tags">Giá vé</MenuLink>
                            </NavGroup>

                            <NavGroup title="Vận hành & kinh doanh">
                                <MenuLink to="/admin/bookings" icon="fa-qrcode" badge="QR">Đặt vé</MenuLink>
                                <MenuLink to="/admin/concessions" icon="fa-burger">Combo</MenuLink>
                                <MenuLink to="/admin/revenue" icon="fa-chart-line">Thống kê</MenuLink>
                            </NavGroup>
                        </>
                    )}

                    {!isAdmin() && !isCinemaManager() && canCheckInTickets() && (
                        <NavGroup title="Soát vé">
                            <MenuLink to="/admin/bookings" icon="fa-qrcode" badge="QR">Check-in vé</MenuLink>
                        </NavGroup>
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
                            <span>{isAdmin() ? 'Toàn hệ thống' : 'Chi nhánh'}</span>
                            <i className="fas fa-chevron-right" />
                            <strong>{currentTitle}</strong>
                        </div>
                    </div>

                    <div className="header-right">
                        {isCinemaManager() && user?.cinemaId ? (
                            <span className="admin-branch-pill">
                                <i className="fas fa-building" /> Chi nhánh #{user.cinemaId}
                            </span>
                        ) : null}
                        {isAdmin() ? (
                            <Link className="header-icon" to="/admin/notifications" aria-label="Thông báo">
                                <i className="fas fa-bell" />
                            </Link>
                        ) : null}
                        <div className="user-dropdown">
                            <span className="user-avatar small">{initials || 'AD'}</span>
                            <span className="header-user-name">{displayName}</span>
                            <i className="fas fa-chevron-down" />
                            <div className="dropdown-menu">
                                <div className="dropdown-header">
                                    <strong>{displayName}</strong>
                                    <small>{user?.email}</small>
                                </div>
                                {isAdmin() ? (
                                    <Link to="/admin/system" className="dropdown-action">
                                        <i className="fas fa-key" />
                                        Đổi mật khẩu
                                    </Link>
                                ) : null}
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
