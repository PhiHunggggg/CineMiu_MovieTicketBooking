import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const modules = [
    { to: '/admin/movies', icon: 'fa-film', title: 'Dữ liệu phim', description: 'Quản lý danh mục và trạng thái phim' },
    { to: '/admin/cinemas', icon: 'fa-building', title: 'Hệ thống rạp', description: 'Quản lý chi nhánh và thông tin vận hành' },
    { to: '/admin/users', icon: 'fa-users-gear', title: 'Tài khoản', description: 'Quản lý người dùng và phân quyền' },
    { to: '/admin/notifications', icon: 'fa-bell', title: 'Thông báo', description: 'Theo dõi kênh gửi thông báo hệ thống' },
];

export default function System() {
    const { user } = useAuth();
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <h1 className="m-0">Hệ thống</h1>
                    <p className="page-description">Thông tin cấu hình và các khu vực quản trị cốt lõi.</p>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    <div className="system-summary-grid">
                        <div className="system-summary-card">
                            <span className="system-summary-icon blue"><i className="fas fa-server" /></span>
                            <span><small>API đang sử dụng</small><strong>{apiUrl}</strong></span>
                        </div>
                        <div className="system-summary-card">
                            <span className="system-summary-icon green"><i className="fas fa-shield-halved" /></span>
                            <span><small>Phiên đăng nhập</small><strong>{user?.email || 'Chưa xác định'}</strong></span>
                        </div>
                        <div className="system-summary-card">
                            <span className="system-summary-icon amber"><i className="fas fa-code-branch" /></span>
                            <span><small>Phiên bản giao diện</small><strong>Admin 1.0.0</strong></span>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title mb-0"><i className="fas fa-sliders mr-2" />Khu vực cấu hình</h3>
                        </div>
                        <div className="card-body">
                            <div className="system-module-grid">
                                {modules.map((module) => (
                                    <Link className="system-module-card" to={module.to} key={module.to}>
                                        <span><i className={`fas ${module.icon}`} /></span>
                                        <strong>{module.title}</strong>
                                        <small>{module.description}</small>
                                        <i className="fas fa-arrow-right" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
