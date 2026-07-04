import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { reviewApi } from '../../services/api';
import './MovieReviews.css';

export default function MovieReviews({ movieId }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ count: 0, visibleCount: 0, averageRating: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [eligibility, setEligibility] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ rating: 0, comment: '' });
  const [editMode, setEditMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isLoggedIn = !!localStorage.getItem('token') || !!JSON.parse(localStorage.getItem('cineverse_auth') || '{}').token;

  const loadReviews = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const res = await reviewApi.getByMovie(movieId, { page: pageNum, pageSize: 10 });
      setReviews(prev => append ? [...prev, ...res.items] : res.items);
      setStats(res.stats);
      setHasMore(res.items.length === 10);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [movieId]);

  const loadEligibility = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await reviewApi.getEligibility(movieId);
      setEligibility(res);
      if (res.existingReview) {
        setForm({ rating: res.existingReview.rating, comment: res.existingReview.comment });
      }
    } catch (err) {
      console.error(err);
    }
  }, [movieId, isLoggedIn]);

  useEffect(() => {
    loadReviews();
    loadEligibility();
  }, [loadReviews, loadEligibility]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.rating === 0) {
      setErrorMsg('Vui lòng chọn số sao đánh giá.');
      return;
    }
    if (form.comment.trim().length < 10) {
      setErrorMsg('Bình luận phải dài ít nhất 10 ký tự.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      if (editMode || eligibility?.existingReview) {
        await reviewApi.update(eligibility.existingReview.reviewId, form);
      } else {
        await reviewApi.create(movieId, form);
      }
      setEditMode(false);
      await Promise.all([loadReviews(1), loadEligibility()]);
    } catch (err) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi lưu đánh giá.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này không?')) return;
    try {
      await reviewApi.delete(eligibility.existingReview.reviewId);
      setForm({ rating: 0, comment: '' });
      setEditMode(false);
      await Promise.all([loadReviews(1), loadEligibility()]);
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa đánh giá');
    }
  };

  const renderStars = (rating, interactive = false) => {
    return (
      <div className={`review-stars ${interactive ? 'interactive' : ''}`}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            className={`star ${star <= (interactive ? form.rating : rating) ? 'filled' : ''}`}
            onClick={() => interactive && setForm({ ...form, rating: star })}
            disabled={!interactive || submitting}
            aria-label={`Đánh giá ${star} sao`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  return (
    <section className="movie-reviews container" id="movie-detail-reviews">
      <div className="movie-reviews__header">
        <h2>Đánh giá & Bình luận</h2>
        <div className="movie-reviews__summary">
          <span className="summary-rating">★ {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}</span>
          <span className="summary-count">({stats.visibleCount} đánh giá)</span>
        </div>
      </div>

      <div className="movie-reviews__form-section">
        {!isLoggedIn ? (
          <div className="movie-reviews__alert">
            <p>Vui lòng đăng nhập để gửi bình luận.</p>
            <Link to="/login" className="movie-detail__button">Đăng nhập ngay</Link>
          </div>
        ) : eligibility && !eligibility.canReview && !eligibility.existingReview ? (
          <div className="movie-reviews__alert">
            <p>{eligibility.reason || 'Bạn cần xem phim tại CineMiu trước khi bình luận.'}</p>
          </div>
        ) : eligibility?.existingReview && !editMode ? (
          <div className="movie-reviews__my-review">
            <h3>Đánh giá của bạn</h3>
            {renderStars(eligibility.existingReview.rating)}
            <p>{eligibility.existingReview.comment}</p>
            <div className="my-review__actions">
              <button onClick={() => setEditMode(true)} className="movie-detail__button">Sửa bình luận</button>
              <button onClick={handleDelete} className="movie-detail__button movie-detail__button--danger">Xóa</button>
            </div>
          </div>
        ) : (
          <form className="movie-reviews__form" onSubmit={handleSubmit}>
            <h3>{editMode ? 'Sửa đánh giá của bạn' : 'Viết đánh giá của bạn'}</h3>
            {errorMsg && <p className="movie-reviews__error">{errorMsg}</p>}
            <div className="form-group">
              <label>Điểm đánh giá:</label>
              {renderStars(form.rating, true)}
            </div>
            <div className="form-group">
              <label htmlFor="comment">Bình luận (từ 10 đến 1000 ký tự):</label>
              <textarea
                id="comment"
                rows="4"
                value={form.comment}
                onChange={e => setForm({ ...form, comment: e.target.value })}
                disabled={submitting}
                placeholder="Chia sẻ cảm nhận của bạn về bộ phim..."
              />
            </div>
            <div className="form-actions">
              <button type="submit" disabled={submitting} className="movie-detail__button movie-detail__button--primary">
                {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
              {editMode && (
                <button type="button" onClick={() => {
                  setEditMode(false);
                  setForm({ rating: eligibility.existingReview.rating, comment: eligibility.existingReview.comment });
                }} className="movie-detail__button">
                  Hủy
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="movie-reviews__list">
        {loading && page === 1 ? (
          <div className="skeleton review-skeleton" />
        ) : reviews.length === 0 ? (
          <p className="movie-reviews__empty">Chưa có bình luận nào. Hãy là người đầu tiên đánh giá!</p>
        ) : (
          <>
            {reviews.map(review => (
              <div key={review.reviewId} className="movie-review-item">
                <div className="movie-review-item__header">
                  <div className="reviewer-info">
                    <strong>{review.fullName || 'Khách hàng'}</strong>
                    <span className="review-date">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  {renderStars(review.rating)}
                </div>
                <p className="movie-review-item__comment">{review.comment}</p>
              </div>
            ))}
            {hasMore && (
              <button
                className="movie-detail__button load-more-btn"
                onClick={() => loadReviews(page + 1, true)}
                disabled={loading}
              >
                {loading ? 'Đang tải...' : 'Xem thêm bình luận'}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
