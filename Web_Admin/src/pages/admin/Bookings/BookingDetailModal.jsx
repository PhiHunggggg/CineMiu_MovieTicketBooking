import { formatCurrency, formatDateTime, getPaymentStatusLabel, getStatusLabel } from './bookingsUtils';

const BookingDetailModal = ({
    canRefundBookings,
    canRefundDetail,
    checkInTicket,
    checkingIn,
    closeDetail,
    detail,
    detailBooking,
    detailConcessions,
    detailLoading,
    detailPayments,
    detailRefundAmount,
    detailRefundedAt,
    detailTickets,
    refundBooking,
}) => {
    if (!detail && !detailLoading) return null;

    return (
        <>
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
                                            <thead><tr><th>ID</th><th>Ghế</th><th>Giá</th><th>QR</th><th>Check-in</th><th>Thao tác</th></tr></thead>
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
                                                                <button className="btn btn-xs btn-success" type="button" onClick={() => checkInTicket(ticket)} disabled={checkingIn || !canCheckInTicket}>
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
                                                <thead><tr><th>Món</th><th>Số lượng</th><th>Thành tiền</th></tr></thead>
                                                <tbody>
                                                    {detailConcessions.length === 0 ? (
                                                        <tr><td colSpan="3" className="text-center">Không có</td></tr>
                                                    ) : detailConcessions.map((item) => (
                                                        <tr key={item.id}><td>{item.itemId}</td><td>{item.quantity}</td><td>{formatCurrency(item.subtotal)}</td></tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="col-md-6">
                                            <h6>Thanh toán</h6>
                                            <table className="table table-sm table-bordered">
                                                <thead><tr><th>Mã GD</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày trả</th><th>Đã hoàn</th><th>Ngày hoàn</th></tr></thead>
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
            <div className="modal-backdrop fade show"></div>
        </>
    );
};

export default BookingDetailModal;
