import React, { useEffect, useState } from 'react';
import { bookingAdminApi, cinemaApi, movieApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const bookingStatuses = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'Chờ thanh toán' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'completed', label: 'Đã sử dụng' },
    { value: 'cancelled', label: 'Đã hủy' },
];

const getItems = (data) => data?.items || data?.data || data || [];
const getBookingId = (booking) => booking?.bookingId ?? booking?.BookingId ?? booking?.id;
const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '-');
const toDateInput = (value) => (value ? String(value).substring(0, 10) : '');

const getStatusLabel = (status) => {
    const map = {
        pending: 'Chờ thanh toán',
        confirmed: 'Đã xác nhận',
        paid: 'Đã thanh toán',
        completed: 'Đã sử dụng',
        cancelled: 'Đã hủy',
    };
    return map[status] || status || '-';
};

const getStatusBadge = (status) => {
    const map = {
        pending: 'badge-warning',
        confirmed: 'badge-success',
        paid: 'badge-success',
        completed: 'badge-primary',
        cancelled: 'badge-secondary',
    };
    return map[status] || 'badge-light';
};

const getPaymentStatusLabel = (status) => {
    const map = {
        pending: 'Chờ thanh toán',
        success: 'Đã thanh toán',
        paid: 'Đã thanh toán',
        refunded: 'Đã hoàn tiền',
        partial_refund: 'Hoàn tiền một phần',
        failed: 'Thất bại',
    };
    return map[status] || status || '-';
};

