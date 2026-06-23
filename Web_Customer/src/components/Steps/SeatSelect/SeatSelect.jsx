import { useState, useEffect, useMemo } from 'react';
import { showtimeApi, lookupApi } from '../../../services/api';
import { useBooking } from '../../../context/BookingContext';
import { useAuth } from '../../../context/AuthContext';
import { getUserId } from '../../../utils/authUser';
import './SeatSelect.css';

function getShowtimeId(showtime) {
  return showtime?.showtimeId ?? showtime?.ShowtimeId ?? showtime?.id ?? showtime?.Id ?? null;
}

function getSeatId(seat) {
  return seat?.seatId ?? seat?.SeatId ?? seat?.id ?? seat?.Id ?? null;
}

function getSeatStatus(seat) {
  if (seat?.isBooked ?? seat?.IsBooked) return 'booked';
  if (seat?.isLocked ?? seat?.IsLocked) return 'locked';
  return (seat?.status ?? seat?.Status ?? 'available').toString().toLowerCase();
}

function getStartTime(showtime) {
  return showtime?.startTime ?? showtime?.StartTime ?? null;
}

export default function SeatSelect() {
  const {
    showtime, hall, movie, cinema, selectedSeats, toggleSeat, removeSeats, confirmSeats,
    subtotalTickets, setSessionId
  } = useBooking();
  const { user } = useAuth();
  const [showtimeSeats, setShowtimeSeats] = useState([]);
  const [seatTypes, setSeatTypes] = useState([]);
  const [isFetchingSeats, setIsFetchingSeats] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

    const hasValidShowtime = Boolean(showtime && hall && getShowtimeId(showtime));
    const loading = hasValidShowtime && isFetchingSeats;

    const fetchSeats = async (showtimeId) => {
        setIsFetchingSeats(true);
        setError('');

        try {
            const userId = getUserId(user);
            const [seats, lookups] = await Promise.all([
                showtimeApi.getSeats(showtimeId, userId ? { userId } : {}),
                lookupApi.getAll(),
            ]);

            setShowtimeSeats(Array.isArray(seats) ? seats : []);
            setSeatTypes(lookups.seatTypes || []);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Không thể tải sơ đồ ghế.');
            setShowtimeSeats([]);
            setSeatTypes([]);
        } finally {
            setIsFetchingSeats(false);
        }
    };
    useEffect(() => {
        if (!showtime || !hall) return;

        const showtimeId = getShowtimeId(showtime);
        if (!showtimeId) return;

        setTimeout(() => {
            fetchSeats(showtimeId);
        }, 0);
    }, [showtime, hall, user]);

    const showtimeId = getShowtimeId(showtime);

    const missingShowtimeError =
        showtime && hall && !showtimeId
            ? 'Thiếu thông tin suất chiếu. Vui lòng quay lại chọn suất chiếu.'
            : '';

    const displayError = missingShowtimeError || error;
  // Map seat info with showtime seat status
  const seatMap = useMemo(() => {
    const map = {};
    showtimeSeats.forEach(s => {
      const seatId = getSeatId(s);
      if (seatId != null) map[seatId] = s;
    });
    return map;
  }, [showtimeSeats]);

  // Group by rows
  const rows = useMemo(() => {
    const grouped = {};
    Object.values(seatMap).forEach(seat => {
      const rowLabel = seat.rowLabel ?? seat.RowLabel ?? '';
      if (!grouped[rowLabel]) grouped[rowLabel] = [];
      grouped[rowLabel].push(seat);
    });
    Object.values(grouped).forEach(row => row.sort((a, b) => (a.colNumber ?? a.ColNumber ?? 0) - (b.colNumber ?? b.ColNumber ?? 0)));
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [seatMap]);

  const seatTypeMap = useMemo(() => {
    const map = {};
    seatTypes.forEach(st => {
      const key = st.seatTypeId ?? st.SeatTypeId ?? st.id ?? st.Id;
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
        setError('Thiếu thông tin suất chiếu. Vui lòng chọn lại suất chiếu.');
        return;
      }
      
      const seatIds = selectedSeats.map(s => s.seatId).filter(Boolean);
      
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
      try {
        const data = showtimeId ? await showtimeApi.getSeats(showtimeId) : null;
        const updatedSeats = Array.isArray(data) ? data : [];
        if (updatedSeats.length > 0) {
          setShowtimeSeats(updatedSeats);
        }

        // Find seats that are no longer available and remove them from selection
        const unavailableSeatIds = updatedSeats
          .filter(s => getSeatStatus(s) !== 'available' && selectedSeats.some(sel => sel.seatId === getSeatId(s)))
          .map(s => getSeatId(s))
          .filter(Boolean);
        
        if (unavailableSeatIds.length > 0) {
          removeSeats(unavailableSeatIds);
        }
      } catch (refreshErr) {
        console.error('[SeatSelect] Refresh failed:', refreshErr);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleSeatClick = (seat) => {
    if (getSeatStatus(seat) !== 'available') return;
    const seatId = getSeatId(seat);
    if (!seatId) return;
    toggleSeat({
      id: seatId,
      seatId,
      seatCode: seat.seatCode ?? seat.SeatCode,
      seatTypeId: seat.seatTypeId ?? seat.SeatTypeId,
      finalPrice: seat.finalPrice ?? seat.FinalPrice ?? seat.price ?? seat.Price,
      rowLabel: seat.rowLabel ?? seat.RowLabel,
      colNumber: seat.colNumber ?? seat.ColNumber,
    });
  };

  const isSelected = (seat) => {
    return selectedSeats.some(s => s.id === getSeatId(seat));
  };

  const getSeatClass = (seat) => {
    const modifiers = [];

    // Status classes
    if (isSelected(seat)) modifiers.push('seat--selected');
    const status = getSeatStatus(seat);
    if (status === 'booked' || status === 'locked') {
      modifiers.push('seat--booked');
      return modifiers.join(' ');
    }

    // Type classes
    const type = seatTypeMap[seat.seatTypeId ?? seat.SeatTypeId];
    const typeName = (
      seat.seatTypeName ||
      seat.SeatTypeName ||
      type?.typeName ||
      type?.TypeName ||
      type?.name ||
      type?.Name ||
      ''
    ).toLowerCase();

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

if (displayError && showtimeSeats.length === 0) {
    return (
      <div className="seat-select" id="seat-select-step">
        <h2 className="section-title">Chọn ghế</h2>
        <div className="seat-select__map-area">
          <p className="seat-summary-error">{error}</p>
        </div>
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
                  {seats.map(seat => {
                    const seatId = getSeatId(seat);
                    const seatCode = seat.seatCode ?? seat.SeatCode;
                    const colNumber = seat.colNumber ?? seat.ColNumber;
                    const finalPrice = seat.finalPrice ?? seat.FinalPrice ?? seat.price ?? seat.Price;
                    const status = getSeatStatus(seat);
                    return (
                      <button
                        key={seatId}
                        className={`seat ${getSeatClass(seat)}`}
                        onClick={() => handleSeatClick(seat)}
                        disabled={status !== 'available' && !isSelected(seat)}
                        title={`${seatCode} - ${formatPrice(finalPrice)}`}
                        id={`seat-${seatCode}`}
                      >
                        <span className="seat__code">{colNumber}</span>
                      </button>
                    );
                  })}
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
                <p>{cinema?.cinemaName || cinema?.CinemaName || cinema?.name || cinema?.Name} • {hall?.hallName || hall?.HallName || hall?.name || hall?.Name}</p>
                <p>{getStartTime(showtime)?.split('T')[0]} • {getStartTime(showtime)?.split('T')[1]?.split(':').slice(0, 2).join(':')}</p>
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

               {displayError && <p className="seat-summary-error">{displayError}</p>}

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
