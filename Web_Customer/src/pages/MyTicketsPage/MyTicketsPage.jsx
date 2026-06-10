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
  if (raw?.booking) return raw;
  return {
    booking: raw,
    movie: { title: raw?.movieTitle ?? raw?.MovieTitle },
    cinema: { cinemaName: raw?.cinemaName ?? raw?.CinemaName },
    hall: { hallName: raw?.hallName ?? raw?.HallName },
    showtime: { startTime: raw?.startTime ?? raw?.StartTime },
    tickets: raw?.tickets ?? raw?.Tickets ?? [],
    concessions: raw?.concessions ?? raw?.Concessions ?? [],
    payments: raw?.payments ?? raw?.Payments ?? [],
  };
}

export default function MyTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userId = getUserId(user);
  const email = getUserEmail(user);

  useEffect(() => {
    if (!userId && !email) {
      setLoading(false);
      setTickets([]);
      return;
    }

    setLoading(true);
    setError('');

    const request = userId ? bookingApi.getByUser(userId) : bookingApi.getByEmail(email);
    request
      .then(data => setTickets(Array.isArray(data) ? data.map(normalizeTicket) : []))
      .catch(err => setError(err.message || 'Không thể tải danh sách vé.'))
      .finally(() => setLoading(false));
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
                    <span className={`ticket-card__status ticket-card__status--${(booking.status ?? booking.Status ?? '').toLowerCase()}`}>
                      {statusLabels[(booking.status ?? booking.Status ?? '').toLowerCase()] || booking.status || booking.Status}
                    </span>
                  </div>

                  <div className="ticket-card__grid">
                    <div>
                      <span>Mã vé</span>
                      <strong>{booking.bookingCode ?? booking.BookingCode}</strong>
                    </div>
                    <div>
                      <span>Suất chiếu</span>
                      <strong>{formatDateTime(item.showtime?.startTime)}</strong>
                    </div>
                    <div>
                      <span>Ghế</span>
                      <strong>{seats.map(x => x.seat?.seatCode ?? x.seatCode ?? x.SeatCode).filter(Boolean).join(', ') || '-'}</strong>
                    </div>
                    <div>
                      <span>Thanh toán</span>
                      <strong>{formatPrice(booking.finalAmount ?? booking.FinalAmount ?? booking.totalAmount ?? booking.TotalAmount)}</strong>
                    </div>
                    <div>
                      <span>Điểm nhận</span>
                      <strong>{points > 0 ? `+${points}` : '0'}</strong>
                    </div>
                    <div>
                      <span>Phương thức</span>
                      <strong>{payments[0]?.methodId || payments[0]?.MethodId ? `#${payments[0]?.methodId ?? payments[0]?.MethodId}` : '-'}</strong>
                    </div>
                  </div>

                  {concessions.length > 0 && (
                    <div className="ticket-card__section">
                      <span>Đồ ăn & thức uống</span>
                      <p>
                        {concessions.map(x => `${x.item?.itemName || x.itemName || x.ItemName || 'Sản phẩm'} x${x.concession?.quantity || x.quantity || x.Quantity || 0}`).join(', ')}
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
