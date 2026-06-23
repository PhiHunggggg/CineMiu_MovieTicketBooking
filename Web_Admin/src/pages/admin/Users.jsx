import React, { useEffect, useState } from 'react';
import { bookingAdminApi, cinemaLookupApi, userApi } from '../../services/api';

const emptyUser = {
    roleId: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    avatarUrl: '',
    dateOfBirth: '',
    gender: '',
    isActive: true,
};

const toDateInput = (value) => (value ? String(value).substring(0, 10) : '');

const Users = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState(emptyUser);
    const [error, setError] = useState('');
    const [historyUser, setHistoryUser] = useState(null);
    const [bookingHistory, setBookingHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        loadLookups();
        loadUsers();
    }, []);

    const loadLookups = async () => {
        try {
            const response = await cinemaLookupApi.getAll();
            setRoles(response.data?.roles || []);
        } catch (err) {
            console.error('Failed to load roles:', err);
        }
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await userApi.getAll({ keyword: keyword || undefined });
            setUsers(response.data?.items || response.data?.data || response.data || []);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        loadUsers();
    };

    const openModal = (user = null) => {
        setEditingUser(user);
        setFormData(user ? {
            roleId: user.roleId || '',
            fullName: user.fullName || user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            password: '',
            avatarUrl: user.avatarUrl || '',
            dateOfBirth: toDateInput(user.dateOfBirth),
            gender: user.gender || '',
            isActive: user.isActive ?? true,
        } : {
            ...emptyUser,
            roleId: roles[0]?.roleId || '',
        });
        setError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const payload = {
                ...formData,
                roleId: formData.roleId ? Number(formData.roleId) : null,
                dateOfBirth: formData.dateOfBirth || null,
            };

            if (editingUser && !payload.password) {
                delete payload.password;
            }

            if (editingUser) {
                await userApi.update(editingUser.userId || editingUser.id, payload);
            } else {
                await userApi.create(payload);
            }
            closeModal();
            loadUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Lưu người dùng thất bại');
        }
    };

    const handleToggleStatus = async (user) => {
        setError('');
        try {
            await userApi.update(user.userId || user.id, {
                roleId: user.roleId,
                cinemaId: user.cinemaId || null,
                fullName: user.fullName || user.name || '',
                email: user.email,
                phone: user.phone || null,
                avatarUrl: user.avatarUrl || null,
                dateOfBirth: user.dateOfBirth || null,
                gender: user.gender || null,
                isActive: !user.isActive,
            });
            loadUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Thay đổi trạng thái khách hàng thất bại');
        }
    };

    const openBookingHistory = async (user) => {
        setHistoryUser(user);
        setBookingHistory([]);
        setHistoryLoading(true);
        try {
            const response = await bookingAdminApi.getByUser(user.userId || user.id);
            setBookingHistory(response.data?.items || response.data?.data || response.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được lịch sử đặt vé');
        } finally {
            setHistoryLoading(false);
        }
    };

    const getRoleName = (roleId) => {
        const role = roles.find((item) => Number(item.roleId) === Number(roleId));
        return role?.roleName || roleId;
    };
    const customerUsers = users.filter((user) => Number(user.roleId) === 1);
    const activeCustomerCount = customerUsers.filter((user) => user.isActive).length;
    const lockedCustomerCount = customerUsers.length - activeCustomerCount;

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="admin-page-title"><div><p className="admin-eyebrow">Khách hàng</p><h1>Quản lý người dùng</h1><span>Xem tài khoản, lịch sử đặt vé và kiểm soát truy cập.</span></div></div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    <div className="admin-management-brief">
                        <div><i className="fas fa-users"></i><p><span>Tổng khách hàng</span><strong>{customerUsers.length.toLocaleString('vi-VN')}</strong></p></div>
                        <div><i className="fas fa-user-check"></i><p><span>Đang hoạt động</span><strong>{activeCustomerCount.toLocaleString('vi-VN')}</strong></p></div>
                        <div><i className="fas fa-user-lock"></i><p><span>Đã khóa</span><strong>{lockedCustomerCount.toLocaleString('vi-VN')}</strong></p></div>
                        <div><i className="fas fa-clock-rotate-left"></i><p><span>Lịch sử đặt vé</span><strong>Chi tiết</strong></p></div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="row">
                                <div className="col-md-7">
                                    <form onSubmit={handleSearch} className="form-inline">
                                        <input
                                            type="text"
                                            className="form-control mr-2"
                                            placeholder="Tìm theo tên, email, số điện thoại..."
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                        />
                                        <button type="submit" className="btn btn-primary">
                                            <i className="fas fa-search"></i> Tìm kiếm
                                        </button>
                                    </form>
                                </div>
                                <div className="col-md-5 text-right">
                                    <button className="btn btn-success" onClick={() => openModal()}>
                                        <i className="fas fa-plus"></i> Thêm người dùng
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="card-body">
                            {error && !showModal && <div className="alert alert-warning">{error}</div>}
                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary"></div>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped">
                                        <thead>
                                            <tr>
                                                <th>Họ tên</th>
                                                <th>Email</th>
                                                <th>Số điện thoại</th>
                                                <th>Vai trò</th>
                                                <th>Trạng thái</th>
                                                <th style={{ width: '145px' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customerUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="text-center">Không tìm thấy người dùng</td>
                                                </tr>
                                            ) : customerUsers.map((user) => (
                                                <tr key={user.userId || user.id}>
                                                    <td>{user.fullName || user.name}</td>
                                                    <td>{user.email}</td>
                                                    <td>{user.phone || '-'}</td>
                                                    <td><span className="badge badge-info">{getRoleName(user.roleId)}</span></td>
                                                    <td>
                                                        <span className={`badge ${user.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                                            {user.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <button className="btn btn-sm btn-light mr-1" type="button" title="Lịch sử đặt vé" onClick={() => openBookingHistory(user)}>
                                                            <i className="fas fa-history"></i>
                                                        </button>
                                                        <button className="btn btn-sm btn-info mr-1" type="button" onClick={() => openModal(user)}>
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button className={`btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-success'}`} type="button" title={user.isActive ? 'Khóa tài khoản' : 'Mở tài khoản'} onClick={() => handleToggleStatus(user)}>
                                                            <i className={`fas fa-${user.isActive ? 'lock' : 'unlock'}`}></i>
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
                <div className="modal fade show" style={{ display: 'block', overflowY: 'auto' }} tabIndex="-1">
                    <div className="modal-dialog" style={{ marginTop: '10px', marginBottom: '10px' }}>
                        <div className="modal-content" style={{ maxHeight: 'calc(100vh - 20px)' }}>
                            <div className="modal-header">
                                <h5 className="modal-title">{editingUser ? 'Cập nhật người dùng' : 'Thêm người dùng'}</h5>
                                <button type="button" className="close" onClick={closeModal}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="d-flex flex-column" style={{ minHeight: 0 }}>
                                <div className="modal-body" style={{ overflowY: 'auto' }}>
                                    {error && <div className="alert alert-danger">{error}</div>}
                                    <div className="form-group">
                                        <label>Họ tên</label>
                                        <input className="form-control" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Mật khẩu</label>
                                        <input type="password" className="form-control" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingUser} />
                                        {editingUser && <small className="form-text text-muted">Để trống nếu không đổi mật khẩu.</small>}
                                    </div>
                                    <div className="form-group">
                                        <label>Số điện thoại</label>
                                        <input className="form-control" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Vai trò</label>
                                        <select className="form-control" value={formData.roleId} onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}>
                                            <option value="">Chọn vai trò</option>
                                            {roles.map((role) => <option key={role.roleId} value={role.roleId}>{role.roleName}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Trạng thái</label>
                                        <select className="form-control" value={String(formData.isActive)} onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}>
                                            <option value="true">Hoạt động</option>
                                            <option value="false">Ngừng hoạt động</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Ngày sinh</label>
                                        <input type="date" className="form-control" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Giới tính</label>
                                        <select className="form-control" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                                            <option value="">Chưa chọn</option>
                                            <option value="male">Nam</option>
                                            <option value="female">Nữ</option>
                                            <option value="other">Khác</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-footer" style={{ flexShrink: 0 }}>
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                                    <button type="submit" className="btn btn-primary">{editingUser ? 'Lưu thay đổi' : 'Tạo mới'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {showModal && <div className="modal-backdrop fade show"></div>}
            {historyUser && (
                <>
                    <div className="modal fade show admin-modal" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-xl"><div className="modal-content">
                            <div className="modal-header"><div><small>LỊCH SỬ GIAO DỊCH</small><h5>{historyUser.fullName || historyUser.email}</h5></div><button type="button" className="close" onClick={() => setHistoryUser(null)}><span>&times;</span></button></div>
                            <div className="modal-body p-0">
                                {historyLoading ? <div className="admin-loading"><div className="spinner-border text-primary"></div></div> : <div className="table-responsive"><table className="table admin-table mb-0">
                                    <thead><tr><th>Mã đặt vé</th><th>Phim</th><th>Rạp</th><th>Ngày đặt</th><th>Giá trị</th><th>Trạng thái</th></tr></thead>
                                    <tbody>{bookingHistory.length === 0 ? <tr><td colSpan="6" className="text-center py-5 text-muted">Khách hàng chưa có lịch sử đặt vé</td></tr> : bookingHistory.map((item, index) => {
                                        const booking = item.booking || item.Booking || item;
                                        const movie = item.movie || item.Movie || {};
                                        const cinema = item.cinema || item.Cinema || {};
                                        return <tr key={booking.bookingId || booking.BookingId || index}><td><strong>{booking.bookingCode || booking.BookingCode || '-'}</strong></td><td>{movie.title || movie.Title || '-'}</td><td>{cinema.cinemaName || cinema.CinemaName || '-'}</td><td>{booking.createdAt || booking.CreatedAt ? new Date(booking.createdAt || booking.CreatedAt).toLocaleString('vi-VN') : '-'}</td><td>{Number(booking.finalAmount || booking.FinalAmount || 0).toLocaleString('vi-VN')} ₫</td><td><span className="badge badge-info">{booking.status || booking.Status || '-'}</span></td></tr>;
                                    })}</tbody>
                                </table></div>}
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-light" onClick={() => setHistoryUser(null)}>Đóng</button></div>
                        </div></div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )}
        </div>
    );
};

export default Users;
