import { useState, useEffect, useRef } from 'react';
import { bookingApi, promotionApi } from '../../../services/api';
import { useBooking } from '../../../context/BookingContext';
import { useAuth } from '../../../context/AuthContext';
import { getUserId } from '../../../utils/authUser';
import './Invoice.css';
import { generateQrCodeUrl, BANK_ID, ACCOUNT_NO, ACCOUNT_NAME } from '../../../staticThing';

const PAYMENT_TIMEOUT_SECONDS = 5 * 60; // 5 ph�t

function getBookingId(order) {
    return order?.bookingId
        ?? order?.BookingId
        ?? order?.booking?.bookingId
        ?? order?.booking?.BookingId
        ?? null;
}
function getBookingCode(order) {
    return order?.bookingCode
        ?? order?.BookingCode
        ?? order?.booking?.bookingCode
        ?? order?.booking?.BookingCode
        ?? 'BOOKING';
}
function getStartTime(showtime) {
  return showtime?.startTime ?? showtime?.StartTime ?? null;
}

function getSeatPrice(seat) {
  const price = Number(seat?.finalPrice ?? seat?.FinalPrice ?? seat?.price ?? seat?.Price);
  return Number.isFinite(price) ? price : 0;
}

function getTicketQrUrl(code) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(code)}`;
}

export default function Invoice() {
  const {
    cinema, movie, hall, showtime, selectedSeats, selectedProducts,
    subtotalTickets, subtotalProducts, discountAmount, totalAmount,
    voucherCode, voucher, order, setOrder, reset,
    stopTimer, unlockSeats, setPaymentWaiting,
  } = useBooking();
  const { user } = useAuth();
  const [payMethod, setPayMethod] = useState('qrbank');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [paymentTimeLeft, setPaymentTimeLeft] = useState(PAYMENT_TIMEOUT_SECONDS); // 5 ph�t thanh to�n
  const pollingRef = useRef(null);
  const countdownRef = useRef(null);

  // ─── Bộ đếm ngược 5 ph�t cho ri�ng bước thanh to�n ──────────────────────────
  useEffect(() => {
    if (!isWaiting) return;

    setPaymentTimeLeft(PAYMENT_TIMEOUT_SECONDS); // Reset về 5 ph�t khi bắt đầu chờ

    countdownRef.current = setInterval(() => {
      setPaymentTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownRef.current);
  }, [isWaiting]);

  // ─── Polling kiểm tra trạng th�i đơn ────────────────────────────────────────
  useEffect(() => {
    if (!isWaiting || !order) return;

      const orderId = getBookingId(order);
      if (!orderId) {
          console.error('[Polling] Missing bookingId:', order);
          setError('Không tìm thấy mã booking để xác nhận thanh toán.');
          return;
      }
    pollingRef.current = setInterval(async () => {
      try {
        const response = await bookingApi.getById(orderId);
        // Backend trả { booking, tickets, ... }
        const updatedBooking = response.booking ?? response;
        const status = (updatedBooking.status ?? updatedBooking.Status ?? '').toString().toLowerCase();

        console.log(`[Polling] Order ${orderId} status: ${status}`);

        if (status === 'confirmed') {
          clearInterval(pollingRef.current);
          clearInterval(countdownRef.current);
          setOrder(updatedBooking);
          setIsWaiting(false);
          setPaymentWaiting(false); // re-enable stepper on success
          setSuccess(true);
        }
      } catch (err) {
        console.error('[Polling] Error:', err);
      }
    }, 3000);

    return () => clearInterval(pollingRef.current);
  }, [isWaiting, order, setOrder]);

  // ─── Hủy đơn khi hết thời gian ──────────────────────────────────────────────
  const handleTimeout = async () => {
    clearInterval(pollingRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setIsWaiting(false);
    setPaymentWaiting(false); // re-enable stepper navigation

    // Mở kh�a ghế ngay lập tức
    unlockSeats();

    if (order) {
      const orderId = order.bookingId ?? order.BookingId;
      try {
        await bookingApi.cancel(orderId, 'Hết thời gian chờ thanh to�n QR (5 ph�t)');
        console.log(`[Invoice] Order ${orderId} cancelled due to timeout`);
      } catch (err) {
        console.error('[Invoice] Cancel error:', err);
      }
    }
    setCancelled(true);
  };

  const formatPrice = (p) => new Intl.NumberFormat('vi-VN').format(Number(p) || 0) + 'đ';

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const confirmQrPaymentDemo = async () => {
    if (!order) return;
    setProcessing(true);
    setError('');
    try {
      const bookingId = getBookingId(order);
      if (!bookingId) {
        throw new Error('Kh�ng t�m thấy m� booking để x�c nhận thanh to�n.');
      }

      const payAmount = order.finalAmount ?? order.FinalAmount ?? order.totalAmount ?? order.TotalAmount ?? totalAmount;
      const paidOrder = await bookingApi.addPayment(bookingId, {
        methodId: 1,
        amount: payAmount,
        status: 'success',
        promoCode: voucherCode || voucher?.promoCode || null,
        transactionRef: `QR${Date.now()}`,
        paidAt: new Date().toISOString(),
      });

      clearInterval(pollingRef.current);
      clearInterval(countdownRef.current);
      setOrder(paidOrder || { ...order, status: 'confirmed' });
      setIsWaiting(false);
      setPaymentWaiting(false);
      setSuccess(true);
    } catch (err) {
      console.error('[Booking] QR demo confirm failed:', err);
      setError(err.message || 'Kh�ng thể x�c nhận thanh to�n QR demo.');
    } finally {
      setProcessing(false);
    }
  };

  // ─── Submit thanh to�n ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setProcessing(true);
    setError('');
    setCancelled(false);
    try {
      const userId = getUserId(user);
      const stId = showtime?.showtimeId ?? showtime?.ShowtimeId ?? showtime?.id ?? showtime?.Id;
      const cinemaId = cinema?.cinemaId ?? cinema?.CinemaId ?? cinema?.id ?? cinema?.Id;
      const hallId = hall?.hallId ?? hall?.HallId ?? hall?.id ?? hall?.Id;

      if (!userId) {
        setError('Vui l�ng đăng nhập lại trước khi đặt v�.');
        setProcessing(false);
        return;
      }

      if (!stId) {
        setError('Thiếu th�ng tin suất chiếu. Vui l�ng quay lại chọn suất chiếu.');
        setProcessing(false);
        return;
      }
      if (!selectedSeats || selectedSeats.length === 0) {
        setError('Vui l�ng chọn �t nhất một ghế.');
        setProcessing(false);
        return;
      }
      if (!cinemaId || !hallId) {
        setError('Thiếu th�ng tin rạp hoặc ph�ng chiếu.');
        setProcessing(false);
        return;
      }
      let serverDiscountAmount = 0;
      const appliedPromoCode = voucherCode?.trim();
      if (appliedPromoCode) {
        const validation = await promotionApi.validate({
          promoCode: appliedPromoCode,
          userId,
          orderAmount: subtotalTickets + subtotalProducts,
        });
        serverDiscountAmount = Number(validation.discountAmount || 0);
      }

      // Build booking payload matching CreateBookingDto exactly

      const bookingData = {
        userId,
        cinemaId,
        hallId,
        showtimeId: stId,
        seats: selectedSeats.map(s => ({
          seatId: s.seatId,
          price: getSeatPrice(s),
        })).filter(s => s.seatId),
        concessions: selectedProducts
          .filter(p => p.product && p.quantity > 0)
          .map(p => ({
            itemId: p.product.itemId ?? p.product.ItemId,
            quantity: p.quantity,
          }))
          .filter(x => x.itemId),
        discountAmount: serverDiscountAmount,
        promoCode: appliedPromoCode || undefined,
        bookingChannel: 'web',
      };

      const createdOrder = await bookingApi.create(bookingData);
      const bookingId = getBookingId(createdOrder);
      if (!bookingId) {
        throw new Error('Kh�ng nhận được m� booking từ server.');
      }

      let bookingDetail = createdOrder;
      try {
        bookingDetail = await bookingApi.getById(bookingId);
      } catch (detailErr) {
        console.warn('[Booking] Created order but failed to reload detail:', detailErr);
      }
      console.log('[Booking] Created order:', bookingDetail);
      setOrder(bookingDetail);

      // QR Bank → v�o trạng th�i chờ webhook
      if (payMethod === 'qrbank') {
        stopTimer(); // Dừng bộ đếm giữ ghế cũ
        setIsWaiting(true);
        setPaymentWaiting(true); // disable stepper navigation while waiting
        return;
      }

      // C�c phương thức kh�c → confirm ngay (demo)
      const payMethodId =
        payMethod === 'momo' ? 1 :
          payMethod === 'zalopay' ? 2 :
            payMethod === 'vnpay' ? 3 :
              payMethod === 'visa' ? 4 :
                payMethod === 'atm' ? 5 : 1;

      const payAmount = bookingDetail.finalAmount ?? bookingDetail.FinalAmount ?? totalAmount;

      const paidOrder = await bookingApi.addPayment(bookingId, {
        methodId: payMethodId,
        amount: payAmount,
        status: 'success',
        promoCode: voucherCode || voucher?.promoCode || null,
        transactionRef: `TXN${Date.now()}`,
        paidAt: new Date().toISOString(),
      });

      console.log('[Booking] Payment added successfully');
      stopTimer();
      setPaymentWaiting(false);
      setOrder(paidOrder || { ...bookingDetail, status: 'confirmed', methodId: payMethodId });
      setSuccess(true);
    } catch (err) {
      console.error('[Booking] Error:', err);
      setError(err.message || 'Đ� c� lỗi xảy ra. Vui l�ng thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  // ─── M�n h�nh hủy (timeout) ─────────────────────────────────────────────────
  if (cancelled) {
    return (
      <div className="invoice-waiting" id="payment-cancelled">
        <div className="invoice-waiting__card">
          <div className="invoice-waiting__header">
            <h2 className="invoice-waiting__title" style={{ color: '#e74c3c' }}>⏰ Đơn h�ng đ� bị hủy</h2>
            <p className="invoice-waiting__subtitle">Đ� hết 5 ph�t m� chưa nhận được x�c nhận thanh to�n.</p>
          </div>
          <div className="invoice-waiting__note">
            <p>Đơn h�ng của bạn đ� được hủy tự động. Vui l�ng đặt v� lại nếu bạn vẫn muốn xem phim.</p>
          </div>
          <button className="invoice-waiting__cancel" style={{ color: '#e74c3c', fontWeight: 700 }} onClick={reset}>
            ← Đặt v� lại
          </button>
        </div>
      </div>
    );
  }

  // ─── M�n h�nh chờ thanh to�n QR ─────────────────────────────────────────────
  if (isWaiting) {
    const qrAmount = order?.finalAmount ?? order?.FinalAmount ?? order?.totalAmount ?? order?.TotalAmount ?? totalAmount;
      const qrCode = getBookingCode(order);
    const qrUrl = generateQrCodeUrl(qrAmount, qrCode);

    return (
      <div className="invoice-waiting" id="payment-waiting">
        <div className="invoice-waiting__card">
          <div className="invoice-waiting__header">
            <h2 className="invoice-waiting__title">Qu�t m� để thanh to�n</h2>
            <p className="invoice-waiting__subtitle">Sử dụng ứng dụng Ng�n h�ng để qu�t m� QR b�n dưới</p>
          </div>

          {/* Đồng hồ đếm ngược */}
          <div className="invoice-waiting__countdown" style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: paymentTimeLeft <= 60 ? '#e74c3c' : 'var(--primary)',
            marginBottom: '1rem',
            letterSpacing: '2px',
            animation: paymentTimeLeft <= 60 ? 'pulse 1s infinite' : 'none',
          }}>
            ⏱ {formatCountdown(paymentTimeLeft)}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Đơn h�ng sẽ tự động hủy sau khi hết thời gian
          </p>

          <div className="invoice-waiting__qr-box">
            <img src={qrUrl} alt="VietQR" className="invoice-waiting__qr-img" />
            <div className="invoice-waiting__loader">
              <span className="invoice-waiting__spinner"></span>
              Đang chờ x�c nhận từ ng�n h�ng...
            </div>
          </div>

          <div className="invoice-waiting__info">
            <div className="invoice-waiting__info-row">
              <span>Ng�n h�ng:</span>
              <strong>{BANK_ID}</strong>
            </div>
            <div className="invoice-waiting__info-row">
              <span>Số t�i khoản:</span>
              <strong>{ACCOUNT_NO}</strong>
            </div>
            <div className="invoice-waiting__info-row">
              <span>Chủ t�i khoản:</span>
              <strong>{ACCOUNT_NAME}</strong>
            </div>
            <div className="invoice-waiting__info-row">
              <span>Số tiền:</span>
              <strong className="invoice-waiting__amount">{formatPrice(qrAmount)}</strong>
            </div>
            <div className="invoice-waiting__info-row">
              <span>Nội dung:</span>
              <strong className="invoice-waiting__code"
                style={{ cursor: 'pointer' }}
                title="Nhấn để sao ch�p"
                onClick={() => navigator.clipboard.writeText(qrCode).then(() => alert('Đ� sao ch�p nội dung chuyển khoản!'))}
              >
                {qrCode} 📋
              </strong>
            </div>
          </div>

          <div className="invoice-waiting__note">
            <p>⚠️ <strong>Lưu �:</strong> Vui l�ng giữ nguy�n nội dung chuyển khoản để hệ thống tự động x�c nhận đơn h�ng. Nhấn v�o m� để sao ch�p nhanh.</p>
          </div>

          {error && <p className="invoice-total-card__error">{error}</p>}

          <button
            className="invoice-total-card__btn"
            onClick={confirmQrPaymentDemo}
            disabled={processing}
            style={{ marginBottom: '0.75rem' }}
          >
            {processing ? 'Đang x�c nhận...' : 'T�i đ� thanh to�n (demo)'}
          </button>

          <button className="invoice-waiting__cancel" onClick={handleTimeout}>
            Hủy đơn h�ng
          </button>
        </div>
      </div>
    );
  }

  // ─── M�n h�nh th�nh c�ng ─────────────────────────────────────────────────────
  if (success) {
    const qrAmount = order?.finalAmount ?? order?.FinalAmount ?? order?.totalAmount ?? order?.TotalAmount ?? totalAmount;
      const qrCode = getBookingCode(order);
    const tickets = order?.tickets ?? order?.Tickets ?? [];
    return (
      <div className="invoice-success" id="booking-success">
        <div className="invoice-success__card">
          <div className="invoice-success__icon">✅</div>
          <h2 className="invoice-success__title">Đặt v� th�nh c�ng!</h2>
          <p className="invoice-success__subtitle">Cảm ơn bạn đ� đặt v� tại CineMiu</p>

          <div className="invoice-success__ticket">
            <div className="invoice-success__ticket-header">
              <span>🎬 CINEMIU</span>
              <span className="invoice-success__order-code">{qrCode}</span>
            </div>

            <div className="invoice-success__ticket-body">
              <div className="invoice-success__ticket-row">
                <span className="invoice-success__ticket-label">Phim</span>
                <strong>{movie?.title}</strong>
              </div>
              <div className="invoice-success__ticket-row">
                <span className="invoice-success__ticket-label">Rạp</span>
                <span>{cinema?.name || cinema?.Name || cinema?.cinemaName || cinema?.CinemaName || 'Chưa x�c định'} � {hall?.name || hall?.Name || hall?.hallName || hall?.HallName || 'Chưa x�c định'}</span>
              </div>
              <div className="invoice-success__ticket-row">
                <span className="invoice-success__ticket-label">Suất chiếu</span>
                <span>{getStartTime(showtime)?.split('T')[0]} � {getStartTime(showtime)?.split('T')[1]?.split(':').slice(0, 2).join(':')}</span>
              </div>
              <div className="invoice-success__ticket-row">
                <span className="invoice-success__ticket-label">Ghế</span>
                <span className="invoice-success__seat-list">
                  {selectedSeats.map(s => s.seatCode).join(', ')}
                </span>
              </div>
              <div className="invoice-success__ticket-row invoice-success__ticket-total">
                <span>Tổng thanh to�n</span>
                <strong>{formatPrice(order?.finalAmount ?? order?.FinalAmount ?? order?.totalAmount ?? order?.TotalAmount ?? totalAmount)}</strong>
              </div>
            </div>

            <div className="invoice-success__ticket-qr">
              <div className="invoice-success__qr-placeholder">
                <div className="invoice-success__qr-container">
                  {tickets.length > 0 ? (
                    <div className="invoice-success__checkin-list">
                      <h3>M� QR check-in</h3>
                      <p>Xuất tr�nh m� QR từng ghế tại quầy so�t v�.</p>
                      {tickets.map(ticket => {
                        const ticketCode = ticket.qrCode ?? ticket.QrCode;
                        const seatCode = ticket.seatCode ?? ticket.SeatCode;
                        return (
                          <div key={ticket.ticketId ?? ticket.TicketId ?? ticketCode} className="invoice-success__checkin-item">
                            <img src={getTicketQrUrl(ticketCode)} alt={`QR ${seatCode}`} />
                            <div>
                              <span>{seatCode}</span>
                              <code>{ticketCode}</code>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="invoice-success__bank-info">
                      <p><strong>M� booking:</strong> {qrCode}</p>
                      <p><strong>Số tiền:</strong> {formatPrice(qrAmount)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button className="invoice-success__btn" onClick={reset} id="book-again-btn">
            Đặt v� mới
          </button>
        </div>
      </div>
    );
  }

  // ─── Form chọn phương thức thanh to�n ───────────────────────────────────────
  return (
    <div className="invoice" id="invoice-step">
      <h2 className="section-title">X�c nhận & Thanh to�n</h2>

      <div className="invoice__layout">
        <div className="invoice__details">
          {/* Movie Info */}
          <div className="invoice-card">
            <div className="invoice-card__header">
              <span className="invoice-card__icon">🎬</span>
              <h3>Th�ng tin phim</h3>
            </div>
            <div className="invoice-card__body">
              <div className="invoice-card__movie">
                {movie?.posterUrl && <img src={movie.posterUrl} alt="" className="invoice-card__poster" />}
                <div>
                  <strong className="invoice-card__movie-title">{movie?.title}</strong>
                  <p>{movie?.durationMins} ph�t � {movie?.ageRating || 'P'}</p>
                  <p>{cinema?.cinemaName || cinema?.CinemaName || cinema?.name || cinema?.Name}</p>
                  <p>{hall?.hallName || hall?.HallName || hall?.name || hall?.Name}</p>
                  <p>{getStartTime(showtime)?.split('T')[0]} � {getStartTime(showtime)?.split('T')[1]?.split(':').slice(0, 2).join(':')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Seats */}
          <div className="invoice-card">
            <div className="invoice-card__header">
              <span className="invoice-card__icon">💺</span>
              <h3>Ghế đ� chọn ({selectedSeats.length})</h3>
            </div>
            <div className="invoice-card__body">
              <table className="invoice-table">
                <thead>
                  <tr><th>Ghế</th><th>Gi�</th></tr>
                </thead>
                <tbody>
                  {selectedSeats.map(s => (
                    <tr key={s.seatId ?? s.id}>
                      <td><strong>{s.seatCode}</strong></td>
                      <td>{formatPrice(getSeatPrice(s))}</td>
                    </tr>
                  ))}
                  <tr className="invoice-table__subtotal">
                    <td>Tạm t�nh v�</td>
                    <td><strong>{formatPrice(subtotalTickets)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Food */}
          {selectedProducts.length > 0 && (
            <div className="invoice-card">
              <div className="invoice-card__header">
                <span className="invoice-card__icon">🍿</span>
                <h3>Đồ ăn & Thức uống</h3>
              </div>
              <div className="invoice-card__body">
                <table className="invoice-table">
                  <thead>
                    <tr><th>Sản phẩm</th><th>SL</th><th>Th�nh tiền</th></tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map(p => (
                      <tr key={p.product.itemId}>
                        <td>{p.product.itemName}</td>
                        <td>{p.quantity}</td>
                        <td>{formatPrice(p.product.price * p.quantity)}</td>
                      </tr>
                    ))}
                    <tr className="invoice-table__subtotal">
                      <td colSpan="2">Tạm t�nh đồ ăn</td>
                      <td><strong>{formatPrice(subtotalProducts)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div className="invoice-card">
            <div className="invoice-card__header">
              <span className="invoice-card__icon">💳</span>
              <h3>Phương thức thanh to�n</h3>
            </div>
            <div className="invoice-card__body">
              <div className="invoice-pay-methods">
                {[
                  { id: 'qrbank', label: 'Bank QR (VietQR)', icon: '🏦', color: '#1a1f71' },
                  { id: 'momo', label: 'V� MoMo', icon: '📱', color: '#d82d8b' },
                  { id: 'zalopay', label: 'ZaloPay', icon: '💙', color: '#0068ff' },
                  { id: 'vnpay', label: 'VNPay', icon: '🏧', color: '#e21e2c' },
                  { id: 'visa', label: 'Visa / Mastercard', icon: '💳', color: '#1a1f71' },
                  { id: 'atm', label: 'Thẻ ATM nội địa', icon: '🏧', color: '#2ecc71' },
                ].map(method => (
                  <button
                    key={method.id}
                    className={`invoice-pay-method ${payMethod === method.id ? 'invoice-pay-method--active' : ''}`}
                    onClick={() => setPayMethod(method.id)}
                    id={`pay-${method.id}`}
                  >
                    <span className="invoice-pay-method__icon">{method.icon}</span>
                    <span className="invoice-pay-method__label">{method.label}</span>
                    <span className={`invoice-pay-method__radio ${payMethod === method.id ? 'invoice-pay-method__radio--checked' : ''}`} />
                  </button>
                ))}
              </div>
              {payMethod === 'qrbank' && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)', borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>
                  Sau khi x�c nhận, m� QR sẽ hiển thị. Bạn c� <strong>5 ph�t</strong> để ho�n th�nh chuyển khoản. Đơn h�ng sẽ tự động hủy nếu kh�ng nhận được thanh to�n.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="invoice__sidebar">
          <div className="invoice-total-card">
            <h3 className="invoice-total-card__title">H�a đơn thanh to�n</h3>

            <div className="invoice-total-card__lines">
              <div className="invoice-total-card__line">
                <span>V� xem phim ({selectedSeats.length})</span>
                <span>{formatPrice(subtotalTickets)}</span>
              </div>
              <div className="invoice-total-card__line">
                <span>Đồ ăn & Thức uống</span>
                <span>{formatPrice(subtotalProducts)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="invoice-total-card__line invoice-total-card__line--discount">
                  <span>Giảm gi� {voucherCode && `(${voucherCode})`}</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
            </div>

            <div className="invoice-total-card__total">
              <span>Tổng thanh to�n</span>
              <strong>{formatPrice(totalAmount)}</strong>
            </div>

            {error && <p className="invoice-total-card__error">{error}</p>}

            <button
              className="invoice-total-card__btn"
              onClick={handleSubmit}
              disabled={processing}
              id="submit-payment-btn"
            >
              {processing ? (
                <span className="invoice-total-card__spinner">⏳ Đang xử l�...</span>
              ) : (
                `Thanh to�n ${formatPrice(totalAmount)}`
              )}
            </button>

            <p className="invoice-total-card__note">
              Bằng việc thanh to�n, bạn đồng � với <a href="#">Điều khoản sử dụng</a> v� <a href="#">Ch�nh s�ch bảo mật</a> của CineVerse.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
