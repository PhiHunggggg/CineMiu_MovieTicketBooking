import { useBooking } from '../../context/BookingContext';
import './BookingStepper.css';

const cinemaFirstSteps = [
  { num: 1, label: 'Chọn rạp', icon: '🏛️' },
  { num: 2, label: 'Chọn phim', icon: '🎬' },
  { num: 3, label: 'Suất chiếu', icon: '🕐' },
  { num: 4, label: 'Chọn ghế', icon: '💺' },
  { num: 5, label: 'Đồ ăn', icon: '🍿' },
  { num: 6, label: 'Thanh toán', icon: '💳' },
];

const movieFirstSteps = [
  { num: 1, label: 'Chọn phim', icon: '🎬' },
  { num: 2, label: 'Chọn rạp', icon: '🏛️' },
  { num: 3, label: 'Suất chiếu', icon: '🕐' },
  { num: 4, label: 'Chọn ghế', icon: '💺' },
  { num: 5, label: 'Đồ ăn', icon: '🍿' },
  { num: 6, label: 'Thanh toán', icon: '💳' },
];

export default function BookingStepper() {
  const { step, setStep, cinema, movie, showtime, bookingFlow, timeLeft, isTimerActive, isPaymentWaiting } = useBooking();
  const steps = bookingFlow === 'movie_first' ? movieFirstSteps : cinemaFirstSteps;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canGoTo = (targetStep) => {
    // While QR payment is active, lock all navigation — user must use the cancel button in Invoice
    if (isPaymentWaiting) return false;
    if (targetStep > step) return false;
    if (bookingFlow === 'cinema_first') {
      if (targetStep === 2 && !cinema) return false;
      if (targetStep === 3 && !movie) return false;
    } else {
      if (targetStep === 2 && !movie) return false;
      if (targetStep === 3 && !cinema) return false;
    }
    if (targetStep >= 4 && !showtime) return false;
    return true;
  };

  return (
    <div className="stepper" id="booking-stepper">
      <div className="stepper__track">
        {steps.map((s, i) => (
          <div key={s.num} className="stepper__item-wrapper">
            <button
              className={`stepper__item ${step === s.num ? 'stepper__item--active' : ''} ${step > s.num ? 'stepper__item--done' : ''}`}
              onClick={() => canGoTo(s.num) && setStep(s.num)}
              disabled={!canGoTo(s.num)}
              id={`step-${s.num}`}
            >
              <div className="stepper__circle">
                {step > s.num ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="stepper__icon">{s.icon}</span>
                )}
              </div>
              <span className="stepper__label">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`stepper__line ${step > s.num ? 'stepper__line--done' : ''}`} />
            )}
          </div>
        ))}
      </div>
      
      {isTimerActive && (
        <div className={`stepper__timer ${timeLeft < 60 ? 'stepper__timer--urgent' : ''}`} id="booking-timer">
          <span className="stepper__timer-icon">⏳</span>
          <span className="stepper__timer-text">Thời gian giữ ghế:</span>
          <strong className="stepper__timer-value">{formatTime(timeLeft)}</strong>
        </div>
      )}
      {isPaymentWaiting && (
        <div className="stepper__timer" id="payment-waiting-badge" style={{ background: 'rgba(52,199,89,0.15)', borderColor: '#34c759' }}>
          <span className="stepper__timer-icon">🔒</span>
          <span className="stepper__timer-text" style={{ color: '#34c759' }}>Đang chờ xác nhận thanh toán — Không thể thay đổi bước</span>
        </div>
      )}
    </div>
  );
}
