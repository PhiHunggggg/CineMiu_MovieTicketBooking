import React, { useEffect, useState } from 'react';
import { cinemaLookupApi, movieApi } from '../../services/api';

const createEmptyMovie = () => ({
    title: '',
    titleEn: '',
    countryId: '',
    durationMins: 90,
    releaseDate: '',
    endDate: '',
    ageRating: 'P',
    status: 'coming_soon',
    synopsis: '',
    director: '',
    castMembers: '',
    language: '',
    subtitle: '',
    posterUrl: '',
    bannerUrl: '',
    trailerUrl: '',
    imdbRating: '',
    genreIds: [],
});

const movieStatusOptions = [
    { value: 'now_showing', label: 'Đang chiếu', badge: 'badge-success' },
    { value: 'coming_soon', label: 'Sắp chiếu', badge: 'badge-primary' },
    { value: 'early_screening', label: 'Suất chiếu sớm', badge: 'badge-warning' },
    { value: 'ended', label: 'Ngừng chiếu', badge: 'badge-secondary' },
];

const ageRatingOptions = ['P', 'T13', 'T16', 'T18', 'C'];

const getItems = (data) => data?.items || data?.data || data || [];
const getMovieId = (movie) => movie?.movieId || movie?.id;
const toDateInput = (value) => (value ? String(value).substring(0, 10) : '');
const normalizeStatus = (value) => {
    const key = String(value || '').trim().toLowerCase().replace(/[\s-]/g, '_');
    if (key === 'nowshowing' || key === 'now_showing') return 'now_showing';
    if (key === 'comingsoon' || key === 'coming_soon') return 'coming_soon';
    if (key === 'earlyscreening' || key === 'early_screening') return 'early_screening';
    if (key === 'ended') return 'ended';
    return 'coming_soon';
};
const genreNameViMap = {
    action: 'Hành động',
    adventure: 'Phiêu lưu',
    animation: 'Hoạt hình',
    comedy: 'Hài',
    drama: 'Chính kịch',
    family: 'Gia đình',
    horror: 'Kinh dị',
    mystery: 'Bí ẩn',
    romance: 'Lãng mạn',
    scifi: 'Khoa học viễn tưởng',
    'sci-fi': 'Khoa học viễn tưởng',
   
};

const normalizeGenreKey = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/&/g, 'and')
        .replace(/[\s_]+/g, ' ')
        .replace(/[^a-z0-9 -]/g, '');

const getGenreNameVi = (genre) => {
    const name = typeof genre === 'string'
        ? genre
        : genre?.genreName || genre?.name || genre?.title || '';

    const key = normalizeGenreKey(name);
    const compactKey = key.replace(/[\s-]/g, '');

    return genreNameViMap[key] || genreNameViMap[compactKey] || name || '-';
};

const getGenreText = (movie) => {
    if (!Array.isArray(movie?.genres) || movie.genres.length === 0) return '-';
    return movie.genres.map(getGenreNameVi).join(', ');
};