const AdminBookings = () => {
    const { user, canCheckInTickets, isAdmin, isCinemaManager } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [movies, setMovies] = useState([]);
    const [filters, setFilters] = useState({
        keyword: '',
        status: '',
        movieId: '',
        cinemaId: '',
        date: '',
    });
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState('');
    const [quickQrCode, setQuickQrCode] = useState('');
    const [checkingIn, setCheckingIn] = useState(false);
    const managerCinemaId = isCinemaManager() ? user?.cinemaId : null;

    useEffect(() => {
        loadCinemas();
        loadMovies();
        loadBookings();
    }, []);

    const loadCinemas = async () => {
        try {
            const response = await cinemaApi.getAll();
            const items = getItems(response.data);
            setCinemas(isCinemaManager()
                ? items.filter((cinema) => managerCinemaId && Number(cinema.cinemaId || cinema.id) === Number(managerCinemaId))
                : items);
        } catch (err) {
            console.error('Failed to load cinemas:', err);
        }
    };

    const loadMovies = async () => {
        try {
            const response = await movieApi.getAll({ page: 1, pageSize: 500 });
            setMovies(getItems(response.data));
        } catch (err) {
            console.error('Failed to load movies:', err);
        }
    };

    const loadBookings = async (event) => {
        if (event) event.preventDefault();

        setLoading(true);
        setError('');
        try {
            const response = await bookingAdminApi.getAll({
                keyword: filters.keyword || undefined,
                status: filters.status || undefined,
                movieId: filters.movieId || undefined,
                cinemaId: isCinemaManager() ? managerCinemaId || -1 : filters.cinemaId || undefined,
                date: filters.date || undefined,
                page: 1,
                pageSize: 200,
            });
            setBookings(getItems(response.data));
            setTotal(response.data?.total || response.data?.totalCount || getItems(response.data).length);
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được danh sách đặt vé');
        } finally {
            setLoading(false);
        }
    };

    const openDetail = async (booking) => {
        const bookingId = getBookingId(booking);
        if (!bookingId) return;

        setDetailLoading(true);
        setError('');
        try {
            const response = await bookingAdminApi.getById(bookingId);
            setDetail(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được chi tiết đặt vé');
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setDetail(null);
        setDetailLoading(false);
    };

    const canCancelBookings = isAdmin() || isCinemaManager();
    const canRefundBookings = canCancelBookings;

    const isBookingRefunded = (booking) => Number(booking?.refundAmount || booking?.RefundAmount || 0) > 0 || !!(booking?.refundedAt || booking?.RefundedAt);

    const canRefundBooking = (booking) => {
        if (!canRefundBookings || !booking) return false;

        const status = booking.status || booking.Status;
        const usedTicketCount = Number(booking.usedTicketCount || booking.UsedTicketCount || 0);
        const finalAmount = Number(booking.finalAmount || booking.FinalAmount || 0);

        return ['confirmed', 'paid', 'completed', 'cancelled'].includes(status)
            && usedTicketCount === 0
            && finalAmount > 0
            && !isBookingRefunded(booking);
    };

    const cancelBooking = async (booking) => {
        if (!canCancelBookings) return;

        const bookingId = getBookingId(booking);
        const reason = window.prompt('Nhập lý do hủy đặt vé:', 'Hủy bởi quản trị viên');
        if (!bookingId || reason === null) return;

        setError('');
        try {
            await bookingAdminApi.cancel(bookingId, { reason });
            await loadBookings();
            if (getBookingId(detail?.booking) === bookingId) {
                await openDetail({ bookingId });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Hủy đặt vé thất bại');
        }
    };

    const refundBooking = async (booking) => {
        if (!canRefundBooking(booking)) return;

        const bookingId = getBookingId(booking);
        const reason = window.prompt('Nhập lý do hoàn tiền:', 'Hoàn tiền bởi quản trị viên');
        if (!bookingId || reason === null) return;

        const confirmed = window.confirm(`Xác nhận hoàn tiền toàn bộ cho đơn ${booking.bookingCode || bookingId}?`);
        if (!confirmed) return;

        setError('');
        try {
            await bookingAdminApi.refund(bookingId, { reason });
            await loadBookings();
            if (getBookingId(detail?.booking) === bookingId) {
                await openDetail({ bookingId });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Hoàn tiền thất bại');
        }
    };

    const checkInBooking = async (booking) => {
        const bookingId = getBookingId(booking);
        const qrCode = window.prompt('Nhập QR code cần check-in. Để trống để check-in toàn bộ vé chưa dùng:', '');
        if (!bookingId || qrCode === null) return;
        if (!canCheckInTickets()) {
            setError('Vui lòng đăng nhập bằng tài khoản nhân viên, quản lý hoặc admin để check-in vé');
            return;
        }

        setError('');
        try {
            await bookingAdminApi.checkIn(bookingId, {
                qrCode: qrCode.trim() || undefined,
            });
            await loadBookings();
            if (getBookingId(detail?.booking) === bookingId) {
                await openDetail({ bookingId });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Check-in vé thất bại');
        }
    };

    const quickCheckIn = async (event) => {
        event.preventDefault();
        const qrCode = quickQrCode.trim();
        if (!qrCode) return;
        if (!canCheckInTickets()) {
            setError('Vui lòng đăng nhập bằng tài khoản nhân viên, quản lý hoặc admin để check-in vé');
            return;
        }

        setCheckingIn(true);
        setError('');
        try {
            await bookingAdminApi.checkInTicket({
                qrCode,
            });
            setQuickQrCode('');
            await loadBookings();
            const detailBookingId = getBookingId(detail?.booking);
            if (detailBookingId) {
                await openDetail({ bookingId: detailBookingId });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Check-in vé thất bại');
        } finally {
            setCheckingIn(false);
        }
    };

    const checkInTicket = async (ticket) => {
        const bookingId = getBookingId(detailBooking);
        if (!bookingId || !ticket?.ticketId) return;
        if (!canCheckInTickets()) {
            setError('Vui lòng đăng nhập bằng tài khoản nhân viên, quản lý hoặc admin để check-in vé');
            return;
        }

        setCheckingIn(true);
        setError('');
        try {
            await bookingAdminApi.checkIn(bookingId, {
                ticketId: ticket.ticketId,
            });
            await loadBookings();
            await openDetail({ bookingId });
        } catch (err) {
            setError(err.response?.data?.message || 'Check-in vé thất bại');
        } finally {
            setCheckingIn(false);
        }
    };

    const detailBooking = detail?.booking || {};
    const detailTickets = detail?.tickets || [];
    const detailConcessions = detail?.concessions || [];
    const detailPayments = detail?.payments || [];
    const detailRefundAmount = detailPayments.reduce((sum, payment) => sum + Number(payment.refundAmount || 0), 0);
    const detailRefundedAt = detailPayments.find((payment) => payment.refundedAt)?.refundedAt;
    const canRefundDetail = canRefundBooking({
        ...detailBooking,
        refundAmount: detailRefundAmount,
        refundedAt: detailRefundedAt,
    });
    const paidCount = bookings.filter((booking) => ['paid', 'confirmed'].includes(booking.status)).length;
    const usedCount = bookings.filter((booking) => booking.status === 'completed').length;
    const cancelledCount = bookings.filter((booking) => booking.status === 'cancelled').length;

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <h1 className="m-0">Quản lý đặt vé</h1>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {error && <div className="alert alert-warning">{error}</div>}

                    <div className="admin-management-brief">
                        <div><i className="fas fa-ticket"></i><p><span>Tổng đơn hiển thị</span><strong>{Number(total || bookings.length).toLocaleString('vi-VN')}</strong></p></div>
                        <div><i className="fas fa-credit-card"></i><p><span>Đã thanh toán</span><strong>{paidCount.toLocaleString('vi-VN')}</strong></p></div>
                        <div><i className="fas fa-check-double"></i><p><span>Đã sử dụng</span><strong>{usedCount.toLocaleString('vi-VN')}</strong></p></div>
                        <div><i className="fas fa-ban"></i><p><span>Đã hủy</span><strong>{cancelledCount.toLocaleString('vi-VN')}</strong></p></div>
                    </div>

                    <div className="card">
                        <div className="card-body">
                            <form className="form-inline align-items-end" onSubmit={quickCheckIn}>
                                <div className="mr-2 mb-2 flex-grow-1">
                                    <label className="d-block mb-1">Check-in nhanh bằng QR</label>
                                    <input
                                        className="form-control w-100"
                                        value={quickQrCode}
                                        onChange={(e) => setQuickQrCode(e.target.value)}
                                        placeholder="Dán hoặc quét QR code của vé"
                                    />
                                </div>
                                <button className="btn btn-success mb-2" type="submit" disabled={checkingIn || !quickQrCode.trim()}>
                                    <i className="fas fa-qrcode mr-1"></i> Check-in
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="card admin-filter-card">
                        <div className="card-body">
                            <form className="admin-filter-grid" onSubmit={loadBookings}>
                                <div>
                                    <label className="d-block mb-1">Từ khóa</label>
                                    <input
                                        className="form-control"
                                        value={filters.keyword}
                                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                                        placeholder="Mã vé, tên, email..."
                                    />
                                </div>
                                <div>
                                    <label className="d-block mb-1">Trạng thái</label>
                                    <select
                                        className="form-control"
                                        value={filters.status}
                                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    >
                                        {bookingStatuses.map((status) => (
                                            <option key={status.value} value={status.value}>{status.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="d-block mb-1">Phim</label>
                                    <select
                                        className="form-control"
                                        value={filters.movieId}
                                        onChange={(e) => setFilters({ ...filters, movieId: e.target.value })}
                                    >
                                        <option value="">Tất cả phim</option>
                                        {movies.map((movie) => (
                                            <option key={movie.movieId || movie.id} value={movie.movieId || movie.id}>{movie.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="d-block mb-1">Rạp</label>
                                    {isCinemaManager() ? (
                                        <input
                                            className="form-control"
                                            value={cinemas[0]?.cinemaName || `Chi nhánh #${user?.cinemaId || ''}`}
                                            disabled
                                        />
                                    ) : (
                                        <select
                                            className="form-control"
                                            value={filters.cinemaId}
                                            onChange={(e) => setFilters({ ...filters, cinemaId: e.target.value })}
                                        >
                                            <option value="">Tất cả rạp</option>
                                            {cinemas.map((cinema) => (
                                                <option key={cinema.cinemaId} value={cinema.cinemaId}>{cinema.cinemaName || cinema.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="d-block mb-1">Ngày đặt</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={filters.date}
                                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                                    />
                                </div>
                                <button className="btn btn-primary" type="submit" disabled={loading}>
                                    <i className="fas fa-search mr-1"></i> Lọc
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h3 className="card-title mb-0">Danh sách đặt vé</h3>
                            <span className="text-muted small">Tổng: {Number(total || 0).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="card-body">
                            {loading ? (
                                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped">
                                        <thead>
                                            <tr>
                                                <th>Mã đặt vé</th>
                                                <th>Khách hàng</th>
                                                <th>Phim</th>
                                                <th>Rạp / Phòng</th>
                                                <th>Suất chiếu</th>
                                                <th>Tổng tiền</th>
                                                <th>Trạng thái</th>
                                                <th style={{ width: '190px' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bookings.length === 0 ? (
                                                <tr><td colSpan="8" className="text-center">Chưa có đặt vé phù hợp</td></tr>
                                            ) : bookings.map((booking) => {
                                                const bookingId = getBookingId(booking);
                                                const ticketCount = booking.ticketCount || 0;
                                                const usedTicketCount = booking.usedTicketCount || 0;
                                                const refundAmount = Number(booking.refundAmount || booking.RefundAmount || 0);
                                                const canCheckIn = ['confirmed', 'paid', 'completed'].includes(booking.status) && usedTicketCount < ticketCount;
                                                const canRefund = canRefundBooking(booking);
                                                return (
                                                    <tr key={bookingId}>
                                                        <td>
                                                            <strong>{booking.bookingCode}</strong>
                                                            <div className="small text-muted">{formatDateTime(booking.createdAt)}</div>
                                                        </td>
                                                        <td>
                                                            {booking.fullName || '-'}
                                                            <div className="small text-muted">{booking.email || booking.phone || ''}</div>
                                                        </td>
                                                        <td>{booking.movieTitle || '-'}</td>
                                                        <td>
                                                            {booking.cinemaName || '-'}
                                                            <div className="small text-muted">{booking.hallName || ''}</div>
                                                        </td>
                                                        <td>{formatDateTime(booking.startTime)}</td>
                                                        <td>
                                                            {formatCurrency(booking.finalAmount)}
                                                            {refundAmount > 0 && (
                                                                <div className="small text-success">
                                                                    Đã hoàn {formatCurrency(refundAmount)}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${getStatusBadge(booking.status)}`}>
                                                                {getStatusLabel(booking.status)}
                                                            </span>
                                                            <div className="small text-muted">
                                                                {usedTicketCount}/{ticketCount} vé đã dùng
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            <button className="btn btn-sm btn-info mr-1" type="button" onClick={() => openDetail(booking)}>
                                                                <i className="fas fa-eye"></i>
                                                            </button>
                                                            <button className="btn btn-sm btn-success mr-1" type="button" onClick={() => checkInBooking(booking)} disabled={!canCheckIn}>
                                                                <i className="fas fa-check"></i>
                                                            </button>
                                                            {canCancelBookings && (
                                                                <>
                                                                    <button className="btn btn-sm btn-warning mr-1" type="button" onClick={() => refundBooking(booking)} disabled={!canRefund}>
                                                                        <i className="fas fa-undo-alt"></i>
                                                                    </button>
                                                                    <button className="btn btn-sm btn-danger" type="button" onClick={() => cancelBooking(booking)} disabled={booking.status === 'cancelled'}>
                                                                        <i className="fas fa-ban"></i>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {(detail || detailLoading) && (
                <div className="modal fade show" style={{ display: 'block', overflowY: 'auto' }} tabIndex="-1">
                    <div className="modal-dialog modal-xl">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Chi tiết đặt vé {detailBooking.bookingCode || ''}</h5>
                                <button type="button" className="close" onClick={closeDetail}><span>&times;</span></button>
                            </div>
                            <div className="modal-body">
                                {detailLoading ? (
                                    <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                                ) : (
                                    <>
                                        <div className="row mb-3">
                                            <div className="col-md-3"><strong>Trạng thái:</strong> {getStatusLabel(detailBooking.status)}</div>
                                            <div className="col-md-3"><strong>Tổng tiền:</strong> {formatCurrency(detailBooking.finalAmount)}</div>
                                            <div className="col-md-3"><strong>Ngày đặt:</strong> {formatDateTime(detailBooking.createdAt)}</div>
                                            <div className="col-md-3"><strong>Ngày hủy:</strong> {formatDateTime(detailBooking.cancelledAt)}</div>
                                            <div className="col-md-3 mt-2"><strong>Đã hoàn:</strong> {formatCurrency(detailRefundAmount)}</div>
                                            <div className="col-md-3 mt-2"><strong>Ngày hoàn:</strong> {formatDateTime(detailRefundedAt)}</div>
                                        </div>

                                        <h6>Vé</h6>
                                        <div className="table-responsive mb-3">
                                            <table className="table table-sm table-bordered">
                                                <thead>
                                                    <tr>
                                                        <th>ID</th>
                                                        <th>Ghế</th>
                                                        <th>Giá</th>
                                                        <th>QR</th>
                                                        <th>Check-in</th>
                                                        <th>Thao tác</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {detailTickets.length === 0 ? (
                                                        <tr><td colSpan="6" className="text-center">Chưa có vé</td></tr>
                                                    ) : detailTickets.map((ticket) => {
                                                        const canCheckInTicket = ['confirmed', 'paid', 'completed'].includes(detailBooking.status) && !ticket.isUsed;
                                                        return (
                                                            <tr key={ticket.ticketId}>
                                                                <td>{ticket.ticketId}</td>
                                                                <td>{ticket.seatCode || ticket.seatId}</td>
                                                                <td>{formatCurrency(ticket.price)}</td>
                                                                <td><code>{ticket.qrCode}</code></td>
                                                                <td>{ticket.isUsed ? `Đã dùng lúc ${formatDateTime(ticket.usedAt)}` : 'Chưa dùng'}</td>
                                                                <td>
                                                                    <button
                                                                        className="btn btn-xs btn-success"
                                                                        type="button"
                                                                        onClick={() => checkInTicket(ticket)}
                                                                        disabled={checkingIn || !canCheckInTicket}
                                                                    >
                                                                        <i className="fas fa-check mr-1"></i> Check-in
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="row">
                                            <div className="col-md-6">
                                                <h6>Bắp nước</h6>
                                                <table className="table table-sm table-bordered">
                                                    <thead>
                                                        <tr>
                                                            <th>Món</th>
                                                            <th>Số lượng</th>
                                                            <th>Thành tiền</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {detailConcessions.length === 0 ? (
                                                            <tr><td colSpan="3" className="text-center">Không có</td></tr>
                                                        ) : detailConcessions.map((item) => (
                                                            <tr key={item.id}>
                                                                <td>{item.itemId}</td>
                                                                <td>{item.quantity}</td>
                                                                <td>{formatCurrency(item.subtotal)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="col-md-6">
                                                <h6>Thanh toán</h6>
                                                <table className="table table-sm table-bordered">
                                                    <thead>
                                                        <tr>
                                                            <th>Mã GD</th>
                                                            <th>Số tiền</th>
                                                            <th>Trạng thái</th>
                                                            <th>Ngày trả</th>
                                                            <th>Đã hoàn</th>
                                                            <th>Ngày hoàn</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {detailPayments.length === 0 ? (
                                                            <tr><td colSpan="6" className="text-center">Chưa có thanh toán</td></tr>
                                                        ) : detailPayments.map((payment) => (
                                                            <tr key={payment.paymentId}>
                                                                <td>{payment.transactionRef || payment.paymentId}</td>
                                                                <td>{formatCurrency(payment.amount)}</td>
                                                                <td>{getPaymentStatusLabel(payment.status)}</td>
                                                                <td>{formatDateTime(payment.paidAt)}</td>
                                                                <td>{formatCurrency(payment.refundAmount)}</td>
                                                                <td>{formatDateTime(payment.refundedAt)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="modal-footer">
                                {canRefundBookings && (
                                    <button type="button" className="btn btn-warning" onClick={() => refundBooking(detailBooking)} disabled={!canRefundDetail}>
                                        <i className="fas fa-undo-alt mr-1"></i> Hoàn tiền
                                    </button>
                                )}
                                <button type="button" className="btn btn-secondary" onClick={closeDetail}>Đóng</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {(detail || detailLoading) && <div className="modal-backdrop fade show"></div>}
        </div>
    );
};

export default AdminBookings;
