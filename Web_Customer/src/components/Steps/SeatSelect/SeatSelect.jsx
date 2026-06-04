import { useState, useEffect, useMemo } from 'react';
import { showtimeApi, cinemaApi, lookupApi } from '../../../services/api';
import { useBooking } from '../../../context/BookingContext';
import { useAuth } from '../../../context/AuthContext';
import { getUserId } from '../../../utils/authUser';
import './SeatSelect.css';

function getShowtimeId(showtime) {
  return showtime?.showtimeId ?? showtime?.ShowtimeId ?? showtime?.id ?? showtime?.Id ?? null;
}

export default function SeatSelect() {
  const {
    showtime, hall, movie, cinema, selectedSeats, toggleSeat, removeSeats, confirmSeats,
    subtotalTickets, setSessionId, unlockSeats, sessionId: storedSessionId
  } = useBooking();
  const { user } = useAuth();
  const [showtimeSeats, setShowtimeSeats] = useState([]);
  const [hallSeats, setHallSeats] = useState([]);
  const [seatTypes, setSeatTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!showtime || !hall) return;
    const showtimeId = getShowtimeId(showtime);
    if (!showtimeId) return;

    Promise.all([
      showtimeApi.getById(showtimeId),
      lookupApi.getAll(),
    ])
    .then(([stData, lookups]) => {
        const seats = stData.seats || [];
        const types = lookups.seatTypes || [];
        console.log('[SeatSelect] Total seats:', seats.length);
        console.log('[SeatSelect] Seat Type Counts:', seats.reduce((acc, s) => {
          acc[s.seatTypeId] = (acc[s.seatTypeId] || 0) + 1;
          return acc;
    },{})
        
        );
        console.log('[SeatSelect] Seat Type Definitions:', types.map(t => ({ id: t.seatTypeId ?? t.id, name: t.typeName || t.name })));
        setShowtimeSeats(seats);
        setSeatTypes(types);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    
     },[showtime, hall]);


  // Map seat info with showtime seat status
  const seatMap = useMemo(() => {
    const map = {};
    showtimeSeats.forEach(s => {
      map[s.id] = s;
    });
    return map;
  }, [showtimeSeats]);

  // Group by rows
  const rows = useMemo(() => {
    const grouped = {};
    Object.values(seatMap).forEach(seat => {
      if (!grouped[seat.rowLabel]) grouped[seat.rowLabel] = [];
      grouped[seat.rowLabel].push(seat);
    });
    Object.values(grouped).forEach(row => row.sort((a, b) => a.colNumber - b.colNumber));
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [seatMap]);

  const seatTypeMap = useMemo(() => {
    const map = {};
    seatTypes.forEach(st => {
      const key = st.seatTypeId ?? st.id;
      if (key != null) {
        map[key] = st;
        map[key.toString()] = st;
      }
    });
    return map;
  }, [seatTypes]);

  const handleConfirm = async () => {
    if (selectedSeats.length === 0) return;
    setProcessing(true);
    setError('');
    try {
      const userId = getUserId(user);
      if (!userId) {
        setError('Vui lòng đăng nhập lại trước khi giữ ghế.');
        return;
      }
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const showtimeId = getShowtimeId(showtime);
      if (!showtimeId) {
        setError('Thiáº¿u thÃ´ng tin suáº¥t chiáº¿u. Vui lÃ²ng chá»n láº¡i suáº¥t chiáº¿u.');
        return;
      }
      
      const seatIds = selectedSeats.map(s => s.seatId);
      
      await showtimeApi.lockSeats(showtimeId, {
        userId,
        sessionId,
        seatIds,
        minutes: 10
      });
      
      setSessionId(sessionId);
      confirmSeats();
    } catch (err) {
      console.error('[SeatSelect] Lock failed:', err);
      setError(err.message || 'Ghế bạn chọn vừa có người khác giữ. Vui lòng chọn ghế khác.');
      
      // Refresh seats to show updated status
      const showtimeId = getShowtimeId(showtime);
      const data = showtimeId ? await showtimeApi.getById(showtimeId) : null;
      const updatedSeats = data?.seats || [];
      if (updatedSeats.length > 0) {
        setShowtimeSeats(updatedSeats);
      }

      // Find seats that are no longer available and remove them from selection
      const unavailableSeatIds = updatedSeats
        .filter(s => s.status !== 'available' && selectedSeats.some(sel => sel.seatId === s.id))
        .map(s => s.id);
      
      if (unavailableSeatIds.length > 0) {
        removeSeats(unavailableSeatIds);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleSeatClick = (seat) => {
    if (seat.status !== 'available') return;
    toggleSeat({
      id: seat.seatId,
      seatId: seat.seatId,
      seatCode: seat.seatCode,
      seatTypeId: seat.seatTypeId,
      finalPrice: seat.finalPrice,
      rowLabel: seat.rowLabel,
      colNumber: seat.colNumber,
    });
  };

  const isSelected = (seat) => {
    return selectedSeats.some(s => s.id === seat.seatId);
  };

  const getSeatClass = (seat) => {
    const modifiers = [];

    // Status classes
    if (isSelected(seat)) modifiers.push('seat--selected');
    if (seat.status === 'booked' || seat.status === 'locked') {
      modifiers.push('seat--booked');
      return modifiers.join(' ');
    }

    // Type classes
    const type = seatTypeMap[seat.seatTypeId];
    const typeName = (type?.typeName || type?.name || '').toLowerCase();

    if (typeName.includes('vip') || typeName.includes('premium') || typeName.includes('sang') || typeName.includes('deluxe')) {
      modifiers.push('seat--vip');
    } else if (typeName.includes('sweetbox') || typeName.includes('couple') || typeName.includes('đôi')) {
      modifiers.push('seat--couple');
    } else {
      modifiers.push('seat--available');
    }

    return modifiers.join(' ');
  };

  const formatPrice = (p) => new Intl.NumberFormat('vi-VN').format(p) + 'đ';

  if (loading) {
    return (
      <div className="seat-select" id="seat-select-step">
        <h2 className="section-title">Chọn ghế</h2>
        <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div className="seat-select" id="seat-select-step">
      <h2 className="section-title">Chọn ghế ngồi</h2>

      <div className="seat-select__layout">
        <div className="seat-select__map-area">
          {/* Screen */}
          <div className="seat-select__screen-wrapper">
            <div className="seat-select__screen">
              <span>MÀN HÌNH</span>
            </div>
            <div className="seat-select__screen-glow" />
          </div>

          {/* Seats */}
          <div className="seat-select__grid">
            {rows.map(([rowLabel, seats]) => (
              <div key={rowLabel} className="seat-row">
                <span className="seat-row__label">{rowLabel}</span>
                <div className="seat-row__seats">
                  {seats.map(seat => (
                    <button
                      key={seat.seatId}
                      className={`seat ${getSeatClass(seat)}`}
                      onClick={() => handleSeatClick(seat)}
                      disabled={seat.status !== 'available' && !isSelected(seat)}
                      title={`${seat.seatCode} - ${formatPrice(seat.finalPrice)}`}
                      id={`seat-${seat.seatCode}`}
                    >
                    <span className="seat__code">{seat.colNumber}</span>
                    </button>
                  ))}
                </div>
                <span className="seat-row__label">{rowLabel}</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="seat-select__legend">
            <div className="seat-legend-item">
              <div className="seat-legend-box seat-legend-box--available" />
              <span>Trống</span>
            </div>
            <div className="seat-legend-item">
              <div className="seat-legend-box seat-legend-box--selected" />
              <span>Đang chọn</span>
            </div>
            <div className="seat-legend-item">
              <div className="seat-legend-box seat-legend-box--booked" />
              <span>Đã đặt</span>
            </div>
            <div className="seat-legend-item">
              <div className="seat-legend-box seat-legend-box--vip" />
              <span>VIP</span>
            </div>
            <div className="seat-legend-item">
              <div className="seat-legend-box seat-legend-box--couple" />
              <span>Đôi</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="seat-select__summary">
          <div className="seat-summary">
            <h3 className="seat-summary__title">Thông tin đặt vé</h3>

            <div className="seat-summary__movie">
              {movie?.posterUrl && <img src={movie.posterUrl} alt="" className="seat-summary__poster" />}
              <div>
                <strong>{movie?.title}</strong>
                <p>{cinema?.cinemaName} • {hall?.hallName}</p>
                <p>{showtime?.startTime?.split('T')[0]} • {showtime?.startTime?.split('T')[1]?.split(':').slice(0, 2).join(':')}</p>
              </div>
            </div>

            <div className="seat-summary__seats">
              <h4>Ghế đã chọn ({selectedSeats.length})</h4>
              {selectedSeats.length === 0 ? (
                <p className="seat-summary__empty">Chưa chọn ghế nào</p>
              ) : (
                <div className="seat-summary__tags">
                  {selectedSeats.map(s => (
                    <span key={s.id} className="seat-summary__tag">
                      {s.seatCode}
                      <small>{formatPrice(s.finalPrice)}</small>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="seat-summary__total">
              <span>Tạm tính</span>
              <strong>{formatPrice(subtotalTickets)}</strong>
            </div>

            {error && <p className="seat-summary-error">{error}</p>}

            <button
              className="seat-summary__btn"
              onClick={handleConfirm}
              disabled={selectedSeats.length === 0 || processing}
              id="confirm-seats-btn"
            >
              {processing ? 'Đang giữ ghế...' : 'Tiếp tục chọn đồ ăn →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
