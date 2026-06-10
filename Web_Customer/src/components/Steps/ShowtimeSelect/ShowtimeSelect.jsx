import { useState, useEffect, useMemo } from 'react';
import { showtimeApi } from '../../../services/api';
import { useBooking } from '../../../context/BookingContext';
import './ShowtimeSelect.css';

function getId(value, keys) {
  for (const key of keys) {
    const raw = value?.[key];
    if (raw !== undefined && raw !== null) return raw;
  }
  return null;
}

function getMovieId(movie) {
  return getId(movie, ['movieId', 'MovieId', 'id', 'Id']);
}

function getCinemaId(cinema) {
  return getId(cinema, ['cinemaId', 'CinemaId', 'id', 'Id']);
}

function getHallId(hall) {
  return getId(hall, ['hallId', 'HallId', 'id', 'Id']);
}

function toLocalDateString(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getNext7Days() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() + i);
    days.push(toLocalDateString(date));
  }
  return days;
}

export default function ShowtimeSelect() {
  const { cinema, movie, selectShowDate, selectShowtime, showDate } = useBooking();
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const weekDates = useMemo(() => getNext7Days(), []);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];

  useEffect(() => {
    const movieId = getMovieId(movie);
    const cinemaId = getCinemaId(cinema);
    if (!cinemaId || !movieId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    showtimeApi
      .getAll({ movieId, cinemaId, dateFrom: weekStart, dateTo: weekEnd })
      .then(data => setShowtimes(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error(err);
        setError(err.message || 'Khong the tai danh sach suat chieu.');
        setShowtimes([]);
      })
      .finally(() => setLoading(false));
  }, [cinema, movie, weekStart, weekEnd]);

  const dateGroups = useMemo(() => {
    const groups = {};
    showtimes.forEach(item => {
      const startTime = item.showtime?.startTime ?? item.showtime?.StartTime;
      const dateStr = toLocalDateString(startTime);
      if (!weekDates.includes(dateStr)) return;
      if (!dateStr) return;

      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(item);
    });
    return groups;
  }, [showtimes, weekDates]);

  const dates = Object.keys(dateGroups).sort();

  // Only display the next 7 days to keep this step fast and easy to scan.
  const dateTabs = useMemo(() => {
    const tabs = [];
    weekDates.forEach(dateStr => {
      // Parse YYYY-MM-DD manually to create a Local Date object
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

      const today = new Date();
      const todayStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

      const isToday = dateStr === todayStr;

      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      tabs.push({
        dateStr,
        dayName: isToday ? 'Hôm nay' : dayNames[d.getDay()],
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        hasShowtimes: !!dateGroups[dateStr],
        isPast: dateStr < todayStr
      });
    });
    return tabs;
  }, [dateGroups, weekDates]);

  useEffect(() => {
    if (!showDate && dates.length > 0) {
      const todayStr = new Date().getFullYear() + '-' +
        String(new Date().getMonth() + 1).padStart(2, '0') + '-' +
        String(new Date().getDate()).padStart(2, '0');

      if (dates.includes(todayStr)) {
        selectShowDate(todayStr);
      } else {
        const futureDates = dates.filter(d => d > todayStr);
        selectShowDate(futureDates.length > 0 ? futureDates[0] : dates[0]);
      }
    }
  }, [dates, showDate, selectShowDate]);

  const currentShowtimes = showDate ? (dateGroups[showDate] || []) : [];

  // Group by hall
  const hallGroups = useMemo(() => {
    const groups = {};
    currentShowtimes.forEach(item => {
      if (!item.hall) return;
      const hallId = getHallId(item.hall);
      if (!hallId) return;
      if (!groups[hallId]) {
        groups[hallId] = {
          hall: item.hall,
          cinema: item.cinema,
          showtimes: []
        };
      }
      // Đẩy toàn bộ object showtime vào mảng
      groups[hallId].showtimes.push(item.showtime);
    });
    return Object.values(groups);
  }, [currentShowtimes]);

  const formatTime = (t) => {
    if (!t) return '';
    const value = t.includes('T') ? t.split('T')[1] : t;
    const parts = value.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : value;
  };

  const formatPrice = (p) => {
    return new Intl.NumberFormat('vi-VN').format(p) + 'đ';
  };

  // Determine seat availability color class
  const getSeatStatusClass = (available, total) => {
    if (total === 0) return '';
    if (available === 0) return 'showtime-time-btn--sold-out';
    const ratio = available / total;
    if (ratio <= 0.2) return 'showtime-time-btn--few-seats';
    return 'showtime-time-btn--available';
  };

  if (loading) {
    return (
      <div className="showtime-select" id="showtime-select-step">
        <h2 className="section-title">Chọn suất chiếu</h2>
        <div className="showtime-select__loading">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="skeleton" style={{ width: 70, height: 70, borderRadius: 12 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 120, marginTop: 24, borderRadius: 16 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="showtime-select" id="showtime-select-step">
        <h2 className="section-title">Chọn suất chiếu</h2>
        <div className="showtime-select__empty">
          <span>!</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="showtime-select" id="showtime-select-step">
      <div className="showtime-select__header">
        <h2 className="section-title">Chọn suất chiếu</h2>
        <div className="showtime-select__info">
          <div className="showtime-select__movie-badge">
            {movie?.posterUrl && <img src={movie.posterUrl} alt="" className="showtime-select__movie-thumb" />}
            <div>
              <strong>{movie?.title}</strong>
              <span>{movie?.durationMins || movie?.DurationMins || movie?.durationMin || '-'} phút • {cinema?.cinemaName || cinema?.CinemaName || cinema?.name || cinema?.Name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="showtime-select__dates">
        {dateTabs.map(tab => (
          <button
            key={tab.dateStr}
            className={`showtime-date-tab ${showDate === tab.dateStr ? 'showtime-date-tab--active' : ''} ${!tab.hasShowtimes ? 'showtime-date-tab--disabled' : ''} ${tab.isPast ? 'showtime-date-tab--past' : ''}`}
            onClick={() => tab.hasShowtimes && selectShowDate(tab.dateStr)}
            disabled={!tab.hasShowtimes}
            id={`date-${tab.dateStr}`}
          >
            <span className="showtime-date-tab__day">{tab.dayName}</span>
            <span className="showtime-date-tab__num">{tab.dayNum}</span>
            <span className="showtime-date-tab__month">Th{tab.monthNum}</span>
          </button>
        ))}
      </div>

      {hallGroups.length === 0 ? (
        <div className="showtime-select__empty">
          <span>📅</span>
          <p>Không có suất chiếu trong ngày này</p>
        </div>
      ) : (
        <div className="showtime-select__halls">
          {hallGroups.map(group => (
            <div key={getHallId(group.hall)} className="showtime-hall">
              <div className="showtime-hall__header">
                <h3 className="showtime-hall__name">{group.hall.name || group.hall.Name || group.hall.hallName || group.hall.HallName}</h3>
                <span className="showtime-hall__format">
                  {group.hall.hallTypeId === 1 ? '2D' : group.hall.hallTypeId === 2 ? '3D' : group.hall.hallTypeId === 3 ? 'IMAX' : group.hall.hallTypeId === 4 ? '4DX' : '2D'}
                </span>
              </div>
              <div className="showtime-hall__times">
                {group.showtimes
                  .sort((a, b) => (a.startTime ?? a.StartTime ?? '').localeCompare(b.startTime ?? b.StartTime ?? ''))
                  .map(st => {
                    const startTime = st.startTime ?? st.StartTime;
                    const status = (st.status ?? st.Status ?? '').toLowerCase();
                    const available = st.availableSeats ?? st.AvailableSeats ?? null;
                    const total = st.totalSeats ?? st.TotalSeats ?? 0;
                    const isSoldOut = available !== null && available === 0;
                    const seatClass = available !== null ? getSeatStatusClass(available, total) : '';

                    return (
                      <button
                        key={st.showtimeId ?? st.ShowtimeId ?? st.id ?? st.Id}
                        className={`showtime-time-btn ${status === 'cancelled' || isSoldOut ? 'showtime-time-btn--disabled' : ''} ${seatClass}`}
                        onClick={() => !isSoldOut && status !== 'cancelled' && selectShowtime(st, group.hall)}
                        disabled={status === 'cancelled' || isSoldOut}
                      >
                        {/* Chú ý: st ở đây chính là item.showtime từ Backend */}
                        <span className="showtime-time-btn__time">
                          {formatTime(startTime)}
                        </span>
                        <span className="showtime-time-btn__price">
                          {formatPrice((st.basePrice ?? st.BasePrice) > 0 ? (st.basePrice ?? st.BasePrice) : 75000)}
                        </span>
                        {available !== null && (
                          <span className={`showtime-time-btn__seats ${isSoldOut ? 'showtime-time-btn__seats--sold-out' : available / total <= 0.2 ? 'showtime-time-btn__seats--few' : ''}`}>
                            {isSoldOut ? 'Hết ghế' : `${available} ghế trống`}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
