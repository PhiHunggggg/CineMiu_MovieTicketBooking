import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../../components/Icon'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001'
const PAGE_SIZE = 8

const activeOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'true', label: 'Đang hoạt động' },
  { value: 'false', label: 'Tạm ngưng' },
]

const initialForm = {
  chainId: '',
  cinemaName: '',
  address: '',
  city: '',
  ward: '',
  phone: '',
  email: '',
  mapUrl: '',
  imageUrl: '',
  isActive: true,
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data

  if (typeof data === 'string') return data

  return data?.message || data?.title || error?.message || fallback
}

function optionalText(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed || null
}

function getActiveLabel(value) {
  return value ? 'Đang hoạt động' : 'Tạm ngưng'
}

function toForm(cinema) {
  return {
    chainId: cinema.chainId ?? '',
    cinemaName: cinema.cinemaName ?? '',
    address: cinema.address ?? '',
    city: cinema.city ?? '',
    ward: cinema.ward ?? cinema.district ?? '',
    phone: cinema.phone ?? '',
    email: cinema.email ?? '',
    mapUrl: cinema.mapUrl ?? '',
    imageUrl: cinema.imageUrl ?? '',
    isActive: Boolean(cinema.isActive),
  }
}

function buildPayload(form) {
  return {
    chainId: Number(form.chainId),
    cinemaName: form.cinemaName.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    ward: optionalText(form.ward),
    phone: optionalText(form.phone),
    email: optionalText(form.email),
    mapUrl: optionalText(form.mapUrl),
    imageUrl: optionalText(form.imageUrl),
    isActive: Boolean(form.isActive),
  }
}

function validateForm(form) {
  const errors = {}
  const chainId = Number(form.chainId)

  if (!Number.isInteger(chainId) || chainId <= 0) {
    errors.chainId = 'Vui lòng chọn chuỗi rạp.'
  }

  if (!form.cinemaName.trim()) {
    errors.cinemaName = 'Vui lòng nhập tên rạp.'
  }

  if (!form.address.trim()) {
    errors.address = 'Vui lòng nhập địa chỉ.'
  }

  if (!form.city.trim()) {
    errors.city = 'Vui lòng nhập thành phố.'
  }

  return errors
}

