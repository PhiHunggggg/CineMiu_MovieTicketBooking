const BookingBrief = ({ bookings, total }) => {
    const paidCount = bookings.filter((booking) => ['paid', 'confirmed'].includes(booking.status)).length;
    const usedCount = bookings.filter((booking) => booking.status === 'completed').length;
    const cancelledCount = bookings.filter((booking) => booking.status === 'cancelled').length;

    return (
        <div className="admin-management-brief">
            <div><i className="fas fa-ticket"></i><p><span>Tổng đơn hiển thị</span><strong>{Number(total || bookings.length).toLocaleString('vi-VN')}</strong></p></div>
            <div><i className="fas fa-credit-card"></i><p><span>Đã thanh toán</span><strong>{paidCount.toLocaleString('vi-VN')}</strong></p></div>
            <div><i className="fas fa-check-double"></i><p><span>Đã sử dụng</span><strong>{usedCount.toLocaleString('vi-VN')}</strong></p></div>
            <div><i className="fas fa-ban"></i><p><span>Đã hủy</span><strong>{cancelledCount.toLocaleString('vi-VN')}</strong></p></div>
        </div>
    );
};

export default BookingBrief;
