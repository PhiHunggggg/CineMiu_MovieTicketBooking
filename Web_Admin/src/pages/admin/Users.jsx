import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../../components/Icon'

const AUTH_API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL ?? 'http://localhost:5002'
const PAGE_SIZE = 8

const activeOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'true', label: 'Đang hoạt động' },
  { value: 'false', label: 'Tạm khóa' },
]

const genderOptions = [
  { value: '', label: 'Chưa đặt' },
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
]

const initialForm = {
  roleId: '1',
  cinemaId: '',
  fullName: '',
  email: '',
  password: '',
  phone: '',
  avatarUrl: '',
  dateOfBirth: '',
  gender: '',
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

function optionalNumber(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed ? Number(trimmed) : null
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

function normalizeRole(role) {
  return {
    roleId: Number(role.roleId ?? role.RoleId),
    roleName: role.roleName ?? role.RoleName ?? 'User',
    description: role.description ?? role.Description ?? '',
  }
}

function getActiveLabel(value) {
  return value ? 'Đang hoạt động' : 'Tạm khóa'
}

function getRoleLabel(user, roles) {
  const roleName = user.roleName ?? user.RoleName
  if (roleName) return roleName

  const roleId = Number(user.roleId ?? user.RoleId)
  return roles.find((role) => role.roleId === roleId)?.roleName ?? 'User'
}

function getUserId(user) {
  return user.userId ?? user.UserId
}

function toForm(user) {
  return {
    roleId: String(user.roleId ?? user.RoleId ?? 1),
    cinemaId: user.cinemaId ?? user.CinemaId ?? '',
    fullName: user.fullName ?? user.FullName ?? '',
    email: user.email ?? user.Email ?? '',
    password: '',
    phone: user.phone ?? user.Phone ?? '',
    avatarUrl: user.avatarUrl ?? user.AvatarUrl ?? '',
    dateOfBirth: toDateInput(user.dateOfBirth ?? user.DateOfBirth),
    gender: user.gender ?? user.Gender ?? '',
    isActive: Boolean(user.isActive ?? user.IsActive),
  }
}

function buildPayload(form, isEditing) {
  return {
    roleId: Number(form.roleId || 1),
    cinemaId: optionalNumber(form.cinemaId),
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    password: isEditing ? optionalText(form.password) : form.password,
    phone: optionalText(form.phone),
    avatarUrl: optionalText(form.avatarUrl),
    dateOfBirth: form.dateOfBirth || null,
    gender: optionalText(form.gender),
    isActive: Boolean(form.isActive),
  }
}

function validateForm(form, isEditing) {
  const errors = {}
  const roleId = Number(form.roleId)
  const cinemaId = optionalNumber(form.cinemaId)

  if (!form.fullName.trim()) {
    errors.fullName = 'Vui lòng nhập họ tên.'
  }

  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    errors.email = 'Email không hợp lệ.'
  }

  if (!Number.isInteger(roleId) || roleId <= 0 || roleId > 255) {
    errors.roleId = 'Vui lòng chọn vai trò hợp lệ.'
  }

  if (cinemaId !== null && (!Number.isInteger(cinemaId) || cinemaId <= 0)) {
    errors.cinemaId = 'Cinema ID phải là số nguyên dương.'
  }

  if (!isEditing && !form.password.trim()) {
    errors.password = 'Vui lòng nhập mật khẩu.'
  } else if (form.password && form.password.length < 6) {
    errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.'
  }

  return errors
}

function Users() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
  })
  const [page, setPage] = useState(1)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [roleIdFilter, setRoleIdFilter] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const fetchRoles = useCallback(async () => {
    try {
      const response = await axios.get(`${AUTH_API_BASE_URL}/api/roles`)
      const items = Array.isArray(response.data) ? response.data.map(normalizeRole) : []
      setRoles(items.filter((role) => Number.isInteger(role.roleId)))
    } catch (roleError) {
      setRoles([])
      setError(getErrorMessage(roleError, 'Không tải được danh sách vai trò.'))
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await axios.get(`${AUTH_API_BASE_URL}/api/users`, {
        params: {
          keyword: keyword || undefined,
          roleId: roleIdFilter || undefined,
          isActive: isActiveFilter || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      })

      const data = response.data ?? {}
      setUsers(Array.isArray(data.items) ? data.items : [])
      setPagination({
        page: data.page ?? page,
        pageSize: data.pageSize ?? PAGE_SIZE,
        totalCount: data.totalCount ?? 0,
        totalPages: Math.max(data.totalPages ?? 1, 1),
      })
    } catch (userError) {
      setUsers([])
      setError(getErrorMessage(userError, 'Không tải được danh sách người dùng.'))
    } finally {
      setIsLoading(false)
    }
  }, [isActiveFilter, keyword, page, roleIdFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRoles()
  }, [fetchRoles])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers()
  }, [fetchUsers])

  const shownRange = useMemo(() => {
    if (pagination.totalCount === 0) return '0'

    const start = (pagination.page - 1) * pagination.pageSize + 1
    const end = Math.min(pagination.page * pagination.pageSize, pagination.totalCount)

    return `${start}-${end}`
  }, [pagination])

  const formDefaults = useMemo(
    () => ({
      ...initialForm,
      roleId: roles.length > 0 ? String(roles[0].roleId) : '1',
    }),
    [roles],
  )

  const openCreateForm = () => {
    setEditingUser(null)
    setForm(formDefaults)
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const openEditForm = (user) => {
    setEditingUser(user)
    setForm(toForm(user))
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    if (isSaving) return

    setIsFormOpen(false)
    setEditingUser(null)
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
    setRoleIdFilter('')
    setIsActiveFilter('')
    setPage(1)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const isEditing = Boolean(editingUser)
    const nextErrors = validateForm(form, isEditing)

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    setIsSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = buildPayload(form, isEditing)

      if (editingUser) {
        await axios.put(`${AUTH_API_BASE_URL}/api/users/${getUserId(editingUser)}`, payload)
        setNotice('Đã cập nhật người dùng.')
      } else {
        await axios.post(`${AUTH_API_BASE_URL}/api/users`, payload)
        setNotice('Đã thêm người dùng mới.')
      }

      closeForm()
      await fetchUsers()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Không lưu được người dùng.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (user) => {
    const userId = getUserId(user)
    const fullName = user.fullName ?? user.FullName ?? user.email ?? user.Email ?? userId
    const confirmed = window.confirm(`Khóa người dùng "${fullName}"?`)
    if (!confirmed) return

    setDeletingId(userId)
    setError('')
    setNotice('')

    try {
      await axios.delete(`${AUTH_API_BASE_URL}/api/users/${userId}`)
      setNotice('Đã khóa người dùng.')

      if (users.length === 1 && page > 1) {
        setPage((current) => current - 1)
      } else {
        await fetchUsers()
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Không khóa được người dùng.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="admin-page users-page" aria-label="Quản lý người dùng">
      <div className="page-surface movies-surface">
        <div className="movies-toolbar">
          <div>
            <p className="section-kicker">Danh sách người dùng</p>
            <h2>Quản lý người dùng</h2>
            <p className="section-subtitle">
              Hiển thị {shownRange} trong {pagination.totalCount} người dùng
            </p>
          </div>

          <button className="primary-button" type="button" onClick={openCreateForm}>
            <Icon name="plus" />
            Thêm người dùng
          </button>
        </div>

        <form className="users-filters" onSubmit={handleSearch}>
          <label className="search-field">
            <Icon name="search" className="field-icon" />
            <input
              type="search"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="Tìm theo tên, email, SĐT"
              aria-label="Tìm kiếm người dùng"
            />
          </label>

          <select
            value={roleIdFilter}
            onChange={(event) => {
              setRoleIdFilter(event.target.value)
              setPage(1)
            }}
            aria-label="Lọc vai trò"
          >
            <option value="">Tất cả vai trò</option>
            {roles.map((role) => (
              <option key={role.roleId} value={role.roleId}>
                {role.roleName}
              </option>
            ))}
          </select>

          <select
            value={isActiveFilter}
            onChange={(event) => {
              setIsActiveFilter(event.target.value)
              setPage(1)
            }}
            aria-label="Lọc trạng thái người dùng"
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
          <table className="movies-table users-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Liên hệ</th>
                <th>Ngày sinh</th>
                <th>Trạng thái</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="table-state">
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((user) => {
                  const userId = getUserId(user)
                  const fullName = user.fullName ?? user.FullName ?? 'Chưa có tên'
                  const email = user.email ?? user.Email ?? 'Chưa có email'
                  const isActive = Boolean(user.isActive ?? user.IsActive)

                  return (
                    <tr key={userId}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {user.avatarUrl ?? user.AvatarUrl ? (
                              <img src={user.avatarUrl ?? user.AvatarUrl} alt="" />
                            ) : (
                              <Icon name="users" />
                            )}
                          </div>
                          <div>
                            <strong>{fullName}</strong>
                            <span>{email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{getRoleLabel(user, roles)}</strong>
                        <span className="muted-cell">
                          Cinema ID: {user.cinemaId ?? user.CinemaId ?? 'Không gán'}
                        </span>
                      </td>
                      <td>
                        <strong>{user.phone ?? user.Phone ?? 'Chưa có SĐT'}</strong>
                        <span className="muted-cell">
                          {genderOptions.find((option) => option.value === (user.gender ?? user.Gender))?.label ??
                            'Chưa đặt giới tính'}
                        </span>
                      </td>
                      <td>{formatDate(user.dateOfBirth ?? user.DateOfBirth)}</td>
                      <td>
                        <span className={`status-badge ${isActive ? 'status-active' : 'status-inactive'}`}>
                          {getActiveLabel(isActive)}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button table-action"
                            type="button"
                            onClick={() => openEditForm(user)}
                            aria-label={`Sửa người dùng ${fullName}`}
                            title="Sửa người dùng"
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            className="icon-button table-action danger"
                            type="button"
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === userId}
                            aria-label={`Khóa người dùng ${fullName}`}
                            title="Khóa người dùng"
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
                    Chưa có người dùng phù hợp.
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
          <section className="modal-panel user-form-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="section-kicker">{editingUser ? 'Sửa người dùng' : 'Thêm người dùng'}</p>
                <h2>{editingUser ? form.fullName : 'Người dùng mới'}</h2>
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
                  <span>Họ tên</span>
                  <input name="fullName" value={form.fullName} onChange={handleFieldChange} />
                  {formErrors.fullName ? <em>{formErrors.fullName}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Email</span>
                  <input name="email" type="email" value={form.email} onChange={handleFieldChange} />
                  {formErrors.email ? <em>{formErrors.email}</em> : null}
                </label>

                <label className={`form-field ${editingUser ? '' : 'required'}`}>
                  <span>{editingUser ? 'Mật khẩu mới' : 'Mật khẩu'}</span>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleFieldChange}
                    placeholder={editingUser ? 'Để trống nếu không đổi' : ''}
                  />
                  {formErrors.password ? <em>{formErrors.password}</em> : null}
                </label>

                <label className="form-field required">
                  <span>Vai trò</span>
                  <select name="roleId" value={form.roleId} onChange={handleFieldChange}>
                    {roles.length > 0 ? (
                      roles.map((role) => (
                        <option key={role.roleId} value={role.roleId}>
                          {role.roleName}
                        </option>
                      ))
                    ) : (
                      <option value="1">User</option>
                    )}
                  </select>
                  {formErrors.roleId ? <em>{formErrors.roleId}</em> : null}
                </label>

                <label className="form-field">
                  <span>Số điện thoại</span>
                  <input name="phone" value={form.phone} onChange={handleFieldChange} />
                </label>

                <label className="form-field">
                  <span>Cinema ID</span>
                  <input name="cinemaId" type="number" min="1" value={form.cinemaId} onChange={handleFieldChange} />
                  {formErrors.cinemaId ? <em>{formErrors.cinemaId}</em> : null}
                </label>

                <label className="form-field">
                  <span>Ngày sinh</span>
                  <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleFieldChange} />
                </label>

                <label className="form-field">
                  <span>Giới tính</span>
                  <select name="gender" value={form.gender} onChange={handleFieldChange}>
                    {genderOptions.map((option) => (
                      <option key={option.value || 'unset'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field checkbox-field wide">
                  <input name="isActive" type="checkbox" checked={form.isActive} onChange={handleFieldChange} />
                  <span>Đang hoạt động</span>
                </label>

                <label className="form-field wide">
                  <span>Avatar URL</span>
                  <input name="avatarUrl" value={form.avatarUrl} onChange={handleFieldChange} />
                </label>
              </div>

              <div className="form-actions">
                <button className="ghost-button" type="button" onClick={closeForm} disabled={isSaving}>
                  Hủy
                </button>
                <button className="primary-button" type="submit" disabled={isSaving}>
                  <Icon name="save" />
                  {isSaving ? 'Đang lưu...' : 'Lưu người dùng'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}

export default Users
