import { useState, useEffect, useRef } from 'react';
import { bookingApi, promotionApi } from '../../../services/api';
import { useBooking } from '../../../context/BookingContext';
import { useAuth } from '../../../context/AuthContext';
import { getUserId } from '../../../utils/authUser';
import './Invoice.css';
import { generateQrCodeUrl, BANK_ID, ACCOUNT_NO, ACCOUNT_NAME } from '../../../staticThing';

const PAYMENT_TIMEOUT_SECONDS = 5 * 60; // 5 phút

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
  const [paymentTimeLeft, setPaymentTimeLeft] = useState(PAYMENT_TIMEOUT_SECONDS); // 5 phút thanh toán
  const pollingRef = useRef(null);
  const countdownRef = useRef(null);

  // ─── Bộ đếm ngược 5 phút cho riêng bước thanh toán ──────────────────────────
  useEffect(() => {
    if (!isWaiting) return;

    setPaymentTimeLeft(PAYMENT_TIMEOUT_SECONDS); // Reset về 5 phút khi bắt đầu chờ

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

  // ─── Polling kiểm tra trạng thái đơn ────────────────────────────────────────
  useEffect(() => {
    if (!isWaiting || !order) return;

    const orderId = order.bookingId ?? order.BookingId;
    pollingRef.current = setInterval(async () => {
      try {
        const response = await bookingApi.getById(orderId);
        // Backend trả { booking, tickets, ... }
        const updatedBooking = response.booking ?? response;
        const status = updatedBooking.status ?? updatedBooking.Status;

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

    // Mở khóa ghế ngay lập tức
    unlockSeats();

    if (order) {
      const orderId = order.bookingId ?? order.BookingId;
      try {
        await bookingApi.cancel(orderId, 'Hết thời gian chờ thanh toán QR (5 phút)');
        console.log(`[Invoice] Order ${orderId} cancelled due to timeout`);
      } catch (err) {
        console.error('[Invoice] Cancel error:', err);
      }
    }
    setCancelled(true);
  };

  const formatPrice = (p) => new Intl.NumberFormat('vi-VN').format(p) + 'đ';

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ─── Submit thanh toán ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setProcessing(true);
    setError('');
    setCancelled(false);
    try {
      const userId = getUserId(user);
      const stId = showtime?.showtimeId ?? showtime?.ShowtimeId ?? showtime?.id ?? showtime?.Id;
      const cinemaId = cinema?.cinemaId ?? cinema?.CinemaId;
      const hallId = hall?.hallId ?? hall?.HallId;

      if (!userId) {
        setError('Vui lòng đăng nhập lại trước khi đặt vé.');
        setProcessing(false);
        return;
      }

      if (!stId) {
        setError('Thiếu thông tin suất chiếu. Vui lòng quay lại chọn suất chiếu.');
        setProcessing(false);
        return;
      }
      if (!selectedSeats || selectedSeats.length === 0) {
        setError('Vui lòng chọn ít nhất một ghế.');
        setProcessing(false);
        return;
      }
      if (!cinemaId || !hallId) {
        setError('Thiếu thông tin rạp hoặc phòng chiếu.');
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
          price: s.finalPrice || 85000,
        })),
        concessions: selectedProducts
          .filter(p => p.product && p.quantity > 0)
          .map(p => ({
            itemId: p.product.itemId,
            quantity: p.quantity,
          })),
        discountAmount: serverDiscountAmount,
        promoCode: appliedPromoCode || undefined,
        bookingChannel: 'web',
      };

      const createdOrder = await bookingApi.create(bookingData);
      console.log('[Booking] Created order:', createdOrder);
      setOrder(createdOrder);

      // QR Bank → vào trạng thái chờ webhook
      if (payMethod === 'qrbank') {
        stopTimer(); // Dừng bộ đếm giữ ghế cũ
        setIsWaiting(true);
        setPaymentWaiting(true); // disable stepper navigation while waiting
        return;
      }

      // Các phương thức khác → confirm ngay (demo)
      const payMethodId =
        payMethod === 'momo' ? 1 :
          payMethod === 'zalopay' ? 2 :
            payMethod === 'vnpay' ? 3 :
              payMethod === 'visa' ? 4 :
                payMethod === 'atm' ? 5 : 1;

      const bookingId = createdOrder.bookingId ?? createdOrder.BookingId;
      const payAmount = createdOrder.finalAmount ?? createdOrder.FinalAmount ?? totalAmount;

      await bookingApi.addPayment(bookingId, {
        methodId: payMethodId,
        amount: payAmount,
        status: 'success',
        promoCode: voucherCode || voucher?.promoCode || null,
        transactionRef: `TXN${Date.now()}`,
        paidAt: new Date().toISOString(),
      });

      console.log('[Booking] Payment added successfully');
      let paidOrder = { ...createdOrder, methodId: payMethodId };
      try {
        const orderDetail = await bookingApi.getById(bookingId);
        paidOrder = {
          ...paidOrder,
          ...(orderDetail?.booking || {}),
          tickets: orderDetail?.tickets || [],
          concessions: orderDetail?.concessions || [],
          payments: orderDetail?.payments || [],
          promotions: orderDetail?.promotions || [],
        };
      } catch (detailErr) {
        console.warn('[Booking] Created order but failed to reload detail:', detailErr);
      }
      setOrder(paidOrder);
      setOrder({ ...createdOrder, status: 'confirmed', methodId: payMethodId });
      setSuccess(true);
    } catch (err) {
      console.error('[Booking] Error:', err);
      setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  // ─── Màn hình hủy (timeout) ─────────────────────────────────────────────────
  if (cancelled) {
    return (
      <div className="invoice-waiting" id="payment-cancelled">
        <div className="invoice-waiting__card">
          <div className="invoice-waiting__header">
            <h2 className="invoice-waiting__title" style={{ color: '#e74c3c' }}>⏰ Đơn hàng đã bị hủy</h2>
            <p className="invoice-waiting__subtitle">Đã hết 5 phút mà chưa nhận được xác nhận thanh toán.</p>
          </div>
          <div className="invoice-waiting__note">
            <p>Đơn hàng của bạn đã được hủy tự động. Vui lòng đặt vé lại nếu bạn vẫn muốn xem phim.</p>
          </div>
          <button className="invoice-waiting__cancel" style={{ color: '#e74c3c', fontWeight: 700 }} onClick={reset}>
            ← Đặt vé lại
          </button>
        </div>
      </div>
    );
  }

  // ─── Màn hình chờ thanh toán QR ─────────────────────────────────────────────
  if (isWaiting) {
    const qrAmount = order?.finalAmount ?? order?.FinalAmount ?? order?.totalAmount ?? order?.TotalAmount ?? totalAmount;
    const qrCode = order?.bookingCode ?? order?.BookingCode ?? 'BOOKING';
    const qrUrl = generateQrCodeUrl(qrAmount, qrCode);

    return (
      <div className="invoice-waiting" id="payment-waiting">
        <div className="invoice-waiting__card">
          <div className="invoice-waiting__header">
            <h2 className="invoice-waiting__title">Quét mã để thanh toán</h2>
            <p className="invoice-waiting__subtitle">Sử dụng ứng dụng Ngân hàng để quét mã QR bên dưới</p>
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
            Đơn hàng sẽ tự động hủy sau khi hết thời gian
          </p>

          <div className="invoice-waiting__qr-box">
            <img src={qrUrl} alt="VietQR" className="invoice-waiting__qr-img" />
            <div className="invoice-waiting__loader">
              <span className="invoice-waiting__spinner"></span>
              Đang chờ xác nhận từ ngân hàng...
            </div>
          </div>

          <div className="invoice-waiting__info">
            <div className="invoice-waiting__info-row">
              <span>Ngân hàng:</span>
              <strong>{BANK_ID}</strong>
            </div>
            <div className="invoice-waiting__info-row">
              <span>Số tài khoản:</span>
              <strong>{ACCOUNT_NO}</strong>
            </div>
            <div className="invoice-waiting__info-row">
              <span>Chủ tài khoản:</span>
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
                title="Nhấn để sao chép"
                onClick={() => navigator.clipboard.writeText(qrCode).then(() => alert('Đã sao chép nội dung chuyển khoản!'))}
              >
                {qrCode} 📋
              </strong>
            </div>
          </div>

          <div className="invoice-waiting__note">
            <p>⚠️ <strong>Lưu ý:</strong> Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động xác nhận đơn hàng. Nhấn vào mã để sao chép nhanh.</p>
          </div>

          <button className="invoice-waiting__cancel" onClick={handleTimeout}>
            Hủy đơn hàng
          </button>
        </div>
      </div>
    );
  }

  // ─── Màn hình thành công ─────────────────────────────────────────────────────
  if (success) {
    const qrAmount = order?.finalAmount ?? order?.FinalAmount ?? order?.totalAmount ?? order?.TotalAmount ?? totalAmount;
    const qrCode = order?.bookingCode ?? order?.BookingCode ?? 'BOOKING';
    const qrUrl = generateQrCodeUrl(qrAmount, qrCode);
    return (
      <div className="invoice-success" id="booking-success">
        <div className="invoice-success__card">
          <div className="invoice-success__icon">✅</div>
          <h2 className="invoice-success__title">Đặt vé thành công!</h2>
          <p className="invoice-success__subtitle">Cảm ơn bạn đã đặt vé tại CineMiu</p>

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
                <span>{cinema?.name || cinema?.cinemaName || 'Chưa xác định'} • {hall?.name || hall?.hallName || 'Chưa xác định'}</span>
              </div>
              <div className="invoice-success__ticket-row">
                <span className="invoice-success__ticket-label">Suất chiếu</span>
                <span>{(showtime?.startTime)?.split('T')[0]} • {(showtime?.startTime)?.split('T')[1]?.split(':').slice(0, 2).join(':')}</span>
              </div>
              <div className="invoice-success__ticket-row">
                <span className="invoice-success__ticket-label">Ghế</span>
                <span className="invoice-success__seat-list">
                  {selectedSeats.map(s => s.seatCode).join(', ')}
                </span>
              </div>
              <div className="invoice-success__ticket-row invoice-success__ticket-total">
                <span>Tổng thanh toán</span>
                <strong>{formatPrice(order?.finalAmount ?? order?.FinalAmount ?? order?.totalAmount ?? order?.TotalAmount ?? totalAmount)}</strong>
              </div>
            </div>

            <div className="invoice-success__ticket-qr">
              <div className="invoice-success__qr-placeholder">
                <div className="invoice-success__qr-container">
                  <img src={qrUrl} alt="QR Code" className="invoice-success__qr-img" />
                  <div className="invoice-success__bank-info">
                    <p><strong>Ngân hàng:</strong> {BANK_ID}</p>
                    <p><strong>STK:</strong> {ACCOUNT_NO}</p>
                    <p><strong>Chủ tài khoản:</strong> {ACCOUNT_NAME}</p>
                    <p><strong>Số tiền:</strong> {formatPrice(qrAmount)}</p>
                    <p><strong>Nội dung:</strong> {qrCode}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button className="invoice-success__btn" onClick={reset} id="book-again-btn">
            Đặt vé mới
          </button>
        </div>
      </div>
    );
  }

  // ─── Form chọn phương thức thanh toán ───────────────────────────────────────
  return (
    <div className="invoice" id="invoice-step">
      <h2 className="section-title">Xác nhận & Thanh toán</h2>

      <div className="invoice__layout">
        <div className="invoice__details">
          {/* Movie Info */}
          <div className="invoice-card">
            <div className="invoice-card__header">
              <span className="invoice-card__icon">🎬</span>
              <h3>Thông tin phim</h3>
            </div>
            <div className="invoice-card__body">
              <div className="invoice-card__movie">
                {movie?.posterUrl && <img src={movie.posterUrl} alt="" className="invoice-card__poster" />}
                <div>
                  <strong className="invoice-card__movie-title">{movie?.title}</strong>
                  <p>{movie?.durationMins} phút • {movie?.ageRating || 'P'}</p>
                  <p>{cinema?.cinemaName || cinema?.name}</p>
                  <p>{hall?.hallName || hall?.name}</p>
                  <p>{showtime?.startTime?.split('T')[0]} • {showtime?.startTime?.split('T')[1]?.split(':').slice(0, 2).join(':')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Seats */}
          <div className="invoice-card">
            <div className="invoice-card__header">
              <span className="invoice-card__icon">💺</span>
              <h3>Ghế đã chọn ({selectedSeats.length})</h3>
            </div>
            <div className="invoice-card__body">
              <table className="invoice-table">
                <thead>
                  <tr><th>Ghế</th><th>Giá</th></tr>
                </thead>
                <tbody>
                  {selectedSeats.map(s => (
                    <tr key={s.seatId ?? s.id}>
                      <td><strong>{s.seatCode}</strong></td>
                      <td>{formatPrice(s.finalPrice)}</td>
                    </tr>
                  ))}
                  <tr className="invoice-table__subtotal">
                    <td>Tạm tính vé</td>
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
                    <tr><th>Sản phẩm</th><th>SL</th><th>Thành tiền</th></tr>
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
                      <td colSpan="2">Tạm tính đồ ăn</td>
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
              <h3>Phương thức thanh toán</h3>
            </div>
            <div className="invoice-card__body">
              <div className="invoice-pay-methods">
                {[
                  { id: 'qrbank', label: 'Bank QR (VietQR)', icon: '🏦', color: '#1a1f71' },
                  { id: 'momo', label: 'Ví MoMo', icon: '📱', color: '#d82d8b' },
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
                  Sau khi xác nhận, mã QR sẽ hiển thị. Bạn có <strong>5 phút</strong> để hoàn thành chuyển khoản. Đơn hàng sẽ tự động hủy nếu không nhận được thanh toán.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="invoice__sidebar">
          <div className="invoice-total-card">
            <h3 className="invoice-total-card__title">Hóa đơn thanh toán</h3>

            <div className="invoice-total-card__lines">
              <div className="invoice-total-card__line">
                <span>Vé xem phim ({selectedSeats.length})</span>
                <span>{formatPrice(subtotalTickets)}</span>
              </div>
              <div className="invoice-total-card__line">
                <span>Đồ ăn & Thức uống</span>
                <span>{formatPrice(subtotalProducts)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="invoice-total-card__line invoice-total-card__line--discount">
                  <span>Giảm giá {voucherCode && `(${voucherCode})`}</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
            </div>

            <div className="invoice-total-card__total">
              <span>Tổng thanh toán</span>
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
                <span className="invoice-total-card__spinner">⏳ Đang xử lý...</span>
              ) : (
                `Thanh toán ${formatPrice(totalAmount)}`
              )}
            </button>

            <p className="invoice-total-card__note">
              Bằng việc thanh toán, bạn đồng ý với <a href="#">Điều khoản sử dụng</a> và <a href="#">Chính sách bảo mật</a> của CineVerse.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
