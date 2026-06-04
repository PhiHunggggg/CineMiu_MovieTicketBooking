import { useState, useEffect } from 'react';
import { movieApi } from '../../../services/api';
import { useBooking } from '../../../context/BookingContext';
import './MovieSelect.css';

export default function MovieSelect() {
  const { selectMovie, movie: selectedMovie, cinema } = useBooking();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('now_showing');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = { status: filter, pageSize: 50 };
    if (cinema?.cinemaId) {
      params.cinemaId = cinema.cinemaId;
    }
    movieApi.getAll(params)
      .then(data => setMovies(data.items || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter, cinema]);

  const filtered = movies.filter(m =>
    !search || m.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="movie-select" id="movie-select-step">
      <div className="movie-select__header">
        <div>
          <h2 className="section-title">Chọn phim</h2>
          <p className="movie-select__subtitle">
            Rạp: <strong>{cinema?.name}</strong>
          </p>
        </div>
      </div>

      <div className="movie-select__filters">
        <div className="movie-select__tabs">
          <button
            className={`movie-select__tab ${filter === 'now_showing' ? 'movie-select__tab--active' : ''}`}
            onClick={() => { setFilter('now_showing'); setLoading(true); }}
          >
            🎬 Đang chiếu
          </button>
          <button
            className={`movie-select__tab ${filter === 'coming_soon' ? 'movie-select__tab--active' : ''}`}
            onClick={() => { setFilter('coming_soon'); setLoading(true); }}
          >
            ⏳ Sắp chiếu
          </button>
        </div>
        <div className="movie-select__search">
          <input
            type="text"
            placeholder="Tìm phim..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="movie-select__search-input"
            id="movie-search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="movie-select__grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="movie-card-skeleton">
              <div className="skeleton" style={{ paddingTop: '150%' }} />
              <div className="skeleton" style={{ height: 16, marginTop: 10, width: '80%' }} />
              <div className="skeleton" style={{ height: 12, marginTop: 6, width: '50%' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="movie-select__empty">
          <span>🎞️</span>
          <p>Không có phim {filter === 'now_showing' ? 'đang chiếu' : 'sắp chiếu'}</p>
        </div>
      ) : (
        <div className="movie-select__grid">
          {filtered.map(movie => (
            <button
              key={movie.movieId}
              className={`movie-card ${selectedMovie?.movieId === movie.movieId ? 'movie-card--selected' : ''}`}
              onClick={() => selectMovie(movie)}
              id={`movie-${movie.movieId}`}
            >
              <div className="movie-card__poster">
                {movie.posterUrl ? (
                  <img src={movie.posterUrl} alt={movie.title} loading="lazy" />
                ) : (
                  <div className="movie-card__poster-placeholder">🎬</div>
                )}
                {movie.ageRating && (
                  <span className="movie-card__rated">{movie.ageRating}</span>
                )}
                {movie.imdbRating && (
                  <span className="movie-card__rating">⭐ {Number(movie.imdbRating).toFixed(1)}</span>
                )}
                <div className="movie-card__overlay">
                  <span className="movie-card__play">▶</span>
                </div>
              </div>
              <div className="movie-card__body">
                <h3 className="movie-card__title">{movie.title}</h3>
                <div className="movie-card__details">
                  <span className="movie-card__duration">⏱ {movie.durationMins} phút</span>
                  {movie.releaseDate && (
                    <span className="movie-card__date">📅 {formatDate(movie.releaseDate)}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
