import { useState, useEffect, useMemo } from 'react';
import { showtimeApi } from '../../../services/api';
import { useBooking } from '../../../context/BookingContext';
import './ShowtimeSelect.css';

export default function ShowtimeSelect() {
    const { cinema, movie, selectShowDate, selectShowtime, showDate } = useBooking();
    const [showtimes, setShowtimes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!cinema || !movie) {
            setLoading(false);
            return;
        }
        setLoading(true);
        showtimeApi
            .getAll({ movieId: movie.movieId, cinemaId: cinema.cinemaId })
            .then(data => setShowtimes(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [cinema, movie]);

    const dateGroups = useMemo(() => {
        const groups = {};
        showtimes.forEach(item => {
            if (!item.showtime.startTime) return;
            // Extract date part reliably (YYYY-MM-DD)
            const d = new Date(item.showtime.startTime);
            const dateStr = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0');

            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(item);
        });
        return groups;
    }, [showtimes]);

    const dates = Object.keys(dateGroups).sort();

    // Generate date tabs based on available showtimes
    const dateTabs = useMemo(() => {
        const tabs = [];
        const sortedDates = Object.keys(dateGroups).sort();

        // Generate next 7 days in YYYY-MM-DD local format
        const next7Days = [];
        const now = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() + i);
            const ds = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0');
            next7Days.push(ds);
        }

        // Combine with actual dates from DB and unique them
        const allDates = [...new Set([...next7Days, ...sortedDates])].sort();

        next7Days.forEach(dateStr => {
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
    }, [dateGroups]);

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
            const hallId = item.hall.hallId;
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
        const parts = t.split(':');
        return `${parts[0]}:${parts[1]}`;
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

    return (
        <div className="showtime-select" id="showtime-select-step">
            <div className="showtime-select__header">
                <h2 className="section-title">Chọn suất chiếu</h2>
                <div className="showtime-select__info">
                    <div className="showtime-select__movie-badge">
                        {movie?.posterUrl && <img src={movie.posterUrl} alt="" className="showtime-select__movie-thumb" />}
                        <div>
                            <strong>{movie?.title}</strong>
                            <span>{movie?.durationMins || movie?.durationMins} phút • {cinema?.cinemaName || cinema?.name}</span>
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
                        <div key={group.hall.hallId} className="showtime-hall">
                            <div className="showtime-hall__header">
                                <h3 className="showtime-hall__name">{group.hall.name}</h3>
                                <span className="showtime-hall__format">
                                    {group.hall.hallTypeId === 1 ? '2D' : group.hall.hallTypeId === 2 ? '3D' : group.hall.hallTypeId === 3 ? 'IMAX' : group.hall.hallTypeId === 4 ? '4DX' : '2D'}
                                </span>
                            </div>
                            <div className="showtime-hall__times">
                                {group.showtimes
                                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                    .map(st => {
                                        const available = st.availableSeats ?? null;
                                        const total = st.totalSeats ?? 0;
                                        const isSoldOut = available !== null && available === 0;
                                        const seatClass = available !== null ? getSeatStatusClass(available, total) : '';

                                        return (
                                            <button
                                                key={st.showtimeId}
                                                className={`showtime-time-btn ${st.status === 'cancelled' || isSoldOut ? 'showtime-time-btn--disabled' : ''} ${seatClass}`}
                                                onClick={() => !isSoldOut && st.status !== 'cancelled' && selectShowtime(st, group.hall)}
                                                disabled={st.status === 'cancelled' || isSoldOut}
                                            >
                                                {/* Chú ý: st ở đây chính là item.showtime từ Backend */}
                                                <span className="showtime-time-btn__time">
                                                    {formatTime(st.startTime.split('T')[1])}
                                                </span>
                                                <span className="showtime-time-btn__price">
                                                    {formatPrice(st.basePrice > 0 ? st.basePrice : 75000)}
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
