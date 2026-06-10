import { useState } from 'react';
import { Link } from 'react-router-dom';
import './MovieCard.css';

export default function MovieCard({ movie }) {
  const [showTrailer, setShowTrailer] = useState(false);

  // Hàm lấy ID từ link youtube để tạo link nhúng (embed)
  const getYoutubeEmbedUrl = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11)
      ? `https://www.youtube.com/embed/${match[2]}?autoplay=1`
      : url;
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const movieId = movie.id || movie.movieId;

  return (
    <>
      <div className="movie-card-v2" id={`movie-card-${movieId}`}>
        <div className="movie-card-v2__poster">
          {movie.posterUrl ? (
            <img src={movie.posterUrl} alt={movie.title} loading="lazy" />
          ) : (
            <div className="movie-card-v2__placeholder">🎬</div>
          )}

          {movie.ageRating && <span className="movie-card-v2__rated">{movie.ageRating}</span>}
          {movie.imdbRating && (
            <span className="movie-card-v2__rating">⭐ {Number(movie.imdbRating).toFixed(1)}</span>
          )}

          {/* Overlay với 2 lựa chọn */}
          <div className="movie-card-v2__overlay">
            <Link to={`/movies/${movieId}`} className="movie-card-v2__btn movie-card-v2__btn--detail">
              Chi tiết
            </Link>
            <Link to={`/bookings?flow=movie_first&movieId=${movieId}`} className="movie-card-v2__btn movie-card-v2__btn--book">
              🎟️ Đặt vé
            </Link>
            {movie.trailerUrl && (
              <button
                onClick={(e) => { e.preventDefault(); setShowTrailer(true); }}
                className="movie-card-v2__btn movie-card-v2__btn--trailer"
              >
                ▶ Trailer
              </button>
            )}
          </div>
        </div>

        <div className="movie-card-v2__info">
          <Link to={`/movies/${movieId}`} className="movie-card-v2__title">{movie.title}</Link>
          <h3 className="movie-card-v2__genre">Thể loại : {movie.genres.map((genre) => genre).join(', ')}.</h3>
          <div className="movie-card-v2__meta">
            <span>⏱ {movie.durationMins}p</span>
            {movie.releaseDate && <span>📅 {formatDate(movie.releaseDate)}</span>}
          </div>
        </div>
      </div>

      {/* Modal Trailer */}
      {showTrailer && (
        <div className="trailer-modal" onClick={() => setShowTrailer(false)}>
          <div className="trailer-modal__content" onClick={e => e.stopPropagation()}>
            <button className="trailer-modal__close" onClick={() => setShowTrailer(false)}>✕</button>
            <div className="trailer-modal__video">
              <iframe
                src={getYoutubeEmbedUrl(movie.trailerUrl)}
                title={movie.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
