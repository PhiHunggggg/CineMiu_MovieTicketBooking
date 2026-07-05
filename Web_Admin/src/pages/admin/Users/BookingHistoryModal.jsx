const BookingHistoryModal = ({ bookingHistory, historyLoading, historyUser, onClose }) => {
    if (!historyUser) return null;

    return (
        <>
            <div className="modal fade show admin-modal" style={{ display: 'block' }} tabIndex="-1">
                <div className="modal-dialog modal-xl">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div>
                                <small>LỊCH SỬ GIAO DỊCH</small>
                                <h5>{historyUser.fullName || historyUser.email}</h5>
                            </div>
                            <button type="button" className="close" onClick={onClose}>
                                <span>&times;</span>
                            </button>
                        </div>
                        <div className="modal-body p-0">
                            {historyLoading ? (
                                <div className="admin-loading">
                                    <div className="spinner-border text-primary"></div>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table admin-table mb-0">
                                        <thead>
                                            <tr>
                                                <th>Mã đặt vé</th>
                                                <th>Phim</th>
                                                <th>Rạp</th>
                                                <th>Ngày đặt</th>
                                                <th>Giá trị</th>
                                                <th>Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bookingHistory.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-5 text-muted">Khách hàng chưa có lịch sử đặt vé</td>
                                                </tr>
                                            ) : (
                                                bookingHistory.map((item, index) => {
                                                    const booking = item.booking || item.Booking || item;
                                                    const movie = item.movie || item.Movie || {};
                                                    const cinema = item.cinema || item.Cinema || {};
                                                    return (
                                                        <tr key={booking.bookingId || booking.BookingId || index}>
                                                            <td><strong>{booking.bookingCode || booking.BookingCode || '-'}</strong></td>
                                                            <td>{movie.title || movie.Title || '-'}</td>
                                                            <td>{cinema.cinemaName || cinema.CinemaName || '-'}</td>
                                                            <td>{booking.createdAt || booking.CreatedAt ? new Date(booking.createdAt || booking.CreatedAt).toLocaleString('vi-VN') : '-'}</td>
                                                            <td>{Number(booking.finalAmount || booking.FinalAmount || 0).toLocaleString('vi-VN')} ₫</td>
                                                            <td><span className="badge badge-info">{booking.status || booking.Status || '-'}</span></td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-light" onClick={onClose}>Đóng</button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    );
};

export default BookingHistoryModal;
