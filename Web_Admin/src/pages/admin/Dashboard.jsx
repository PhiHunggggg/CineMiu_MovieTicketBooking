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
        tone: 'teal',
        to: '/admin/movies',
        meta: 'Quản lý danh mục',
    },
    {
        key: 'cinemas',
        title: 'Chi nhánh rạp',
        icon: 'fa-building',
        tone: 'green',
        to: '/admin/cinemas',
        meta: 'Xem chi nhánh',
    },
    {
        key: 'todayShowtimes',
        title: 'Lịch chiếu hôm nay',
        icon: 'fa-calendar-check',
        tone: 'blue',
        to: '/admin/showtimes',
        meta: 'Điều phối lịch',
    },
    {
        key: 'users',
        title: 'Người dùng',
        icon: 'fa-users',
        tone: 'amber',
        to: '/admin/users',
        meta: 'Phân quyền',
    },
];

const quickActions = [
    {
        to: '/admin/movies',
        icon: 'fa-film',
        title: 'Phim',
        description: 'Cập nhật thông tin và trạng thái phim',
        admin: true,
    },
    {
        to: '/admin/cinemas',
        icon: 'fa-building',
        title: 'Chi nhánh rạp',
        description: 'Quản lý rạp và phòng chiếu',
        manager: true,
    },
    {
        to: '/admin/users',
        icon: 'fa-user-shield',
        title: 'Người dùng',
        description: 'Tài khoản, vai trò và phân quyền',
        admin: true,
    },
    {
        to: '/admin/bookings',
        icon: 'fa-ticket-alt',
        title: 'Đặt vé',
        description: 'Tra cứu, hủy vé và check-in',
        checkIn: true,
    },
    {
        to: '/admin/concessions',
        icon: 'fa-utensils',
        title: 'Bắp nước',
        description: 'Combo, bắp, nước và snack',
        admin: true,
    },
    {
        to: '/admin/vouchers',
        icon: 'fa-percent',
        title: 'Khuyến mãi',
        description: 'Mã giảm giá và điều kiện áp dụng',
        admin: true,
    },
    {
        to: '/admin/showtimes',
        icon: 'fa-clock',
        title: 'Suất chiếu',
        description: 'Tạo và điều chỉnh lịch chiếu',
        manager: true,
    },
    {
        to: '/admin/revenue',
        icon: 'fa-chart-line',
        title: 'Thống kê',
        description: 'Theo dõi doanh thu hệ thống',
        manager: true,
    },
];

function StatCard({ item, value }) {
    return (
        <Link to={item.to} className={`admin-stat-card admin-stat-${item.tone}`}>
            <span className="admin-stat-copy">
                <strong>{formatNumber(value)}</strong>
                <span>{item.title}</span>
                <small>{item.meta} <i className="fas fa-arrow-right" /></small>
            </span>
            <span className="admin-stat-icon">
                <i className={`fas ${item.icon}`} />
            </span>
        </Link>
    );
}

function QuickAction({ item }) {
    return (
        <Link to={item.to} className="admin-action-card">
            <span className="admin-action-icon"><i className={`fas ${item.icon}`} /></span>
            <span className="admin-action-text">
                <strong>{item.title}</strong>
                <small>{item.description}</small>
            </span>
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
                    ? cinemasRes.value.data?.length || cinemasRes.value.data?.items?.length || 0
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
        <div className="admin-dashboard">
            <header className="admin-page-header">
                <div>
                    <p className="admin-eyebrow">Bảng điều khiển</p>
                    <h1>Tổng quan vận hành</h1>
                    <span>Xin chào {displayName}, đây là tình hình rạp phim hôm nay.</span>
                </div>
                <div className="admin-date-pill">
                    <i className="fas fa-calendar-day" />
                    <span>{todayLabel}</span>
                </div>
            </header>

            {loadWarning && (
                <div className="admin-dashboard-warning">
                    <i className="fas fa-exclamation-circle" />
                    <span>{loadWarning}</span>
                </div>
            )}

            {loading ? (
                <div className="admin-loading">
                    <i className="fas fa-circle-notch fa-spin" />
                    <span>Đang tải dữ liệu...</span>
                </div>
            ) : (
                <>
                    <section className="admin-stat-grid" aria-label="Chỉ số tổng quan">
                        {statCards.map((item) => (
                            <StatCard key={item.key} item={item} value={stats[item.key]} />
                        ))}
                    </section>

                    <section className="admin-quick-panel">
                        <header className="admin-panel-header">
                            <span className="admin-panel-icon"><i className="fas fa-bolt" /></span>
                            <span>
                                <h2>Thao tác nhanh</h2>
                                <p>Mở nhanh các khu vực quản trị thường dùng.</p>
                            </span>
                        </header>
                        <div className="admin-action-grid">
                            {visibleActions.map((item) => <QuickAction key={item.to} item={item} />)}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
