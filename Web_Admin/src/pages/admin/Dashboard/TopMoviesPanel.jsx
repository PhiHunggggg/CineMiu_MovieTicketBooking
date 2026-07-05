import { Link } from 'react-router-dom';
import { compactCurrency, formatNumber, read } from './dashboardUtils';

const TopMoviesPanel = ({ maxMovieRevenue, topMovies }) => (
    <div className="admin-panel admin-top-movies">
        <div className="admin-panel-header">
            <div>
                <p className="admin-eyebrow">Xếp hạng</p>
                <h2>Top phim bán chạy</h2>
                <span>Theo doanh thu tháng hiện tại</span>
            </div>
            <Link to="/admin/movies">Quản lý phim</Link>
        </div>
        <div className="admin-movie-ranking">
            {topMovies.length ? (
                topMovies.map((movie, index) => {
                    const revenue = Number(read(movie, 'totalRevenue', 'TotalRevenue') || 0);
                    return (
                        <div key={read(movie, 'movieId', 'MovieId') || index}>
                            <span className="rank">{String(index + 1).padStart(2, '0')}</span>
                            <div className="movie-rank-copy">
                                <strong>{read(movie, 'movieTitle', 'MovieTitle') || `Phim ${index + 1}`}</strong>
                                <span>
                                    <i style={{ width: `${Math.max(4, (revenue / maxMovieRevenue) * 100)}%` }}></i>
                                </span>
                            </div>
                            <div className="movie-rank-value">
                                <strong>{compactCurrency(revenue)}</strong>
                                <span>{formatNumber(read(movie, 'totalTickets', 'TotalTickets'))} vé</span>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="admin-empty-state">
                    <i className="fas fa-chart-bar"></i>
                    <strong>Chưa có doanh thu phim</strong>
                    <span>Dữ liệu sẽ xuất hiện khi có giao dịch trong tháng.</span>
                </div>
            )}
        </div>
    </div>
);

export default TopMoviesPanel;

