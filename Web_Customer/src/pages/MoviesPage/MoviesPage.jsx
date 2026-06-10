import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { movieApi, lookupApi } from '../../services/api';
import MovieCard from '../../components/MovieCard/MovieCard';
import './MoviesPage.css';

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('now_showing');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMovie, setSelectedMovie] = useState(null);

  useEffect(() => {
    setLoading(true);
    movieApi.getAll({ status: filter, keyword: search, page, pageSize: 12 })
      .then(data => {
        setMovies(data.items || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter, search, page]);

  useEffect(() => {
    lookupApi.getAll().then(data => setGenres(data.genres || [])).catch(console.error);
  }, []);

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="movies-page" id="movies-page">
      <div className="movies-page__container container">
        <div className="movies-page__header">
          <h1 className="movies-page__title">Phim</h1>
          <div className="movies-page__controls">
            <div className="movies-page__tabs">
              <button
                className={`movies-page__tab ${filter === 'now_showing' ? 'movies-page__tab--active' : ''}`}
                onClick={() => { setFilter('now_showing'); setPage(1); }}
              >
                Đang chiếu
              </button>
              <button
                className={`movies-page__tab ${filter === 'coming_soon' ? 'movies-page__tab--active' : ''}`}
                onClick={() => { setFilter('coming_soon'); setPage(1); }}
              >
                Sắp chiếu
              </button>
            </div>
            <input
              type="text"
              placeholder="🔍 Tìm phim..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="movies-page__search"
              id="movies-search"
            />
          </div>
        </div>

        {loading ? (
          <div className="movies-page__grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i}>
                <div className="skeleton" style={{ paddingTop: '150%', borderRadius: 16 }} />
                <div className="skeleton" style={{ height: 18, marginTop: 12, width: '80%' }} />
                <div className="skeleton" style={{ height: 12, marginTop: 6, width: '50%' }} />
              </div>
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div className="movies-page__empty">
            <span>🎞️</span>
            <p>Không tìm thấy phim phù hợp</p>
          </div>
        ) : (
          <>
            <div className="movies-page__grid">
              {movies.map(movie => (
                <div key={movie.movieId} onClick={() => setSelectedMovie(movie)}>
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="movies-page__pagination">
                <button
                  className="movies-page__page-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  ← Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className={`movies-page__page-btn ${page === p ? 'movies-page__page-btn--active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="movies-page__page-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Sau →
                </button>
              </div>
            )}
          </>
        )}

        {/* Movie Detail Modal */}
        {selectedMovie && (
          <div className="movie-modal" onClick={() => setSelectedMovie(null)} id="movie-detail-modal">
            <div className="movie-modal__content" onClick={e => e.stopPropagation()}>
              <button className="movie-modal__close" onClick={() => setSelectedMovie(null)}>✕</button>

              <div className="movie-modal__layout">
                {selectedMovie.posterUrl && (
                  <img src={selectedMovie.posterUrl} alt="" className="movie-modal__poster" />
                )}
                <div className="movie-modal__info">
                  <h2 className="movie-modal__title">{selectedMovie.title}</h2>
                  {selectedMovie.titleEn && (
                    <p className="movie-modal__original">{selectedMovie.titleEn}</p>
                  )}

                  <div className="movie-modal__badges">
                    {selectedMovie.ageRating && <span className="movie-modal__badge movie-modal__badge--red">{selectedMovie.ageRating}</span>}
                    {selectedMovie.imdbRating && <span className="movie-modal__badge movie-modal__badge--gold">⭐ {Number(selectedMovie.imdbRating).toFixed(1)}</span>}
                  </div>

                  <div className="movie-modal__details">
                    <div className="movie-modal__detail"><strong>Thời lượng:</strong> {selectedMovie.durationMins} phút</div>
                    {selectedMovie.director && <div className="movie-modal__detail"><strong>Đạo diễn:</strong> {selectedMovie.director}</div>}
                    {selectedMovie.castMembers && <div className="movie-modal__detail"><strong>Diễn viên:</strong> {selectedMovie.castMembers}</div>}
                    {selectedMovie.language && <div className="movie-modal__detail"><strong>Ngôn ngữ:</strong> {selectedMovie.language}</div>}
                    {selectedMovie.releaseDate && <div className="movie-modal__detail"><strong>Khởi chiếu:</strong> {formatDate(selectedMovie.releaseDate)}</div>}
                  </div>

                  {selectedMovie.synopsis && (
                    <div className="movie-modal__synopsis">
                      <strong>Nội dung:</strong>
                      <p>{selectedMovie.synopsis}</p>
                    </div>
                  )}

                  <div className="movie-modal__actions">
                    <Link to={`/bookings?flow=movie_first&movieId=${selectedMovie.movieId}`} className="movie-modal__book-btn" onClick={() => setSelectedMovie(null)}>🎟️ Đặt vé ngay</Link>
                    {selectedMovie.trailerUrl && (
                      <a href={selectedMovie.trailerUrl} target="_blank" rel="noopener noreferrer" className="movie-modal__trailer-btn">▶ Xem trailer</a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