function Cinemas() {
  const [cinemas, setCinemas] = useState([])
  const [chains, setChains] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
  })
  const [page, setPage] = useState(1)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCinema, setEditingCinema] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const fetchChains = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/cinemas/chains`)
      const items = Array.isArray(response.data) ? response.data : []
      setChains(items)
      setForm((current) => {
        if (current.chainId || items.length === 0) return current
        return { ...current, chainId: String(items[0].chainId) }
      })
    } catch (chainError) {
      setChains([])
      setError(getErrorMessage(chainError, 'Không tải được danh sách chuỗi rạp.'))
    }
  }, [])

  const fetchCinemas = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await axios.get(`${API_BASE_URL}/api/cinemas`, {
        params: {
          keyword: keyword || undefined,
          isActive: isActiveFilter || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })

      const data = response.data ?? {}
      setCinemas(Array.isArray(data.items) ? data.items : [])
      setPagination({
        page: data.page ?? page,
        pageSize: data.pageSize ?? PAGE_SIZE,
        totalCount: data.totalCount ?? 0,
        totalPages: Math.max(data.totalPages ?? 1, 1),
      })
    } catch (cinemaError) {
      setCinemas([])
      setError(getErrorMessage(cinemaError, 'Không tải được danh sách rạp.'))
    } finally {
      setIsLoading(false)
    }
  }, [isActiveFilter, keyword, page])

  useEffect(() => {
    fetchChains()
  }, [fetchChains])

  useEffect(() => {
    fetchCinemas()
  }, [fetchCinemas])

  const shownRange = useMemo(() => {
    if (pagination.totalCount === 0) return '0'

    const start = (pagination.page - 1) * pagination.pageSize + 1
    const end = Math.min(pagination.page * pagination.pageSize, pagination.totalCount)

    return `${start}-${end}`
  }, [pagination])

  const formDefaults = useMemo(
    () => ({
      ...initialForm,
      chainId: chains.length > 0 ? String(chains[0].chainId) : '',
    }),
    [chains],
  )

  const openCreateForm = () => {
    setEditingCinema(null)
    setForm(formDefaults)
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const openEditForm = (cinema) => {
    setEditingCinema(cinema)
    setForm(toForm(cinema))
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    if (isSaving) return

    setIsFormOpen(false)
    setEditingCinema(null)
    setForm(formDefaults)
    setFormErrors({})
  }

  const handleFieldChange = (event) => {
    const { checked, name, type, value } = event.target
    const nextValue = type === 'checkbox' ? checked : value

    setForm((current) => ({ ...current, [name]: nextValue }))
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
    setIsActiveFilter('')
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

      if (editingCinema) {
        await axios.put(`${API_BASE_URL}/api/cinemas/${editingCinema.cinemaId}`, payload)
        setNotice('Đã cập nhật rạp.')
      } else {
        await axios.post(`${API_BASE_URL}/api/cinemas`, payload)
        setNotice('Đã thêm rạp mới.')
      }

      closeForm()
      await fetchCinemas()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Không lưu được rạp.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (cinema) => {
    const confirmed = window.confirm(`Xóa rạp "${cinema.cinemaName}"?`)
    if (!confirmed) return

    setDeletingId(cinema.cinemaId)
    setError('')
    setNotice('')

    try {
      await axios.delete(`${API_BASE_URL}/api/cinemas/${cinema.cinemaId}`)
      setNotice('Đã xóa rạp.')

      if (cinemas.length === 1 && page > 1) {
        setPage((current) => current - 1)
      } else {
        await fetchCinemas()
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Không xóa được rạp.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="admin-page cinemas-page" aria-label="Quản lý rạp">
      <div className="page-surface movies-surface">
        <div className="movies-toolbar">
          <div>
            <p className="section-kicker">Danh sách rạp</p>
            <h2>Quản lý rạp</h2>
            <p className="section-subtitle">
              Hiển thị {shownRange} trong {pagination.totalCount} rạp
            </p>
          </div>

          <button className="primary-button" type="button" onClick={openCreateForm}>
            <Icon name="plus" />
            Thêm rạp
          </button>
        </div>

        <form className="cinemas-filters" onSubmit={handleSearch}>
          <label className="search-field">
            <Icon name="search" className="field-icon" />
            <input
              type="search"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="Tìm theo tên, địa chỉ"
              aria-label="Tìm kiếm rạp"
            />
          </label>

          <select
            value={isActiveFilter}
            onChange={(event) => {
              setIsActiveFilter(event.target.value)
              setPage(1)
            }}
            aria-label="Lọc trạng thái rạp"
          >
            {activeOptions.map((option) => (
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
          <table className="movies-table cinemas-table">
            <thead>
              <tr>
                <th>Rạp</th>
                <th>Thành phố</th>
                <th>Liên hệ</th>
                <th>Trạng thái</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="table-state">
                    Đang tải danh sách rạp...
                  </td>
                </tr>
              ) : cinemas.length > 0 ? (
                cinemas.map((cinema) => (
                  <tr key={cinema.cinemaId}>
                    <td>
                      <div className="cinema-cell">
                        <div className="cinema-thumb">
                          {cinema.imageUrl ? (
                            <img src={cinema.imageUrl} alt="" />
                          ) : (
                            <Icon name="cinemas" />
                          )}
                        </div>
                        <div>
                          <strong>{cinema.cinemaName}</strong>
                          <span>{cinema.address}</span>
                          <small>{cinema.chainName || 'Chưa có chuỗi rạp'}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{cinema.city}</strong>
                      <span className="muted-cell">{cinema.ward ?? cinema.district ?? 'Chưa có xã/phường'}</span>
                    </td>
                    <td>
                      <strong>{cinema.phone || 'Chưa có SĐT'}</strong>
                      <span className="muted-cell">{cinema.email || 'Chưa có email'}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${cinema.isActive ? 'status-active' : 'status-inactive'}`}>
                        {getActiveLabel(cinema.isActive)}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button table-action"
                          type="button"
                          onClick={() => openEditForm(cinema)}
                          aria-label={`Sửa rạp ${cinema.cinemaName}`}
                          title="Sửa rạp"
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          className="icon-button table-action danger"
                          type="button"
                          onClick={() => handleDelete(cinema)}
                          disabled={deletingId === cinema.cinemaId}
                          aria-label={`Xóa rạp ${cinema.cinemaName}`}
                          title="Xóa rạp"
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="table-state">
                    Chưa có rạp phù hợp.
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
          <section className="modal-panel cinema-form-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="section-kicker">{editingCinema ? 'Sửa rạp' : 'Thêm rạp'}</p>
                <h2>{editingCinema ? editingCinema.cinemaName : 'Rạp mới'}</h2>
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
                  <span>Tên rạp</span>
                  <input name="cinemaName" value={form.cinemaName} onChange={handleFieldChange} />
                  {formErrors.cinemaName ? <em>{formErrors.cinemaName}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Chuỗi rạp</span>
                  <select name="chainId" value={form.chainId} onChange={handleFieldChange}>
                    <option value="">Chọn chuỗi rạp</option>
                    {chains.map((chain) => (
                      <option key={chain.chainId} value={chain.chainId}>
                        {chain.chainName}
                      </option>
                    ))}
                  </select>
                  {formErrors.chainId ? <em>{formErrors.chainId}</em> : null}
                </label>

                <label className="form-field required wide">
                  <span>Địa chỉ</span>
                  <input name="address" value={form.address} onChange={handleFieldChange} />
                  {formErrors.address ? <em>{formErrors.address}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Thành phố</span>
                  <input name="city" value={form.city} onChange={handleFieldChange} />
                  {formErrors.city ? <em>{formErrors.city}</em> : null}
                </label>

                <label className="form-field">
                  <span>Xã/Phường</span>
                  <input name="ward" value={form.ward} onChange={handleFieldChange} />
                </label>

                <label className="form-field">
                  <span>Số điện thoại</span>
                  <input name="phone" value={form.phone} onChange={handleFieldChange} />
                </label>

                <label className="form-field">
                  <span>Email</span>
                  <input name="email" type="email" value={form.email} onChange={handleFieldChange} />
                </label>

                <label className="form-field checkbox-field wide">
                  <input
                    name="isActive"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={handleFieldChange}
                  />
                  <span>Đang hoạt động</span>
                </label>

                <label className="form-field wide">
                  <span>Map URL</span>
                  <input name="mapUrl" value={form.mapUrl} onChange={handleFieldChange} />
                </label>

                <label className="form-field wide">
                  <span>Image URL</span>
                  <input name="imageUrl" value={form.imageUrl} onChange={handleFieldChange} />
                </label>
              </div>

              <div className="form-actions">
                <button className="ghost-button" type="button" onClick={closeForm} disabled={isSaving}>
                  Hủy
                </button>
                <button className="primary-button" type="submit" disabled={isSaving}>
                  <Icon name="save" />
                  {isSaving ? 'Đang lưu...' : 'Lưu rạp'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

export default Cinemas
