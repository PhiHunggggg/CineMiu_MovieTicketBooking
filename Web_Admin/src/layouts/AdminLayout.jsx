import MainLayout from '../components/MainLayout';

export default MainLayout;
//         '/manager': 'Quản lý lịch chiếu',
//         '/manager/showtimes': 'Quản lý lịch chiếu',
//         '/manager/halls': 'Trạng thái phòng',
//         '/manager/ticket-prices': 'Giá vé giờ/ngày lễ',
//         '/admin/movies': 'Quản lý phim',
//         '/admin/cinemas': 'Chi nhánh rạp',
//         '/admin/revenue': 'Thống kê doanh thu',
//         '/admin/bookings': 'Quản lý đặt vé',
//         '/admin/concessions': 'Bắp nước',
//         '/admin/promotions': 'Khuyến mãi',
//         '/admin/reviews': 'Đánh giá',
//         '/admin/notifications': 'Thông báo',
//         '/admin/system': 'Hệ thống',
//         '/users': 'Người dùng',
//     };
//     const currentTitle = pageTitles[location.pathname] || 'Quản trị';

//     const handleLogout = () => {
//         logout();
//         navigate('/login');
//     };

//     const isActive = (path) => location.pathname === path ? 'active' : '';
//     const isManagerActive = location.pathname === '/manager' || location.pathname.startsWith('/manager/');

//     return (
//         <div className="wrapper admin-shell">
//             <nav className="main-header navbar navbar-expand navbar-white navbar-light admin-topbar">
//                 <ul className="navbar-nav">
//                     <li className="nav-item">
//                         <a className="nav-link admin-menu-toggle" data-widget="pushmenu" href="#!" role="button" aria-label="Mở menu quản trị">
//                             <i className="fas fa-bars"></i>
//                         </a>
//                     </li>
//                     <li className="nav-item d-none d-sm-inline-block">
//                         <div className="nav-link admin-breadcrumb">
//                             <span>Trang chủ</span>
//                             <i className="fas fa-chevron-right fa-xs"></i>
//                             <strong>{currentTitle}</strong>
//                         </div>
//                     </li>
//                 </ul>

//                 <ul className="navbar-nav ml-auto">
//                     <li className="nav-item dropdown">
//                         <a className="nav-link admin-user-toggle" data-toggle="dropdown" href="#!" aria-label="Tài khoản quản trị">
//                             <span className="admin-user-avatar">{initials || 'AD'}</span>
//                             <span className="d-none d-md-inline">{displayName}</span>
//                             <i className="fas fa-angle-down d-none d-md-inline"></i>
//                         </a>
//                         <div className="dropdown-menu dropdown-menu-right">
//                             <span className="dropdown-item dropdown-header">{userEmail}</span>
//                             <div className="dropdown-divider"></div>
//                             <button className="dropdown-item" onClick={handleLogout}>
//                                 <i className="fas fa-sign-out-alt mr-2"></i> Đăng xuất
//                             </button>
//                         </div>
//                     </li>
//                 </ul>
//             </nav>

//             <aside className="main-sidebar sidebar-dark-primary admin-sidebar elevation-4">
//                 <Link to="/" className="brand-link admin-brand">
//                     <span className="admin-brand-icon">
//                         <i className="fas fa-ticket-alt"></i>
//                     </span>
//                     <span className="admin-brand-text">
//                         <strong>Đặt Vé Rạp Phim</strong>
//                         <span>Admin console</span>
//                     </span>
//                 </Link>

//                 <div className="sidebar">
//                     <div className="user-panel admin-user-panel d-flex align-items-center">
//                         <span className="admin-user-avatar">{initials || 'AD'}</span>
//                         <div className="info">
//                             <span className="d-block">{displayName}</span>
//                             <small>{isAdmin() ? 'Quản trị hệ thống' : isTicketStaff() ? 'Nhân viên soát vé' : 'Quản lý rạp'}</small>
//                         </div>
//                     </div>

//                     <nav className="mt-2">
//                         <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
//                             <li className="nav-item">
//                                 <Link to="/" className={`nav-link ${isActive('/')}`}>
//                                     <i className="nav-icon fas fa-tachometer-alt"></i>
//                                     <p>Tổng quan</p>
//                                 </Link>
//                             </li>

