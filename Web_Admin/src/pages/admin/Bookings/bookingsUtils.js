export const bookingStatuses = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'Chờ thanh toán' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'completed', label: 'Đã sử dụng' },
    { value: 'cancelled', label: 'Đã hủy' },
];

export const getItems = (data) => data?.items || data?.data || data || [];

export const getBookingId = (booking) => booking?.bookingId ?? booking?.BookingId ?? booking?.id;

export const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

export const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '-');

export const getStatusLabel = (status) => {
    const map = {
        pending: 'Chờ thanh toán',
        confirmed: 'Đã xác nhận',
        paid: 'Đã thanh toán',
        completed: 'Đã sử dụng',
        cancelled: 'Đã hủy',
    };
    return map[status] || status || '-';
};

export const getStatusBadge = (status) => {
    const map = {
        pending: 'badge-warning',
        confirmed: 'badge-success',
        paid: 'badge-success',
        completed: 'badge-primary',
        cancelled: 'badge-secondary',
    };
    return map[status] || 'badge-light';
};

export const getPaymentStatusLabel = (status) => {
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

export const isBookingRefunded = (booking) =>
    Number(booking?.refundAmount || booking?.RefundAmount || 0) > 0 || !!(booking?.refundedAt || booking?.RefundedAt);
