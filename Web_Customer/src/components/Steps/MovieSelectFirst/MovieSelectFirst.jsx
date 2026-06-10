import { useState, useEffect } from 'react';
import { movieApi } from '../../../services/api';
import { useBooking } from '../../../context/BookingContext';
import './MovieSelectFirst.css';

export default function MovieSelectFirst() {
  const { selectMovieFirst, movie: selectedMovie } = useBooking();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('now_showing');
  const [search, setSearch] = useState('');

    useEffect(() => {
        let ignore = false;

        const fetchMovies = async () => {
            setLoading(true);

            try {
                const data = await movieApi.getAll({ status: filter, pageSize: 50 });
                if (!ignore) {
                    setMovies(data.items || []);
                }
            } catch (error) {
                console.error(error);
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        fetchMovies();

        return () => {
            ignore = true;
        };
    }, [filter]);

  const filtered = movies.filter(m =>
    !search || m.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="movie-select-first" id="movie-select-first-step">
      <div className="movie-select-first__header">
        <div>
          <h2 className="section-title">Chọn phim bạn muốn xem</h2>
          <p className="movie-select-first__subtitle">
            Chọn phim trước, hệ thống sẽ tìm rạp có suất chiếu cho bạn
          </p>
        </div>
      </div>

      <div className="movie-select-first__filters">
        <div className="movie-select-first__tabs">
          <button
            className={`movie-select-first__tab ${filter === 'now_showing' ? 'movie-select-first__tab--active' : ''}`}
            onClick={() =>  setFilter('now_showing')}
          >
            🎬 Đang chiếu
          </button>
          <button
            className={`movie-select-first__tab ${filter === 'coming_soon' ? 'movie-select-first__tab--active' : ''}`}
            onClick={() => setFilter('coming_soon')}
          >
            ⏳ Sắp chiếu
          </button>
        </div>
        <div className="movie-select-first__search">
          <input
            type="text"
            placeholder="🔍 Tìm phim..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="movie-select-first__search-input"
            id="movie-first-search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="movie-select-first__grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="movie-card-skeleton">
              <div className="skeleton" style={{ paddingTop: '150%' }} />
              <div className="skeleton" style={{ height: 16, marginTop: 10, width: '80%' }} />
              <div className="skeleton" style={{ height: 12, marginTop: 6, width: '50%' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="movie-select-first__empty">
          <span>🎞️</span>
          <p>Không có phim {filter === 'now_showing' ? 'đang chiếu' : 'sắp chiếu'}</p>
        </div>
      ) : (
        <div className="movie-select-first__grid">
          {filtered.map(movie => (
            <button
              key={movie.movieId}
              className={`msf-card ${selectedMovie?.movieId === movie.movieId ? 'msf-card--selected' : ''}`}
              onClick={() => selectMovieFirst(movie)}
              id={`movie-first-${movie.movieId}`}
            >
              <div className="msf-card__poster">
                {movie.posterUrl ? (
                  <img src={movie.posterUrl} alt={movie.title} loading="lazy" />
                ) : (
                  <div className="msf-card__poster-placeholder">🎬</div>
                )}
                {movie.ageRating && (
                  <span className="msf-card__rated">{movie.ageRating}</span>
                )}
                {movie.imdbRating && (
                  <span className="msf-card__rating">⭐ {Number(movie.imdbRating).toFixed(1)}</span>
                )}
                <div className="msf-card__overlay">
                  <span className="msf-card__play">▶</span>
                </div>
              </div>
              <div className="msf-card__body">
                <h3 className="msf-card__title">{movie.title}</h3>
                <div className="msf-card__details">
                  <span className="msf-card__duration">⏱ {movie.durationMins} phút</span>
                  {movie.releaseDate && (
                    <span className="msf-card__date">📅 {formatDate(movie.releaseDate)}</span>
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
