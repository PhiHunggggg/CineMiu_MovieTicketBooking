import React, { useEffect, useState } from 'react';
import { adminSystemApi, authApi } from '../../services/api';

const emptyRole = {
    roleName: '',
    description: '',
};

const getItems = (data) => data?.items || data?.data || data || [];
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '-');

const AdminSystem = () => {
    const [summary, setSummary] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [roleForm, setRoleForm] = useState(emptyRole);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    useEffect(() => {
        loadSystem();
    }, []);

    const loadSystem = async () => {
        setLoading(true);
        setError('');
        try {
            const [summaryRes, sessionsRes] = await Promise.all([
                adminSystemApi.getSummary(),
                adminSystemApi.getSessions(),
            ]);
            setSummary(summaryRes.data);
            setSessions(getItems(sessionsRes.data));
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được dữ liệu hệ thống');
        } finally {
            setLoading(false);
        }
    };

    const openRoleModal = (role = null) => {
        setEditingRole(role);
        setError('');
        setRoleForm(role ? {
            roleName: role.roleName || '',
            description: role.description || '',
        } : emptyRole);
        setShowRoleModal(true);
    };

    const closeRoleModal = () => {
        setShowRoleModal(false);
        setEditingRole(null);
        setError('');
    };

    const submitRole = async (event) => {
        event.preventDefault();
        setError('');

        try {
            if (editingRole) {
                await adminSystemApi.updateRole(editingRole.roleId, roleForm);
            } else {
                await adminSystemApi.createRole(roleForm);
            }
            closeRoleModal();
            await loadSystem();
        } catch (err) {
            setError(err.response?.data?.message || 'Lưu vai trò thất bại');
        }
    };

    const deleteRole = async (role) => {
        if (!window.confirm(`Xóa vai trò "${role.roleName}"?`)) return;

        setError('');
        try {
            await adminSystemApi.deleteRole(role.roleId);
            await loadSystem();
        } catch (err) {
            setError(err.response?.data?.message || 'Xóa vai trò thất bại');
        }
    };

    const deleteSession = async (session) => {
        if (!window.confirm(`Xóa session giữ ghế "${session.sessionId}"?`)) return;

        setError('');
        try {
            await adminSystemApi.deleteSession(session.sessionId);
            await loadSystem();
        } catch (err) {
            setError(err.response?.data?.message || 'Xóa session thất bại');
        }
    };

    const changePassword = async (event) => {
        event.preventDefault();
        setError('');
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }
        try {
            await authApi.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });
            setShowPasswordModal(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setNotice('Đổi mật khẩu thành công.');
        } catch (err) {
            setError(err.response?.data?.message || 'Đổi mật khẩu thất bại');
        }
    };

    const roles = summary?.roles || [];
    const permissions = summary?.permissions || [];
    const sessionSummary = summary?.sessions || {};
    const tokens = summary?.tokens || {};

    return (
        <div className="content-wrapper">
            <div className="content-header admin-page-header">
                <div className="container-fluid admin-page-title">
                    <div><p className="admin-eyebrow">Bảo mật & phân quyền</p><h1>Quản trị hệ thống</h1><span>Quản lý vai trò, phiên giữ ghế và thông tin bảo mật.</span></div>
                    <button className="btn btn-primary admin-primary-action" type="button" onClick={() => { setError(''); setShowPasswordModal(true); }}><i className="fas fa-key"></i> Đổi mật khẩu</button>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {error && !showRoleModal && !showPasswordModal && <div className="alert alert-warning">{error}</div>}
                    {notice && <div className="alert alert-success alert-dismissible">{notice}<button type="button" className="close" onClick={() => setNotice('')}><span>&times;</span></button></div>}

                    {loading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                    ) : (
                        <>
                            <div className="row">
                                <div className="col-md-3">
                                    <div className="info-box">
                                        <span className="info-box-icon bg-info"><i className="fas fa-users-cog"></i></span>
                                        <div className="info-box-content">
                                            <span className="info-box-text">Vai trò</span>
                                            <span className="info-box-number">{roles.length}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="info-box">
                                        <span className="info-box-icon bg-warning"><i className="fas fa-chair"></i></span>
                                        <div className="info-box-content">
                                            <span className="info-box-text">Ghế đang giữ</span>
                                            <span className="info-box-number">{sessionSummary.activeSeatLocks || 0}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="info-box">
                                        <span className="info-box-icon bg-success"><i className="fas fa-plug"></i></span>
                                        <div className="info-box-content">
                                            <span className="info-box-text">Phiên giữ ghế</span>
                                            <span className="info-box-number">{sessionSummary.activeSeatLockSessions || 0}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="info-box">
                                        <span className="info-box-icon bg-secondary"><i className="fas fa-key"></i></span>
                                        <div className="info-box-content">
                                            <span className="info-box-text">Token</span>
                                            <span className="info-box-number">{tokens.mode || 'JWT'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-lg-6 mb-3">
                                    <div className="card h-100">
                                        <div className="card-header d-flex justify-content-between align-items-center">
                                            <h3 className="card-title mb-0">Vai trò</h3>
                                            <button className="btn btn-sm btn-primary" type="button" onClick={() => openRoleModal()}>
                                                <i className="fas fa-plus mr-1"></i> Thêm vai trò
                                            </button>
                                        </div>
                                        <div className="card-body p-0">
                                            <table className="table table-bordered mb-0">
                                                <thead>
                                                    <tr>
                                                        <th>Vai trò</th>
                                                        <th>Mô tả</th>
                                                        <th>Người dùng</th>
                                                        <th style={{ width: '105px' }}>Thao tác</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {roles.map((role) => (
                                                        <tr key={role.roleId}>
                                                            <td><strong>{role.roleName}</strong></td>
                                                            <td>{role.description || '-'}</td>
                                                            <td>{role.userCount || 0}</td>
                                                            <td className="text-center">
                                                                <button className="btn btn-sm btn-info mr-1" type="button" onClick={() => openRoleModal(role)}>
                                                                    <i className="fas fa-edit"></i>
                                                                </button>
                                                                <button className="btn btn-sm btn-danger" type="button" onClick={() => deleteRole(role)} disabled={(role.userCount || 0) > 0}>
                                                                    <i className="fas fa-trash"></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-lg-6 mb-3">
                                    <div className="card h-100">
                                        <div className="card-header">
                                            <h3 className="card-title mb-0">Phân quyền hiện tại</h3>
                                        </div>
                                        <div className="card-body">
                                            {permissions.map((permission) => (
                                                <div className="mb-3" key={permission.role}>
                                                    <strong>{permission.role}</strong>
                                                    <div className="text-muted">{permission.scope}</div>
                                                </div>
                                            ))}
                                            <div className="alert alert-light mb-0">
                                                <strong>{tokens.mode || 'JWT'}:</strong> {tokens.note || 'Đang dùng JWT cho phiên đăng nhập.'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title mb-0">Session giữ ghế đang hoạt động</h3>
                                </div>
                                <div className="card-body">
                                    <div className="table-responsive">
                                        <table className="table table-bordered table-striped">
                                            <thead>
                                                <tr>
                                                    <th>Session</th>
                                                    <th>Khách hàng</th>
                                                    <th>Phim</th>
                                                    <th>Rạp / Phòng</th>
                                                    <th>Ghế</th>
                                                    <th>Hết hạn</th>
                                                    <th style={{ width: '80px' }}>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sessions.length === 0 ? (
                                                    <tr><td colSpan="7" className="text-center">Không có session giữ ghế</td></tr>
                                                ) : sessions.map((session) => (
                                                    <tr key={session.lockId}>
                                                        <td><code>{session.sessionId}</code></td>
                                                        <td>
                                                            {session.fullName || '-'}
                                                            <div className="small text-muted">{session.email || ''}</div>
                                                        </td>
                                                        <td>{session.movieTitle}</td>
                                                        <td>{session.cinemaName}<div className="small text-muted">{session.hallName}</div></td>
                                                        <td>{session.seatCode}</td>
                                                        <td>{formatDateTime(session.expiresAt)}</td>
                                                        <td className="text-center">
                                                            <button className="btn btn-sm btn-danger" type="button" onClick={() => deleteSession(session)}>
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {showRoleModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <form onSubmit={submitRole}>
                                <div className="modal-header">
                                    <h5 className="modal-title">{editingRole ? 'Cập nhật vai trò' : 'Thêm vai trò'}</h5>
                                    <button type="button" className="close" onClick={closeRoleModal}><span>&times;</span></button>
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger">{error}</div>}
                                    <div className="form-group">
                                        <label>Tên vai trò</label>
                                        <input className="form-control" value={roleForm.roleName} onChange={(e) => setRoleForm({ ...roleForm, roleName: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Mô tả</label>
                                        <textarea className="form-control" rows="3" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeRoleModal}>Đóng</button>
                                    <button type="submit" className="btn btn-primary">Lưu</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {showRoleModal && <div className="modal-backdrop fade show"></div>}
            {showPasswordModal && (
                <>
                    <div className="modal fade show admin-modal" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog"><div className="modal-content"><form onSubmit={changePassword}>
                            <div className="modal-header"><div><small>BẢO MẬT TÀI KHOẢN</small><h5>Đổi mật khẩu</h5></div><button type="button" className="close" onClick={() => setShowPasswordModal(false)}><span>&times;</span></button></div>
                            <div className="modal-body">
                                {error && <div className="alert alert-danger">{error}</div>}
                                <div className="form-group"><label>Mật khẩu hiện tại</label><input type="password" className="form-control" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} required /></div>
                                <div className="form-group"><label>Mật khẩu mới</label><input type="password" minLength="6" className="form-control" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} required /></div>
                                <div className="form-group mb-0"><label>Xác nhận mật khẩu mới</label><input type="password" minLength="6" className="form-control" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} required /></div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-light" onClick={() => setShowPasswordModal(false)}>Hủy</button><button className="btn btn-primary">Cập nhật mật khẩu</button></div>
                        </form></div></div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )}
        </div>
    );
};

export default AdminSystem;
