import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../../components/Icon'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001'
const PAGE_SIZE = 8

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'scheduled', label: 'Đã lên lịch' },
  { value: 'selling', label: 'Đang bán' },
  { value: 'sold_out', label: 'Hết vé' },
  { value: 'cancelled', label: 'Đã hủy' },
  { value: 'completed', label: 'Hoàn tất' },
]

const languageOptions = [
  { value: 'subtitled', label: 'Phụ đề' },
  { value: 'dubbed', label: 'Lồng tiếng' },
  { value: 'original', label: 'Nguyên bản' },
]

const initialForm = {
  movieId: '',
  cinemaId: '',
  hallId: '',
  startTime: '',
  endTime: '',
  languageType: 'subtitled',
  status: 'scheduled',
  isSpecial: false,
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data

  if (typeof data === 'string') return data

  return data?.message || data?.title || error?.message || fallback
}

function getShowtimeInfo(item) {
  return item?.showtime ?? item ?? {}
}

function toInteger(value) {
  const numberValue = Number(value)
  return Number.isInteger(numberValue) ? numberValue : NaN
}

function padDatePart(value) {
  return String(value).padStart(2, '0')
}

function toDateTimeLocal(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 16)
  }

  return [
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`,
  ].join('T')
}

function toApiDateTime(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null

  return trimmed.length === 16 ? `${trimmed}:00` : trimmed
}

function formatDate(value) {
  if (!value) return 'Chưa đặt'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chưa đặt'

  return new Intl.DateTimeFormat('vi-VN').format(date)
}

function formatTime(value) {
  if (!value) return '--:--'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatTimeRange(startTime, endTime) {
  if (!startTime) return 'Chưa đặt giờ'

  return `${formatTime(startTime)} - ${formatTime(endTime)}`
}

function formatDuration(startTime, endTime) {
  const start = new Date(startTime)
  const end = new Date(endTime)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 'Chưa rõ thời lượng'
  }

  return `${Math.round((end.getTime() - start.getTime()) / 60000)} phút`
}

function formatPrice(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 'Chưa đặt giá'

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

function getStatusLabel(value) {
  return statusOptions.find((option) => option.value === value)?.label ?? 'Chưa rõ'
}

function getLanguageLabel(value) {
  return languageOptions.find((option) => option.value === value)?.label ?? 'Chưa rõ'
}

function toForm(item) {
  const showtime = getShowtimeInfo(item)
  const hall = item?.hall ?? {}
  const cinema = item?.cinema ?? {}

  return {
    movieId: showtime.movieId ? String(showtime.movieId) : '',
    cinemaId: hall.cinemaId || cinema.cinemaId ? String(hall.cinemaId ?? cinema.cinemaId) : '',
    hallId: showtime.hallId ? String(showtime.hallId) : '',
    startTime: toDateTimeLocal(showtime.startTime),
    endTime: toDateTimeLocal(showtime.endTime),
    languageType: showtime.languageType ?? 'subtitled',
    status: showtime.status ?? 'scheduled',
    isSpecial: Boolean(showtime.isSpecial),
  }
}

function buildPayload(form) {
  return {
    movieId: Number(form.movieId),
    hallId: Number(form.hallId),
    startTime: toApiDateTime(form.startTime),
    endTime: toApiDateTime(form.endTime),
    languageType: form.languageType,
    isSpecial: Boolean(form.isSpecial),
    status: form.status,
  }
}

function validateForm(form, halls) {
  const errors = {}
  const movieId = toInteger(form.movieId)
  const cinemaId = toInteger(form.cinemaId)
  const hallId = toInteger(form.hallId)
  const start = form.startTime ? new Date(form.startTime) : null
  const end = form.endTime ? new Date(form.endTime) : null
  const validStatuses = statusOptions.map((option) => option.value).filter(Boolean)
  const validLanguages = languageOptions.map((option) => option.value)
  const selectedHall = halls.find((hall) => hall.hallId === hallId)

  if (!Number.isInteger(movieId) || movieId <= 0) {
    errors.movieId = 'Vui lòng chọn phim.'
  }

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    errors.cinemaId = 'Vui lòng chọn rạp.'
  }

  if (!Number.isInteger(hallId) || hallId <= 0) {
    errors.hallId = 'Vui lòng chọn phòng chiếu.'
  }

  if (selectedHall && selectedHall.status !== 'active') {
    errors.hallId = 'Phòng đã chọn không hoạt động.'
  }

  if (selectedHall && Number.isInteger(cinemaId) && selectedHall.cinemaId !== cinemaId) {
    errors.hallId = 'Phòng không thuộc rạp đã chọn.'
  }

  if (!form.startTime || !start || Number.isNaN(start.getTime())) {
    errors.startTime = 'Vui lòng chọn giờ bắt đầu.'
  }

  if (form.endTime && (!end || Number.isNaN(end.getTime()) || (start && end <= start))) {
    errors.endTime = 'Giờ kết thúc phải sau giờ bắt đầu.'
  }

  if (!validLanguages.includes(form.languageType)) {
    errors.languageType = 'Ngôn ngữ suất chiếu không hợp lệ.'
  }

  if (!validStatuses.includes(form.status)) {
    errors.status = 'Trạng thái suất chiếu không hợp lệ.'
  }

  return errors
}

function Showtimes() {
  const [showtimes, setShowtimes] = useState([])
  const [movies, setMovies] = useState([])
  const [cinemas, setCinemas] = useState([])
  const [halls, setHalls] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
  })
  const [page, setPage] = useState(1)
  const [statusInput, setStatusInput] = useState('')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLookupsLoading, setIsLookupsLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingShowtime, setEditingShowtime] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const fetchLookups = useCallback(async () => {
    setIsLookupsLoading(true)

    try {
      const [movieResponse, cinemaResponse, hallResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/movies`, { params: { page: 1, pageSize: 1000 } }),
        axios.get(`${API_BASE_URL}/api/cinemas`, { params: { page: 1, pageSize: 1000 } }),
        axios.get(`${API_BASE_URL}/api/halls`, { params: { page: 1, pageSize: 1000 } }),
      ])

      const movieData = movieResponse.data ?? {}
      const cinemaData = cinemaResponse.data ?? {}
      const hallData = hallResponse.data ?? {}

      setMovies(Array.isArray(movieData.items) ? movieData.items : [])
      setCinemas(Array.isArray(cinemaData.items) ? cinemaData.items : [])
      setHalls(Array.isArray(hallData.items) ? hallData.items : [])
    } catch (lookupError) {
      setMovies([])
      setCinemas([])
      setHalls([])
      setError(getErrorMessage(lookupError, 'Không tải được dữ liệu phim, rạp hoặc phòng chiếu.'))
    } finally {
      setIsLookupsLoading(false)
    }
  }, [])

  const fetchShowtimes = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await axios.get(`${API_BASE_URL}/api/showtimes`, {
        params: {
          status: status || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })

      const data = response.data ?? {}
      setShowtimes(Array.isArray(data.items) ? data.items : [])
      setPagination({
        page: data.page ?? page,
        pageSize: data.pageSize ?? PAGE_SIZE,
        totalCount: data.totalCount ?? 0,
        totalPages: Math.max(data.totalPages ?? 1, 1),
      })
    } catch (showtimeError) {
      setShowtimes([])
      setError(getErrorMessage(showtimeError, 'Không tải được danh sách suất chiếu.'))
    } finally {
      setIsLoading(false)
    }
  }, [page, status])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLookups()
  }, [fetchLookups])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchShowtimes()
  }, [fetchShowtimes])

  const shownRange = useMemo(() => {
    if (pagination.totalCount === 0) return '0'

    const start = (pagination.page - 1) * pagination.pageSize + 1
    const end = Math.min(pagination.page * pagination.pageSize, pagination.totalCount)

    return `${start}-${end}`
  }, [pagination])

  const formHallOptions = useMemo(
    () => halls.filter((hall) => !form.cinemaId || String(hall.cinemaId) === form.cinemaId),
    [form.cinemaId, halls],
  )

  const selectedMovie = useMemo(
    () => movies.find((movie) => String(movie.movieId) === form.movieId),
    [form.movieId, movies],
  )

  const selectedHall = useMemo(
    () => halls.find((hall) => String(hall.hallId) === form.hallId),
    [form.hallId, halls],
  )

  const openCreateForm = () => {
    setEditingShowtime(null)
    setForm(initialForm)
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const openEditForm = (showtime) => {
    setEditingShowtime(showtime)
    setForm(toForm(showtime))
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    if (isSaving) return

    setIsFormOpen(false)
    setEditingShowtime(null)
    setForm(initialForm)
    setFormErrors({})
  }

  const handleFieldChange = (event) => {
    const { checked, name, type, value } = event.target
    const nextValue = type === 'checkbox' ? checked : value

    setForm((current) => {
      const next = { ...current, [name]: nextValue }

      if (name === 'cinemaId') {
        next.hallId = ''
      }

      if (name === 'hallId') {
        const nextHall = halls.find((hall) => String(hall.hallId) === value)
        if (nextHall) {
          next.cinemaId = String(nextHall.cinemaId)
        }
      }

      return next
    })

    setFormErrors((current) => {
      if (!current[name] && !(name === 'cinemaId' && current.hallId) && !(name === 'hallId' && current.cinemaId)) {
        return current
      }

      const next = { ...current }
      delete next[name]

      if (name === 'cinemaId') {
        delete next.hallId
      }

      if (name === 'hallId') {
        delete next.cinemaId
      }

      return next
    })
  }

  const handleSearch = (event) => {
    event.preventDefault()
    setStatus(statusInput)
    setPage(1)
  }

  const resetFilters = () => {
    setStatusInput('')
    setStatus('')
    setPage(1)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateForm(form, halls)

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    setIsSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = buildPayload(form)

      if (editingShowtime) {
        await axios.put(`${API_BASE_URL}/api/showtimes/${getShowtimeInfo(editingShowtime).showtimeId}`, payload)
        setNotice('Đã cập nhật suất chiếu.')
      } else {
        await axios.post(`${API_BASE_URL}/api/showtimes`, payload)
        setNotice('Đã thêm suất chiếu mới.')
      }

      closeForm()
      await fetchShowtimes()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Không lưu được suất chiếu.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (item) => {
    const showtime = getShowtimeInfo(item)
    const movieTitle = item.movie?.title ?? 'suất chiếu này'
    const confirmed = window.confirm(`Xóa suất chiếu "${movieTitle}" lúc ${formatTime(showtime.startTime)} ngày ${formatDate(showtime.startTime)}?`)
    if (!confirmed) return

    setDeletingId(showtime.showtimeId)
    setError('')
    setNotice('')

    try {
      await axios.delete(`${API_BASE_URL}/api/showtimes/${showtime.showtimeId}`)
      setNotice('Đã xóa suất chiếu.')

      if (showtimes.length === 1 && page > 1) {
        setPage((current) => current - 1)
      } else {
        await fetchShowtimes()
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Không xóa được suất chiếu.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="admin-page showtimes-page" aria-label="Quản lý suất chiếu">
      <div className="page-surface movies-surface showtimes-surface">
        <div className="movies-toolbar">
          <div>
            <p className="section-kicker">Lịch chiếu</p>
            <h2>Quản lý suất chiếu</h2>
            <p className="section-subtitle">
              Hiển thị {shownRange} trong {pagination.totalCount} suất chiếu
            </p>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={openCreateForm}
            disabled={isLookupsLoading}
          >
            <Icon name="plus" />
            Thêm suất chiếu
          </button>
        </div>

        <form className="showtimes-filters" onSubmit={handleSearch}>
          <select
            value={statusInput}
            onChange={(event) => setStatusInput(event.target.value)}
            aria-label="Lọc trạng thái suất chiếu"
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
          <table className="movies-table showtimes-table">
            <thead>
              <tr>
                <th>Phim</th>
                <th>Rạp / Phòng</th>
                <th>Thời gian</th>
                <th>Ghế</th>
                <th>Trạng thái</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="table-state">
                    Đang tải danh sách suất chiếu...
                  </td>
                </tr>
              ) : showtimes.length > 0 ? (
                showtimes.map((item) => {
                  const showtime = getShowtimeInfo(item)
                  const movie = item.movie ?? {}
                  const hall = item.hall ?? {}
                  const cinema = item.cinema ?? {}
                  const totalSeats = Number(showtime.totalSeats ?? hall.totalSeats ?? 0)
                  const availableSeats = Number(showtime.availableSeats ?? 0)
                  const soldSeats = Math.max(totalSeats - availableSeats, 0)
                  const soldPercent = totalSeats > 0 ? Math.min(Math.max((soldSeats / totalSeats) * 100, 0), 100) : 0

                  return (
                    <tr key={showtime.showtimeId}>
                      <td>
                        <div className="movie-cell">
                          <div className="poster-thumb">
                            {movie.posterUrl ? (
                              <img src={movie.posterUrl} alt="" />
                            ) : (
                              <Icon name="movies" />
                            )}
                          </div>
                          <div>
                            <strong>{movie.title || 'Chưa có phim'}</strong>
                            <span>{movie.durationMins ? `${movie.durationMins} phút` : 'Chưa rõ thời lượng'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="showtime-location-cell">
                          <strong>{cinema.cinemaName || hall.cinemaName || 'Chưa có rạp'}</strong>
                          <span>{hall.hallName || hall.name || 'Chưa có phòng'}</span>
                          <small>{hall.hallTypeName || cinema.city || 'Chưa có loại phòng'}</small>
                        </div>
                      </td>
                      <td>
                        <div className="schedule-cell">
                          <strong>{formatTimeRange(showtime.startTime, showtime.endTime)}</strong>
                          <span>{formatDate(showtime.startTime)}</span>
                          <small>{formatDuration(showtime.startTime, showtime.endTime)}</small>
                          <div className="showtime-tags">
                            <span>{getLanguageLabel(showtime.languageType)}</span>
                            {showtime.isSpecial ? <span>Suất đặc biệt</span> : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="seat-count-cell">
                          <strong>
                            {availableSeats}/{totalSeats}
                          </strong>
                          <span className="muted-cell">Ghế trống</span>
                          <div className="seat-progress" aria-hidden="true">
                            <span style={{ width: `${soldPercent}%` }} />
                          </div>
                          <small>{formatPrice(showtime.basePrice)}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge status-${showtime.status || 'unknown'}`}>
                          {getStatusLabel(showtime.status)}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button table-action"
                            type="button"
                            onClick={() => openEditForm(item)}
                            aria-label={`Sửa suất chiếu ${movie.title || showtime.showtimeId}`}
                            title="Sửa suất chiếu"
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            className="icon-button table-action danger"
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === showtime.showtimeId}
                            aria-label={`Xóa suất chiếu ${movie.title || showtime.showtimeId}`}
                            title="Xóa suất chiếu"
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="6" className="table-state">
                    Chưa có suất chiếu phù hợp.
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
          <section className="modal-panel showtime-form-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="section-kicker">{editingShowtime ? 'Sửa suất chiếu' : 'Thêm suất chiếu'}</p>
                <h2>{editingShowtime ? itemTitle(editingShowtime) : 'Suất chiếu mới'}</h2>
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

            <form className="movie-form showtime-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="form-field required">
                  <span>Phim</span>
                  <select name="movieId" value={form.movieId} onChange={handleFieldChange}>
                    <option value="">Chọn phim</option>
                    {movies.map((movie) => (
                      <option key={movie.movieId} value={movie.movieId}>
                        {movie.title}
                      </option>
                    ))}
                  </select>
                  {selectedMovie ? <small className="form-hint">{selectedMovie.durationMins} phút</small> : null}
                  {formErrors.movieId ? <em>{formErrors.movieId}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Rạp</span>
                  <select name="cinemaId" value={form.cinemaId} onChange={handleFieldChange}>
                    <option value="">Chọn rạp</option>
                    {cinemas.map((cinema) => (
                      <option key={cinema.cinemaId} value={cinema.cinemaId}>
                        {cinema.cinemaName}
                      </option>
                    ))}
                  </select>
                  {formErrors.cinemaId ? <em>{formErrors.cinemaId}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Phòng chiếu</span>
                  <select name="hallId" value={form.hallId} onChange={handleFieldChange}>
                    <option value="">Chọn phòng chiếu</option>
                    {formHallOptions.map((hall) => (
                      <option key={hall.hallId} value={hall.hallId}>
                        {hall.hallName || hall.name} - {hall.hallTypeName || 'Phòng chiếu'}
                      </option>
                    ))}
                  </select>
                  {selectedHall ? (
                    <small className="form-hint">
                      {selectedHall.totalSeats} ghế, trạng thái {selectedHall.status}
                    </small>
                  ) : null}
                  {formErrors.hallId ? <em>{formErrors.hallId}</em> : null}
                </label>

                <label className="form-field required">
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
                  {formErrors.status ? <em>{formErrors.status}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Bắt đầu</span>
                  <input
                    name="startTime"
                    type="datetime-local"
                    value={form.startTime}
                    onChange={handleFieldChange}
                  />
                  {formErrors.startTime ? <em>{formErrors.startTime}</em> : null}
                </label>

                <label className="form-field">
                  <span>Kết thúc</span>
                  <input
                    name="endTime"
                    type="datetime-local"
                    value={form.endTime}
                    onChange={handleFieldChange}
                  />
                  <small className="form-hint">Để trống khi thêm mới để tự tính theo thời lượng phim.</small>
                  {formErrors.endTime ? <em>{formErrors.endTime}</em> : null}
                </label>

                <label className="form-field">
                  <span>Ngôn ngữ</span>
                  <select name="languageType" value={form.languageType} onChange={handleFieldChange}>
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.languageType ? <em>{formErrors.languageType}</em> : null}
                </label>

                <label className="form-field checkbox-field showtime-special-field">
                  <input
                    name="isSpecial"
                    type="checkbox"
                    checked={form.isSpecial}
                    onChange={handleFieldChange}
                  />
                  <span>Suất chiếu đặc biệt</span>
                </label>
              </div>

              <div className="form-actions">
                <button className="ghost-button" type="button" onClick={closeForm} disabled={isSaving}>
                  Hủy
                </button>
                <button className="primary-button" type="submit" disabled={isSaving}>
                  <Icon name="save" />
                  {isSaving ? 'Đang lưu...' : 'Lưu suất chiếu'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

function itemTitle(item) {
  const showtime = getShowtimeInfo(item)
  const movieTitle = item?.movie?.title ?? 'Suất chiếu'

  return `${movieTitle} - ${formatTime(showtime.startTime)} ${formatDate(showtime.startTime)}`
}

export default Showtimes
