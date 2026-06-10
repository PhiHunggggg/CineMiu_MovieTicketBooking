import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ShowtimeSelect from '../../components/Steps/ShowtimeSelect/ShowtimeSelect';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import {
    bookingApi,
    cinemaApi,
    lookupApi,
    movieApi,
    showtimeApi,
} from '../../services/api';
import { getUserId } from '../../utils/authUser';
import './BookingPage.css';

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

export default function BookingPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, isLoggedIn } = useAuth();
    const {
        cinema,
        movie,
        showtime,
        hall,
        selectCinema,
        selectMovie,
        resetBooking,
    } = useBooking();
    const [cinemas, setCinemas] = useState([]);
    const [movies, setMovies] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [seats, setSeats] = useState([]);
    const [selectedSeatIds, setSelectedSeatIds] = useState([]);
    const [promoCode, setPromoCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [seatLoading, setSeatLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [sessionId] = useState(() => (
        globalThis.crypto?.randomUUID?.() || `booking-${Date.now()}-${Math.random()}`
    ));

    useEffect(() => {
        Promise.all([
            cinemaApi.getAll(),
            movieApi.getAll({ status: 'now_showing', pageSize: 100 }),
            lookupApi.getAll(),
        ])
            .then(([cinemaData, movieData, lookupData]) => {
                setCinemas(cinemaData);
                setMovies(movieData.items || []);
                setPaymentMethods(lookupData.paymentMethods || []);

                const requestedCinemaId = Number(searchParams.get('cinemaId'));
                const requestedMovieId = Number(searchParams.get('movieId'));
                if (requestedCinemaId) {
                    selectCinema(cinemaData.find((item) => item.cinemaId === requestedCinemaId) || null);
                }
                if (requestedMovieId) {
                    selectMovie((movieData.items || []).find((item) => item.movieId === requestedMovieId) || null);
                }
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [searchParams, selectCinema, selectMovie]);

    useEffect(() => {
        if (!showtime?.showtimeId) {
            setSeats([]);
            setSelectedSeatIds([]);
            return;
        }

        setSeatLoading(true);
        setError('');
        showtimeApi.getSeats(showtime.showtimeId, {
            userId: getUserId(user),
            sessionId,
        })
            .then((data) => {
                setSeats(data);
                setSelectedSeatIds((current) => current.filter((id) => (
                    data.some((seat) => seat.seatId === id && !seat.isBooked && !seat.isLocked)
                )));
            })
            .catch((err) => setError(err.message))
            .finally(() => setSeatLoading(false));
    }, [showtime, user, sessionId]);

    const selectedSeats = useMemo(
        () => seats.filter((seat) => selectedSeatIds.includes(seat.seatId)),
        [seats, selectedSeatIds],
    );
    const total = selectedSeats.reduce((sum, seat) => sum + Number(seat.price || 0), 0);

    const toggleSeat = (seat) => {
        if (seat.isBooked || seat.isLocked) return;
        setSelectedSeatIds((current) => current.includes(seat.seatId)
            ? current.filter((id) => id !== seat.seatId)
            : [...current, seat.seatId]);
    };

    const handlePayment = async () => {
        if (!isLoggedIn) {
            navigate('/login', { state: { from: window.location.pathname + window.location.search } });
            return;
        }
        if (!showtime || selectedSeats.length === 0) {
            setError('Vui lòng chọn suất chiếu và ít nhất một ghế.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const userId = getUserId(user);
            await showtimeApi.lockSeats(showtime.showtimeId, {
                userId,
                sessionId,
                seatIds: selectedSeatIds,
                minutes: 10,
            });

            const booking = await bookingApi.create({
                userId,
                showtimeId: showtime.showtimeId,
                seats: selectedSeats.map((seat) => ({
                    seatId: seat.seatId,
                    price: seat.price,
                })),
                concessions: [],
                promoCode: promoCode.trim() || null,
                bookingChannel: 'web',
            });

            await bookingApi.addPayment(booking.bookingId, {
                methodId: paymentMethods[0]?.methodId || 1,
                transactionRef: `WEB-${booking.bookingCode}-${Date.now()}`,
                amount: booking.finalAmount,
            });

            resetBooking();
            navigate('/my-tickets', { replace: true });
        } catch (err) {
            setError(err.message || 'Không thể hoàn tất đặt vé.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="booking-page container">Đang tải dữ liệu đặt vé...</div>;

    return (
        <div className="booking-page container">
            <div className="booking-page__header">
                <p>Đặt vé trực tuyến</p>
                <h1>Chọn phim, suất chiếu và ghế</h1>
            </div>

            {error && <p className="form-error booking-page__error">{error}</p>}

            <section className="booking-panel">
                <div>
                    <label htmlFor="booking-cinema">Rạp chiếu</label>
                    <select
                        id="booking-cinema"
                        value={cinema?.cinemaId || ''}
                        onChange={(event) => selectCinema(
                            cinemas.find((item) => item.cinemaId === Number(event.target.value)) || null,
                        )}
                    >
                        <option value="">Chọn rạp</option>
                        {cinemas.map((item) => (
                            <option key={item.cinemaId} value={item.cinemaId}>
                                {item.cinemaName} - {item.city}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="booking-movie">Phim</label>
                    <select
                        id="booking-movie"
                        value={movie?.movieId || ''}
                        onChange={(event) => selectMovie(
                            movies.find((item) => item.movieId === Number(event.target.value)) || null,
                        )}
                    >
                        <option value="">Chọn phim</option>
                        {movies.map((item) => (
                            <option key={item.movieId} value={item.movieId}>{item.title}</option>
                        ))}
                    </select>
                </div>
            </section>

            {cinema && movie && <ShowtimeSelect />}

            {showtime && (
                <section className="seat-section">
                    <div className="seat-section__header">
                        <div>
                            <p>{cinema.cinemaName} · {hall?.name || hall?.hallName}</p>
                            <h2>Chọn ghế</h2>
                        </div>
                        <span>{selectedSeats.length} ghế · {formatPrice(total)}</span>
                    </div>
                    <div className="screen">Màn hình</div>
                    {seatLoading ? (
                        <p>Đang tải sơ đồ ghế...</p>
                    ) : (
                        <div className="seat-map">
                            {seats.map((seat) => (
                                <button
                                    type="button"
                                    key={seat.seatId}
                                    className={[
                                        'seat',
                                        selectedSeatIds.includes(seat.seatId) ? 'seat--selected' : '',
                                        seat.isBooked ? 'seat--booked' : '',
                                        seat.isLocked ? 'seat--locked' : '',
                                    ].join(' ')}
                                    disabled={seat.isBooked || seat.isLocked}
                                    title={`${seat.seatTypeName || 'Ghế'} - ${formatPrice(seat.price)}`}
                                    onClick={() => toggleSeat(seat)}
                                >
                                    {seat.seatCode}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="seat-legend">
                        <span><i className="seat" /> Còn trống</span>
                        <span><i className="seat seat--selected" /> Đang chọn</span>
                        <span><i className="seat seat--booked" /> Đã bán/đang giữ</span>
                    </div>
                </section>
            )}

            {selectedSeats.length > 0 && (
                <section className="checkout-panel">
                    <div>
                        <label htmlFor="promo-code">Mã khuyến mãi</label>
                        <input
                            id="promo-code"
                            value={promoCode}
                            onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                            placeholder="Nhập mã nếu có"
                        />
                    </div>
                    <div className="checkout-panel__summary">
                        <span>Tạm tính</span>
                        <strong>{formatPrice(total)}</strong>
                        <button type="button" onClick={handlePayment} disabled={submitting}>
                            {submitting ? 'Đang xử lý...' : isLoggedIn ? 'Thanh toán và đặt vé' : 'Đăng nhập để tiếp tục'}
                        </button>
                    </div>
                </section>
            )}

            {!isLoggedIn && (
                <p className="booking-page__login-note">
                    Bạn có thể chọn suất và ghế trước. <Link to="/login">Đăng nhập</Link> khi thanh toán.
                </p>
            )}
        </div>
    );
}
