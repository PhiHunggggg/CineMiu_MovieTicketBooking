import { useEffect, useState } from 'react';
import { bookingApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getUserEmail, getUserId } from '../../utils/authUser';
import './MyTicketsPage.css';

const statusLabels = {
    pending: 'Chờ thanh toán',
    confirmed: 'Đã thanh toán',
    cancelled: 'Đã hủy',
};

function formatPrice(value) {
    return new Intl.NumberFormat('vi-VN').format(value || 0) + 'đ';
}

function formatDateTime(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function normalizeTicket(raw) {
    return raw?.booking ? raw : { booking: raw };
}

export default function MyTicketsPage() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const userId = getUserId(user);
    const email = getUserEmail(user);

    useEffect(() => {
        let ignore = false;

        Promise.resolve()
            .then(() => {
                if (!userId && !email) {
                    if (!ignore) {
                        setTickets([]);
                        setLoading(false);
                    }
                    return null;
                }

                if (!ignore) {
                    setLoading(true);
                    setError('');
                }

                return userId ? bookingApi.getByUser(userId) : bookingApi.getByEmail(email);
            })
            .then(data => {
                if (!ignore && data) setTickets(Array.isArray(data) ? data.map(normalizeTicket) : []);
            })
            .catch(err => {
                if (!ignore) setError(err.message || 'Không thể tải danh sách vé.');
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [userId, email]);

    if (loading) {
        return <div className="my-tickets-page container">Đang tải vé...</div>;
    }

    return (
        <div className="my-tickets-page container">
            <div className="my-tickets-page__header">
                <div>
                    <h1>Vé của tôi</h1>
                    <p>Theo dõi toàn bộ vé, thanh toán, ghế và điểm đã nhận.</p>
                </div>
                <span>{tickets.length} vé</span>
            </div>

            {error && <p className="my-tickets-page__error">{error}</p>}

            {tickets.length === 0 ? (
                <div className="my-tickets-page__empty">
                    <h2>Chưa có vé nào</h2>
                    <p>Những vé bạn đặt thành công sẽ xuất hiện tại đây.</p>
                </div>
            ) : (
                <div className="my-tickets-page__list">
                    {tickets.map(item => {
                        const booking = item.booking;
                        const seats = item.tickets || [];
                        const concessions = item.concessions || [];
                        const payments = item.payments || [];
                        const points = item.pointTransactions?.reduce((sum, tx) => sum + (tx.points || 0), 0) || 0;

                        return (
                            <article key={booking.bookingId} className="ticket-card">
                                <div className="ticket-card__poster">
                                    {item.movie?.posterUrl ? (
                                        <img src={item.movie.posterUrl} alt={item.movie.title} />
                                    ) : (
                                        <span>{item.movie?.title?.charAt(0) || 'C'}</span>
                                    )}
                                </div>

                                <div className="ticket-card__body">
                                    <div className="ticket-card__top">
                                        <div>
                                            <h2>{item.movie?.title || 'Vé xem phim'}</h2>
                                            <p>{item.cinema?.cinemaName || '-'} · {item.hall?.hallName || '-'}</p>
                                        </div>
                                        <span className={`ticket-card__status ticket-card__status--${booking.status}`}>
                                            {statusLabels[booking.status] || booking.status}
                                        </span>
                                    </div>

                                    <div className="ticket-card__grid">
                                        <div>
                                            <span>Mã vé</span>
                                            <strong>{booking.bookingCode}</strong>
                                        </div>
                                        <div>
                                            <span>Suất chiếu</span>
                                            <strong>{formatDateTime(item.showtime?.startTime)}</strong>
                                        </div>
                                        <div>
                                            <span>Ghế</span>
                                            <strong>{seats.map(x => x.seat?.seatCode).filter(Boolean).join(', ') || '-'}</strong>
                                        </div>
                                        <div>
                                            <span>Thanh toán</span>
                                            <strong>{formatPrice(booking.finalAmount ?? booking.totalAmount)}</strong>
                                        </div>
                                        <div>
                                            <span>Điểm nhận</span>
                                            <strong>{points > 0 ? `+${points}` : '0'}</strong>
                                        </div>
                                        <div>
                                            <span>Phương thức</span>
                                            <strong>{payments[0]?.methodId ? `#${payments[0].methodId}` : '-'}</strong>
                                        </div>
                                    </div>

                                    {concessions.length > 0 && (
                                        <div className="ticket-card__section">
                                            <span>Đồ ăn & thức uống</span>
                                            <p>
                                                {concessions.map(x => `${x.item?.itemName || 'Sản phẩm'} x${x.concession?.quantity || 0}`).join(', ')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
