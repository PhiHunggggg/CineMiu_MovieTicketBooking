import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../../components/Icon'
import './Halls.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001'
const PAGE_SIZE = 8

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'maintenance', label: 'Bảo trì' },
  { value: 'inactive', label: 'Ngưng dùng' },
]

const initialForm = {
  cinemaId: '',
  hallTypeId: '',
  hallName: '',
  totalRows: '8',
  totalCols: '12',
  status: 'active',
  defaultSeatTypeId: '',
}

const initialSeatForm = {
  seatTypeId: '',
  isActive: '',
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data

  if (typeof data === 'string') return data

  return data?.message || data?.title || error?.message || fallback
}

function getStatusLabel(value) {
  return statusOptions.find((option) => option.value === value)?.label ?? 'Chưa rõ'
}

function toInteger(value) {
  const numberValue = Number(value)
  return Number.isInteger(numberValue) ? numberValue : NaN
}

function toForm(hall, defaultSeatTypeId) {
  return {
    cinemaId: hall.cinemaId ? String(hall.cinemaId) : '',
    hallTypeId: hall.hallTypeId ? String(hall.hallTypeId) : '',
    hallName: hall.hallName ?? hall.name ?? '',
    totalRows: hall.totalRows ? String(hall.totalRows) : '8',
    totalCols: hall.totalCols ? String(hall.totalCols) : '12',
    status: hall.status ?? 'active',
    defaultSeatTypeId: defaultSeatTypeId ? String(defaultSeatTypeId) : '',
  }
}

function buildPayload(form) {
  return {
    cinemaId: Number(form.cinemaId),
    hallTypeId: Number(form.hallTypeId),
    hallName: form.hallName.trim(),
    totalRows: Number(form.totalRows),
    totalCols: Number(form.totalCols),
    status: form.status,
    defaultSeatTypeId: Number(form.defaultSeatTypeId),
  }
}

function validateForm(form) {
  const errors = {}
  const cinemaId = toInteger(form.cinemaId)
  const hallTypeId = toInteger(form.hallTypeId)
  const defaultSeatTypeId = toInteger(form.defaultSeatTypeId)
  const totalRows = toInteger(form.totalRows)
  const totalCols = toInteger(form.totalCols)
  const validStatuses = statusOptions.map((option) => option.value).filter(Boolean)

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    errors.cinemaId = 'Vui lòng chọn rạp.'
  }

  if (!Number.isInteger(hallTypeId) || hallTypeId <= 0) {
    errors.hallTypeId = 'Vui lòng chọn loại phòng.'
  }

  if (!form.hallName.trim()) {
    errors.hallName = 'Vui lòng nhập tên phòng.'
  }

  if (!Number.isInteger(totalRows) || totalRows < 1 || totalRows > 26) {
    errors.totalRows = 'Số hàng phải từ 1 đến 26.'
  }

  if (!Number.isInteger(totalCols) || totalCols < 1 || totalCols > 50) {
    errors.totalCols = 'Số cột phải từ 1 đến 50.'
  }

  if (!validStatuses.includes(form.status)) {
    errors.status = 'Trạng thái phòng không hợp lệ.'
  }

  if (!Number.isInteger(defaultSeatTypeId) || defaultSeatTypeId <= 0) {
    errors.defaultSeatTypeId = 'Vui lòng chọn loại ghế mặc định.'
  }

  return errors
}

