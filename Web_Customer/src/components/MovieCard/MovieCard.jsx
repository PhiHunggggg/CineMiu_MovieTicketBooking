import { Link } from 'react-router-dom';

export default function MovieCard({ movie }) {
    const movieId = movie.movieId || movie.id;
    return (
        <article className="mp-movie-card">
            <Link to={`/movies/${movieId}`} className="mp-movie-card__poster">
                {movie.posterUrl ? (
                    <img src={movie.posterUrl} alt={movie.title} loading="lazy" />
                ) : (
                    <span className="mp-movie-card__placeholder">Phim</span>
                )}
                {movie.ageRating && <span className="mp-movie-card__rated">{movie.ageRating}</span>}
                {movie.imdbRating && (
                    <span className="mp-movie-card__rating">★ {Number(movie.imdbRating).toFixed(1)}</span>
                )}
                <span className="mp-movie-card__overlay">
                    <span className="mp-movie-card__detail-btn">Xem chi tiết</span>
                </span>
            </Link>
            <div className="mp-movie-card__body">
                <Link to={`/movies/${movieId}`} className="mp-movie-card__title">{movie.title}</Link>
                <div className="mp-movie-card__meta">
                    <span>{movie.durationMins ? `${movie.durationMins} phút` : 'Chưa cập nhật'}</span>
                    <span>{movie.genres?.slice(0, 1).join('') || movie.language || ''}</span>
                </div>
                <Link className="mp-movie-card__book" to={`/bookings?flow=movie_first&movieId=${movieId}`}>
                    Đặt vé
                </Link>
            </div>
        </article>
    );
}