const getMovieStatus = (value) => movieStatusOptions.find((status) => status.value === normalizeStatus(value));
const getMovieStatusLabel = (value) => getMovieStatus(value)?.label || '-';
const getMovieStatusBadge = (value) => getMovieStatus(value)?.badge || 'badge-secondary';
const getMoviePosterUrl = (movie) => movie?.posterUrl || movie?.poster_url || movie?.PosterUrl || movie?.imageUrl || '';
// const getGenreText = (movie) => Array.isArray(movie?.genres) && movie.genres.length > 0 ? movie.genres.join(', ') : '-';
const cleanText = (value) => {
    if (typeof value !== 'string') return value ?? null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const MoviePoster = ({ movie }) => {
    const [imageError, setImageError] = useState(false);
    const posterUrl = getMoviePosterUrl(movie);

    if (!posterUrl || imageError) {
        return (
            <div
                className="d-inline-flex align-items-center justify-content-center bg-light border rounded text-muted"
                style={{ width: '58px', height: '78px' }}
                title="Chưa có poster"
            >
                <i className="fas fa-film"></i>
            </div>
        );
    }

    return (
        <img
            src={posterUrl}
            alt={movie?.title ? `Poster ${movie.title}` : 'Poster phim'}
            className="border rounded"
            style={{ width: '58px', height: '78px', objectFit: 'cover', backgroundColor: '#f8f9fa' }}
            onError={() => setImageError(true)}
        />
    );
};

const AdminMovies = () => {
    const [movies, setMovies] = useState([]);
    const [lookups, setLookups] = useState({ genres: [], countries: [] });
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMovie, setEditingMovie] = useState(null);
    const [formData, setFormData] = useState(createEmptyMovie);
    const [posterPreviewError, setPosterPreviewError] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadLookups();
        loadMovies();
    }, []);

    const loadLookups = async () => {
        try {
            const response = await cinemaLookupApi.getAll();
            setLookups({
                genres: response.data?.genres || [],
                countries: response.data?.countries || [],
            });
        } catch (err) {
            console.error('Failed to load movie lookups:', err);
            setError('Không tải được danh mục thể loại và quốc gia');
        }
    };

    const loadMovies = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await movieApi.getAll({
                keyword: keyword || undefined,
                status: status || undefined,
                page: 1,
                pageSize: 100,
            });
            setMovies(getItems(response.data));
        } catch (err) {
            console.error('Failed to load movies:', err);
            setError(err.response?.data?.message || 'Không tải được danh sách phim');
        } finally {
            setLoading(false);
        }
    };

    const openModal = async (movie = null) => {
        setError('');
        setSuccess('');
        setEditingMovie(movie);
        setPosterPreviewError(false);

        if (!movie) {
            setFormData(createEmptyMovie());
            setShowModal(true);
            return;
        }

        let sourceMovie = movie;
        let genreIds = Array.isArray(movie.genreIds) ? movie.genreIds : [];

        try {
            const response = await movieApi.getById(getMovieId(movie));
            sourceMovie = response.data?.movie || movie;
            genreIds = response.data?.genreIds || [];
        } catch (err) {
            console.error('Failed to load movie details:', err);
            setError('Không tải được chi tiết phim, đang dùng dữ liệu trên danh sách');
        }

        setFormData({
            title: sourceMovie.title || '',
            titleEn: sourceMovie.titleEn || '',
            countryId: sourceMovie.countryId ?? '',
            durationMins: sourceMovie.durationMins || 90,
            releaseDate: toDateInput(sourceMovie.releaseDate),
            endDate: toDateInput(sourceMovie.endDate),
            ageRating: sourceMovie.ageRating || 'P',
            status: normalizeStatus(sourceMovie.status),
            synopsis: sourceMovie.synopsis || '',
            director: sourceMovie.director || '',
            castMembers: sourceMovie.castMembers || '',
            language: sourceMovie.language || '',
            subtitle: sourceMovie.subtitle || '',
            posterUrl: sourceMovie.posterUrl || '',
            bannerUrl: sourceMovie.bannerUrl || '',
            trailerUrl: sourceMovie.trailerUrl || '',
            imdbRating: sourceMovie.imdbRating ?? '',
            genreIds: genreIds.map(Number),
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingMovie(null);
        setPosterPreviewError(false);
        setError('');
        setSaving(false);
    };

    const handleGenreChange = (genreId, checked) => {
        setFormData((current) => ({
            ...current,
            genreIds: checked
                ? [...current.genreIds, genreId]
                : current.genreIds.filter((id) => id !== genreId),
        }));
    };

    const handlePosterLinkChange = (e) => {
        setPosterPreviewError(false);
        setFormData({ ...formData, posterUrl: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const durationMins = Number(formData.durationMins);
        const imdbRating = formData.imdbRating === '' || formData.imdbRating === null ? null : Number(formData.imdbRating);

        if (!formData.title.trim()) {
            setError('Tên phim là bắt buộc');
            return;
        }

        if (!Number.isFinite(durationMins) || durationMins <= 0) {
            setError('Thời lượng phim phải lớn hơn 0');
            return;
        }

        if (imdbRating !== null && (!Number.isFinite(imdbRating) || imdbRating < 0 || imdbRating > 10)) {
            setError('IMDb phải nằm trong khoảng 0 đến 10');
            return;
        }

        const payload = {
            title: formData.title.trim(),
            titleEn: cleanText(formData.titleEn),
            countryId: formData.countryId ? Number(formData.countryId) : null,
            durationMins,
            releaseDate: formData.releaseDate || null,
            endDate: formData.endDate || null,
            ageRating: cleanText(formData.ageRating) || 'P',
            status: formData.status,
            synopsis: cleanText(formData.synopsis),
            director: cleanText(formData.director),
            castMembers: cleanText(formData.castMembers),
            language: cleanText(formData.language),
            subtitle: cleanText(formData.subtitle),
            posterUrl: cleanText(formData.posterUrl),
            bannerUrl: cleanText(formData.bannerUrl),
            trailerUrl: cleanText(formData.trailerUrl),
            imdbRating,
            genreIds: formData.genreIds.map(Number),
        };

        setSaving(true);
        try {
            if (editingMovie) {
                await movieApi.update(getMovieId(editingMovie), payload);
                setSuccess('Đã cập nhật phim');
            } else {
                await movieApi.create(payload);
                setSuccess('Đã thêm phim mới');
            }

            closeModal();
            await loadMovies();
        } catch (err) {
            setError(err.response?.data?.message || 'Lưu phim thất bại');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (movie) => {
        if (!window.confirm(`Xóa phim "${movie.title}"?`)) return;

        setError('');
        setSuccess('');
        try {
            await movieApi.delete(getMovieId(movie));
            setSuccess('Đã xóa phim');
            await loadMovies();
        } catch (err) {
            setError(err.response?.data?.message || 'Xóa phim thất bại');
        }
    };
    const nowShowingCount = movies.filter((movie) => normalizeStatus(movie.status) === 'now_showing').length;
    const comingSoonCount = movies.filter((movie) => normalizeStatus(movie.status) === 'coming_soon').length;
    const earlyScreeningCount = movies.filter((movie) => normalizeStatus(movie.status) === 'early_screening').length;
    const endedCount = movies.filter((movie) => normalizeStatus(movie.status) === 'ended').length;

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <h1 className="m-0">Quản lý phim</h1>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    <div className="admin-management-brief">
                        <div><i className="fas fa-film"></i><p><span>Tổng số phim</span><strong>{movies.length.toLocaleString('vi-VN')}</strong></p></div>
                        <div><i className="fas fa-clapperboard"></i><p><span>Đang chiếu</span><strong>{nowShowingCount.toLocaleString('vi-VN')}</strong></p></div>
                        <div><i className="fas fa-calendar-plus"></i><p><span>Sắp / chiếu sớm</span><strong>{(comingSoonCount + earlyScreeningCount).toLocaleString('vi-VN')}</strong></p></div>
                        <div><i className="fas fa-circle-stop"></i><p><span>Ngừng chiếu</span><strong>{endedCount.toLocaleString('vi-VN')}</strong></p></div>
                    </div>

                    {error && !showModal && <div className="alert alert-warning">{error}</div>}
                    {success && !showModal && <div className="alert alert-success">{success}</div>}

                    <div className="card">
                        <div className="card-header">
                            <div className="row align-items-start">
                                <div className="col-lg-9">
                                    <form className="form-inline" onSubmit={(e) => { e.preventDefault(); loadMovies(); }}>
                                        <input
                                            className="form-control mr-2 mb-2"
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                            placeholder="Tìm tên phim..."
                                        />
                                        <select
                                            className="form-control mr-2 mb-2"
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                        >
                                            <option value="">Tất cả trạng thái</option>
                                            {movieStatusOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                        <button className="btn btn-primary mr-2 mb-2" type="submit">
                                            <i className="fas fa-search mr-1"></i> Tìm kiếm
                                        </button>
                                        <button className="btn btn-outline-secondary mb-2" type="button" onClick={loadMovies}>
                                            <i className="fas fa-sync-alt mr-1"></i> Tải lại
                                        </button>
                                    </form>
                                </div>
                                <div className="col-lg-3 text-lg-right">
                                    <button className="btn btn-success" onClick={() => openModal()}>
                                        <i className="fas fa-plus mr-1"></i> Thêm phim
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="card-body">
                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary"></div>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '86px' }}>Poster</th>
                                                <th>Phim</th>
                                                <th>Thể loại</th>
                                                <th>Thời lượng</th>
                                                <th>Khởi chiếu</th>
                                                <th>Phân loại</th>
                                                <th>Trạng thái</th>
                                                <th style={{ width: '105px' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {movies.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="text-center">Không tìm thấy phim</td>
                                                </tr>
                                            ) : movies.map((movie) => (
                                                <tr key={getMovieId(movie)}>
                                                    <td className="text-center">
                                                        <MoviePoster movie={movie} />
                                                    </td>
                                                    <td>
                                                        <strong>{movie.title}</strong>
                                                        <div className="text-muted small">{movie.titleEn || movie.director || '-'}</div>
                                                    </td>
                                                    <td>{getGenreText(movie)}</td>
                                                    <td>{movie.durationMins} phút</td>
                                                    <td>{toDateInput(movie.releaseDate) || '-'}</td>
                                                    <td>{movie.ageRating || '-'}</td>
                                                    <td>
                                                        <span className={`badge ${getMovieStatusBadge(movie.status)}`}>
                                                            {getMovieStatusLabel(movie.status)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-sm btn-info mr-1" onClick={() => openModal(movie)} title="Sửa phim">
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(movie)} title="Xóa phim">
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

            {showModal && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-xl" style={{ marginTop: '20px' }}>
                        <div className="modal-content">
                            <form onSubmit={handleSubmit}>
                                <div className="modal-header">
                                    <h5 className="modal-title">{editingMovie ? 'Cập nhật phim' : 'Thêm phim'}</h5>
                                    <button type="button" className="close" onClick={closeModal}>&times;</button>
                                </div>
                                <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                    {error && <div className="alert alert-danger">{error}</div>}
                                    <div className="row">
                                        <div className="col-md-6 form-group">
                                            <label>Tên phim</label>
                                            <input
                                                className="form-control"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6 form-group">
                                            <label>Tên tiếng Anh</label>
                                            <input
                                                className="form-control"
                                                value={formData.titleEn}
                                                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-md-3 form-group">
                                            <label>Quốc gia</label>
                                            <select
                                                className="form-control"
                                                value={formData.countryId}
                                                onChange={(e) => setFormData({ ...formData, countryId: e.target.value })}
                                            >
                                                <option value="">Chọn quốc gia</option>
                                                {lookups.countries.map((country) => (
                                                    <option key={country.countryId} value={country.countryId}>
                                                        {country.countryName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-3 form-group">
                                            <label>Thời lượng</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="form-control"
                                                value={formData.durationMins}
                                                onChange={(e) => setFormData({ ...formData, durationMins: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-3 form-group">
                                            <label>Ngày khởi chiếu</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={formData.releaseDate}
                                                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-3 form-group">
                                            <label>Ngày kết thúc</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={formData.endDate}
                                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-md-3 form-group">
                                            <label>Phân loại</label>
                                            <select
                                                className="form-control"
                                                value={formData.ageRating}
                                                onChange={(e) => setFormData({ ...formData, ageRating: e.target.value })}
                                            >
                                                {ageRatingOptions.map((rating) => (
                                                    <option key={rating} value={rating}>{rating}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-3 form-group">
                                            <label>Trạng thái</label>
                                            <select
                                                className="form-control"
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            >
                                                {movieStatusOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-3 form-group">
                                            <label>Ngôn ngữ</label>
                                            <input
                                                className="form-control"
                                                value={formData.language}
                                                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-3 form-group">
                                            <label>IMDb</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="10"
                                                step="0.1"
                                                className="form-control"
                                                value={formData.imdbRating}
                                                onChange={(e) => setFormData({ ...formData, imdbRating: e.target.value })}
                                            />
                                        </div>

                                        <div className="col-md-6 form-group">
                                            <label>Đạo diễn</label>
                                            <input
                                                className="form-control"
                                                value={formData.director}
                                                onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6 form-group">
                                            <label>Diễn viên</label>
                                            <input
                                                className="form-control"
                                                value={formData.castMembers}
                                                onChange={(e) => setFormData({ ...formData, castMembers: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6 form-group">
                                            <label>Phụ đề</label>
                                            <input
                                                className="form-control"
                                                value={formData.subtitle}
                                                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6 form-group">
                                            <label>Link trailer</label>
                                            <input
                                                type="url"
                                                className="form-control"
                                                value={formData.trailerUrl}
                                                onChange={(e) => setFormData({ ...formData, trailerUrl: e.target.value })}
                                                placeholder="https://youtube.com/..."
                                            />
                                        </div>

                                        <div className="col-md-6 form-group">
                                            <label>Link poster</label>
                                            <input
                                                type="url"
                                                className="form-control"
                                                value={formData.posterUrl}
                                                onChange={handlePosterLinkChange}
                                                placeholder="https://.../poster.jpg"
                                            />
                                            {formData.posterUrl && !posterPreviewError && (
                                                <div className="mt-2 border rounded p-2 bg-light" style={{ maxWidth: '180px' }}>
                                                    <img
                                                        src={formData.posterUrl}
                                                        alt="Xem trước poster"
                                                        style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '4px' }}
                                                        onError={() => setPosterPreviewError(true)}
                                                    />
                                                </div>
                                            )}
                                            {formData.posterUrl && posterPreviewError && (
                                                <small className="form-text text-danger">Không hiển thị được ảnh từ link này.</small>
                                            )}
                                        </div>
                                        <div className="col-md-6 form-group">
                                            <label>Link banner</label>
                                            <input
                                                type="url"
                                                className="form-control"
                                                value={formData.bannerUrl}
                                                onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                                                placeholder="https://.../banner.jpg"
                                            />
                                        </div>

                                        <div className="col-md-12 form-group">
                                            <label>Thể loại</label>
                                            <div className="border rounded p-3 bg-light">
                                                {lookups.genres.length === 0 ? (
                                                    <span className="text-muted">Chưa có thể loại</span>
                                                ) : lookups.genres.map((genre) => (
                                                    <label className="mr-3 mb-2" key={genre.genreId}>
                                                        <input
                                                            type="checkbox"
                                                            className="mr-1"
                                                            checked={formData.genreIds.includes(Number(genre.genreId))}
                                                            onChange={(e) => handleGenreChange(Number(genre.genreId), e.target.checked)}
                                                        />
                                                       {getGenreNameVi(genre)}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="col-md-12 form-group">
                                            <label>Tóm tắt</label>
                                            <textarea
                                                className="form-control"
                                                rows="4"
                                                value={formData.synopsis}
                                                onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>
                                        Đóng
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Đang lưu...' : 'Lưu'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMovies;
