import './LoyaltyCard.css';

export default function LoyaltyCard({ membership }) {
  if (!membership) return null;

  const totalPoints = membership.totalPoints ?? 0;
  const minPoints = membership.minPoints ?? 0;
  const nextTier = membership.nextTier;
  const pointsToNextTier = membership.pointsToNextTier ?? 0;
  const nextMinPoints = nextTier?.minPoints ?? totalPoints;
  const progressRange = Math.max(1, nextMinPoints - minPoints);
  const progress = nextTier
    ? Math.min(100, Math.max(0, ((totalPoints - minPoints) / progressRange) * 100))
    : 100;

  return (
    <div className="loyalty-card">
      <div className="loyalty-card__header">
        <div>
          <span className="loyalty-card__label">Hạng thành viên</span>
          <h3>{membership.tierName}</h3>
        </div>
        <div className="loyalty-card__badge">
          Giảm {membership.discountPercent ?? 0}%
        </div>
      </div>

      <div className="loyalty-card__points">
        <strong>{totalPoints.toLocaleString('vi-VN')}</strong>
        <span>điểm</span>
      </div>

      <div className="loyalty-card__progress">
        <div className="loyalty-card__progress-bar">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="loyalty-card__progress-meta">
          {nextTier ? (
            <span>Còn {pointsToNextTier.toLocaleString('vi-VN')} điểm để lên {nextTier.tierName}</span>
          ) : (
            <span>Bạn đang ở hạng cao nhất</span>
          )}
        </div>
      </div>

      {membership.benefits && (
        <p className="loyalty-card__benefits">{membership.benefits}</p>
      )}

      <dl className="loyalty-card__details">
        <div>
          <dt>Điểm tối thiểu hạng này</dt>
          <dd>{minPoints.toLocaleString('vi-VN')}</dd>
        </div>
        <div>
          <dt>Cập nhật lần cuối</dt>
          <dd>{membership.updatedAt ? new Date(membership.updatedAt).toLocaleString('vi-VN') : '-'}</dd>
        </div>
      </dl>
    </div>
  );
}
