import { Link } from 'react-router-dom';

const QuickActionsPanel = () => (
    <div className="admin-panel admin-quick-panel">
        <div className="admin-panel-header">
            <div>
                <p className="admin-eyebrow">Truy cập nhanh</p>
                <h2>Tác vụ thường dùng</h2>
                <span>Đi thẳng đến khu vực cần xử lý</span>
            </div>
        </div>
        <div className="admin-quick-grid">
            <Link to="/admin/movies">
                <span>
                    <i className="fas fa-plus"></i>
                </span>
                <strong>Thêm phim</strong>
                <small>Cập nhật danh mục phim</small>
            </Link>
            <Link to="/admin/bookings">
                <span>
                    <i className="fas fa-search"></i>
                </span>
                <strong>Tra cứu vé</strong>
                <small>Tìm theo mã đặt vé</small>
            </Link>
            <Link to="/admin/promotions">
                <span>
                    <i className="fas fa-percent"></i>
                </span>
                <strong>Tạo ưu đãi</strong>
                <small>Mã giảm giá mới</small>
            </Link>
            <Link to="/admin/managers">
                <span>
                    <i className="fas fa-user-plus"></i>
                </span>
                <strong>Thêm quản lý</strong>
                <small>Phân công chi nhánh</small>
            </Link>
        </div>
    </div>
);

export default QuickActionsPanel;

