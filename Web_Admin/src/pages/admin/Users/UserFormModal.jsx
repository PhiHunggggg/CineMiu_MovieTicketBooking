const UserFormModal = ({
    editingUser,
    error,
    formData,
    onClose,
    onSubmit,
    roles,
    setFormData,
    show,
}) => {
    if (!show) return null;

    return (
        <>
            <div className="modal fade show" style={{ display: 'block', overflowY: 'auto' }} tabIndex="-1">
                <div className="modal-dialog" style={{ marginTop: '10px', marginBottom: '10px' }}>
                    <div className="modal-content" style={{ maxHeight: 'calc(100vh - 20px)' }}>
                        <div className="modal-header">
                            <h5 className="modal-title">{editingUser ? 'Cập nhật người dùng' : 'Thêm người dùng'}</h5>
                            <button type="button" className="close" onClick={onClose}>
                                <span>&times;</span>
                            </button>
                        </div>
                        <form onSubmit={onSubmit} className="d-flex flex-column" style={{ minHeight: 0 }}>
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
                                <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                                <button type="submit" className="btn btn-primary">{editingUser ? 'Lưu thay đổi' : 'Tạo mới'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    );
};

export default UserFormModal;
