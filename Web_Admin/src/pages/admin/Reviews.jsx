import { useCallback, useEffect, useState } from 'react';
import { reviewApi } from '../../services/api';

const getItems = (data) => data?.items || data?.data || data || [];
const getReviewId = (review) => review?.reviewId || review?.id;
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '-');

export default function Reviews() {
    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [replyingReview, setReplyingReview] = useState(null);
    const [reply, setReply] = useState('');
    const [saving, setSaving] = useState(false);

    const loadReviews = useCallback(async (event) => {
        event?.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await reviewApi.getAll({
                rating: rating || undefined,
                page: 1,
                pageSize: 200,
            });
            setReviews(getItems(response.data));
        } catch (requestError) {
            setReviews([]);
            setError(requestError.response?.data?.message || 'Không tải được danh sách đánh giá.');
        } finally {
            setLoading(false);
        }
    }, [rating]);

    useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    const toggleVisibility = async (review) => {
        setError('');
        try {
            await reviewApi.updateVisibility(getReviewId(review), {
                isVisible: !(review.isVisible ?? true),
            });
            await loadReviews();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không cập nhật được trạng thái đánh giá.');
        }
    };

    const deleteReview = async (review) => {
        if (!window.confirm('Xóa đánh giá này?')) return;

        setError('');
        try {
            await reviewApi.delete(getReviewId(review));
            await loadReviews();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không xóa được đánh giá.');
        }
    };

    const openReply = (review) => {
        setReplyingReview(review);
        setReply(review.adminReply || review.reply || '');
        setError('');
    };

    const submitReply = async (event) => {
        event.preventDefault();
        if (!reply.trim()) return;

        setSaving(true);
        setError('');
        try {
            await reviewApi.reply(getReviewId(replyingReview), { reply: reply.trim() });
            setReplyingReview(null);
            setReply('');
            await loadReviews();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không gửi được phản hồi.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <h1 className="m-0">Quản lý đánh giá</h1>
                    <p className="page-description">Duyệt nội dung và phản hồi đánh giá của khách hàng.</p>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    <div className="card">
                        <div className="card-body">
                            <form className="form-inline align-items-end" onSubmit={loadReviews}>
                                <div className="mr-2 mb-2">
                                    <label className="d-block mb-1">Số sao</label>
                                    <select className="form-control" value={rating} onChange={(event) => setRating(event.target.value)}>
                                        <option value="">Tất cả đánh giá</option>
                                        {[5, 4, 3, 2, 1].map((value) => (
                                            <option key={value} value={value}>{value} sao</option>
                                        ))}
                                    </select>
                                </div>
                                <button className="btn btn-primary mb-2" type="submit">
                                    <i className="fas fa-filter mr-1" /> Lọc
                                </button>
                            </form>
                        </div>
                    </div>

                    {error ? <div className="alert alert-warning">{error}</div> : null}

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title mb-0">
                                <i className="fas fa-star mr-2" />Danh sách đánh giá
                            </h3>
                        </div>
                        <div className="card-body">
                            {loading ? (
                                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped">
                                        <thead>
                                            <tr>
                                                <th>Khách hàng</th>
                                                <th>Phim</th>
                                                <th>Đánh giá</th>
                                                <th>Nội dung</th>
                                                <th>Ngày gửi</th>
                                                <th>Trạng thái</th>
                                                <th style={{ width: '150px' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reviews.length === 0 ? (
                                                <tr><td colSpan="7" className="text-center">Chưa có đánh giá phù hợp</td></tr>
                                            ) : reviews.map((review) => (
                                                <tr key={getReviewId(review)}>
                                                    <td>
                                                        <strong>{review.fullName || review.userName || 'Khách hàng'}</strong>
                                                        <div className="small text-muted">{review.email || ''}</div>
                                                    </td>
                                                    <td>{review.movieTitle || review.title || '-'}</td>
                                                    <td>
                                                        <span className="review-stars">
                                                            <i className="fas fa-star" /> {Number(review.rating || 0)}/5
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="review-content">{review.comment || review.content || '-'}</div>
                                                        {(review.adminReply || review.reply) ? (
                                                            <div className="review-reply">
                                                                <strong>Phản hồi:</strong> {review.adminReply || review.reply}
                                                            </div>
                                                        ) : null}
                                                    </td>
                                                    <td>{formatDateTime(review.createdAt)}</td>
                                                    <td>
                                                        <span className={`badge ${(review.isVisible ?? true) ? 'badge-success' : 'badge-secondary'}`}>
                                                            {(review.isVisible ?? true) ? 'Đang hiển thị' : 'Đã ẩn'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <button className="btn btn-sm btn-info mr-1" type="button" onClick={() => openReply(review)} title="Phản hồi">
                                                            <i className="fas fa-reply" />
                                                        </button>
                                                        <button className="btn btn-sm btn-warning mr-1" type="button" onClick={() => toggleVisibility(review)} title="Ẩn/hiện">
                                                            <i className={`fas ${(review.isVisible ?? true) ? 'fa-eye-slash' : 'fa-eye'}`} />
                                                        </button>
                                                        <button className="btn btn-sm btn-danger" type="button" onClick={() => deleteReview(review)} title="Xóa">
                                                            <i className="fas fa-trash" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {replyingReview ? (
                <>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <form onSubmit={submitReply}>
                                    <div className="modal-header">
                                        <h5 className="modal-title">Phản hồi đánh giá</h5>
                                        <button className="close" type="button" onClick={() => setReplyingReview(null)}>&times;</button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="review-original">{replyingReview.comment || replyingReview.content || '-'}</div>
                                        <div className="form-group">
                                            <label>Nội dung phản hồi</label>
                                            <textarea className="form-control" rows="5" value={reply} onChange={(event) => setReply(event.target.value)} required />
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button className="btn btn-secondary" type="button" onClick={() => setReplyingReview(null)}>Đóng</button>
                                        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Đang gửi...' : 'Gửi phản hồi'}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" />
                </>
            ) : null}
        </div>
    );
}