function Halls() {
  const [halls, setHalls] = useState([])
  const [cinemas, setCinemas] = useState([])
  const [hallTypes, setHallTypes] = useState([])
  const [seatTypes, setSeatTypes] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
  })
  const [page, setPage] = useState(1)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [cinemaId, setCinemaId] = useState('')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingHall, setEditingHall] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [seatModalHall, setSeatModalHall] = useState(null)
  const [seats, setSeats] = useState([])
  const [isSeatsLoading, setIsSeatsLoading] = useState(false)
  const [seatsError, setSeatsError] = useState('')
  const [selectedSeatIds, setSelectedSeatIds] = useState([])
  const [seatForm, setSeatForm] = useState(initialSeatForm)
  const [seatFormError, setSeatFormError] = useState('')
  const [seatNotice, setSeatNotice] = useState('')
  const [isSeatSaving, setIsSeatSaving] = useState(false)

  const fetchLookups = useCallback(async () => {
    try {
      const [cinemaResponse, hallTypeResponse, seatTypeResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/cinemas`, { params: { page: 1, pageSize: 1000 } }),
        axios.get(`${API_BASE_URL}/api/halls/types`),
        axios.get(`${API_BASE_URL}/api/halls/seat-types`),
      ])

      const cinemaData = cinemaResponse.data ?? {}
      setCinemas(Array.isArray(cinemaData.items) ? cinemaData.items : [])
      setHallTypes(Array.isArray(hallTypeResponse.data) ? hallTypeResponse.data : [])
      setSeatTypes(Array.isArray(seatTypeResponse.data) ? seatTypeResponse.data : [])
    } catch (lookupError) {
      setCinemas([])
      setHallTypes([])
      setSeatTypes([])
      setError(getErrorMessage(lookupError, 'Không tải được dữ liệu rạp, loại phòng hoặc loại ghế.'))
    }
  }, [])

  const fetchHalls = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await axios.get(`${API_BASE_URL}/api/halls`, {
        params: {
          keyword: keyword || undefined,
          cinemaId: cinemaId || undefined,
          status: status || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })

      const data = response.data ?? {}
      setHalls(Array.isArray(data.items) ? data.items : [])
      setPagination({
        page: data.page ?? page,
        pageSize: data.pageSize ?? PAGE_SIZE,
        totalCount: data.totalCount ?? 0,
        totalPages: Math.max(data.totalPages ?? 1, 1),
      })
    } catch (hallError) {
      setHalls([])
      setError(getErrorMessage(hallError, 'Không tải được danh sách phòng chiếu.'))
    } finally {
      setIsLoading(false)
    }
  }, [cinemaId, keyword, page, status])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLookups()
  }, [fetchLookups])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHalls()
  }, [fetchHalls])

  const defaultSeatTypeId = useMemo(
    () => seatTypes[0]?.seatTypeId ?? '',
    [seatTypes],
  )

  const formDefaults = useMemo(
    () => ({
      ...initialForm,
      cinemaId: cinemas[0]?.cinemaId ? String(cinemas[0].cinemaId) : '',
      hallTypeId: hallTypes[0]?.hallTypeId ? String(hallTypes[0].hallTypeId) : '',
      defaultSeatTypeId: defaultSeatTypeId ? String(defaultSeatTypeId) : '',
    }),
    [cinemas, defaultSeatTypeId, hallTypes],
  )

  const shownRange = useMemo(() => {
    if (pagination.totalCount === 0) return '0'

    const start = (pagination.page - 1) * pagination.pageSize + 1
    const end = Math.min(pagination.page * pagination.pageSize, pagination.totalCount)

    return `${start}-${end}`
  }, [pagination])

  const seatRows = useMemo(() => {
    const rows = new Map()

    seats.forEach((seat) => {
      const rowLabel = seat.rowLabel || ''

      if (!rows.has(rowLabel)) {
        rows.set(rowLabel, [])
      }

      rows.get(rowLabel).push(seat)
    })

    return Array.from(rows.entries())
      .sort(([first], [second]) => first.localeCompare(second, 'vi'))
      .map(([rowLabel, rowSeats]) => ({
        rowLabel,
        seats: rowSeats.sort((first, second) => first.colNumber - second.colNumber),
      }))
  }, [seats])

  const selectedSeatIdSet = useMemo(
    () => new Set(selectedSeatIds),
    [selectedSeatIds],
  )

  const selectedSeats = useMemo(
    () => seats.filter((seat) => selectedSeatIdSet.has(seat.seatId)),
    [seats, selectedSeatIdSet],
  )

  const activeSeatCount = useMemo(
    () => seats.filter((seat) => seat.isActive).length,
    [seats],
  )

  const selectedSeatPreview = useMemo(() => {
    if (selectedSeats.length === 0) return '0 ghế'

    const visibleCodes = selectedSeats.slice(0, 8).map((seat) => seat.seatCode)
    const suffix = selectedSeats.length > visibleCodes.length
      ? ` +${selectedSeats.length - visibleCodes.length}`
      : ''

    return `${visibleCodes.join(', ')}${suffix}`
  }, [selectedSeats])

  const getSeatFormForSelection = useCallback((seatIds, sourceSeats = seats) => {
    if (seatIds.length === 0) return initialSeatForm

    const seatIdSet = new Set(seatIds)
    const nextSelectedSeats = sourceSeats.filter((seat) => seatIdSet.has(seat.seatId))
    if (nextSelectedSeats.length === 0) return initialSeatForm

    const firstSeat = nextSelectedSeats[0]
    const sameSeatType = nextSelectedSeats.every((seat) => seat.seatTypeId === firstSeat.seatTypeId)
    const sameActiveState = nextSelectedSeats.every((seat) => seat.isActive === firstSeat.isActive)

    return {
      seatTypeId: sameSeatType ? String(firstSeat.seatTypeId) : '',
      isActive: sameActiveState ? String(firstSeat.isActive) : '',
    }
  }, [seats])

  const openCreateForm = () => {
    setEditingHall(null)
    setForm(formDefaults)
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const openEditForm = (hall) => {
    setEditingHall(hall)
    setForm(toForm(hall, defaultSeatTypeId))
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    if (isSaving) return

    setIsFormOpen(false)
    setEditingHall(null)
    setForm(formDefaults)
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

  const handleSearch = (event) => {
    event.preventDefault()
    setKeyword(keywordInput.trim())
    setPage(1)
  }

  const resetFilters = () => {
    setKeywordInput('')
    setKeyword('')
    setCinemaId('')
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

      if (editingHall) {
        await axios.put(`${API_BASE_URL}/api/halls/${editingHall.hallId}`, payload)
        setNotice('Đã cập nhật phòng chiếu.')
      } else {
        await axios.post(`${API_BASE_URL}/api/halls`, payload)
        setNotice('Đã thêm phòng chiếu mới.')
      }

      closeForm()
      await fetchHalls()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Không lưu được phòng chiếu.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (hall) => {
    const confirmed = window.confirm(`Xóa phòng "${hall.hallName}"?`)
    if (!confirmed) return

    setDeletingId(hall.hallId)
    setError('')
    setNotice('')

    try {
      await axios.delete(`${API_BASE_URL}/api/halls/${hall.hallId}`)
      setNotice('Đã xóa phòng chiếu.')

      if (halls.length === 1 && page > 1) {
        setPage((current) => current - 1)
      } else {
        await fetchHalls()
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Không xóa được phòng chiếu.'))
    } finally {
      setDeletingId(null)
    }
  }

  const openSeatModal = async (hall) => {
    setSeatModalHall(hall)
    setSeats([])
    setSeatsError('')
    setSelectedSeatIds([])
    setSeatForm(initialSeatForm)
    setSeatFormError('')
    setSeatNotice('')
    setIsSeatsLoading(true)

    try {
      const response = await axios.get(`${API_BASE_URL}/api/halls/${hall.hallId}/seats`)
      setSeats(Array.isArray(response.data) ? response.data : [])
    } catch (seatError) {
      setSeatsError(getErrorMessage(seatError, 'Không tải được sơ đồ ghế.'))
    } finally {
      setIsSeatsLoading(false)
    }
  }

  const closeSeatModal = () => {
    if (isSeatSaving) return

    setSeatModalHall(null)
    setSeats([])
    setSeatsError('')
    setSelectedSeatIds([])
    setSeatForm(initialSeatForm)
    setSeatFormError('')
    setSeatNotice('')
  }

  const applySeatSelection = (nextSeatIds) => {
    const uniqueSeatIds = [...new Set(nextSeatIds)]

    setSelectedSeatIds(uniqueSeatIds)
    setSeatForm(getSeatFormForSelection(uniqueSeatIds))
    setSeatFormError('')
    setSeatNotice('')
  }

  const handleSeatClick = (seat) => {
    if (isSeatSaving) return

    const nextSeatIds = selectedSeatIdSet.has(seat.seatId)
      ? selectedSeatIds.filter((seatId) => seatId !== seat.seatId)
      : [...selectedSeatIds, seat.seatId]

    applySeatSelection(nextSeatIds)
  }

  const handleRowSelect = (rowSeats) => {
    if (isSeatSaving) return

    const rowSeatIds = rowSeats.map((seat) => seat.seatId)
    const isWholeRowSelected = rowSeatIds.every((seatId) => selectedSeatIdSet.has(seatId))
    const nextSeatIds = isWholeRowSelected
      ? selectedSeatIds.filter((seatId) => !rowSeatIds.includes(seatId))
      : [...selectedSeatIds, ...rowSeatIds]

    applySeatSelection(nextSeatIds)
  }

  const selectAllSeats = () => {
    if (isSeatSaving) return

    applySeatSelection(seats.map((seat) => seat.seatId))
  }

  const clearSeatSelection = () => {
    if (isSeatSaving) return

    applySeatSelection([])
  }

  const handleSeatTypeChange = (event) => {
    setSeatForm((current) => ({ ...current, seatTypeId: event.target.value }))
    setSeatFormError('')
    setSeatNotice('')
  }

  const handleSeatActiveChange = (event) => {
    setSeatForm((current) => ({ ...current, isActive: event.target.value }))
    setSeatFormError('')
    setSeatNotice('')
  }

  const handleSeatSubmit = async (event) => {
    event.preventDefault()

    if (!seatModalHall) return

    if (selectedSeatIds.length === 0) {
      setSeatFormError('Vui lòng chọn ít nhất một ghế.')
      return
    }

    const seatTypeId = seatForm.seatTypeId ? toInteger(seatForm.seatTypeId) : null
    const isActive = seatForm.isActive ? seatForm.isActive === 'true' : null

    if (seatForm.seatTypeId && (!Number.isInteger(seatTypeId) || seatTypeId <= 0)) {
      setSeatFormError('Vui lòng chọn loại ghế.')
      return
    }

    if (seatTypeId === null && isActive === null) {
      setSeatFormError('Vui lòng chọn loại ghế hoặc trạng thái cần áp dụng.')
      return
    }

    setIsSeatSaving(true)
    setSeatFormError('')
    setSeatNotice('')

    try {
      const response = await axios.put(`${API_BASE_URL}/api/halls/${seatModalHall.hallId}/seats`, {
        seatIds: selectedSeatIds,
        seatTypeId,
        isActive,
      })
      const updatedSeats = Array.isArray(response.data) ? response.data : []
      const updatedSeatMap = new Map(updatedSeats.map((seat) => [seat.seatId, seat]))
      const nextSeats = seats.map((seat) => updatedSeatMap.get(seat.seatId) ?? seat)

      setSeats(nextSeats)
      setSeatForm(getSeatFormForSelection(selectedSeatIds, nextSeats))
      setSeatNotice(`Đã cập nhật ${updatedSeats.length} ghế.`)
      await fetchHalls()
    } catch (seatError) {
      setSeatFormError(getErrorMessage(seatError, 'Không cập nhật được ghế.'))
    } finally {
      setIsSeatSaving(false)
    }
  }

  return (
    <section className="admin-page halls-page" aria-label="Quản lý phòng chiếu">
      <div className="page-surface movies-surface halls-surface">
        <div className="movies-toolbar">
          <div>
            <p className="section-kicker">Danh sách phòng</p>
            <h2>Quản lý phòng chiếu</h2>
            <p className="section-subtitle">
              Hiển thị {shownRange} trong {pagination.totalCount} phòng
            </p>
          </div>

          <button className="primary-button" type="button" onClick={openCreateForm}>
            <Icon name="plus" />
            Thêm phòng
          </button>
        </div>

        <form className="halls-filters" onSubmit={handleSearch}>
          <label className="search-field">
            <Icon name="search" className="field-icon" />
            <input
              type="search"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="Tìm theo tên phòng hoặc rạp"
              aria-label="Tìm kiếm phòng chiếu"
            />
          </label>

          <select
            value={cinemaId}
            onChange={(event) => {
              setCinemaId(event.target.value)
              setPage(1)
            }}
            aria-label="Lọc rạp"
          >
            <option value="">Tất cả rạp</option>
            {cinemas.map((cinema) => (
              <option key={cinema.cinemaId} value={cinema.cinemaId}>
                {cinema.cinemaName}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            aria-label="Lọc trạng thái phòng"
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
          <table className="movies-table halls-table">
            <thead>
              <tr>
                <th>Phòng</th>
                <th>Loại</th>
                <th>Sơ đồ</th>
                <th>Ghế</th>
                <th>Trạng thái</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="table-state">
                    Đang tải danh sách phòng chiếu...
                  </td>
                </tr>
              ) : halls.length > 0 ? (
                halls.map((hall) => (
                  <tr key={hall.hallId}>
                    <td>
                      <div className="hall-cell">
                        <div className="hall-thumb">
                          <Icon name="halls" />
                        </div>
                        <div>
                          <strong>{hall.hallName || hall.name}</strong>
                          <span>{hall.cinemaName || 'Chưa có rạp'}</span>
                          <small>{hall.cinemaCity || 'Chưa có thành phố'}</small>
                        </div>
                      </div>
                    </td>
                    <td>{hall.hallTypeName || 'Chưa có loại'}</td>
                    <td>
                      <strong>
                        {hall.totalRows} x {hall.totalCols}
                      </strong>
                      <span className="muted-cell">{hall.totalSeats} ghế</span>
                    </td>
                    <td>
                      <strong>
                        {hall.activeSeatCount}/{hall.totalSeats}
                      </strong>
                      <span className="muted-cell">Đang dùng</span>
                    </td>
                    <td>
                      <span className={`status-badge status-${hall.status || 'unknown'}`}>
                        {getStatusLabel(hall.status)}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button table-action"
                          type="button"
                          onClick={() => openSeatModal(hall)}
                          aria-label={`Xem sơ đồ ghế ${hall.hallName}`}
                          title="Xem sơ đồ ghế"
                        >
                          <Icon name="halls" />
                        </button>
                        <button
                          className="icon-button table-action"
                          type="button"
                          onClick={() => openEditForm(hall)}
                          aria-label={`Sửa phòng ${hall.hallName}`}
                          title="Sửa phòng"
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          className="icon-button table-action danger"
                          type="button"
                          onClick={() => handleDelete(hall)}
                          disabled={deletingId === hall.hallId}
                          aria-label={`Xóa phòng ${hall.hallName}`}
                          title="Xóa phòng"
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
                    Chưa có phòng chiếu phù hợp.
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
          <section className="modal-panel hall-form-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="section-kicker">{editingHall ? 'Sửa phòng' : 'Thêm phòng'}</p>
                <h2>{editingHall ? editingHall.hallName : 'Phòng chiếu mới'}</h2>
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
                  <span>Tên phòng</span>
                  <input name="hallName" value={form.hallName} onChange={handleFieldChange} />
                  {formErrors.hallName ? <em>{formErrors.hallName}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Loại phòng</span>
                  <select name="hallTypeId" value={form.hallTypeId} onChange={handleFieldChange}>
                    <option value="">Chọn loại phòng</option>
                    {hallTypes.map((hallType) => (
                      <option key={hallType.hallTypeId} value={hallType.hallTypeId}>
                        {hallType.typeName}
                      </option>
                    ))}
                  </select>
                  {formErrors.hallTypeId ? <em>{formErrors.hallTypeId}</em> : null}
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
                  <span>Số hàng</span>
                  <input
                    name="totalRows"
                    type="number"
                    min="1"
                    max="26"
                    value={form.totalRows}
                    onChange={handleFieldChange}
                  />
                  {formErrors.totalRows ? <em>{formErrors.totalRows}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Số cột</span>
                  <input
                    name="totalCols"
                    type="number"
                    min="1"
                    max="50"
                    value={form.totalCols}
                    onChange={handleFieldChange}
                  />
                  {formErrors.totalCols ? <em>{formErrors.totalCols}</em> : null}
                </label>

                <label className="form-field required wide">
                  <span>Loại ghế mặc định</span>
                  <select
                    name="defaultSeatTypeId"
                    value={form.defaultSeatTypeId}
                    onChange={handleFieldChange}
                  >
                    <option value="">Chọn loại ghế</option>
                    {seatTypes.map((seatType) => (
                      <option key={seatType.seatTypeId} value={seatType.seatTypeId}>
                        {seatType.typeName}
                      </option>
                    ))}
                  </select>
                  {formErrors.defaultSeatTypeId ? <em>{formErrors.defaultSeatTypeId}</em> : null}
                </label>
              </div>

              <div className="form-actions">
                <button className="ghost-button" type="button" onClick={closeForm} disabled={isSaving}>
                  Hủy
                </button>
                <button className="primary-button" type="submit" disabled={isSaving}>
                  <Icon name="save" />
                  {isSaving ? 'Đang lưu...' : 'Lưu phòng'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {seatModalHall ? (
        <div className="modal-backdrop">
          <section className="modal-panel hall-seats-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="section-kicker">Sơ đồ ghế</p>
                <h2>{seatModalHall.hallName}</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeSeatModal}
                disabled={isSeatSaving}
                aria-label="Đóng sơ đồ ghế"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="hall-seat-content">
              {seatsError ? <div className="alert alert-error">{seatsError}</div> : null}

              {isSeatsLoading ? (
                <div className="table-state">Đang tải sơ đồ ghế...</div>
              ) : (
                <>
                  <div className="seat-summary">
                    <span>{seatModalHall.totalRows} hàng</span>
                    <span>{seatModalHall.totalCols} cột</span>
                    <span>{activeSeatCount}/{seatModalHall.totalSeats} ghế đang dùng</span>
                  </div>

                  <div className="seat-legend">
                    {seatTypes.map((seatType) => (
                      <span className="seat-legend-item" key={seatType.seatTypeId}>
                        <span className={`seat-chip seat-type-${seatType.seatTypeId}`} />
                        {seatType.typeName}
                      </span>
                    ))}
                    <span className="seat-legend-item">
                      <span className="seat-chip seat-disabled" />
                      Ngưng dùng
                    </span>
                  </div>

                  <div className="seat-tools">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={selectAllSeats}
                      disabled={seats.length === 0 || isSeatSaving}
                    >
                      Chọn tất cả
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={clearSeatSelection}
                      disabled={selectedSeats.length === 0 || isSeatSaving}
                    >
                      Bỏ chọn
                    </button>
                    <span className="seat-selection-count">{selectedSeats.length} ghế đã chọn</span>
                  </div>

                  <div className="screen-bar">Màn hình</div>

                  <div className="seat-editor-layout">
                    <div className="seat-map-wrap">
                      <div className="seat-map">
                        {seatRows.length > 0 ? (
                          seatRows.map((row) => (
                            <div
                              className="seat-row"
                              key={row.rowLabel}
                              style={{
                                gridTemplateColumns: `38px repeat(${seatModalHall.totalCols}, minmax(34px, 1fr))`,
                              }}
                            >
                              <button
                                className={`seat-row-label ${
                                  row.seats.every((seat) => selectedSeatIdSet.has(seat.seatId))
                                    ? 'is-selected'
                                    : ''
                                }`}
                                type="button"
                                onClick={() => handleRowSelect(row.seats)}
                                disabled={isSeatSaving}
                                title={`Chọn hàng ${row.rowLabel}`}
                                aria-label={`Chọn hàng ${row.rowLabel}`}
                              >
                                {row.rowLabel}
                              </button>
                              {row.seats.map((seat) => (
                                <button
                                  className={`seat-cell seat-type-${seat.seatTypeId} ${
                                    seat.isActive ? '' : 'seat-disabled'
                                  } ${selectedSeatIdSet.has(seat.seatId) ? 'is-selected' : ''}`}
                                  key={seat.seatId}
                                  type="button"
                                  onClick={() => handleSeatClick(seat)}
                                  title={`${seat.seatCode} - ${seat.seatTypeName || 'Ghế'}`}
                                  disabled={isSeatSaving}
                                  aria-pressed={selectedSeatIdSet.has(seat.seatId)}
                                >
                                  {seat.seatCode}
                                </button>
                              ))}
                            </div>
                          ))
                        ) : (
                          <div className="table-state">Chưa có ghế cho phòng này.</div>
                        )}
                      </div>
                    </div>

                    <form className="seat-editor-panel" onSubmit={handleSeatSubmit}>
                      <div>
                        <p className="section-kicker">Thiết lập hàng loạt</p>
                        <h3>{selectedSeats.length} ghế</h3>
                        <p>{selectedSeatPreview}</p>
                      </div>

                      {seatFormError ? <div className="alert alert-error">{seatFormError}</div> : null}
                      {seatNotice ? <div className="alert alert-success">{seatNotice}</div> : null}

                      <label className="form-field">
                        <span>Loại ghế</span>
                        <select
                          value={seatForm.seatTypeId}
                          onChange={handleSeatTypeChange}
                          disabled={selectedSeats.length === 0 || isSeatSaving}
                        >
                          <option value="">Giữ nguyên loại ghế</option>
                          {seatTypes.map((seatType) => (
                            <option key={seatType.seatTypeId} value={seatType.seatTypeId}>
                              {seatType.typeName}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="form-field">
                        <span>Trạng thái</span>
                        <select
                          value={seatForm.isActive}
                          onChange={handleSeatActiveChange}
                          disabled={selectedSeats.length === 0 || isSeatSaving}
                        >
                          <option value="">Giữ nguyên trạng thái</option>
                          <option value="true">Đang dùng</option>
                          <option value="false">Ngưng dùng</option>
                        </select>
                      </label>

                      <button
                        className="primary-button"
                        type="submit"
                        disabled={selectedSeats.length === 0 || isSeatSaving}
                      >
                        <Icon name="save" />
                        {isSeatSaving ? 'Đang lưu...' : 'Áp dụng'}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

export default Halls
