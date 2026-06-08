import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../../components/Icon'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001'
const PAGE_SIZE = 8

const activeOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'true', label: 'Đang bật' },
  { value: 'false', label: 'Tạm ngưng' },
]

const discountTypeOptions = [
  { value: '', label: 'Tất cả loại giảm' },
  { value: 'percent', label: 'Theo phần trăm' },
  { value: 'fixed', label: 'Số tiền cố định' },
]

function getErrorMessage(error, fallback) {
  const data = error?.response?.data

  if (typeof data === 'string') return data

  return data?.message || data?.title || error?.message || fallback
}

function optionalText(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed || null
}

function optionalNumber(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed ? Number(trimmed) : null
}

function optionalInteger(value) {
  const number = optionalNumber(value)
  return number === null ? null : Math.trunc(number)
}

function toDateTimeInput(value) {
  if (!value) return ''

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 16)
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

function createInitialForm() {
  const validFrom = new Date()
  const validTo = new Date(validFrom)
  validTo.setDate(validTo.getDate() + 30)

  return {
    promoCode: '',
    description: '',
    discountType: 'percent',
    discountValue: '',
    minOrderAmt: '0',
    maxDiscount: '',
    usageLimit: '',
    perUserLimit: '1',
    validFrom: toDateTimeInput(validFrom),
    validTo: toDateTimeInput(validTo),
    isActive: true,
  }
}

function formatDateTime(value) {
  if (!value) return 'Chưa đặt'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chưa đặt'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    currency: 'VND',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(value ?? 0))
}

function formatDiscount(voucher) {
  if (voucher.discountType === 'percent') {
    return `${Number(voucher.discountValue ?? 0).toLocaleString('vi-VN')}%`
  }

  return formatCurrency(voucher.discountValue)
}

function formatUsage(voucher) {
  if (voucher.usageLimit === null || voucher.usageLimit === undefined) {
    return `${voucher.totalUses ?? 0} / Không giới hạn`
  }

  return `${voucher.totalUses ?? 0} / ${voucher.usageLimit}`
}

function getVoucherStatus(voucher) {
  const now = new Date()
  const validFrom = new Date(voucher.validFrom)
  const validTo = new Date(voucher.validTo)

  if (!voucher.isActive) {
    return { className: 'status-inactive', label: 'Tạm ngưng' }
  }

  if (voucher.isExhausted) {
    return { className: 'status-exhausted', label: 'Hết lượt' }
  }

  if (!Number.isNaN(validFrom.getTime()) && validFrom > now) {
    return { className: 'status-upcoming', label: 'Sắp hiệu lực' }
  }

  if (voucher.isExpired || (!Number.isNaN(validTo.getTime()) && validTo < now)) {
    return { className: 'status-expired', label: 'Hết hạn' }
  }

  return { className: 'status-active', label: 'Đang bật' }
}

function toForm(voucher) {
  return {
    promoCode: voucher.promoCode ?? '',
    description: voucher.description ?? '',
    discountType: voucher.discountType ?? 'percent',
    discountValue: voucher.discountValue ?? '',
    minOrderAmt: voucher.minOrderAmt ?? '0',
    maxDiscount: voucher.maxDiscount ?? '',
    usageLimit: voucher.usageLimit ?? '',
    perUserLimit: voucher.perUserLimit ?? '1',
    validFrom: toDateTimeInput(voucher.validFrom),
    validTo: toDateTimeInput(voucher.validTo),
    isActive: Boolean(voucher.isActive),
  }
}

function buildPayload(form) {
  return {
    promoCode: form.promoCode.trim().toUpperCase(),
    description: optionalText(form.description),
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    minOrderAmt: Number(form.minOrderAmt),
    maxDiscount: form.discountType === 'percent' ? optionalNumber(form.maxDiscount) : null,
    usageLimit: optionalInteger(form.usageLimit),
    perUserLimit: Number(form.perUserLimit),
    validFrom: new Date(form.validFrom).toISOString(),
    validTo: new Date(form.validTo).toISOString(),
    isActive: Boolean(form.isActive),
  }
}

