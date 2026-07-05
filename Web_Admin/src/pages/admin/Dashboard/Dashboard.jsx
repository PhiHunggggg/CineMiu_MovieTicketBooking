import { useCallback, useEffect, useMemo, useState } from 'react';
import { cinemaApi, movieApi, revenueApi } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import KpiCard from './KpiCard';
import QuickActionsPanel from './QuickActionsPanel';
import RevenuePanel from './RevenuePanel';
import TicketStatusPanel from './TicketStatusPanel';
import TopMoviesPanel from './TopMoviesPanel';
import { compactCurrency, formatNumber, getItems, read } from './dashboardUtils';

const Dashboard = () => {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [stats, setStats] = useState({ revenue: 0, tickets: 0, movies: 0, cinemas: 0 });
    const [monthly, setMonthly] = useState([]);
    const [topMovies, setTopMovies] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [warning, setWarning] = useState('');
    const { user, isAdmin } = useAuth();
    const displayName = user?.fullName || user?.name || 'Quản trị viên';

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setWarning('');
        const results = await Promise.allSettled([
            revenueApi.getSystemRevenue({ year }),
            movieApi.getAll({ page: 1, pageSize: 1 }),
            cinemaApi.getAll({ activeOnly: false }),
        ]);
        const [revenueResult, movieResult, cinemaResult] = results;
        const report = revenueResult.status === 'fulfilled' ? revenueResult.value.data || {} : {};
        const movieData = movieResult.status === 'fulfilled' ? movieResult.value.data : [];
        const cinemaData = cinemaResult.status === 'fulfilled' ? cinemaResult.value.data : [];

        setStats({
            revenue: Number(read(report, 'totalRevenue', 'TotalRevenue') || 0),
            tickets: Number(read(report, 'totalTickets', 'TotalTickets') || 0),
            movies: Number(read(movieData, 'totalCount', 'TotalCount') || getItems(movieData).length),
            cinemas: getItems(cinemaData).length,
        });

        const monthRows = getItems(read(report, 'monthlyRevenue', 'MonthlyRevenue'));
        setMonthly(
            Array.from(
                { length: 12 },
                (_, index) =>
                    monthRows.find((row) => Number(read(row, 'month', 'Month')) === index + 1) || {
                        month: index + 1,
                        totalRevenue: 0,
                    },
            ),
        );
        setTopMovies(getItems(read(report, 'revenueByMovie', 'RevenueByMovie')).slice(0, 5));
        setStatuses(getItems(read(report, 'ticketStatusSummary', 'TicketStatusSummary')));
        if (results.some((result) => result.status === 'rejected')) {
            setWarning('Một phần dữ liệu chưa tải được. Hãy kiểm tra APIService và kết nối cơ sở dữ liệu.');
        }
        setLoading(false);
    }, [year]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const totalBookings = useMemo(
        () => monthly.reduce((sum, row) => sum + Number(read(row, 'totalBookings', 'TotalBookings') || 0), 0),
        [monthly],
    );
    const maxMovieRevenue = Math.max(
        ...topMovies.map((movie) => Number(read(movie, 'totalRevenue', 'TotalRevenue') || 0)),
        1,
    );
    const soldTickets = Number(
        read(
            statuses.find((item) => read(item, 'status', 'Status') === 'sold'),
            'totalTickets',
            'TotalTickets',
        ) ||
            stats.tickets ||
            0,
    );
    const ticketStatusTotal = statuses.reduce(
        (sum, item) => sum + Number(read(item, 'totalTickets', 'TotalTickets') || 0),
        0,
    );
    const soldTicketRatio = ticketStatusTotal ? Math.min(100, (soldTickets / ticketStatusTotal) * 100) : 0;

    return (
        <div className="content-wrapper admin-dashboard-page">
            <div className="content-header admin-page-header">
                <div className="container-fluid admin-page-title">
                    <div>
                        <p className="admin-eyebrow">Trung tâm điều hành</p>
                        <h1>Chào buổi làm việc, {displayName}</h1>
                        <span>Nắm nhanh sức khỏe kinh doanh và các tác vụ cần ưu tiên hôm nay.</span>
                    </div>
                    <div className="admin-dashboard-controls">
                        <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
                            <option value={currentYear}>Năm {currentYear}</option>
                            <option value={currentYear - 1}>Năm {currentYear - 1}</option>
                        </select>
                        <button type="button" onClick={loadDashboard}>
                            <i className="fas fa-rotate"></i> Làm mới
                        </button>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {warning && <div className="alert alert-warning">{warning}</div>}
                    {loading ? (
                        <div className="admin-loading">
                            <div className="spinner-border text-danger"></div>
                        </div>
                    ) : (
                        <>
                            <div className="admin-kpi-grid">
                                <KpiCard
                                    label="Tổng doanh thu"
                                    value={compactCurrency(stats.revenue)}
                                    icon="fa-wallet"
                                    tone="red"
                                    detail={`${formatNumber(totalBookings)} giao dịch thành công`}
                                    to={isAdmin() ? '/admin/revenue' : undefined}
                                />
                                <KpiCard
                                    label="Vé bán thành công"
                                    value={formatNumber(stats.tickets)}
                                    icon="fa-ticket-alt"
                                    tone="violet"
                                    detail={`Đã thanh toán trong năm ${year}`}
                                    to="/admin/bookings"
                                />
                                <KpiCard
                                    label="Tổng số phim"
                                    value={formatNumber(stats.movies)}
                                    icon="fa-film"
                                    tone="blue"
                                    detail="Đang quản lý trên hệ thống"
                                    to={isAdmin() ? '/admin/movies' : undefined}
                                />
                                <KpiCard
                                    label="Chi nhánh rạp"
                                    value={formatNumber(stats.cinemas)}
                                    icon="fa-building"
                                    tone="green"
                                    detail="Toàn bộ cụm rạp"
                                    to={isAdmin() ? '/admin/cinemas' : undefined}
                                />
                            </div>

                            <div className="admin-dashboard-grid">
                                <RevenuePanel monthly={monthly} revenue={stats.revenue} year={year} />
                                <TicketStatusPanel
                                    soldTicketRatio={soldTicketRatio}
                                    soldTickets={soldTickets}
                                    statuses={statuses}
                                />
                            </div>

                            <div className="admin-dashboard-grid lower">
                                <TopMoviesPanel maxMovieRevenue={maxMovieRevenue} topMovies={topMovies} />
                                <QuickActionsPanel />
                            </div>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Dashboard;

