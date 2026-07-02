import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cinemaApi, movieApi, revenueApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const read = (value, ...keys) => keys.map((key) => value?.[key]).find((item) => item !== undefined && item !== null);
const getItems = (data) => data?.items || data?.data || data || [];
const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');
const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const compactCurrency = (value) => {
    const amount = Number(value || 0);
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} tr`;
    return formatCurrency(amount);
};

const KpiCard = ({ label, value, icon, tone, detail, to }) => {
    const content = <>
        <div className="admin-kpi-head"><span className={`admin-kpi-icon ${tone}`}><i className={`fas ${icon}`}></i></span><span className="admin-kpi-menu"><i className="fas fa-ellipsis-h"></i></span></div>
        <div className="admin-kpi-value">{value}</div>
        <div className="admin-kpi-label">{label}</div>
        <div className="admin-kpi-detail"><i className="fas fa-arrow-trend-up"></i>{detail}</div>
    </>;
    return to ? <Link className="admin-kpi-card" to={to}>{content}</Link> : <div className="admin-kpi-card">{content}</div>;
};

const RevenueChart = ({ rows }) => {
    const width = 760;
    const height = 230;
    const padding = { top: 18, right: 18, bottom: 34, left: 18 };
    const values = rows.map((row) => Number(read(row, 'totalRevenue', 'TotalRevenue') || 0));
    const maximum = Math.max(...values, 1);
    const step = (width - padding.left - padding.right) / Math.max(rows.length - 1, 1);
    const points = values.map((value, index) => ({
        x: padding.left + index * step,
        y: padding.top + (height - padding.top - padding.bottom) * (1 - value / maximum),
        value,
    }));
    const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const area = points.length ? `${line} L ${points.at(-1).x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z` : '';

    return (
        <div className="admin-revenue-chart">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ doanh thu 12 tháng">
                <defs><linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ec193f" stopOpacity=".24"/><stop offset="1" stopColor="#ec193f" stopOpacity="0"/></linearGradient></defs>
                {[0.25, 0.5, 0.75, 1].map((ratio) => <line key={ratio} x1={padding.left} x2={width - padding.right} y1={padding.top + (height - padding.top - padding.bottom) * ratio} y2={padding.top + (height - padding.top - padding.bottom) * ratio} className="chart-grid-line" />)}
                <path d={area} fill="url(#revenueArea)" />
                <path d={line} className="chart-line" />
                {points.map((point, index) => <g key={index}><circle cx={point.x} cy={point.y} r="4" className="chart-point"><title>{`Tháng ${index + 1}: ${formatCurrency(point.value)}`}</title></circle><text x={point.x} y={height - 10} textAnchor="middle" className="chart-label">T{index + 1}</text></g>)}
            </svg>
        </div>
    );
};

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

    useEffect(() => { loadDashboard(); }, [year]);

    const loadDashboard = async () => {
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
        setMonthly(Array.from({ length: 12 }, (_, index) => monthRows.find((row) => Number(read(row, 'month', 'Month')) === index + 1) || { month: index + 1, totalRevenue: 0 }));
        setTopMovies(getItems(read(report, 'revenueByMovie', 'RevenueByMovie')).slice(0, 5));
        setStatuses(getItems(read(report, 'ticketStatusSummary', 'TicketStatusSummary')));
        if (results.some((result) => result.status === 'rejected')) setWarning('Một phần dữ liệu chưa tải được. Hãy kiểm tra APIService và kết nối cơ sở dữ liệu.');
        setLoading(false);
    };

    const totalBookings = useMemo(() => monthly.reduce((sum, row) => sum + Number(read(row, 'totalBookings', 'TotalBookings') || 0), 0), [monthly]);
    const maxMovieRevenue = Math.max(...topMovies.map((movie) => Number(read(movie, 'totalRevenue', 'TotalRevenue') || 0)), 1);
    const soldTickets = Number(read(statuses.find((item) => read(item, 'status', 'Status') === 'sold'), 'totalTickets', 'TotalTickets') || stats.tickets || 0);
    const ticketStatusTotal = statuses.reduce((sum, item) => sum + Number(read(item, 'totalTickets', 'TotalTickets') || 0), 0);
    const soldTicketRatio = ticketStatusTotal ? Math.min(100, (soldTickets / ticketStatusTotal) * 100) : 0;

    return (
        <div className="content-wrapper admin-dashboard-page">
            <div className="content-header admin-page-header">
                <div className="container-fluid admin-page-title">
                    <div><p className="admin-eyebrow">Trung tâm điều hành</p><h1>Chào buổi làm việc, {displayName}</h1><span>Nắm nhanh sức khỏe kinh doanh và các tác vụ cần ưu tiên hôm nay.</span></div>
                    <div className="admin-dashboard-controls"><select value={year} onChange={(event) => setYear(Number(event.target.value))}><option value={currentYear}>Năm {currentYear}</option><option value={currentYear - 1}>Năm {currentYear - 1}</option></select><button type="button" onClick={loadDashboard}><i className="fas fa-rotate"></i> Làm mới</button></div>
                </div>
            </div>

            <section className="content"><div className="container-fluid">
                {warning && <div className="alert alert-warning">{warning}</div>}
                {loading ? <div className="admin-loading"><div className="spinner-border text-danger"></div></div> : <>
                    <div className="admin-kpi-grid">
                        <KpiCard label="Tổng doanh thu" value={compactCurrency(stats.revenue)} icon="fa-wallet" tone="red" detail={`${formatNumber(totalBookings)} giao dịch thành công`} to={isAdmin() ? '/admin/revenue' : undefined} />
                        <KpiCard label="Vé bán thành công" value={formatNumber(stats.tickets)} icon="fa-ticket-alt" tone="violet" detail={`Đã thanh toán trong năm ${year}`} to="/admin/bookings" />
                        <KpiCard label="Tổng số phim" value={formatNumber(stats.movies)} icon="fa-film" tone="blue" detail="Đang quản lý trên hệ thống" to={isAdmin() ? '/admin/movies' : undefined} />
                        <KpiCard label="Chi nhánh rạp" value={formatNumber(stats.cinemas)} icon="fa-building" tone="green" detail="Toàn bộ cụm rạp" to={isAdmin() ? '/admin/cinemas' : undefined} />
                    </div>

                    <div className="admin-dashboard-grid">
                        <div className="admin-panel admin-chart-panel">
                            <div className="admin-panel-header"><div><p className="admin-eyebrow">Hiệu suất tài chính</p><h2>Biểu đồ doanh thu</h2><span>Doanh thu theo tháng trong năm {year}</span></div><Link to="/admin/revenue">Xem báo cáo <i className="fas fa-arrow-right"></i></Link></div>
                            <div className="admin-chart-summary"><strong>{formatCurrency(stats.revenue)}</strong><span><i className="fas fa-circle"></i> Doanh thu thực tế</span></div>
                            <RevenueChart rows={monthly} />
                        </div>

                        <div className="admin-panel admin-status-panel">
                            <div className="admin-panel-header"><div><p className="admin-eyebrow">Vận hành vé</p><h2>Trạng thái vé</h2><span>Phân loại vé theo trạng thái trong kỳ</span></div></div>
                            <div className="admin-ticket-ring" style={{ '--sold': `${soldTicketRatio}%` }}><div><strong>{formatNumber(soldTickets)}</strong><span>Vé thành công</span></div></div>
                            <div className="admin-status-list">
                                {statuses.length ? statuses.map((item, index) => <div key={read(item, 'status', 'Status') || index}><span className={`status-color status-${index}`}></span><p>{read(item, 'label', 'Label')}<strong>{formatNumber(read(item, 'totalTickets', 'TotalTickets'))}</strong></p></div>) : <div className="admin-empty-inline">Chưa có dữ liệu vé trong kỳ.</div>}
                            </div>
                        </div>
                    </div>

                    <div className="admin-dashboard-grid lower">
                        <div className="admin-panel admin-top-movies">
                            <div className="admin-panel-header"><div><p className="admin-eyebrow">Xếp hạng</p><h2>Top phim bán chạy</h2><span>Theo doanh thu tháng hiện tại</span></div><Link to="/admin/movies">Quản lý phim</Link></div>
                            <div className="admin-movie-ranking">
                                {topMovies.length ? topMovies.map((movie, index) => {
                                    const revenue = Number(read(movie, 'totalRevenue', 'TotalRevenue') || 0);
                                    return <div key={read(movie, 'movieId', 'MovieId') || index}><span className="rank">{String(index + 1).padStart(2, '0')}</span><div className="movie-rank-copy"><strong>{read(movie, 'movieTitle', 'MovieTitle') || `Phim ${index + 1}`}</strong><span><i style={{ width: `${Math.max(4, revenue / maxMovieRevenue * 100)}%` }}></i></span></div><div className="movie-rank-value"><strong>{compactCurrency(revenue)}</strong><span>{formatNumber(read(movie, 'totalTickets', 'TotalTickets'))} vé</span></div></div>;
                                }) : <div className="admin-empty-state"><i className="fas fa-chart-bar"></i><strong>Chưa có doanh thu phim</strong><span>Dữ liệu sẽ xuất hiện khi có giao dịch trong tháng.</span></div>}
                            </div>
                        </div>

                        <div className="admin-panel admin-quick-panel">
                            <div className="admin-panel-header"><div><p className="admin-eyebrow">Truy cập nhanh</p><h2>Tác vụ thường dùng</h2><span>Đi thẳng đến khu vực cần xử lý</span></div></div>
                            <div className="admin-quick-grid">
                                <Link to="/admin/movies"><span><i className="fas fa-plus"></i></span><strong>Thêm phim</strong><small>Cập nhật danh mục phim</small></Link>
                                <Link to="/admin/bookings"><span><i className="fas fa-search"></i></span><strong>Tra cứu vé</strong><small>Tìm theo mã đặt vé</small></Link>
                                <Link to="/admin/promotions"><span><i className="fas fa-percent"></i></span><strong>Tạo ưu đãi</strong><small>Mã giảm giá mới</small></Link>
                                <Link to="/admin/managers"><span><i className="fas fa-user-plus"></i></span><strong>Thêm quản lý</strong><small>Phân công chi nhánh</small></Link>
                            </div>
                        </div>
                    </div>
                </>}
            </div></section>
        </div>
    );
};

export default Dashboard;
