import { useState, useEffect } from 'react';
import { promotionApi } from '../../services/api';
import './PromotionsPage.css';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    promotionApi.getAll()
      .then(data => setPromotions(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (p) => new Intl.NumberFormat('vi-VN').format(p) + 'đ';
  const formatDate = (d) => new Date(d).toLocaleDateString('vi-VN');

  return (
    <div className="promos-page" id="promotions-page">
      <div className="promos-page__container container">
        <h1 className="promos-page__title">Khuyến mãi</h1>
        <p className="promos-page__subtitle">Ưu đãi đặc biệt dành riêng cho bạn</p>

        {loading ? (
          <div className="promos-page__grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 280, borderRadius: 16 }} />
            ))}
          </div>
        ) : promotions.length === 0 ? (
          <div className="promos-page__empty">
            <span>🎁</span>
            <p>Hiện chưa có khuyến mãi nào</p>
          </div>
        ) : (
          <div className="promos-page__grid">
            {promotions.map(promo => (
              <div key={promo.promoId} className="promo-card" id={`promo-card-${promo.promoId}`}>
                <div className="promo-card__banner">
                  <div className="promo-card__banner-placeholder"><span>🎉</span></div>
                  <div className="promo-card__discount-badge">
                    {promo.discountType === 'percent' ? `${promo.discountValue}%` : formatPrice(promo.discountValue)}
                  </div>
                </div>
                <div className="promo-card__body">
                  <h3 className="promo-card__name">{promo.promoCode}</h3>
                  {promo.description && <p className="promo-card__desc">{promo.description}</p>}
                  <div className="promo-card__details">
                    <div className="promo-card__detail">
                      <span className="promo-card__detail-label">Đơn tối thiểu:</span>
                      <span>{formatPrice(promo.minOrderAmt)}</span>
                    </div>
                    <div className="promo-card__detail">
                      <span className="promo-card__detail-label">Thời gian:</span>
                      <span>{formatDate(promo.validFrom)} - {formatDate(promo.validTo)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
