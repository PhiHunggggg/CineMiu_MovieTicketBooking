import { useEffect, useState } from 'react';
import { bookingAdminApi, cinemaApi, movieApi } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import BookingBrief from './BookingBrief';
import BookingDetailModal from './BookingDetailModal';
import BookingFilters from './BookingFilters';
import BookingsTable from './BookingsTable';
import QuickCheckInCard from './QuickCheckInCard';
import { getBookingId, getItems, isBookingRefunded } from './bookingsUtils';

const AdminBookings = () => {
    const { user, canCheckInTickets, isAdmin, isCinemaManager } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [movies, setMovies] = useState([]);
    const [filters, setFilters] = useState({ keyword: '', status: '', movieId: '', cinemaId: '', date: '' });
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
            await bookingAdminApi.checkIn(bookingId, { qrCode: qrCode.trim() || undefined });
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
            await bookingAdminApi.checkInTicket({ qrCode });
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

    const detailBooking = detail?.booking || {};
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
            await bookingAdminApi.checkIn(bookingId, { ticketId: ticket.ticketId });
            await loadBookings();
            await openDetail({ bookingId });
        } catch (err) {
            setError(err.response?.data?.message || 'Check-in vé thất bại');
        } finally {
            setCheckingIn(false);
        }
    };

    const detailTickets = detail?.tickets || [];
    const detailConcessions = detail?.concessions || [];
    const detailPayments = detail?.payments || [];
    const detailRefundAmount = detailPayments.reduce((sum, payment) => sum + Number(payment.refundAmount || 0), 0);
    const detailRefundedAt = detailPayments.find((payment) => payment.refundedAt)?.refundedAt;
    const canRefundDetail = canRefundBooking({ ...detailBooking, refundAmount: detailRefundAmount, refundedAt: detailRefundedAt });

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="admin-page-title">
                        <div>
                            <p className="admin-eyebrow">Vận hành vé</p>
                            <h1 className="m-0">Quản lý đặt vé</h1>
                            <span>Tra cứu đơn, check-in QR, hoàn tiền và theo dõi trạng thái sử dụng vé.</span>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {error && <div className="alert alert-warning">{error}</div>}
                    <BookingBrief bookings={bookings} total={total} />
                    <QuickCheckInCard checkingIn={checkingIn} onSubmit={quickCheckIn} quickQrCode={quickQrCode} setQuickQrCode={setQuickQrCode} />
                    <BookingFilters
                        cinemas={cinemas}
                        filters={filters}
                        isCinemaManager={isCinemaManager()}
                        loading={loading}
                        movies={movies}
                        onSubmit={loadBookings}
                        setFilters={setFilters}
                        user={user}
                    />
                    <BookingsTable
                        bookings={bookings}
                        canCancelBookings={canCancelBookings}
                        canRefundBooking={canRefundBooking}
                        cancelBooking={cancelBooking}
                        checkInBooking={checkInBooking}
                        loading={loading}
                        openDetail={openDetail}
                        refundBooking={refundBooking}
                        total={total}
                    />
                </div>
            </section>

            <BookingDetailModal
                canRefundBookings={canRefundBookings}
                canRefundDetail={canRefundDetail}
                checkInTicket={checkInTicket}
                checkingIn={checkingIn}
                closeDetail={closeDetail}
                detail={detail}
                detailBooking={detailBooking}
                detailConcessions={detailConcessions}
                detailLoading={detailLoading}
                detailPayments={detailPayments}
                detailRefundAmount={detailRefundAmount}
                detailRefundedAt={detailRefundedAt}
                detailTickets={detailTickets}
                refundBooking={refundBooking}
            />
        </div>
    );
};

export default AdminBookings;
