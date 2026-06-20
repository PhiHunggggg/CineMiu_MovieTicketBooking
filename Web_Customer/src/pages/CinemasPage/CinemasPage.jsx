import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cinemaApi } from '../../services/api';
import './CinemasPage.css';

export default function CinemasPage() {
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => {
    cinemaApi.getAll()
      .then(setCinemas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cities = [...new Set(cinemas.map(c => c.city))].sort();

  const filtered = cinemas.filter(c => {
    const matchCity = !cityFilter || c.city === cityFilter;
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.address?.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchSearch;
  });

  return (
    <div className="cinemas-page" id="cinemas-page">
      <div className="cinemas-page__container container">
        <div className="cinemas-page__container-header">
          <h1 className="cinemas-page__title" id="cinemas-page__title">Rạp phim</h1>
        </div>
        <div className="cinemas-page__controls">
          {/* Filters */}
          <div className="cinemas-page__city-tabs">
            <button
              className={`cinemas-page__city-tab ${!cityFilter ? 'cinemas-page__city-tab--active' : ''}`}
              onClick={() => setCityFilter('')}
            >
              Tất cả ({cinemas.length})
            </button>
            {cities.map(city => (
              <button
                key={city}
                className={`cinemas-page__city-tab ${cityFilter === city ? 'cinemas-page__city-tab--active' : ''}`}
                onClick={() => setCityFilter(city)}
              >
                {city} ({cinemas.filter(c => c.city === city).length})
              </button>
            ))}
          </div>
          <div className="cinemas-page__filters">
            <div className="cinemas-page__search">
              <span className="cinemas-page__search-icon">🔍</span>
              <input
                type="text"
                placeholder="Tìm rạp theo tên hoặc địa chỉ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="cinemas-page__search-input"
                id="cinemas-search"
              />
            </div>
          </div>
        </div>

        {/* Cinema list */}
        {loading ? (
          <div className="cinemas-page__grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="cp-cinema-card skeleton" style={{ height: 240 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="cinemas-page__empty">
            <span>🎭</span>
            <p>Không tìm thấy rạp phim phù hợp</p>
          </div>
        ) : (
          <div className="cinemas-page__grid">
            {filtered.map(cinema => (
              <div key={cinema.cinemaId} className="cp-cinema-card" id={`cp-cinema-${cinema.cinemaId}`}>
                <div className="cp-cinema-card__img">
                  {cinema.imageUrl ? (
                    <img src={cinema.imageUrl} alt={cinema.name} loading="lazy" />
                  ) : (
                    <div className="cp-cinema-card__placeholder">
                      <span>🏛️</span>
                    </div>
                  )}
                  <div className="cp-cinema-card__city-badge">{cinema.city}</div>
                </div>
                <div className="cp-cinema-card__body">
                  <h3 className="cp-cinema-card__name">{cinema.name}</h3>
                  <p className="cp-cinema-card__address">
                    📍 {cinema.address}
                  </p>
                  {cinema.district && (
                    <span className="cp-cinema-card__district">{cinema.district}</span>
                  )}
                  <div className="cp-cinema-card__actions">
                    <Link
                      to={`/bookings?flow=cinema_first&cinemaId=${cinema.cinemaId}`}
                      className="cp-cinema-card__book-btn"
                    >
                      🎟️ Đặt vé tại rạp
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
