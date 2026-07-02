import { useEffect, useMemo, useState } from 'react';
import { cinemaApi, cinemaLookupApi, userApi } from '../../services/api';
import './CinemaManagers.css';

const emptyForm = {
    fullName: '',
    email: '',
    phone: '',
    cinemaId: '',
    password: '',
    isActive: true,
};

const getItems = (data) => data?.items || data?.data || data || [];
const getId = (item) => item?.userId || item?.id;

const AdminCinemaManagers = () => {
    const [users, setUsers] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [roles, setRoles] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [cinemaFilter, setCinemaFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [showModal, setShowModal] = useState(false);
    const [resetUser, setResetUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    const managerRole = useMemo(() => roles.find((role) => {
        const name = String(role.roleName || role.name || '').toLowerCase();
        return Number(role.roleId) === 3 || name.includes('manager') || name.includes('quản lý');
    }), [roles]);

    const managers = useMemo(() => users.filter((user) => {
        const matchesRole = Number(user.roleId) === Number(managerRole?.roleId || 3);
        const matchesCinema = !cinemaFilter || Number(user.cinemaId) === Number(cinemaFilter);
        return matchesRole && matchesCinema;
    }), [users, cinemaFilter, managerRole]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (search = '') => {
        setLoading(true);
        setError('');
        try {
            const [usersRes, cinemasRes, lookupsRes] = await Promise.all([
                userApi.getAll({ keyword: search || undefined }),
                cinemaApi.getAll({ activeOnly: false }),
                cinemaLookupApi.getAll(),
            ]);
            setUsers(getItems(usersRes.data));
            setCinemas(getItems(cinemasRes.data));
            setRoles(getItems(lookupsRes.data?.roles));
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được danh sách quản lý rạp');
        } finally {
            setLoading(false);
        }
    };

    const cinemaName = (cinemaId) => cinemas.find((item) => Number(item.cinemaId || item.id) === Number(cinemaId))?.cinemaName || 'Chưa phân công';

    const openForm = (user = null) => {
        setEditing(user);
        setForm(user ? {
            fullName: user.fullName || '',
            email: user.email || '',
            phone: user.phone || '',
            cinemaId: user.cinemaId || '',
            password: '',
            isActive: user.isActive ?? true,
        } : emptyForm);
        setError('');
        setShowModal(true);
    };

    const buildPayload = (user, overrides = {}) => ({
        roleId: Number(managerRole?.roleId || 3),
        cinemaId: overrides.cinemaId ?? user.cinemaId ?? null,
        fullName: overrides.fullName ?? user.fullName ?? '',
        email: overrides.email ?? user.email ?? '',
        phone: overrides.phone ?? user.phone ?? null,
        avatarUrl: user.avatarUrl || null,
        dateOfBirth: user.dateOfBirth || null,
        gender: user.gender || null,
        isActive: overrides.isActive ?? user.isActive ?? true,
        ...(overrides.password ? { password: overrides.password } : {}),
    });

    const submitForm = async (event) => {
        event.preventDefault();
        setError('');
        try {
            const payload = buildPayload(editing || {}, {
                ...form,
                cinemaId: form.cinemaId ? Number(form.cinemaId) : null,
            });
            if (editing) await userApi.update(getId(editing), payload);
            else await userApi.create(payload);
            setShowModal(false);
            setNotice(editing ? 'Đã cập nhật tài khoản quản lý.' : 'Đã tạo tài khoản Cinema Manager.');
            await loadData(keyword);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể lưu tài khoản quản lý');
        }
    };

    const toggleStatus = async (user) => {
        setError('');
        try {
            await userApi.update(getId(user), buildPayload(user, { isActive: !user.isActive }));
            setNotice(user.isActive ? 'Đã khóa tài khoản.' : 'Đã mở lại tài khoản.');
            await loadData(keyword);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể thay đổi trạng thái tài khoản');
        }
    };

    const resetPassword = async (event) => {
        event.preventDefault();
        if (newPassword.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }
        try {
            await userApi.update(getId(resetUser), buildPayload(resetUser, { password: newPassword }));
            setResetUser(null);
            setNewPassword('');
            setNotice('Đã đặt lại mật khẩu cho tài khoản quản lý.');
        } catch (err) {
            setError(err.response?.data?.message || 'Đặt lại mật khẩu thất bại');
        }
    };

    const activeCount = managers.filter((manager) => manager.isActive).length;
    const assignedCount = managers.filter((manager) => manager.cinemaId).length;

    return (
        <div className="content-wrapper">
            <div className="content-header admin-page-header">
                <div className="container-fluid admin-page-title">
                    <div><p className="admin-eyebrow">Tổ chức vận hành</p><h1>Tài khoản quản lý rạp</h1><span>Tạo tài khoản, phân công chi nhánh và kiểm soát quyền truy cập.</span></div>
                    <button className="btn btn-primary admin-primary-action" onClick={() => openForm()}><i className="fas fa-plus"></i> Tạo Cinema Manager</button>
                </div>
            </div>

            <section className="content"><div className="container-fluid">
                {error && !showModal && !resetUser && <div className="alert alert-danger">{error}</div>}
                {notice && <div className="alert alert-success alert-dismissible">{notice}<button type="button" className="close" onClick={() => setNotice('')}><span>&times;</span></button></div>}

                <div className="admin-mini-stats">
                    <div><span><i className="fas fa-user-tie"></i></span><p>Tổng quản lý<strong>{managers.length}</strong></p></div>
                    <div><span className="green"><i className="fas fa-user-check"></i></span><p>Đang hoạt động<strong>{activeCount}</strong></p></div>
                    <div><span className="blue"><i className="fas fa-building"></i></span><p>Đã phân công<strong>{assignedCount}</strong></p></div>
                </div>

                <div className="card admin-data-card">
                    <div className="card-header admin-toolbar">
                        <form onSubmit={(event) => { event.preventDefault(); loadData(keyword); }} className="admin-search-box">
                            <i className="fas fa-search"></i><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm tên, email, số điện thoại..." />
                        </form>
                        <select className="form-control admin-filter-select" value={cinemaFilter} onChange={(event) => setCinemaFilter(event.target.value)}>
                            <option value="">Tất cả chi nhánh</option>
                            {cinemas.map((cinema) => <option key={cinema.cinemaId || cinema.id} value={cinema.cinemaId || cinema.id}>{cinema.cinemaName}</option>)}
                        </select>
                    </div>
                    <div className="card-body p-0">
                        {loading ? <div className="admin-loading"><div className="spinner-border text-primary"></div></div> : (
                            <div className="table-responsive"><table className="table admin-table">
                                <thead><tr><th>Quản lý</th><th>Liên hệ</th><th>Chi nhánh phụ trách</th><th>Trạng thái</th><th className="text-right">Thao tác</th></tr></thead>
                                <tbody>
                                    {managers.length === 0 ? <tr><td colSpan="5"><div className="admin-empty-state"><i className="fas fa-user-tie"></i><strong>Chưa có tài khoản quản lý</strong><span>Tạo tài khoản và phân công cho một chi nhánh.</span></div></td></tr> : managers.map((manager) => (
                                        <tr key={getId(manager)}>
                                            <td><div className="admin-person-cell"><span>{String(manager.fullName || 'M').charAt(0).toUpperCase()}</span><div><strong>{manager.fullName}</strong><small>ID #{getId(manager)}</small></div></div></td>
                                            <td><strong>{manager.email}</strong><small className="d-block text-muted">{manager.phone || 'Chưa có số điện thoại'}</small></td>
                                            <td><span className={`admin-cinema-chip ${manager.cinemaId ? '' : 'unassigned'}`}><i className="fas fa-building"></i>{cinemaName(manager.cinemaId)}</span></td>
                                            <td><span className={`admin-status ${manager.isActive ? 'success' : 'muted'}`}><i></i>{manager.isActive ? 'Đang hoạt động' : 'Đã khóa'}</span></td>
                                            <td className="text-right admin-row-actions">
                                                <button className="btn" title="Chỉnh sửa" onClick={() => openForm(manager)}><i className="fas fa-pen"></i></button>
                                                <button className="btn" title="Đặt lại mật khẩu" onClick={() => { setResetUser(manager); setNewPassword(''); setError(''); }}><i className="fas fa-key"></i></button>
                                                <button className={`btn ${manager.isActive ? 'danger' : 'success'}`} title={manager.isActive ? 'Khóa' : 'Mở khóa'} onClick={() => toggleStatus(manager)}><i className={`fas fa-${manager.isActive ? 'lock' : 'unlock'}`}></i></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></div>
                        )}
                    </div>
                </div>
            </div></section>

            {showModal && <><div className="modal fade show admin-modal" style={{ display: 'block' }}><div className="modal-dialog modal-lg"><div className="modal-content">
                <form onSubmit={submitForm}><div className="modal-header"><div><small>TÀI KHOẢN QUẢN LÝ</small><h5>{editing ? 'Cập nhật Cinema Manager' : 'Tạo Cinema Manager mới'}</h5></div><button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button></div>
                <div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}<div className="row">
                    <div className="col-md-6 form-group"><label>Họ và tên *</label><input className="form-control" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
                    <div className="col-md-6 form-group"><label>Email đăng nhập *</label><input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                    <div className="col-md-6 form-group"><label>Số điện thoại</label><input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                    <div className="col-md-6 form-group"><label>Chi nhánh phụ trách *</label><select className="form-control" value={form.cinemaId} onChange={(e) => setForm({ ...form, cinemaId: e.target.value })} required><option value="">Chọn chi nhánh</option>{cinemas.filter((cinema) => cinema.isActive !== false).map((cinema) => <option key={cinema.cinemaId || cinema.id} value={cinema.cinemaId || cinema.id}>{cinema.cinemaName}</option>)}</select></div>
                    {!editing && <div className="col-md-6 form-group"><label>Mật khẩu ban đầu *</label><input type="password" minLength="6" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /><small className="form-text text-muted">Tối thiểu 6 ký tự.</small></div>}
                    <div className="col-md-6 form-group"><label>Trạng thái</label><select className="form-control" value={String(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}><option value="true">Đang hoạt động</option><option value="false">Tạm khóa</option></select></div>
                </div></div><div className="modal-footer"><button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Hủy</button><button className="btn btn-primary">{editing ? 'Lưu thay đổi' : 'Tạo tài khoản'}</button></div></form>
            </div></div></div><div className="modal-backdrop fade show"></div></>}

            {resetUser && <><div className="modal fade show admin-modal" style={{ display: 'block' }}><div className="modal-dialog"><div className="modal-content"><form onSubmit={resetPassword}>
                <div className="modal-header"><div><small>BẢO MẬT</small><h5>Đặt lại mật khẩu</h5></div><button type="button" className="close" onClick={() => setResetUser(null)}><span>&times;</span></button></div>
                <div className="modal-body">{error && <div className="alert alert-danger">{error}</div>}<p className="text-muted">Tạo mật khẩu mới cho <strong>{resetUser.fullName}</strong>.</p><div className="form-group"><label>Mật khẩu mới</label><input type="password" minLength="6" className="form-control" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus required /></div></div>
                <div className="modal-footer"><button type="button" className="btn btn-light" onClick={() => setResetUser(null)}>Hủy</button><button className="btn btn-primary">Cập nhật mật khẩu</button></div>
            </form></div></div></div><div className="modal-backdrop fade show"></div></>}
        </div>
    );
};

export default AdminCinemaManagers;