//                             {isCinemaManager() && (
//                                 <li className={`nav-item ${isManagerActive ? 'menu-open' : ''}`}>
//                                     <Link to="/manager/showtimes" className={`nav-link ${isManagerActive ? 'active' : ''}`}>
//                                         <i className="nav-icon fas fa-calendar-alt"></i>
//                                         <p>
//                                             Quản lý rạp
//                                             <i className="right fas fa-angle-left"></i>
//                                         </p>
//                                     </Link>
//                                     <ul className="nav nav-treeview">
//                                         <li className="nav-item">
//                                             <Link to="/manager/showtimes" className={`nav-link ${isActive('/manager/showtimes') || isActive('/manager')}`}>
//                                                 <i className="fas fa-clock nav-icon"></i>
//                                                 <p>Lịch chiếu</p>
//                                             </Link>
//                                         </li>
//                                         <li className="nav-item">
//                                             <Link to="/manager/halls" className={`nav-link ${isActive('/manager/halls')}`}>
//                                                 <i className="fas fa-door-open nav-icon"></i>
//                                                 <p>Trạng thái phòng</p>
//                                             </Link>
//                                         </li>
//                                         <li className="nav-item">
//                                             <Link to="/manager/ticket-prices" className={`nav-link ${isActive('/manager/ticket-prices')}`}>
//                                                 <i className="fas fa-tags nav-icon"></i>
//                                                 <p>Giá vé giờ/ngày lễ</p>
//                                             </Link>
//                                         </li>
//                                     </ul>
//                                 </li>
//                             )}

//                             {canCheckInTickets() && !isAdmin() && (
//                                 <>
//                                     <li className="nav-header">VẬN HÀNH</li>
//                                     <li className="nav-item">
//                                         <Link to="/admin/bookings" className={`nav-link ${isActive('/admin/bookings')}`}>
//                                             <i className="nav-icon fas fa-qrcode"></i>
//                                             <p>Check-in vé</p>
//                                         </Link>
//                                     </li>
//                                 </>
//                             )}

//                             {isAdmin() && (
//                                 <>
//                                     <li className="nav-header">QUẢN TRỊ</li>
//                                     <li className="nav-item">
//                                         <Link to="/admin/movies" className={`nav-link ${isActive('/admin/movies')}`}>
//                                             <i className="nav-icon fas fa-film"></i>
//                                             <p>Phim</p>
//                                         </Link>
//                                     </li>
//                                     <li className="nav-item">
//                                         <Link to="/admin/cinemas" className={`nav-link ${isActive('/admin/cinemas')}`}>
//                                             <i className="nav-icon fas fa-building"></i>
//                                             <p>Chi nhánh rạp</p>
//                                         </Link>
//                                     </li>
//                                     <li className="nav-item">
//                                         <Link to="/users" className={`nav-link ${isActive('/users')}`}>
//                                             <i className="nav-icon fas fa-users"></i>
//                                             <p>Người dùng</p>
//                                         </Link>
//                                     </li>
//                                     <li className="nav-item">
//                                         <Link to="/admin/bookings" className={`nav-link ${isActive('/admin/bookings')}`}>
//                                             <i className="nav-icon fas fa-ticket-alt"></i>
//                                             <p>Đặt vé</p>
//                                         </Link>
//                                     </li>
//                                     <li className="nav-item">
//                                         <Link to="/admin/concessions" className={`nav-link ${isActive('/admin/concessions')}`}>
//                                             <i className="nav-icon fas fa-utensils"></i>
//                                             <p>Bắp nước</p>
//                                         </Link>
//                                     </li>
//                                     <li className="nav-item">
//                                         <Link to="/admin/promotions" className={`nav-link ${isActive('/admin/promotions')}`}>
//                                             <i className="nav-icon fas fa-percent"></i>
//                                             <p>Khuyến mãi</p>
//                                         </Link>
//                                     </li>
//                                     <li className="nav-item">
//                                         <Link to="/admin/reviews" className={`nav-link ${isActive('/admin/reviews')}`}>
//                                             <i className="nav-icon fas fa-star"></i>
//                                             <p>Đánh giá</p>
//                                         </Link>
//                                     </li>
//                                     <li className="nav-item">
//                                         <Link to="/admin/notifications" className={`nav-link ${isActive('/admin/notifications')}`}>
//                                             <i className="nav-icon fas fa-bell"></i>
//                                             <p>Thông báo</p>
//                                         </Link>
//                                     </li>
//                                     <li className="nav-item">
//                                         <Link to="/admin/revenue" className={`nav-link ${isActive('/admin/revenue')}`}>
//                                             <i className="nav-icon fas fa-chart-pie"></i>
//                                             <p>Thống kê</p>
//                                         </Link>
//                                     </li>
//                                     <li className="nav-item">
//                                         <Link to="/admin/system" className={`nav-link ${isActive('/admin/system')}`}>
//                                             <i className="nav-icon fas fa-cogs"></i>
//                                             <p>Hệ thống</p>
//                                         </Link>
//                                     </li>
//                                 </>
//                             )}
//                         </ul>
//                     </nav>
//                 </div>
//             </aside>

//             {children}

//             <footer className="main-footer">
//                 <strong>Copyright &copy; 2026 <a href="#">Đặt Vé Rạp Phim</a>.</strong>
//                 <div className="float-right d-none d-sm-inline-block">
//                     <b>Version</b> 1.0.0
//                 </div>
//             </footer>
//         </div>
//     );
// };

// export default MainLayout;
