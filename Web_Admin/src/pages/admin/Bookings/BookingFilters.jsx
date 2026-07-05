import { bookingStatuses } from './bookingsUtils';

const BookingFilters = ({
    cinemas,
    filters,
    isCinemaManager,
    loading,
    movies,
    onSubmit,
    setFilters,
    user,
}) => (
    <div className="card admin-filter-card">
        <div className="card-body">
            <form className="admin-filter-grid" onSubmit={onSubmit}>
                <div>
                    <label className="d-block mb-1">Từ khóa</label>
                    <input
                        className="form-control"
                        value={filters.keyword}
                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                        placeholder="Mã vé, tên, email..."
                    />
                </div>
                <div>
                    <label className="d-block mb-1">Trạng thái</label>
                    <select className="form-control" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        {bookingStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="d-block mb-1">Phim</label>
                    <select className="form-control" value={filters.movieId} onChange={(e) => setFilters({ ...filters, movieId: e.target.value })}>
                        <option value="">Tất cả phim</option>
                        {movies.map((movie) => <option key={movie.movieId || movie.id} value={movie.movieId || movie.id}>{movie.title}</option>)}
                    </select>
                </div>
                <div>
                    <label className="d-block mb-1">Rạp</label>
                    {isCinemaManager ? (
                        <input className="form-control" value={cinemas[0]?.cinemaName || `Chi nhánh #${user?.cinemaId || ''}`} disabled />
                    ) : (
                        <select className="form-control" value={filters.cinemaId} onChange={(e) => setFilters({ ...filters, cinemaId: e.target.value })}>
                            <option value="">Tất cả rạp</option>
                            {cinemas.map((cinema) => <option key={cinema.cinemaId} value={cinema.cinemaId}>{cinema.cinemaName || cinema.name}</option>)}
                        </select>
                    )}
                </div>
                <div>
                    <label className="d-block mb-1">Ngày đặt</label>
                    <input type="date" className="form-control" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                    <i className="fas fa-search mr-1"></i> Lọc
                </button>
            </form>
        </div>
    </div>
);

export default BookingFilters;
