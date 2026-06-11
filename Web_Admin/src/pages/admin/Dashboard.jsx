// Dashboard.jsx - Giao diện dashboard theo ảnh
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cinemaApi, movieApi, showtimeApi, userApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');

const statCards = [
    {
        key: 'movies',
        title: 'Phim',
        icon: 'fa-film',
        color: '#4361ee',
        bgColor: '#eef2ff',
        to: '/admin/movies',
        meta: 'Quản lý danh mục',
    },
    {
        key: 'cinemas',
        title: 'Chi nhánh rạp',
        icon: 'fa-building',
        color: '#10b981',
        bgColor: '#ecfdf5',
        to: '/admin/cinemas',
        meta: 'Xem chi nhánh',
    },
    {
        key: 'todayShowtimes',
        title: 'Lịch chiếu hôm nay',
        icon: 'fa-calendar-check',
        color: '#f59e0b',
        bgColor: '#fffbeb',
        to: '/admin/showtimes',
        meta: 'Điều phối lịch',
    },
    {
        key: 'users',
        title: 'Người dùng',
        icon: 'fa-users',
        color: '#ef4444',
        bgColor: '#fef2f2',
        to: '/admin/users',
        meta: 'Phân quyền',
    },
];

const quickActions = [
    { to: '/admin/movies', icon: 'fa-film', title: 'Phim', description: 'Cập nhật thông tin và trạng thái phim', admin: true },
    { to: '/admin/cinemas', icon: 'fa-building', title: 'Chi nhánh rạp', description: 'Quản lý rạp và phòng chiếu', manager: true },
    { to: '/admin/users', icon: 'fa-user-shield', title: 'Người dùng', description: 'Tài khoản, vai trò và phân quyền', admin: true },
    { to: '/admin/bookings', icon: 'fa-ticket-alt', title: 'Đặt vé', description: 'Tra cứu, hủy vé và check-in', checkIn: true },
    { to: '/admin/concessions', icon: 'fa-utensils', title: 'Bắp nước', description: 'Combo, bắp, nước và snack', admin: true },
    { to: '/admin/vouchers', icon: 'fa-percent', title: 'Khuyến mãi', description: 'Mã giảm giá và điều kiện áp dụng', admin: true },
    { to: '/admin/reviews', icon: 'fa-star', title: 'Đánh giá', description: 'Duyệt hiển thị và phản hồi', admin: true },
    { to: '/admin/notifications', icon: 'fa-bell', title: 'Thông báo', description: 'Gửi và theo dõi thông báo', admin: true },
    { to: '/admin/revenue', icon: 'fa-chart-line', title: 'Thống kê', description: 'Theo dõi doanh thu hệ thống', manager: true },
];

function StatCard({ item, value }) {
    return (
        <Link to={item.to} className="stat-card" style={{ borderTopColor: item.color }}>
            <div className="stat-card-content">
                <div className="stat-card-icon" style={{ backgroundColor: item.bgColor, color: item.color }}>
                    <i className={`fas ${item.icon}`}></i>
                </div>
                <div className="stat-card-info">
                    <div className="stat-card-value">{formatNumber(value)}</div>
                    <div className="stat-card-title">{item.title}</div>
                    <div className="stat-card-meta">{item.meta} <i className="fas fa-arrow-right"></i></div>
                </div>
            </div>
        </Link>
    );
}

function QuickAction({ item }) {
    return (
        <Link to={item.to} className="quick-action-card">
            <div className="quick-action-icon">
                <i className={`fas ${item.icon}`}></i>
            </div>
            <div className="quick-action-content">
                <div className="quick-action-title">{item.title}</div>
                <div className="quick-action-desc">{item.description}</div>
            </div>
        </Link>
    );
}

export default function Dashboard() {
    const [stats, setStats] = useState({
        movies: 0,
        cinemas: 0,
        todayShowtimes: 0,
        users: 0,
    });
    const [loading, setLoading] = useState(true);
    const [loadWarning, setLoadWarning] = useState('');
    const { isAdmin, isCinemaManager, canCheckInTickets, user } = useAuth();
    const displayName = user?.fullName || user?.email || 'Quản trị viên';
    const todayLabel = new Intl.DateTimeFormat('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date());

    useEffect(() => {
        let active = true;

        async function loadStats() {
            const today = new Date().toISOString().substring(0, 10);
            const results = await Promise.allSettled([
                movieApi.getAll({ page: 1, pageSize: 1 }),
                cinemaApi.getAll(),
                showtimeApi.getAll({ date: today }),
                isAdmin()
                    ? userApi.getAll({ page: 1, pageSize: 1 })
                    : Promise.resolve({ data: { totalCount: 0 } }),
            ]);

            if (!active) return;
            const [moviesRes, cinemasRes, showtimesRes, usersRes] = results;
            const hasFailure = results.some((item) => item.status === 'rejected');

            setStats({
                movies: moviesRes.status === 'fulfilled'
                    ? moviesRes.value.data?.totalCount || moviesRes.value.data?.items?.length || 0
                    : 0,
                cinemas: cinemasRes.status === 'fulfilled'
                    ? (cinemasRes.value.data?.length || cinemasRes.value.data?.items?.length || 0)
                    : 0,
                todayShowtimes: showtimesRes.status === 'fulfilled'
                    ? showtimesRes.value.data?.totalCount || showtimesRes.value.data?.items?.length || showtimesRes.value.data?.length || 0
                    : 0,
                users: usersRes.status === 'fulfilled'
                    ? usersRes.value.data?.totalCount || usersRes.value.data?.data?.length || 0
                    : 0,
            });
            setLoadWarning(hasFailure
                ? 'Một số chỉ số chưa tải được từ API. Vui lòng kiểm tra backend hoặc kết nối cơ sở dữ liệu.'
                : '');
            setLoading(false);
        }

        loadStats();
        return () => {
            active = false;
        };
    }, [isAdmin]);

    const visibleActions = quickActions.filter((item) => {
        if (item.admin) return isAdmin();
        if (item.manager) return isCinemaManager();
        if (item.checkIn) return canCheckInTickets();
        return true;
    });

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <div className="dashboard-eyebrow">BẢNG ĐIỀU KHIỂN</div>
                    <h1 className="dashboard-title">Tổng quan vận hành</h1>
                    <p className="dashboard-greeting">
                        Xin chào <strong>{displayName}</strong>, đây là tình hình rạp phim hôm nay.
                    </p>
                </div>
                <div className="dashboard-date">
                    <i className="fas fa-calendar-day"></i>
                    <span>{todayLabel}</span>
                </div>
            </div>

            {loadWarning && (
                <div className="dashboard-warning">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>{loadWarning}</span>
                </div>
            )}

            {loading ? (
                <div className="dashboard-loading">
                    <div className="spinner"></div>
                    <span>Đang tải dữ liệu...</span>
                </div>
            ) : (
                <>
                    <div className="stats-grid">
                        {statCards.map((item) => (
                            <StatCard key={item.key} item={item} value={stats[item.key]} />
                        ))}
                    </div>

                    <div className="quick-actions-section">
                        <div className="section-header">
                            <div className="section-icon">
                                <i className="fas fa-bolt"></i>
                            </div>
                            <div>
                                <h2 className="section-title">Thao tác nhanh</h2>
                                <p className="section-desc">Mở nhanh các khu vực quản trị thường dùng.</p>
                            </div>
                        </div>
                        <div className="quick-actions-grid">
                            {visibleActions.map((item) => (
                                <QuickAction key={item.to} item={item} />
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
