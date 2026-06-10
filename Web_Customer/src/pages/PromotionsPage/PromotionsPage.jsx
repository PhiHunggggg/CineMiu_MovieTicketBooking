import { useEffect, useState } from 'react';
import { promotionApi } from '../../services/api';

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

export default function PromotionsPage() {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        promotionApi.getAll()
            .then(setPromotions)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="listing-page container">
            <div className="listing-page__header">
                <p>Ưu đãi hiện hành</p>
                <h1>Khuyến mãi</h1>
            </div>
            {loading && <p>Đang tải khuyến mãi...</p>}
            {error && <p className="form-error">{error}</p>}
            <div className="promotion-grid">
                {promotions.map((promotion) => (
                    <article className="promotion-card" key={promotion.promoId}>
                        <span>{promotion.promoCode}</span>
                        <h2>
                            {promotion.discountType === 'percent'
                                ? `Giảm ${promotion.discountValue}%`
                                : `Giảm ${formatPrice(promotion.discountValue)}`}
                        </h2>
                        <p>{promotion.description || 'Áp dụng theo điều kiện chương trình.'}</p>
                        <small>
                            Hạn dùng: {new Date(promotion.validTo).toLocaleDateString('vi-VN')}
                        </small>
                    </article>
                ))}
            </div>
            {!loading && promotions.length === 0 && <p>Hiện chưa có khuyến mãi.</p>}
        </div>
    );
}
