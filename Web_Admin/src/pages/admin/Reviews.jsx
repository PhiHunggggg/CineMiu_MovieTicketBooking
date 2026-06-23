import React, { useEffect, useState } from 'react';
import { movieApi, reviewApi } from '../../services/api';

const getItems = (data) => data?.items || data?.data || data || [];
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '-');

const AdminReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [movies, setMovies] = useState([]);
    const [stats, setStats] = useState({ count: 0, visibleCount: 0, averageRating: 0 });
    const [movieId, setMovieId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadMovies();
        loadReviews();
    }, []);

    const loadMovies = async () => {
        try {
            const response = await movieApi.getAll({ page: 1, pageSize: 500 });
            setMovies(getItems(response.data));
        } catch (err) {
            console.error('Failed to load movies:', err);
        }
    };

    const loadReviews = async (event) => {
        if (event) event.preventDefault();

        setLoading(true);
        setError('');
        try {
            const response = await reviewApi.getAll({
                movieId: movieId || undefined,
                visibleOnly: false,
            });
            setReviews(response.data?.items || []);
            setStats(response.data?.stats || { count: 0, visibleCount: 0, averageRating: 0 });
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được danh sách đánh giá');
        } finally {
            setLoading(false);
        }
    };

    const toggleVisibility = async (review) => {
        setError('');
        try {
            await reviewApi.updateVisibility(review.reviewId, { isVisible: !review.isVisible });
            await loadReviews();
        } catch (err) {
            setError(err.response?.data?.message || 'Cập nhật hiển thị thất bại');
        }
    };

    const replyReview = async (review) => {
        const message = window.prompt(`Phản hồi đánh giá của ${review.fullName || review.email}:`, '');
        if (!message) return;

        setError('');
        try {
            await reviewApi.reply(review.reviewId, {
                title: `Phản hồi đánh giá phim ${review.movieTitle}`,
                message,
                sentVia: 'email',
            });
            setError('Đã tạo thông báo phản hồi cho khách hàng.');
        } catch (err) {
            setError(err.response?.data?.message || 'Phản hồi đánh giá thất bại');
        }
    };

    const deleteReview = async (review) => {
        if (!window.confirm('Xóa đánh giá này?')) return;

        setError('');
        try {
            await reviewApi.delete(review.reviewId);
            await loadReviews();
        } catch (err) {
            setError(err.response?.data?.message || 'Xóa đánh giá thất bại');
        }
    };

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <h1 className="m-0">Quản lý đánh giá</h1>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {error && <div className={`alert ${error.startsWith('Đã') ? 'alert-success' : 'alert-warning'}`}>{error}</div>}

                    <div className="row">
                        <div className="col-md-4">
                            <div className="info-box">
                                <span className="info-box-icon bg-info"><i className="fas fa-star"></i></span>
                                <div className="info-box-content">
                                    <span className="info-box-text">Điểm trung bình</span>
                                    <span className="info-box-number">{Number(stats.averageRating || 0).toFixed(1)}/5</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="info-box">
                                <span className="info-box-icon bg-success"><i className="fas fa-eye"></i></span>
                                <div className="info-box-content">
                                    <span className="info-box-text">Đang hiển thị</span>
                                    <span className="info-box-number">{stats.visibleCount || 0}/{stats.count || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-body">
                            <form className="form-inline" onSubmit={loadReviews}>
                                <label className="mr-2">Phim</label>
                                <select className="form-control mr-2" value={movieId} onChange={(e) => setMovieId(e.target.value)}>
                                    <option value="">Tất cả phim</option>
                                    {movies.map((movie) => (
                                        <option key={movie.movieId || movie.id} value={movie.movieId || movie.id}>{movie.title}</option>
                                    ))}
                                </select>
                                <button className="btn btn-primary" type="submit"><i className="fas fa-filter mr-1"></i> Lọc</button>
                            </form>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-body">
                            {loading ? (
                                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped">
                                        <thead>
                                            <tr>
                                                <th>Phim</th>
                                                <th>Khách hàng</th>
                                                <th>Điểm</th>
                                                <th>Nội dung</th>
                                                <th>Ngày tạo</th>
                                                <th>Hiển thị</th>
                                                <th style={{ width: '140px' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reviews.length === 0 ? (
                                                <tr><td colSpan="7" className="text-center">Chưa có đánh giá</td></tr>
                                            ) : reviews.map((review) => (
                                                <tr key={review.reviewId}>
                                                    <td>{review.movieTitle}</td>
                                                    <td>
                                                        {review.fullName || '-'}
                                                        <div className="small text-muted">{review.email || ''}</div>
                                                    </td>
                                                    <td><strong>{review.rating}/5</strong></td>
                                                    <td style={{ minWidth: '260px' }}>{review.comment || '-'}</td>
                                                    <td>{formatDateTime(review.createdAt)}</td>
                                                    <td>
                                                        <span className={`badge ${review.isVisible ? 'badge-success' : 'badge-secondary'}`}>
                                                            {review.isVisible ? 'Có' : 'Ẩn'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <button className="btn btn-sm btn-warning mr-1" type="button" onClick={() => toggleVisibility(review)}>
                                                            <i className={`fas ${review.isVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                                        </button>
                                                        <button className="btn btn-sm btn-info mr-1" type="button" onClick={() => replyReview(review)}>
                                                            <i className="fas fa-reply"></i>
                                                        </button>
                                                        <button className="btn btn-sm btn-danger" type="button" onClick={() => deleteReview(review)}>
                                                            <i className="fas fa-trash"></i>
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
        </div>
    );
};

export default AdminReviews;
