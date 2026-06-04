import { useState, useEffect } from 'react';
import { productApi, promotionApi } from '../../../services/api';
import { useBooking } from '../../../context/BookingContext';
import { useAuth } from '../../../context/AuthContext';
import './FoodSelect.css';

export default function FoodSelect() {
  const {
    selectedProducts, setProductQty, confirmFood,
    subtotalTickets, subtotalProducts, discountAmount,
    voucherCode, setVoucher, clearVoucher, selectedSeats, movie, cinema, hall, showtime,
  } = useBooking();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voucherInput, setVoucherInput] = useState(voucherCode || '');
  const [voucherError, setVoucherError] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);

  useEffect(() => {
    productApi.getAll()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getQuantity = (productId) => {
    const found = selectedProducts.find(p => p.product.itemId === productId);
    return found ? found.quantity : 0;
  };

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return;
    const userId = user?.userId ?? user?.UserId;
    const total = subtotalTickets + subtotalProducts;
    if (!userId) {
      setVoucherError('Vui lòng đăng nhập để dùng voucher');
      return;
    }
    if (total <= 0) {
      setVoucherError('Đơn hàng chưa có giá trị để áp dụng voucher');
      return;
    }

    setVoucherLoading(true);
    setVoucherError('');
    try {
      const result = await promotionApi.validate({
        promoCode: voucherInput.trim(),
        userId,
        orderAmount: total,
      });
      const appliedVoucher = result.promotion;
      setVoucher(
        appliedVoucher,
        appliedVoucher?.promoCode || voucherInput.trim().toUpperCase(),
        Number(result.discountAmount || 0)
      );
    } catch (err) {
      setVoucherError(err.message || 'Voucher không hợp lệ');
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleConfirmFood = async () => {
    if (!voucherCode) {
      confirmFood();
      return;
    }

    const userId = user?.userId ?? user?.UserId;
    const total = subtotalTickets + subtotalProducts;
    if (!userId) {
      clearVoucher();
      setVoucherError('Vui lòng đăng nhập để dùng voucher');
      return;
    }

    setVoucherLoading(true);
    setVoucherError('');
    try {
      const result = await promotionApi.validate({
        promoCode: voucherCode,
        userId,
        orderAmount: total,
      });
      const appliedVoucher = result.promotion;
      setVoucher(
        appliedVoucher,
        appliedVoucher?.promoCode || voucherCode,
        Number(result.discountAmount || 0)
      );
      confirmFood();
    } catch (err) {
      clearVoucher();
      setVoucherError(err.message || 'Voucher không hợp lệ với đơn hàng hiện tại');
    } finally {
      setVoucherLoading(false);
    }
  };

  const formatPrice = (p) => new Intl.NumberFormat('vi-VN').format(p) + 'đ';

  const combos = products.filter(p => p.catId === 1 || p.itemName.toLowerCase().includes('combo'));
  const singles = products.filter(p => p.catId !== 1 && !p.itemName.toLowerCase().includes('combo'));
  const totalBeforeDiscount = subtotalTickets + subtotalProducts;
  const finalTotal = totalBeforeDiscount - discountAmount;

  return (
    <div className="food-select" id="food-select-step">
      <h2 className="section-title">Chọn đồ ăn & thức uống</h2>

      <div className="food-select__layout">
        <div className="food-select__products">
          {loading ? (
            <div className="food-select__grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />
              ))}
            </div>
          ) : (
            <>
              {combos.length > 0 && (
                <div className="food-section">
                  <h3 className="food-section__title">🍿 Combo tiết kiệm</h3>
                  <div className="food-select__grid">
                    {combos.map(product => (
                      <FoodCard
                        key={product.itemId}
                        product={product}
                        quantity={getQuantity(product.itemId)}
                        onQtyChange={(qty) => setProductQty(product, qty)}
                        formatPrice={formatPrice}
                      />
                    ))}
                  </div>
                </div>
              )}

              {singles.length > 0 && (
                <div className="food-section">
                  <h3 className="food-section__title">🥤 Đồ ăn & Thức uống</h3>
                  <div className="food-select__grid">
                    {singles.map(product => (
                      <FoodCard
                        key={product.itemId}
                        product={product}
                        quantity={getQuantity(product.itemId)}
                        onQtyChange={(qty) => setProductQty(product, qty)}
                        formatPrice={formatPrice}
                      />
                    ))}
                  </div>
                </div>
              )}

              {products.length === 0 && (
                <div className="food-select__empty">
                  <span>🍿</span>
                  <p>Chưa có sản phẩm nào</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Summary */}
        <div className="food-select__sidebar">
          <div className="food-summary">
            <h3 className="food-summary__title">Tóm tắt đơn hàng</h3>

            <div className="food-summary__section">
              <h4>🎬 {movie?.title}</h4>
              <p>{cinema?.cinemaName} • {hall?.hallName}</p>
              <p>{showtime?.startTime?.split('T')[0]} • {showtime?.startTime?.split('T')[1]?.split(':').slice(0, 2).join(':')}</p>
            </div>

            <div className="food-summary__section">
              <h4>💺 Ghế ({selectedSeats.length})</h4>
              <div className="food-summary__seat-tags">
                {selectedSeats.map(s => (
                  <span key={s.id} className="food-summary__seat-tag">{s.seatCode}</span>
                ))}
              </div>
            </div>

            {selectedProducts.length > 0 && (
              <div className="food-summary__section">
                <h4>🍿 Đồ ăn</h4>
                {selectedProducts.map(p => (
                  <div key={p.product.itemId} className="food-summary__product-row">
                    <span>{p.product.itemName} x{p.quantity}</span>
                    <span>{formatPrice(p.product.price * p.quantity)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Voucher */}
            <div className="food-summary__voucher">
              <h4>🎁 Mã giảm giá</h4>
              {voucherCode && discountAmount > 0 ? (
                <div className="food-summary__voucher-applied">
                  <span className="food-summary__voucher-code">{voucherCode}</span>
                  <span className="food-summary__voucher-discount">-{formatPrice(discountAmount)}</span>
                  <button className="food-summary__voucher-remove" onClick={clearVoucher}>✕</button>
                </div>
              ) : (
                <div className="food-summary__voucher-input">
                  <input
                    type="text"
                    placeholder="Nhập mã voucher"
                    value={voucherInput}
                    onChange={e => setVoucherInput(e.target.value)}
                    id="voucher-input"
                  />
                  <button onClick={handleApplyVoucher} disabled={voucherLoading} id="apply-voucher-btn">
                    {voucherLoading ? '...' : 'Áp dụng'}
                  </button>
                </div>
              )}
              {voucherError && <p className="food-summary__voucher-error">{voucherError}</p>}
            </div>

            <div className="food-summary__breakdown">
              <div className="food-summary__line">
                <span>Vé ({selectedSeats.length})</span>
                <span>{formatPrice(subtotalTickets)}</span>
              </div>
              <div className="food-summary__line">
                <span>Đồ ăn</span>
                <span>{formatPrice(subtotalProducts)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="food-summary__line food-summary__line--discount">
                  <span>Giảm giá</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
            </div>

            <div className="food-summary__total">
              <span>Tổng cộng</span>
              <strong>{formatPrice(finalTotal > 0 ? finalTotal : 0)}</strong>
            </div>

            <button className="food-summary__btn" onClick={handleConfirmFood} disabled={voucherLoading} id="confirm-food-btn">
              Tiếp tục thanh toán →
            </button>

            <button
              className="food-summary__skip"
              onClick={handleConfirmFood}
              disabled={voucherLoading}
              id="skip-food-btn"
            >
              Bỏ qua, không mua đồ ăn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FoodCard({ product, quantity, onQtyChange, formatPrice }) {
  const isCombo = product.catId === 1 || product.itemName?.toLowerCase().includes('combo');
  return (
    <div className={`food-card ${quantity > 0 ? 'food-card--selected' : ''}`} id={`food-${product.itemId}`}>
      <div className="food-card__img">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.itemName} loading="lazy" />
        ) : (
          <div className="food-card__img-placeholder">
            {isCombo ? '🍿' : '🥤'}
          </div>
        )}
        {isCombo && <span className="food-card__combo-badge">COMBO</span>}
      </div>
      <div className="food-card__body">
        <h4 className="food-card__name">{product.itemName}</h4>
        {product.description && (
          <p className="food-card__desc">{product.description}</p>
        )}
        <div className="food-card__footer">
          <span className="food-card__price">{formatPrice(product.price)}</span>
          <div className="food-card__qty">
            <button
              className="food-card__qty-btn"
              onClick={() => onQtyChange(quantity - 1)}
              disabled={quantity <= 0}
            >
              −
            </button>
            <span className="food-card__qty-num">{quantity}</span>
            <button
              className="food-card__qty-btn"
              onClick={() => onQtyChange(quantity + 1)}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
