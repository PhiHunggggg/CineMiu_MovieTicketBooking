import { useState, useEffect } from 'react';
import { cinemaApi, showtimeApi } from '../../../services/api';
import { useBooking } from '../../../context/BookingContext';
import './CinemaForMovieSelect.css';

function toLocalDateString(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function CinemaForMovieSelect() {
  const { selectCinemaForMovie, cinema: selectedCinema, movie } = useBooking();
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [cinemaShowtimeCounts, setCinemaShowtimeCounts] = useState({});

  useEffect(() => {
    if (!movie) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const now = new Date();
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(now.getDate() + 7);

    // Fetch all showtimes for the selected movie, then find which cinemas have them
    Promise.all([
      cinemaApi.getAll(),
      showtimeApi.getAll({
        movieId: movie.movieId,
        dateFrom: toLocalDateString(now),
        dateTo: toLocalDateString(sevenDaysLater),
        pageSize: 100
      })
    ])
      .then(([allCinemas, showtimeData]) => {
        const showtimes = Array.isArray(showtimeData) ? showtimeData : [];

        // Filter showtimes within next 7 days
        const upcomingShowtimes = showtimes.filter(item => {
          if (!item.showtime?.startTime) return false;
          const st = new Date(item.showtime.startTime);
          return st >= now && st <= sevenDaysLater;
        });

        // Count showtimes per cinema
        const counts = {};
        upcomingShowtimes.forEach(item => {
          const cId = item.cinema?.cinemaId || item.cinema?.id;
          if (cId) {
            counts[cId] = (counts[cId] || 0) + 1;
          }
        });
        setCinemaShowtimeCounts(counts);

        // Filter cinemas that have showtimes
        const cinemaIdsWithShowtimes = new Set(Object.keys(counts).map(Number));
        const filteredCinemas = allCinemas.filter(c => cinemaIdsWithShowtimes.has(c.cinemaId));
        setCinemas(filteredCinemas);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [movie]);

  const cities = [...new Set(cinemas.map(c => c.city))].sort();

  const filtered = cinemas.filter(c => {
    const matchCity = !cityFilter || c.city === cityFilter;
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.address?.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchSearch;
  });

  if (loading) {
    return (
      <div className="cfm-select" id="cinema-for-movie-step">
        <h2 className="section-title">Chọn rạp chiếu</h2>
        <div className="cfm-select__grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="cinema-card skeleton" style={{ height: 200 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="cfm-select" id="cinema-for-movie-step">
      <div className="cfm-select__header">
        <h2 className="section-title">Chọn rạp chiếu</h2>
        <div className="cfm-select__movie-info">
          {movie?.posterUrl && <img src={movie.posterUrl} alt="" className="cfm-select__movie-thumb" />}
          <div>
            <strong>{movie?.title}</strong>
            <span>{movie?.durationMins} phút</span>
          </div>
        </div>
      </div>

      <div className="cfm-select__filters">
        <div className="cfm-select__search">
          <span className="cfm-select__search-icon">🔍</span>
          <input
            type="text"
            placeholder="Tìm rạp theo tên hoặc địa chỉ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="cfm-select__search-input"
            id="cfm-search-input"
          />
        </div>
        <div className="cfm-select__city-tabs">
          <button
            className={`cfm-select__city-tab ${!cityFilter ? 'cfm-select__city-tab--active' : ''}`}
            onClick={() => setCityFilter('')}
          >
            Tất cả
          </button>
          {cities.map(city => (
            <button
              key={city}
              className={`cfm-select__city-tab ${cityFilter === city ? 'cfm-select__city-tab--active' : ''}`}
              onClick={() => setCityFilter(city)}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="cfm-select__empty">
          <span className="cfm-select__empty-icon">🎭</span>
          <p>Không tìm thấy rạp nào có suất chiếu cho phim này trong 7 ngày tới</p>
        </div>
      ) : (
        <div className="cfm-select__grid">
          {filtered.map(cinema => (
            <button
              key={cinema.cinemaId}
              className={`cfm-card ${selectedCinema?.cinemaId === cinema.cinemaId ? 'cfm-card--selected' : ''}`}
              onClick={() => selectCinemaForMovie(cinema)}
              id={`cfm-cinema-${cinema.cinemaId}`}
            >
              <div className="cfm-card__img">
                {cinema.imageUrl ? (
                  <img src={cinema.imageUrl} alt={cinema.name} />
                ) : (
                  <div className="cfm-card__placeholder">🏛️</div>
                )}
              </div>
              <div className="cfm-card__info">
                <h3 className="cfm-card__name">{cinema.name}</h3>
                <p className="cfm-card__address">
                  <span className="cfm-card__pin">📍</span>
                  {cinema.address}
                </p>
                <div className="cfm-card__meta">
                  <span className="cfm-card__city">{cinema.city}</span>
                  {cinema.district && <span className="cfm-card__district">{cinema.district}</span>}
                  <span className="cfm-card__showtime-count">
                    🎬 {cinemaShowtimeCounts[cinema.cinemaId] || 0} suất chiếu
                  </span>
                </div>
              </div>
              <div className="cfm-card__arrow">→</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
