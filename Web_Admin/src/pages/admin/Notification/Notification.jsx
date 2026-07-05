import { useEffect, useState } from 'react';
import { notificationApi, userApi } from '../../../services/api';

const emptyNotification = {
    userId: '',
    type: 'system',
    sentVia: 'email',
    title: '',
    message: '',
};

const getItems = (data) => data?.items || data?.data || data || [];
const getUserId = (user) => user?.userId || user?.id;
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '-');

const AdminNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState({
        userId: '',
        type: '',
        sentVia: '',
        unreadOnly: false,
    });
    const [formData, setFormData] = useState(emptyNotification);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadUsers();
        loadNotifications();
    }, []);

    const loadUsers = async () => {
        try {
            const response = await userApi.getAll({ page: 1, pageSize: 500 });
            setUsers(getItems(response.data));
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    };

    const loadNotifications = async (event) => {
        if (event) event.preventDefault();

        setLoading(true);
        setError('');
        try {
            const response = await notificationApi.getAll({
                userId: filters.userId || undefined,
                type: filters.type || undefined,
                sentVia: filters.sentVia || undefined,
                unreadOnly: filters.unreadOnly || undefined,
            });
            setNotifications(getItems(response.data));
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được danh sách thông báo');
        } finally {
            setLoading(false);
        }
    };

    const openModal = () => {
        setError('');
        setFormData({
            ...emptyNotification,
            userId: users[0] ? getUserId(users[0]) : '',
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setError('');
    };

    const submitNotification = async (event) => {
        event.preventDefault();
        setError('');

        try {
            await notificationApi.create({
                ...formData,
                userId: Number(formData.userId),
            });
            closeModal();
            await loadNotifications();
        } catch (err) {
            setError(err.response?.data?.message || 'Tạo thông báo thất bại');
        }
    };

    const toggleRead = async (notification) => {
        setError('');
        try {
            await notificationApi.markRead(notification.notifId, { isRead: !notification.isRead });
            await loadNotifications();
        } catch (err) {
            setError(err.response?.data?.message || 'Cập nhật trạng thái đọc thất bại');
        }
    };

    const deleteNotification = async (notification) => {
        if (!window.confirm('Xóa thông báo này?')) return;

        setError('');
        try {
            await notificationApi.delete(notification.notifId);
            await loadNotifications();
        } catch (err) {
            setError(err.response?.data?.message || 'Xóa thông báo thất bại');
        }
    };

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <h1 className="m-0">Quản lý thông báo</h1>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {error && !showModal && <div className="alert alert-warning">{error}</div>}

                    <div className="card">
                        <div className="card-body">
                            <form className="form-inline align-items-end" onSubmit={loadNotifications}>
                                <div className="mr-2 mb-2">
                                    <label className="d-block mb-1">Người nhận</label>
                                    <select className="form-control" value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })}>
                                        <option value="">Tất cả</option>
                                        {users.map((user) => (
                                            <option key={getUserId(user)} value={getUserId(user)}>{user.fullName || user.email}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mr-2 mb-2">
                                    <label className="d-block mb-1">Loại</label>
                                    <select className="form-control" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                                        <option value="">Tất cả</option>
                                        <option value="system">Hệ thống</option>
                                        <option value="booking">Đặt vé</option>
                                        <option value="review_reply">Phản hồi review</option>
                                        <option value="promotion">Khuyến mãi</option>
                                    </select>
                                </div>
                                <div className="mr-2 mb-2">
                                    <label className="d-block mb-1">Kênh</label>
                                    <select className="form-control" value={filters.sentVia} onChange={(e) => setFilters({ ...filters, sentVia: e.target.value })}>
                                        <option value="">Tất cả</option>
                                        <option value="email">Email</option>
                                        <option value="app">App</option>
                                        <option value="sms">SMS</option>
                                    </select>
                                </div>
                                <div className="custom-control custom-checkbox mr-3 mb-2">
                                    <input
                                        id="unreadOnly"
                                        type="checkbox"
                                        className="custom-control-input"
                                        checked={filters.unreadOnly}
                                        onChange={(e) => setFilters({ ...filters, unreadOnly: e.target.checked })}
                                    />
                                    <label className="custom-control-label" htmlFor="unreadOnly">Chưa đọc</label>
                                </div>
                                <button className="btn btn-primary mb-2 mr-2" type="submit"><i className="fas fa-filter mr-1"></i> Lọc</button>
                                <button className="btn btn-success mb-2" type="button" onClick={openModal}><i className="fas fa-plus mr-1"></i> Tạo thông báo</button>
                            </form>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-body">
                            {loading ? (
                                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped">
                                        <thead>
                                            <tr>
                                                <th>Người nhận</th>
                                                <th>Tiêu đề</th>
                                                <th>Nội dung</th>
                                                <th>Loại</th>
                                                <th>Kênh</th>
                                                <th>Ngày tạo</th>
                                                <th>Trạng thái</th>
                                                <th style={{ width: '105px' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {notifications.length === 0 ? (
                                                <tr><td colSpan="8" className="text-center">Chưa có thông báo</td></tr>
                                            ) : notifications.map((notification) => (
                                                <tr key={notification.notifId}>
                                                    <td>
                                                        {notification.fullName || '-'}
                                                        <div className="small text-muted">{notification.email || ''}</div>
                                                    </td>
                                                    <td>{notification.title}</td>
                                                    <td style={{ minWidth: '260px' }}>{notification.message}</td>
                                                    <td>{notification.type}</td>
                                                    <td>{notification.sentVia}</td>
                                                    <td>{formatDateTime(notification.createdAt)}</td>
                                                    <td>
                                                        <span className={`badge ${notification.isRead ? 'badge-secondary' : 'badge-info'}`}>
                                                            {notification.isRead ? 'Đã đọc' : 'Chưa đọc'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <button className="btn btn-sm btn-warning mr-1" type="button" onClick={() => toggleRead(notification)}>
                                                            <i className={`fas ${notification.isRead ? 'fa-envelope' : 'fa-envelope-open'}`}></i>
                                                        </button>
                                                        <button className="btn btn-sm btn-danger" type="button" onClick={() => deleteNotification(notification)}>
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
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <form onSubmit={submitNotification}>
                                <div className="modal-header">
                                    <h5 className="modal-title">Tạo thông báo</h5>
                                    <button type="button" className="close" onClick={closeModal}><span>&times;</span></button>
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger">{error}</div>}
                                    <div className="form-group">
                                        <label>Người nhận</label>
                                        <select className="form-control" value={formData.userId} onChange={(e) => setFormData({ ...formData, userId: e.target.value })} required>
                                            <option value="">Chọn người nhận</option>
                                            {users.map((user) => (
                                                <option key={getUserId(user)} value={getUserId(user)}>{user.fullName || user.email}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="row">
                                        <div className="col-md-6 form-group">
                                            <label>Loại</label>
                                            <select className="form-control" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                                <option value="system">Hệ thống</option>
                                                <option value="booking">Đặt vé</option>
                                                <option value="review_reply">Phản hồi review</option>
                                                <option value="promotion">Khuyến mãi</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6 form-group">
                                            <label>Kênh</label>
                                            <select className="form-control" value={formData.sentVia} onChange={(e) => setFormData({ ...formData, sentVia: e.target.value })}>
                                                <option value="email">Email</option>
                                                <option value="app">App</option>
                                                <option value="sms">SMS</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Tiêu đề</label>
                                        <input className="form-control" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Nội dung</label>
                                        <textarea className="form-control" rows="4" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Đóng</button>
                                    <button type="submit" className="btn btn-primary">Gửi</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {showModal && <div className="modal-backdrop fade show"></div>}
        </div>
    );
};

export default AdminNotifications;

