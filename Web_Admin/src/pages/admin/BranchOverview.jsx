import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingAdminApi, cinemaApi, concessionApi, revenueApi, showtimeApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const getItems = (data) => data?.items || data?.data || data || [];
const readNumber = (item, ...fields) => Number(fields.map((field) => item?.[field]).find((value) => value !== undefined && value !== null) || 0);
const successfulBookingStatuses = new Set(['confirmed', 'paid', 'completed']);

function getTodayValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('vi-VN');
}

function formatTime(value) {
    if (!value) return '--:--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function getShowtimeInfo(item) {
    return item?.showtime || item?.Showtime || item || {};
}

function isShowingNow(showtime) {
    const info = getShowtimeInfo(showtime);
    const now = new Date();
    const start = new Date(info.startTime || info.StartTime);
    const end = new Date(info.endTime || info.EndTime);
    const status = String(info.status || info.Status || '').toLowerCase();

    if (status === 'showing' || status === 'selling') return true;
    return !Number.isNaN(start.getTime())
        && !Number.isNaN(end.getTime())
        && start <= now
        && end > now
        && status !== 'cancelled'
        && status !== 'ended'
        && status !== 'completed';
}

async function safeData(request, fallback) {
    try {
        const response = await request;
        return response.data ?? fallback;
    } catch {
        return fallback;
    }
}

