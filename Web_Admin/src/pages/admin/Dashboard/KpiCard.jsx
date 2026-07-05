import { Link } from 'react-router-dom';

const KpiCard = ({ label, value, icon, tone, detail, to }) => {
    const content = (
        <>
            <div className="admin-kpi-head">
                <span className={`admin-kpi-icon ${tone}`}>
                    <i className={`fas ${icon}`}></i>
                </span>
                <span className="admin-kpi-menu">
                    <i className="fas fa-ellipsis-h"></i>
                </span>
            </div>
            <div className="admin-kpi-value">{value}</div>
            <div className="admin-kpi-label">{label}</div>
            <div className="admin-kpi-detail">
                <i className="fas fa-arrow-trend-up"></i>
                {detail}
            </div>
        </>
    );

    return to ? (
        <Link className="admin-kpi-card" to={to}>
            {content}
        </Link>
    ) : (
        <div className="admin-kpi-card">{content}</div>
    );
};

export default KpiCard;

