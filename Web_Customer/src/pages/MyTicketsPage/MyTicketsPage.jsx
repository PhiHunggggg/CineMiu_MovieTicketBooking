import { useEffect, useState } from 'react';
import { bookingApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getUserEmail, getUserId } from '../../utils/authUser';
import { Link } from 'react-router-dom';
import './MyTicketsPage.css';

const statusLabels = {
  pending: 'Chờ thanh toán',
  confirmed: 'Đã thanh toán',
  paid: 'Đã thanh toán',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

const methodLabels = {
  1: 'MoMo',
  2: 'ZaloPay',
  3: 'VNPay',
  4: 'Visa / Mastercard',
  5: 'ATM nội địa',
  6: 'VietQR',
};

function pick(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

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
  if (raw?.booking || raw?.Booking) {
    const booking = raw.booking ?? raw.Booking;
    return {
      booking,
      movie: {
        movieId: pick(raw.movie?.movieId, raw.Movie?.MovieId, booking.movieId, booking.MovieId),
        title: pick(raw.movie?.title, raw.Movie?.Title, booking.movieTitle, booking.MovieTitle),
        posterUrl: pick(raw.movie?.posterUrl, raw.Movie?.PosterUrl, booking.moviePosterUrl, booking.MoviePosterUrl, booking.posterUrl, booking.PosterUrl),
      },
      cinema: {
        cinemaName: pick(raw.cinema?.cinemaName, raw.Cinema?.CinemaName, booking.cinemaName, booking.CinemaName),
      },
      hall: {
        hallName: pick(raw.hall?.hallName, raw.Hall?.HallName, booking.hallName, booking.HallName),
      },
      showtime: {
        startTime: pick(raw.showtime?.startTime, raw.Showtime?.StartTime, booking.startTime, booking.StartTime),
      },
      tickets: raw.tickets ?? raw.Tickets ?? booking.tickets ?? booking.Tickets ?? [],
      concessions: raw.concessions ?? raw.Concessions ?? booking.concessions ?? booking.Concessions ?? [],
      payments: raw.payments ?? raw.Payments ?? booking.payments ?? booking.Payments ?? [],
      pointTransactions: raw.pointTransactions ?? raw.PointTransactions ?? booking.pointTransactions ?? booking.PointTransactions ?? [],
    };
  }

  return {
    booking: raw,
    movie: { 
      movieId: pick(raw?.movieId, raw?.MovieId),
      title: pick(raw?.movieTitle, raw?.MovieTitle), 
      posterUrl: pick(raw?.moviePosterUrl, raw?.MoviePosterUrl) 
    },
    cinema: { cinemaName: pick(raw?.cinemaName, raw?.CinemaName) },
    hall: { hallName: pick(raw?.hallName, raw?.HallName) },
    showtime: { startTime: pick(raw?.startTime, raw?.StartTime) },
    tickets: raw?.tickets ?? raw?.Tickets ?? [],
    concessions: raw?.concessions ?? raw?.Concessions ?? [],
    payments: raw?.payments ?? raw?.Payments ?? [],
    pointTransactions: raw?.pointTransactions ?? raw?.PointTransactions ?? [],
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
            const bookingId = pick(booking.bookingId, booking.BookingId);
            const seats = item.tickets || [];
            const concessions = item.concessions || [];
            const payments = item.payments || [];
            const latestPayment = payments[0];
            const methodId = latestPayment?.methodId ?? latestPayment?.MethodId;
            const points = item.pointTransactions
              ?.filter(tx => (tx.transactionType ?? tx.TransactionType) === 'earn')
              .reduce((sum, tx) => sum + (tx.points ?? tx.Points ?? 0), 0) || 0;
            const status = (booking.status ?? booking.Status ?? '').toLowerCase();

            return (
              <article key={bookingId} className="ticket-card">
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
                      <p>{item.cinema?.cinemaName || '-'} - {item.hall?.hallName || '-'}</p>
                    </div>
                    <span className={`ticket-card__status ticket-card__status--${status}`}>
                      {statusLabels[status] || booking.status || booking.Status}
                    </span>
                    {status === 'completed' && item.movie?.movieId && (
                      <Link 
                        to={`/movies/${item.movie.movieId}#movie-detail-reviews`} 
                        className="ticket-card__review-btn"
                        style={{
                          display: 'inline-block',
                          marginLeft: '1rem',
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.875rem',
                          backgroundColor: '#3b82f6',
                          color: '#fff',
                          borderRadius: '4px',
                          textDecoration: 'none'
                        }}
                      >
                        Viết đánh giá
                      </Link>
                    )}
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
                      <strong>{methodLabels[methodId] || (methodId ? `#${methodId}` : '-')}</strong>
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
