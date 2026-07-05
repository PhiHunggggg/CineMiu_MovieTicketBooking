import { formatCurrency, formatDateTime, getBookingId, getStatusBadge, getStatusLabel } from './bookingsUtils';

const BookingsTable = ({
    bookings,
    canCancelBookings,
    canRefundBooking,
    cancelBooking,
    checkInBooking,
    loading,
    openDetail,
    refundBooking,
    total,
}) => (
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
                                            {refundAmount > 0 && <div className="small text-success">Đã hoàn {formatCurrency(refundAmount)}</div>}
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(booking.status)}`}>{getStatusLabel(booking.status)}</span>
                                            <div className="small text-muted">{usedTicketCount}/{ticketCount} vé đã dùng</div>
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
);

export default BookingsTable;
