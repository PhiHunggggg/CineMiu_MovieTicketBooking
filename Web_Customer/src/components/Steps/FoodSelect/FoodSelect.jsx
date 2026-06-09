import { useState, useEffect } from 'react';
import { productApi } from '../../../services/api';
import { useBooking } from '../../../context/BookingContext';
import './FoodSelect.css';

function normalizeProduct(product) {
  return {
    ...product,
    itemId: product.itemId ?? product.ItemId ?? product.id ?? product.Id,
    catId: product.catId ?? product.CatId,
    itemName: product.itemName ?? product.ItemName ?? product.name ?? product.Name ?? 'Sản phẩm',
    description: product.description ?? product.Description,
    price: Number(product.price ?? product.Price ?? 0),
    imageUrl: product.imageUrl ?? product.ImageUrl,
  };
}

export default function FoodSelect() {
  const {
    selectedProducts, setProductQty, confirmFood,
    subtotalTickets, subtotalProducts, selectedSeats, movie, cinema, hall, showtime,
  } = useBooking();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productError, setProductError] = useState('');

  useEffect(() => {
    setLoading(true);
    setProductError('');
    productApi.getAll()
      .then(data => setProducts(Array.isArray(data) ? data.map(normalizeProduct) : []))
      .catch(err => {
        console.error(err);
        setProductError(err.message || 'Không thể tải danh sách đồ ăn.');
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const getQuantity = (productId) => {
    const found = selectedProducts.find(p => p.product.itemId === productId);
    return found ? found.quantity : 0;
  };

  const formatPrice = (p) => new Intl.NumberFormat('vi-VN').format(p || 0) + 'đ';

  const combos = products.filter(p => p.catId === 1 || p.itemName.toLowerCase().includes('combo'));
  const singles = products.filter(p => p.catId !== 1 && !p.itemName.toLowerCase().includes('combo'));

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
              {productError && (
                <div className="food-select__empty">
                  <span>!</span>
                  <p>{productError}</p>
                </div>
              )}

              {combos.length > 0 && (
                <div className="food-section">
                  <h3 className="food-section__title">Combo tiết kiệm</h3>
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
                  <h3 className="food-section__title">Đồ ăn & thức uống</h3>
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

              {!productError && products.length === 0 && (
                <div className="food-select__empty">
                  <span>🍿</span>
                  <p>Chưa có sản phẩm nào</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="food-select__sidebar">
          <div className="food-summary">
            <h3 className="food-summary__title">Tóm tắt đơn hàng</h3>

            <div className="food-summary__section">
              <h4>🎬 {movie?.title}</h4>
              <p>{cinema?.cinemaName || cinema?.CinemaName || cinema?.name || cinema?.Name} • {hall?.hallName || hall?.HallName || hall?.name || hall?.Name}</p>
              <p>{showtime?.startTime?.split('T')[0] || showtime?.StartTime?.split('T')[0]} • {(showtime?.startTime || showtime?.StartTime)?.split('T')[1]?.split(':').slice(0, 2).join(':')}</p>
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

            <div className="food-summary__breakdown">
              <div className="food-summary__line">
                <span>Vé ({selectedSeats.length})</span>
                <span>{formatPrice(subtotalTickets)}</span>
              </div>
              <div className="food-summary__line">
                <span>Đồ ăn</span>
                <span>{formatPrice(subtotalProducts)}</span>
              </div>
            </div>

            <div className="food-summary__total">
              <span>Tạm tính</span>
              <strong>{formatPrice(subtotalTickets + subtotalProducts)}</strong>
            </div>

            <button className="food-summary__btn" onClick={confirmFood} id="confirm-food-btn">
              Tiếp tục chọn voucher →
            </button>

            <button className="food-summary__skip" onClick={confirmFood} id="skip-food-btn">
              Bỏ qua đồ ăn
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
              -
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