export default function BranchOverview() {
    const { user } = useAuth();
    const assignedCinemaId = user?.cinemaId ? String(user.cinemaId) : '';
    const today = useMemo(() => getTodayValue(), []);
    const [cinema, setCinema] = useState(null);
    const [halls, setHalls] = useState([]);
    const [showtimes, setShowtimes] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [comboItems, setComboItems] = useState([]);
    const [revenueReport, setRevenueReport] = useState(null);
    const [occupancyReport, setOccupancyReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadOverview = useCallback(async () => {
        if (!assignedCinemaId) {
            setLoading(false);
            setError('Tài khoản Cinema Manager chưa được gán chi nhánh.');
            return;
        }

        setLoading(true);
        setError('');

        const [
            cinemaData,
            hallData,
            showtimeData,
            bookingData,
            comboData,
            revenueData,
            occupancyData,
        ] = await Promise.all([
            safeData(cinemaApi.getById(assignedCinemaId), null),
            safeData(cinemaApi.getHalls(assignedCinemaId), []),
            safeData(showtimeApi.getAll({ cinemaId: assignedCinemaId, date: today, page: 1, pageSize: 200 }), { items: [] }),
            safeData(bookingAdminApi.getAll({ cinemaId: assignedCinemaId, date: today, page: 1, pageSize: 200 }), { items: [] }),
            safeData(concessionApi.getAll({ activeOnly: false }), []),
            safeData(revenueApi.getRevenue({ cinemaId: assignedCinemaId, startDate: today, endDate: today }), null),
            safeData(revenueApi.getOccupancy({ cinemaId: assignedCinemaId, startDate: today, endDate: today }), null),
        ]);

        setCinema(cinemaData?.cinema || cinemaData || null);
        setHalls(getItems(hallData));
        setShowtimes(getItems(showtimeData));
        setBookings(getItems(bookingData));
        setComboItems(getItems(comboData));
        setRevenueReport(revenueData);
        setOccupancyReport(occupancyData);
        setLoading(false);
    }, [assignedCinemaId, today]);

    useEffect(() => {
        loadOverview();
    }, [loadOverview]);

    const summary = useMemo(() => {
        const paidBookings = bookings.filter((booking) => successfulBookingStatuses.has(String(booking.status || booking.Status || '').toLowerCase()));
        const fallbackRevenue = paidBookings.reduce((sum, booking) => sum + Number(booking.finalAmount || booking.FinalAmount || 0), 0);
        const fallbackTickets = paidBookings.reduce((sum, booking) => sum + Number(booking.ticketCount || booking.TicketCount || 0), 0);
        const showingHallIds = new Set(
            showtimes
                .filter(isShowingNow)
                .map((item) => getShowtimeInfo(item).hallId || getShowtimeInfo(item).HallId)
                .filter(Boolean),
        );

        return {
            revenueToday: readNumber(revenueReport, 'totalRevenue', 'TotalRevenue') || fallbackRevenue,
            ticketsToday: readNumber(revenueReport, 'totalTickets', 'TotalTickets') || fallbackTickets,
            showtimesToday: readNumber(occupancyReport, 'totalShowtimes', 'TotalShowtimes') || showtimes.length,
            activeRooms: halls.filter((hall) => hall.status === 'active').length,
            maintenanceRooms: halls.filter((hall) => hall.status === 'maintenance').length,
            showingRooms: showingHallIds.size,
            occupancyRate: readNumber(occupancyReport, 'occupancyRate', 'OccupancyRate'),
            sellingCombos: comboItems.filter((item) => item.isAvailable !== false).length,
        };
    }, [bookings, comboItems, halls, occupancyReport, revenueReport, showtimes]);

    const movieRows = useMemo(() => (
        getItems(revenueReport?.revenueByMovie || revenueReport?.RevenueByMovie).slice(0, 5)
    ), [revenueReport]);

    const upcomingShowtimes = useMemo(() => (
        [...showtimes]
            .sort((left, right) => new Date(getShowtimeInfo(left).startTime) - new Date(getShowtimeInfo(right).startTime))
            .slice(0, 6)
    ), [showtimes]);

    const branchName = cinema?.cinemaName || cinema?.name || (assignedCinemaId ? `Chi nhánh #${assignedCinemaId}` : 'Chi nhánh');

    return (
        <div className="theater-page branch-overview-page">
            <header className="management-page-header">
                <div>
                    <p className="section-kicker">Tổng quan chi nhánh</p>
                    <h1>{branchName}</h1>
                    <p>Theo dõi doanh thu, vé, suất chiếu và trạng thái vận hành trong ngày.</p>
                </div>
                <div className="management-header-actions">
                    <button className="btn btn-outline-secondary" type="button" onClick={loadOverview} disabled={loading}>
                        <i className="fas fa-rotate" /> Làm mới
                    </button>
                    <Link className="btn btn-primary" to="/admin/showtimes?create=1">
                        <i className="fas fa-plus" /> Thêm lịch chiếu
                    </Link>
                </div>
            </header>

            {error ? <div className="alert alert-warning">{error}</div> : null}

            <section className="theater-summary-grid branch-summary-grid">
                <article className="theater-summary-card green">
                    <span><i className="fas fa-money-bill-wave" /></span>
                    <div><strong>{loading ? '...' : formatCurrency(summary.revenueToday)}</strong><small>Doanh thu hôm nay</small></div>
                </article>
                <article className="theater-summary-card blue">
                    <span><i className="fas fa-ticket" /></span>
                    <div><strong>{loading ? '...' : formatNumber(summary.ticketsToday)}</strong><small>Vé bán hôm nay</small></div>
                </article>
                <article className="theater-summary-card amber">
                    <span><i className="fas fa-calendar-days" /></span>
                    <div><strong>{loading ? '...' : formatNumber(summary.showtimesToday)}</strong><small>Số suất chiếu hôm nay</small></div>
                </article>
                <article className="theater-summary-card gray">
                    <span><i className="fas fa-screwdriver-wrench" /></span>
                    <div><strong>{loading ? '...' : formatNumber(summary.maintenanceRooms)}</strong><small>Số phòng bảo trì</small></div>
                </article>
            </section>

            <section className="branch-metric-strip">
                <div><span>Phòng hoạt động</span><strong>{formatNumber(summary.activeRooms)}</strong></div>
                <div><span>Phòng đang chiếu</span><strong>{formatNumber(summary.showingRooms)}</strong></div>
                <div><span>Tỷ lệ lấp đầy hôm nay</span><strong>{summary.occupancyRate.toFixed(2)}%</strong></div>
                <div><span>Combo đang bán</span><strong>{formatNumber(summary.sellingCombos)}</strong></div>
            </section>

            <section className="branch-action-grid" aria-label="Nghiệp vụ quản lý chi nhánh">
                <Link to="/admin/halls"><i className="fas fa-door-open" /><span>Phòng chiếu</span></Link>
                <Link to="/admin/seats"><i className="fas fa-chair" /><span>Ghế ngồi</span></Link>
                <Link to="/admin/showtimes"><i className="fas fa-calendar-days" /><span>Lịch chiếu</span></Link>
                <Link to="/admin/ticket-prices"><i className="fas fa-tags" /><span>Giá vé</span></Link>
                <Link to="/admin/bookings"><i className="fas fa-qrcode" /><span>Đặt vé</span></Link>
                <Link to="/admin/concessions"><i className="fas fa-burger" /><span>Combo</span></Link>
                <Link to="/admin/revenue"><i className="fas fa-chart-line" /><span>Thống kê</span></Link>
            </section>

            <div className="branch-overview-columns">
                <section className="card branch-card">
                    <div className="card-header">
                        <h2 className="card-title mb-0">Lịch chiếu hôm nay</h2>
                    </div>
                    <div className="card-body p-0">
                        <table className="table theater-table mb-0">
                            <tbody>
                                {loading ? (
                                    <tr><td className="table-state">Đang tải lịch chiếu...</td></tr>
                                ) : upcomingShowtimes.length === 0 ? (
                                    <tr><td className="table-state">Chưa có lịch chiếu hôm nay.</td></tr>
                                ) : upcomingShowtimes.map((item) => {
                                    const showtime = getShowtimeInfo(item);
                                    return (
                                        <tr key={showtime.showtimeId || showtime.ShowtimeId}>
                                            <td>
                                                <strong>{formatTime(showtime.startTime || showtime.StartTime)}</strong>
                                                <div className="small text-muted">{item.movie?.title || item.Movie?.Title || 'Chưa có phim'}</div>
                                            </td>
                                            <td className="text-right">
                                                <strong>{item.hall?.hallName || item.Hall?.HallName || '-'}</strong>
                                                <div className="small text-muted">{isShowingNow(item) ? 'Đang chiếu' : 'Theo lịch'}</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="card branch-card">
                    <div className="card-header">
                        <h2 className="card-title mb-0">Doanh thu theo phim</h2>
                    </div>
                    <div className="card-body p-0">
                        <table className="table theater-table mb-0">
                            <tbody>
                                {loading ? (
                                    <tr><td className="table-state">Đang tải doanh thu...</td></tr>
                                ) : movieRows.length === 0 ? (
                                    <tr><td className="table-state">Chưa có doanh thu phim hôm nay.</td></tr>
                                ) : movieRows.map((row, index) => (
                                    <tr key={row.movieId || row.MovieId || index}>
                                        <td>
                                            <strong>{row.movieTitle || row.MovieTitle || `Phim ${index + 1}`}</strong>
                                            <div className="small text-muted">{formatNumber(row.totalTickets || row.TotalTickets)} vé</div>
                                        </td>
                                        <td className="text-right">
                                            <strong>{formatCurrency(row.totalRevenue || row.TotalRevenue)}</strong>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}
