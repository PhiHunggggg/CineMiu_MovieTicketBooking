import { getRoleName, getUserId, getUserName } from './usersUtils';

const UserTableCard = ({
    cinemas,
    customerUsers,
    error,
    keyword,
    loading,
    onCreate,
    onEdit,
    onHistory,
    onSearch,
    onToggleStatus,
    roles,
    setKeyword,
    showModal,
}) => (
    <div className="card">
        <div className="card-header">
            <div className="row">
                <div className="col-md-7">
                    <form onSubmit={onSearch} className="form-inline">
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
                    <button className="btn btn-success" onClick={onCreate}>
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
                                <th>Chi nhánh</th>
                                <th>Trạng thái</th>
                                <th style={{ width: '145px' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customerUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center">Không tìm thấy người dùng</td>
                                </tr>
                            ) : (
                                customerUsers.map((user) => (
                                    <tr key={getUserId(user)}>
                                        <td>{getUserName(user)}</td>
                                        <td>{user.email}</td>
                                        <td>{user.phone || '-'}</td>
                                        <td><span className="badge badge-info">{getRoleName(roles, user.roleId)}</span></td>
                                        <td>{cinemas.find((cinema) => Number(cinema.cinemaId || cinema.id) === Number(user.cinemaId))?.cinemaName || '-'}</td>
                                        <td>
                                            <span className={`badge ${user.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                                {user.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <button className="btn btn-sm btn-light mr-1" type="button" title="Lịch sử đặt vé" onClick={() => onHistory(user)}>
                                                <i className="fas fa-history"></i>
                                            </button>
                                            <button className="btn btn-sm btn-info mr-1" type="button" onClick={() => onEdit(user)}>
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button className={`btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-success'}`} type="button" title={user.isActive ? 'Khóa tài khoản' : 'Mở tài khoản'} onClick={() => onToggleStatus(user)}>
                                                <i className={`fas fa-${user.isActive ? 'lock' : 'unlock'}`}></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    </div>
);

export default UserTableCard;