function validateForm(form, editingVoucher) {
  const errors = {}
  const promoCode = form.promoCode.trim().toUpperCase()
  const discountValue = Number(form.discountValue)
  const minOrderAmt = Number(form.minOrderAmt)
  const maxDiscount = optionalNumber(form.maxDiscount)
  const usageLimit = optionalInteger(form.usageLimit)
  const perUserLimit = Number(form.perUserLimit)
  const validFrom = new Date(form.validFrom)
  const validTo = new Date(form.validTo)

  if (!/^[A-Z0-9_-]{3,64}$/.test(promoCode)) {
    errors.promoCode = 'Mã voucher cần 3-64 ký tự, chỉ gồm chữ, số, dấu - hoặc _.'
  }

  if (!['percent', 'fixed'].includes(form.discountType)) {
    errors.discountType = 'Vui lòng chọn loại giảm giá.'
  }

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    errors.discountValue = 'Giá trị giảm phải lớn hơn 0.'
  } else if (form.discountType === 'percent' && discountValue > 100) {
    errors.discountValue = 'Giảm theo phần trăm không được vượt quá 100%.'
  }

  if (!Number.isFinite(minOrderAmt) || minOrderAmt < 0) {
    errors.minOrderAmt = 'Đơn tối thiểu không được âm.'
  }

  if (form.discountType === 'percent' && maxDiscount !== null && (!Number.isFinite(maxDiscount) || maxDiscount <= 0)) {
    errors.maxDiscount = 'Trần giảm phải lớn hơn 0.'
  }

  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit <= 0)) {
    errors.usageLimit = 'Giới hạn lượt phải là số nguyên dương.'
  } else if (usageLimit !== null && editingVoucher && usageLimit < Number(editingVoucher.totalUses ?? 0)) {
    errors.usageLimit = 'Giới hạn lượt không được nhỏ hơn số lượt đã dùng.'
  }

  if (!Number.isInteger(perUserLimit) || perUserLimit <= 0 || perUserLimit > 255) {
    errors.perUserLimit = 'Giới hạn mỗi user phải từ 1 đến 255.'
  }

  if (!form.validFrom || Number.isNaN(validFrom.getTime())) {
    errors.validFrom = 'Vui lòng chọn ngày bắt đầu.'
  }

  if (!form.validTo || Number.isNaN(validTo.getTime())) {
    errors.validTo = 'Vui lòng chọn ngày kết thúc.'
  } else if (!Number.isNaN(validFrom.getTime()) && validTo <= validFrom) {
    errors.validTo = 'Ngày kết thúc phải sau ngày bắt đầu.'
  }

  return errors
}

