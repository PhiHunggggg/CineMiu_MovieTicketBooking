import { useState, useEffect } from 'react';
import { cinemaApi } from '../../../services/api';
import { useBooking } from '../../../context/BookingContext';
import './CinemaSelect.css';

function normalizeCinema(cinema) {
  return {
    ...cinema,
    cinemaId: cinema.cinemaId ?? cinema.CinemaId ?? cinema.id ?? cinema.Id,
    name: cinema.name ?? cinema.Name ?? cinema.cinemaName ?? cinema.CinemaName ?? 'Rạp phim',
    cinemaName: cinema.cinemaName ?? cinema.CinemaName ?? cinema.name ?? cinema.Name ?? 'Rạp phim',
    address: cinema.address ?? cinema.Address ?? '',
    city: cinema.city ?? cinema.City ?? '',
    district: cinema.district ?? cinema.District ?? '',
    imageUrl: cinema.imageUrl ?? cinema.ImageUrl ?? '',
  };
}

export default function CinemaSelect() {
  const { selectCinema, cinema: selectedCinema } = useBooking();
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    cinemaApi.getAll()
      .then(data => setCinemas(Array.isArray(data) ? data.map(normalizeCinema) : []))
      .catch(err => {
        console.error(err);
        setError(err.message || 'Không thể tải danh sách rạp từ database.');
        setCinemas([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const cities = [...new Set(cinemas.map(c => c.city).filter(Boolean))].sort();
  const searchText = search.trim().toLowerCase();

  const filtered = cinemas.filter(c => {
    const matchCity = !cityFilter || c.city === cityFilter;
    const matchSearch = !searchText
      || c.name.toLowerCase().includes(searchText)
      || c.address.toLowerCase().includes(searchText)
      || c.district.toLowerCase().includes(searchText);
    return matchCity && matchSearch;
  });

  if (loading) {
    return (
      <div className="cinema-select" id="cinema-select-step">
        <h2 className="section-title">Chọn rạp phim</h2>
        <div className="cinema-select__grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="cinema-card skeleton" style={{ height: 200 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="cinema-select" id="cinema-select-step">
      <h2 className="section-title">Chọn rạp phim</h2>

      <div className="cinema-select__filters">
        <div className="cinema-select__search">
          <span className="cinema-select__search-icon">🔍</span>
          <input
            type="text"
            placeholder="Tìm rạp theo tên hoặc địa chỉ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="cinema-select__search-input"
            id="cinema-search-input"
          />
        </div>
        <div className="cinema-select__city-tabs">
          <button
            className={`cinema-select__city-tab ${!cityFilter ? 'cinema-select__city-tab--active' : ''}`}
            onClick={() => setCityFilter('')}
          >
            Tất cả
          </button>
          {cities.map(city => (
            <button
              key={city}
              className={`cinema-select__city-tab ${cityFilter === city ? 'cinema-select__city-tab--active' : ''}`}
              onClick={() => setCityFilter(city)}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="cinema-select__empty">
          <span className="cinema-select__empty-icon">!</span>
          <p>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="cinema-select__empty">
          <span className="cinema-select__empty-icon">🎭</span>
          <p>Không tìm thấy rạp phim phù hợp</p>
        </div>
      ) : (
        <div className="cinema-select__grid">
          {filtered.map(cinema => (
            <button
              key={cinema.cinemaId}
              className={`cinema-card ${selectedCinema?.cinemaId === cinema.cinemaId ? 'cinema-card--selected' : ''}`}
              onClick={() => selectCinema(cinema)}
              id={`cinema-${cinema.cinemaId}`}
            >
              <div className="cinema-card__img">
                {cinema.imageUrl ? (
                  <img src={cinema.imageUrl} alt={cinema.name} />
                ) : (
                  <div className="cinema-card__placeholder">🏛️</div>
                )}
              </div>
              <div className="cinema-card__info">
                <h3 className="cinema-card__name">{cinema.name}</h3>
                <p className="cinema-card__address">
                  <span className="cinema-card__pin">📍</span>
                  {cinema.address || 'Chưa cập nhật địa chỉ'}
                </p>
                <div className="cinema-card__meta">
                  {cinema.city && <span className="cinema-card__city">{cinema.city}</span>}
                  {cinema.district && <span className="cinema-card__district">{cinema.district}</span>}
                </div>
              </div>
              <div className="cinema-card__arrow">→</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
