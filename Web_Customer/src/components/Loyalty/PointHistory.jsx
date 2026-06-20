import './PointHistory.css';

export default function PointHistory({ transactions = [] }) {
  return (
    <div className="point-history">
      <div className="point-history__header">
        <h3>Lịch sử điểm</h3>
        <span>{transactions.length} giao dịch</span>
      </div>

      {transactions.length === 0 ? (
        <p className="point-history__empty">Chưa có giao dịch điểm.</p>
      ) : (
        <div className="point-history__list">
          {transactions.map(item => (
            <div key={item.transactionId} className="point-history__item">
              <div>
                <strong>{item.description || item.transactionType}</strong>
                <p>
                  {new Date(item.createdAt).toLocaleString('vi-VN')}
                  {item.bookingId ? ` - Booking #${item.bookingId}` : ''}
                </p>
              </div>
              <span className={item.points >= 0 ? 'point-history__plus' : 'point-history__minus'}>
                {item.points >= 0 ? '+' : ''}{item.points.toLocaleString('vi-VN')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
