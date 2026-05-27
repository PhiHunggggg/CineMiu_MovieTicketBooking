import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { movieApi, showtimeApi } from '../../services/api';
import './MovieDetailPage.css';

function formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function formatTime(value) {
    if (!value) return '';
    return new Date(value).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatPrice(value) {
    return new Intl.NumberFormat('vi-VN').format(value || 0) + 'đ';
}

export default function MovieDetailPage() {
    const { movieId } = useParams();
    const [result, setResult] = useState({
        movieId: null,
        movie: null,
        showtimes: [],
        error: '',
    });

    useEffect(() => {
        let active = true;

        Promise.all([
            movieApi.getById(movieId),
            showtimeApi.getAll({ movieId }).catch(() => []),
        ])
            .then(([detail, schedule]) => {
                if (!active) return;
                setResult({
                    movieId,
                    movie: detail.movie || detail,
                    showtimes: Array.isArray(schedule) ? schedule : [],
                    error: '',
                });
            })
            .catch(() => {
                if (!active) return;
                setResult({
                    movieId,
                    movie: null,
                    showtimes: [],
                    error: 'Không thể tải thông tin phim. Vui lòng thử lại sau.',
                });
            });

        return () => {
            active = false;
        };
    }, [movieId]);

    const loading = result.movieId !== movieId;
    const movie = loading ? null : result.movie;
    const error = loading ? '' : result.error;

    const cinemas = useMemo(() => {
        const showtimes = result.movieId === movieId ? result.showtimes : [];
        const grouped = new Map();
        const now = new Date();
        const sevenDaysLater = new Date(now);
        sevenDaysLater.setDate(now.getDate() + 7);

        showtimes.filter(item => {
            const startTime = item.showtime?.startTime;
            if (!startTime || item.showtime?.status === 'cancelled') return false;
            const start = new Date(startTime);
            return start >= now && start <= sevenDaysLater;
        }).forEach(item => {
            const cinemaId = item.cinema?.cinemaId || item.cinema?.id;
            if (!cinemaId) return;
            if (!grouped.has(cinemaId)) {
                grouped.set(cinemaId, { cinema: item.cinema, showtimes: [] });
            }
            grouped.get(cinemaId).showtimes.push(item);
        });
        return Array.from(grouped.values());
    }, [movieId, result]);

    if (loading) {
        return (
            <div className="movie-detail container movie-detail__state">
                <div className="skeleton movie-detail__skeleton" />
            </div>
        );
    }

    if (error || !movie) {
        return (
            <div className="movie-detail container movie-detail__state">
                <h1>Không tìm thấy phim</h1>
                <p>{error || 'Phim bạn đang tìm không tồn tại.'}</p>
                <Link className="movie-detail__button movie-detail__button--primary" to="/movies">Quay lại danh sách phim</Link>
            </div>
        );
    }

    const bookingUrl = `/bookings?flow=movie_first&movieId=${movie.movieId || movie.id}`;
    const statusLabel = {
        now_showing: 'Đang chiếu',
        coming_soon: 'Sắp chiếu',
        ended: 'Đã kết thúc',
    }[movie.status] || movie.status;

    return (
        <div className="movie-detail" id="movie-detail-page">
            <section className="movie-detail__hero">
                <div
                    className="movie-detail__backdrop"
                    style={{ backgroundImage: `url(${movie.bannerUrl || movie.posterUrl || ''})` }}
                />
                <div className="movie-detail__shade" />
                <div className="movie-detail__content container">
                    <div className="movie-detail__poster">
                        {movie.posterUrl ? <img src={movie.posterUrl} alt={movie.title} /> : <span>🎬</span>}
                    </div>
                    <div className="movie-detail__info">
                        <Link className="movie-detail__back" to="/movies">← Phim</Link>
                        <div className="movie-detail__badges">
                            {movie.ageRating && <span className="movie-detail__badge movie-detail__badge--age">{movie.ageRating}</span>}
                            {movie.imdbRating && <span className="movie-detail__badge">★ {Number(movie.imdbRating).toFixed(1)}</span>}
                            {movie.status && <span className="movie-detail__badge">{statusLabel}</span>}
                        </div>
                        <h1>{movie.title}</h1>
                        {movie.titleEn && <p className="movie-detail__original">{movie.titleEn}</p>}
                        <div className="movie-detail__meta">
                            {movie.durationMins && <span>{movie.durationMins} phút</span>}
                            {movie.releaseDate && <span>Khởi chiếu: {formatDate(movie.releaseDate)}</span>}
                            {movie.language && <span>{movie.language}</span>}
                            {movie.genres?.length > 0 && <span>{movie.genres.join(', ')}</span>}
                        </div>
                        {movie.synopsis && <p className="movie-detail__synopsis">{movie.synopsis}</p>}
                        <div className="movie-detail__credits">
                            {movie.director && <p><strong>Đạo diễn:</strong> {movie.director}</p>}
                            {movie.castMembers && <p><strong>Diễn viên:</strong> {movie.castMembers}</p>}
                            {movie.subtitle && <p><strong>Phụ đề:</strong> {movie.subtitle}</p>}
                        </div>
                        <div className="movie-detail__actions">
                            <Link to={bookingUrl} className="movie-detail__button movie-detail__button--primary">Đặt vé ngay</Link>
                            {movie.trailerUrl && (
                                <a href={movie.trailerUrl} target="_blank" rel="noopener noreferrer" className="movie-detail__button">
                                    Xem trailer
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="movie-detail__schedule container" id="movie-detail-showtimes">
                <h2>Lịch chiếu trong 7 ngày tới</h2>
                {cinemas.length === 0 ? (
                    <div className="movie-detail__empty">
                        <p>Chưa có lịch chiếu cho phim này.</p>
                        <Link to={bookingUrl}>Tiếp tục chọn phim trong quy trình đặt vé</Link>
                    </div>
                ) : (
                    cinemas.map(({ cinema, showtimes: cinemaShowtimes }) => {
                        const cinemaId = cinema.cinemaId || cinema.id;
                        return (
                            <article className="movie-detail__cinema" key={cinemaId}>
                                <div className="movie-detail__cinema-head">
                                    <div>
                                        <h3>{cinema.name}</h3>
                                        {cinema.address && <p>{cinema.address}</p>}
                                    </div>
                                    <Link to={`${bookingUrl}&cinemaId=${cinemaId}`} className="movie-detail__select-cinema">
                                        Đặt tại rạp này
                                    </Link>
                                </div>
                                <div className="movie-detail__times">
                                    {cinemaShowtimes.map(item => (
                                        <Link
                                            key={item.showtime.showtimeId || item.showtime.id}
                                            to={`${bookingUrl}&cinemaId=${cinemaId}`}
                                            className="movie-detail__time"
                                        >
                                            <strong>{formatTime(item.showtime.startTime)}</strong>
                                            <span>{formatDate(item.showtime.startTime)}</span>
                                            <span>{item.hall?.name}</span>
                                            <span>Từ {formatPrice(item.showtime.basePrice)}</span>
                                            <small>{item.showtime.availableSeats} ghế trống</small>
                                        </Link>
                                    ))}
                                </div>
                            </article>
                        );
                    })
                )}
            </section>
        </div>
    );
}
