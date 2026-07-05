import { Link } from 'react-router-dom';
import { formatCurrency } from './dashboardUtils';
import RevenueChart from './RevenueChart';

const RevenuePanel = ({ monthly, revenue, year }) => (
    <div className="admin-panel admin-chart-panel">
        <div className="admin-panel-header">
            <div>
                <p className="admin-eyebrow">Hiệu suất tài chính</p>
                <h2>Biểu đồ doanh thu</h2>
                <span>Doanh thu theo tháng trong năm {year}</span>
            </div>
            <Link to="/admin/revenue">
                Xem báo cáo <i className="fas fa-arrow-right"></i>
            </Link>
        </div>
        <div className="admin-chart-summary">
            <strong>{formatCurrency(revenue)}</strong>
            <span>
                <i className="fas fa-circle"></i> Doanh thu thực tế
            </span>
        </div>
        <RevenueChart rows={monthly} />
    </div>
);

export default RevenuePanel;

