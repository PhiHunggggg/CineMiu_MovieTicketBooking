import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../../components/Icon'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001'
const PAGE_SIZE = 8

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'now_showing', label: 'Đang chiếu' },
  { value: 'coming_soon', label: 'Sắp chiếu' },
  { value: 'ended', label: 'Đã kết thúc' },
]

const ageRatingOptions = ['P', 'K', 'T13', 'T16', 'T18', 'C']

const initialForm = {
  title: '',
  titleEn: '',
  countryId: '',
  durationMins: '',
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
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data

  if (typeof data === 'string') return data

  return data?.message || data?.title || error?.message || fallback
}

function toDateInput(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function formatDate(value) {
  if (!value) return 'Chưa đặt'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chưa đặt'

  return new Intl.DateTimeFormat('vi-VN').format(date)
}

function getStatusLabel(value) {
  return statusOptions.find((option) => option.value === value)?.label ?? 'Chưa rõ'
}

function toForm(movie) {
  return {
    title: movie.title ?? '',
    titleEn: movie.titleEn ?? '',
    countryId: movie.countryId ?? '',
    durationMins: movie.durationMins ?? '',
    releaseDate: toDateInput(movie.releaseDate),
    endDate: toDateInput(movie.endDate),
    ageRating: movie.ageRating ?? 'P',
    status: movie.status ?? 'coming_soon',
    synopsis: movie.synopsis ?? '',
    director: movie.director ?? '',
    castMembers: movie.castMembers ?? '',
    language: movie.language ?? '',
    subtitle: movie.subtitle ?? '',
    posterUrl: movie.posterUrl ?? '',
    bannerUrl: movie.bannerUrl ?? '',
    trailerUrl: movie.trailerUrl ?? '',
    imdbRating: movie.imdbRating ?? '',
    genreIds: Array.isArray(movie.genreIds)
      ? movie.genreIds.map((genreId) => Number(genreId)).filter((genreId) => Number.isInteger(genreId))
      : [],
  }
}

function optionalText(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed || null
}

function optionalNumber(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed ? Number(trimmed) : null
}

function buildPayload(form) {
  return {
    title: form.title.trim(),
    titleEn: optionalText(form.titleEn),
    countryId: optionalNumber(form.countryId),
    durationMins: Number(form.durationMins),
    releaseDate: form.releaseDate || null,
    endDate: form.endDate || null,
    ageRating: optionalText(form.ageRating),
    status: optionalText(form.status),
    synopsis: optionalText(form.synopsis),
    director: optionalText(form.director),
    castMembers: optionalText(form.castMembers),
    language: optionalText(form.language),
    subtitle: optionalText(form.subtitle),
    posterUrl: optionalText(form.posterUrl),
    bannerUrl: optionalText(form.bannerUrl),
    trailerUrl: optionalText(form.trailerUrl),
    imdbRating: optionalNumber(form.imdbRating),
    genreIds: form.genreIds,
  }
}

function validateForm(form) {
  const errors = {}
  const duration = Number(form.durationMins)
  const imdbRating = optionalNumber(form.imdbRating)
  const countryId = optionalNumber(form.countryId)

  if (!form.title.trim()) {
    errors.title = 'Vui lòng nhập tên phim.'
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    errors.durationMins = 'Thời lượng phải lớn hơn 0.'
  } else if (duration > 32767) {
    errors.durationMins = 'Thời lượng không được vượt quá 32767 phút.'
  }

  if (countryId !== null && (!Number.isInteger(countryId) || countryId <= 0)) {
    errors.countryId = 'Country ID phải là số nguyên dương.'
  }

  if (imdbRating !== null && (imdbRating < 0 || imdbRating > 10)) {
    errors.imdbRating = 'Điểm IMDb phải từ 0 đến 10.'
  }

  if (
    !Array.isArray(form.genreIds) ||
    form.genreIds.some((genreId) => !Number.isInteger(genreId) || genreId <= 0 || genreId > 255)
  ) {
    errors.genreIds = 'Vui lòng chọn thể loại phim hợp lệ.'
  }

  return errors
}

function Movies() {
  const [movies, setMovies] = useState([])
  const [genres, setGenres] = useState([])
  const [isGenresLoading, setIsGenresLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
  })
  const [page, setPage] = useState(1)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMovie, setEditingMovie] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const fetchGenres = useCallback(async () => {
    setIsGenresLoading(true)

    try {
      const response = await axios.get(`${API_BASE_URL}/api/movies/genres`)
      setGenres(Array.isArray(response.data) ? response.data : [])
    } catch (genreError) {
      setGenres([])
      setError(getErrorMessage(genreError, 'Không tải được danh sách thể loại phim.'))
    } finally {
      setIsGenresLoading(false)
    }
  }, [])

  const fetchMovies = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await axios.get(`${API_BASE_URL}/api/movies`, {
        params: {
          keyword: keyword || undefined,
          status: status || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })

      const data = response.data ?? {}
      setMovies(Array.isArray(data.items) ? data.items : [])
      setPagination({
        page: data.page ?? page,
        pageSize: data.pageSize ?? PAGE_SIZE,
        totalCount: data.totalCount ?? 0,
        totalPages: Math.max(data.totalPages ?? 1, 1),
      })
    } catch (movieError) {
      setMovies([])
      setError(getErrorMessage(movieError, 'Không tải được danh sách phim.'))
    } finally {
      setIsLoading(false)
    }
  }, [keyword, page, status])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGenres()
  }, [fetchGenres])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMovies()
  }, [fetchMovies])

  const shownRange = useMemo(() => {
    if (pagination.totalCount === 0) return '0'

    const start = (pagination.page - 1) * pagination.pageSize + 1
    const end = Math.min(pagination.page * pagination.pageSize, pagination.totalCount)

    return `${start}-${end}`
  }, [pagination])

  const openCreateForm = () => {
    setEditingMovie(null)
    setForm(initialForm)
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const openEditForm = (movie) => {
    setEditingMovie(movie)
    setForm(toForm(movie))
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    if (isSaving) return

    setIsFormOpen(false)
    setEditingMovie(null)
    setForm(initialForm)
    setFormErrors({})
  }

  const handleFieldChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({ ...current, [name]: value }))
    setFormErrors((current) => {
      if (!current[name]) return current

      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const handleGenreChange = (event) => {
    const genreId = Number(event.target.value)
    if (!Number.isInteger(genreId)) return

    setForm((current) => {
      const currentGenreIds = Array.isArray(current.genreIds) ? current.genreIds : []
      const nextGenreIds = event.target.checked
        ? [...new Set([...currentGenreIds, genreId])]
        : currentGenreIds.filter((currentGenreId) => currentGenreId !== genreId)

      return { ...current, genreIds: nextGenreIds }
    })
    setFormErrors((current) => {
      if (!current.genreIds) return current

      const next = { ...current }
      delete next.genreIds
      return next
    })
  }

  const handleSearch = (event) => {
    event.preventDefault()
    setKeyword(keywordInput.trim())
    setPage(1)
  }

  const resetFilters = () => {
    setKeywordInput('')
    setKeyword('')
    setStatus('')
    setPage(1)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateForm(form)

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    setIsSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = buildPayload(form)

      if (editingMovie) {
        await axios.put(`${API_BASE_URL}/api/movies/${editingMovie.movieId}`, payload)
        setNotice('Đã cập nhật phim.')
      } else {
        await axios.post(`${API_BASE_URL}/api/movies`, payload)
        setNotice('Đã thêm phim mới.')
      }

      closeForm()
      await fetchMovies()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Không lưu được phim.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (movie) => {
    const confirmed = window.confirm(`Xóa phim "${movie.title}"?`)
    if (!confirmed) return

    setDeletingId(movie.movieId)
    setError('')
    setNotice('')

    try {
      await axios.delete(`${API_BASE_URL}/api/movies/${movie.movieId}`)
      setNotice('Đã xóa phim.')

      if (movies.length === 1 && page > 1) {
        setPage((current) => current - 1)
      } else {
        await fetchMovies()
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Không xóa được phim.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="admin-page movies-page" aria-label="Quản lý phim">
      <div className="page-surface movies-surface">
        <div className="movies-toolbar">
          <div>
            <p className="section-kicker">Danh sách phim</p>
            <h2>Quản lý phim</h2>
            <p className="section-subtitle">
              Hiển thị {shownRange} trong {pagination.totalCount} phim
            </p>
          </div>

          <button className="primary-button" type="button" onClick={openCreateForm}>
            <Icon name="plus" />
            Thêm phim
          </button>
        </div>

        <form className="movies-filters" onSubmit={handleSearch}>
          <label className="search-field">
            <Icon name="search" className="field-icon" />
            <input
              type="search"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="Tìm theo tên phim"
              aria-label="Tìm kiếm phim"
            />
          </label>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            aria-label="Lọc trạng thái phim"
          >
            {statusOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button className="secondary-button" type="submit">
            <Icon name="search" />
            Tìm kiếm
          </button>
          <button className="ghost-button" type="button" onClick={resetFilters}>
            <Icon name="refresh" />
            Đặt lại
          </button>
        </form>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {notice ? <div className="alert alert-success">{notice}</div> : null}

        <div className="movies-table-wrap">
          <table className="movies-table">
            <thead>
              <tr>
                <th>Phim</th>
                <th>Trạng thái</th>
                <th>Thời lượng</th>
                <th>Khởi chiếu</th>
                <th>IMDb</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="table-state">
                    Đang tải danh sách phim...
                  </td>
                </tr>
              ) : movies.length > 0 ? (
                movies.map((movie) => (
                  <tr key={movie.movieId}>
                    <td>
                      <div className="movie-cell">
                        <div className="poster-thumb">
                          {movie.posterUrl ? (
                            <img src={movie.posterUrl} alt="" />
                          ) : (
                            <Icon name="image" />
                          )}
                        </div>
                        <div>
                          <strong>{movie.title}</strong>
                          <span>{movie.titleEn || movie.director || 'Chưa có mô tả phụ'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${movie.status || 'unknown'}`}>
                        {getStatusLabel(movie.status)}
                      </span>
                    </td>
                    <td>{movie.durationMins ? `${movie.durationMins} phút` : 'Chưa đặt'}</td>
                    <td>{formatDate(movie.releaseDate)}</td>
                    <td>{movie.imdbRating ?? 'Chưa có'}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button table-action"
                          type="button"
                          onClick={() => openEditForm(movie)}
                          aria-label={`Sửa phim ${movie.title}`}
                          title="Sửa phim"
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          className="icon-button table-action danger"
                          type="button"
                          onClick={() => handleDelete(movie)}
                          disabled={deletingId === movie.movieId}
                          aria-label={`Xóa phim ${movie.title}`}
                          title="Xóa phim"
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="table-state">
                    Chưa có phim phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <span>
            Trang {pagination.page} / {pagination.totalPages}
          </span>
          <div className="pagination-actions">
            <button
              className="icon-button"
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page <= 1 || isLoading}
              aria-label="Trang trước"
            >
              <Icon name="chevronLeft" />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={() => setPage((current) => Math.min(current + 1, pagination.totalPages))}
              disabled={page >= pagination.totalPages || isLoading}
              aria-label="Trang sau"
            >
              <Icon name="chevronRight" />
            </button>
          </div>
        </div>
      </div>

      {isFormOpen ? (
        <div className="modal-backdrop">
          <section className="modal-panel movie-form-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="section-kicker">{editingMovie ? 'Sửa phim' : 'Thêm phim'}</p>
                <h2>{editingMovie ? editingMovie.title : 'Phim mới'}</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                aria-label="Đóng form"
              >
                <Icon name="close" />
              </button>
            </div>

            <form className="movie-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="form-field required">
                  <span>Tên phim</span>
                  <input name="title" value={form.title} onChange={handleFieldChange} />
                  {formErrors.title ? <em>{formErrors.title}</em> : null}
                </label>

                <label className="form-field">
                  <span>Tên tiếng Anh</span>
                  <input name="titleEn" value={form.titleEn} onChange={handleFieldChange} />
                </label>

                <label className="form-field required">
                  <span>Thời lượng</span>
                  <input
                    name="durationMins"
                    type="number"
                    min="1"
                    value={form.durationMins}
                    onChange={handleFieldChange}
                  />
                  {formErrors.durationMins ? <em>{formErrors.durationMins}</em> : null}
                </label>

                <label className="form-field">
                  <span>Trạng thái</span>
                  <select name="status" value={form.status} onChange={handleFieldChange}>
                    {statusOptions
                      .filter((option) => option.value)
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Khởi chiếu</span>
                  <input
                    name="releaseDate"
                    type="date"
                    value={form.releaseDate}
                    onChange={handleFieldChange}
                  />
                </label>

                <label className="form-field">
                  <span>Kết thúc</span>
                  <input
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={handleFieldChange}
                  />
                </label>

                <label className="form-field">
                  <span>Phân loại tuổi</span>
                  <select name="ageRating" value={form.ageRating} onChange={handleFieldChange}>
                    {ageRatingOptions.map((rating) => (
                      <option key={rating} value={rating}>
                        {rating}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>IMDb</span>
                  <input
                    name="imdbRating"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={form.imdbRating}
                    onChange={handleFieldChange}
                  />
                  {formErrors.imdbRating ? <em>{formErrors.imdbRating}</em> : null}
                </label>

                <label className="form-field">
                  <span>Country ID</span>
                  <input
                    name="countryId"
                    type="number"
                    min="1"
                    value={form.countryId}
                    onChange={handleFieldChange}
                  />
                  {formErrors.countryId ? <em>{formErrors.countryId}</em> : null}
                </label>

                <label className="form-field">
                  <span>Đạo diễn</span>
                  <input name="director" value={form.director} onChange={handleFieldChange} />
                </label>

                <label className="form-field">
                  <span>Diễn viên</span>
                  <input name="castMembers" value={form.castMembers} onChange={handleFieldChange} />
                </label>

                <label className="form-field">
                  <span>Ngôn ngữ</span>
                  <input name="language" value={form.language} onChange={handleFieldChange} />
                </label>

                <label className="form-field">
                  <span>Phụ đề</span>
                  <input name="subtitle" value={form.subtitle} onChange={handleFieldChange} />
                </label>

                <label className="form-field wide">
                  <span>Poster URL</span>
                  <input name="posterUrl" value={form.posterUrl} onChange={handleFieldChange} />
                </label>

                <label className="form-field wide">
                  <span>Banner URL</span>
                  <input name="bannerUrl" value={form.bannerUrl} onChange={handleFieldChange} />
                </label>

                <label className="form-field wide">
                  <span>Trailer URL</span>
                  <input name="trailerUrl" value={form.trailerUrl} onChange={handleFieldChange} />
                </label>

                <label className="form-field wide">
                  <span>Tóm tắt</span>
                  <textarea
                    name="synopsis"
                    rows="4"
                    value={form.synopsis}
                    onChange={handleFieldChange}
                  />
                </label>

                <fieldset className="form-field movie-genre-field wide">
                  <legend>Thể loại</legend>
                  <div className="genre-options">
                    {isGenresLoading ? (
                      <span className="genre-empty">Đang tải thể loại...</span>
                    ) : genres.length > 0 ? (
                      genres.map((genre) => {
                        const genreId = Number(genre.genreId)
                        return (
                          <label className="genre-option" key={genre.genreId}>
                            <input
                              type="checkbox"
                              value={genreId}
                              checked={form.genreIds.includes(genreId)}
                              onChange={handleGenreChange}
                            />
                            <span>{genre.genreName}</span>
                          </label>
                        )
                      })
                    ) : (
                      <span className="genre-empty">Chưa có thể loại phim.</span>
                    )}
                  </div>
                  {formErrors.genreIds ? <em>{formErrors.genreIds}</em> : null}
                </fieldset>
              </div>

              <div className="form-actions">
                <button className="ghost-button" type="button" onClick={closeForm} disabled={isSaving}>
                  Hủy
                </button>
                <button className="primary-button" type="submit" disabled={isSaving}>
                  <Icon name="save" />
                  {isSaving ? 'Đang lưu...' : 'Lưu phim'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

export default Movies