function Vouchers() {
  const [vouchers, setVouchers] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
  })
  const [page, setPage] = useState(1)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [discountTypeFilter, setDiscountTypeFilter] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState(null)
  const [form, setForm] = useState(createInitialForm)
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await axios.get(`${API_BASE_URL}/api/promotions`, {
        params: {
          keyword: keyword || undefined,
          discountType: discountTypeFilter || undefined,
          isActive: isActiveFilter || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })

      const data = response.data ?? {}
      setVouchers(Array.isArray(data.items) ? data.items : [])
      setPagination({
        page: data.page ?? page,
        pageSize: data.pageSize ?? PAGE_SIZE,
        totalCount: data.totalCount ?? 0,
        totalPages: Math.max(data.totalPages ?? 1, 1),
      })
    } catch (voucherError) {
      setVouchers([])
      setError(getErrorMessage(voucherError, 'Không tải được danh sách voucher.'))
    } finally {
      setIsLoading(false)
    }
  }, [discountTypeFilter, isActiveFilter, keyword, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVouchers()
  }, [fetchVouchers])

  const shownRange = useMemo(() => {
    if (pagination.totalCount === 0) return '0'

    const start = (pagination.page - 1) * pagination.pageSize + 1
    const end = Math.min(pagination.page * pagination.pageSize, pagination.totalCount)

    return `${start}-${end}`
  }, [pagination])

  const openCreateForm = () => {
    setEditingVoucher(null)
    setForm(createInitialForm())
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const openEditForm = (voucher) => {
    setEditingVoucher(voucher)
    setForm(toForm(voucher))
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    if (isSaving) return

    setIsFormOpen(false)
    setEditingVoucher(null)
    setForm(createInitialForm())
    setFormErrors({})
  }

  const handleFieldChange = (event) => {
    const { checked, name, type, value } = event.target
    const nextValue = type === 'checkbox' ? checked : value

    setForm((current) => ({
      ...current,
      [name]: nextValue,
      ...(name === 'discountType' && nextValue === 'fixed' ? { maxDiscount: '' } : {}),
    }))
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
    setDiscountTypeFilter('')
    setIsActiveFilter('')
    setPage(1)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateForm(form, editingVoucher)

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    setIsSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = buildPayload(form)

      if (editingVoucher) {
        await axios.put(`${API_BASE_URL}/api/promotions/${editingVoucher.promoId}`, payload)
        setNotice('Đã cập nhật voucher.')
      } else {
        await axios.post(`${API_BASE_URL}/api/promotions`, payload)
        setNotice('Đã thêm voucher mới.')
      }

      closeForm()
      await fetchVouchers()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Không lưu được voucher.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (voucher) => {
    const confirmed = window.confirm(`Xóa hoặc tạm ngưng voucher "${voucher.promoCode}"?`)
    if (!confirmed) return

    setDeletingId(voucher.promoId)
    setError('')
    setNotice('')

    try {
      await axios.delete(`${API_BASE_URL}/api/promotions/${voucher.promoId}`)
      setNotice('Đã xóa hoặc tạm ngưng voucher.')

      if (vouchers.length === 1 && page > 1) {
        setPage((current) => current - 1)
      } else {
        await fetchVouchers()
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Không xử lý được voucher.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="admin-page vouchers-page" aria-label="Quản lý voucher">
      <div className="page-surface movies-surface">
        <div className="movies-toolbar">
          <div>
            <p className="section-kicker">Danh sách voucher</p>
            <h2>Quản lý voucher</h2>
            <p className="section-subtitle">
              Hiển thị {shownRange} trong {pagination.totalCount} voucher
            </p>
          </div>

          <button className="primary-button" type="button" onClick={openCreateForm}>
            <Icon name="plus" />
            Thêm voucher
          </button>
        </div>

        <form className="vouchers-filters" onSubmit={handleSearch}>
          <label className="search-field">
            <Icon name="search" className="field-icon" />
            <input
              type="search"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="Tìm theo mã, mô tả"
              aria-label="Tìm kiếm voucher"
            />
          </label>

          <select
            value={discountTypeFilter}
            onChange={(event) => {
              setDiscountTypeFilter(event.target.value)
              setPage(1)
            }}
            aria-label="Lọc loại giảm giá"
          >
            {discountTypeOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={isActiveFilter}
            onChange={(event) => {
              setIsActiveFilter(event.target.value)
              setPage(1)
            }}
            aria-label="Lọc trạng thái voucher"
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
          <table className="movies-table vouchers-table">
            <thead>
              <tr>
                <th>Voucher</th>
                <th>Giảm giá</th>
                <th>Điều kiện</th>
                <th>Lượt dùng</th>
                <th>Hiệu lực</th>
                <th>Trạng thái</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="table-state">
                    Đang tải danh sách voucher...
                  </td>
                </tr>
              ) : vouchers.length > 0 ? (
                vouchers.map((voucher) => {
                  const status = getVoucherStatus(voucher)

                  return (
                    <tr key={voucher.promoId}>
                      <td>
                        <div className="voucher-code-cell">
                          <strong>{voucher.promoCode}</strong>
                          <span>{voucher.description || 'Chưa có mô tả'}</span>
                        </div>
                      </td>
                      <td>
                        <strong>{formatDiscount(voucher)}</strong>
                        <span className="muted-cell">
                          {voucher.discountType === 'percent' ? 'Theo phần trăm' : 'Số tiền cố định'}
                        </span>
                      </td>
                      <td>
                        <strong>Từ {formatCurrency(voucher.minOrderAmt)}</strong>
                        <span className="muted-cell">
                          Trần: {voucher.maxDiscount ? formatCurrency(voucher.maxDiscount) : 'Không đặt'}
                        </span>
                      </td>
                      <td>
                        <strong>{formatUsage(voucher)}</strong>
                        <span className="muted-cell">Mỗi user: {voucher.perUserLimit} lượt</span>
                      </td>
                      <td>
                        <strong>{formatDateTime(voucher.validFrom)}</strong>
                        <span className="muted-cell">{formatDateTime(voucher.validTo)}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${status.className}`}>{status.label}</span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button table-action"
                            type="button"
                            onClick={() => openEditForm(voucher)}
                            aria-label={`Sửa voucher ${voucher.promoCode}`}
                            title="Sửa voucher"
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            className="icon-button table-action danger"
                            type="button"
                            onClick={() => handleDelete(voucher)}
                            disabled={deletingId === voucher.promoId}
                            aria-label={`Xóa hoặc tạm ngưng voucher ${voucher.promoCode}`}
                            title="Xóa hoặc tạm ngưng voucher"
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
                  <td colSpan="7" className="table-state">
                    Chưa có voucher phù hợp.
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
          <section className="modal-panel voucher-form-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="section-kicker">{editingVoucher ? 'Sửa voucher' : 'Thêm voucher'}</p>
                <h2>{editingVoucher ? editingVoucher.promoCode : 'Voucher mới'}</h2>
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
                  <span>Mã voucher</span>
                  <input name="promoCode" value={form.promoCode} onChange={handleFieldChange} />
                  {formErrors.promoCode ? <em>{formErrors.promoCode}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Loại giảm</span>
                  <select name="discountType" value={form.discountType} onChange={handleFieldChange}>
                    {discountTypeOptions
                      .filter((option) => option.value)
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                  {formErrors.discountType ? <em>{formErrors.discountType}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Giá trị giảm</span>
                  <input
                    name="discountValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discountValue}
                    onChange={handleFieldChange}
                  />
                  {formErrors.discountValue ? <em>{formErrors.discountValue}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Đơn tối thiểu</span>
                  <input
                    name="minOrderAmt"
                    type="number"
                    min="0"
                    step="1000"
                    value={form.minOrderAmt}
                    onChange={handleFieldChange}
                  />
                  {formErrors.minOrderAmt ? <em>{formErrors.minOrderAmt}</em> : null}
                </label>

                <label className="form-field">
                  <span>Trần giảm</span>
                  <input
                    name="maxDiscount"
                    type="number"
                    min="0"
                    step="1000"
                    value={form.maxDiscount}
                    onChange={handleFieldChange}
                    disabled={form.discountType !== 'percent'}
                  />
                  {formErrors.maxDiscount ? <em>{formErrors.maxDiscount}</em> : null}
                </label>

                <label className="form-field">
                  <span>Giới hạn lượt</span>
                  <input
                    name="usageLimit"
                    type="number"
                    min="1"
                    value={form.usageLimit}
                    onChange={handleFieldChange}
                  />
                  {formErrors.usageLimit ? <em>{formErrors.usageLimit}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Mỗi user</span>
                  <input
                    name="perUserLimit"
                    type="number"
                    min="1"
                    max="255"
                    value={form.perUserLimit}
                    onChange={handleFieldChange}
                  />
                  {formErrors.perUserLimit ? <em>{formErrors.perUserLimit}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Bắt đầu</span>
                  <input
                    name="validFrom"
                    type="datetime-local"
                    value={form.validFrom}
                    onChange={handleFieldChange}
                  />
                  {formErrors.validFrom ? <em>{formErrors.validFrom}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Kết thúc</span>
                  <input name="validTo" type="datetime-local" value={form.validTo} onChange={handleFieldChange} />
                  {formErrors.validTo ? <em>{formErrors.validTo}</em> : null}
                </label>

                <label className="form-field checkbox-field">
                  <input name="isActive" type="checkbox" checked={form.isActive} onChange={handleFieldChange} />
                  <span>Đang bật</span>
                </label>

                <label className="form-field wide">
                  <span>Mô tả</span>
                  <textarea name="description" rows="4" value={form.description} onChange={handleFieldChange} />
                </label>
              </div>

              <div className="form-actions">
                <button className="ghost-button" type="button" onClick={closeForm} disabled={isSaving}>
                  Hủy
                </button>
                <button className="primary-button" type="submit" disabled={isSaving}>
                  <Icon name="save" />
                  {isSaving ? 'Đang lưu...' : 'Lưu voucher'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

export default Vouchers
