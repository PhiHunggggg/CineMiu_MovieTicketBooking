import { formatNumber, read } from './dashboardUtils';

const TicketStatusPanel = ({ soldTicketRatio, soldTickets, statuses }) => (
    <div className="admin-panel admin-status-panel">
        <div className="admin-panel-header">
            <div>
                <p className="admin-eyebrow">Vận hành vé</p>
                <h2>Trạng thái vé</h2>
                <span>Phân loại vé theo trạng thái trong kỳ</span>
            </div>
        </div>
        <div className="admin-ticket-ring" style={{ '--sold': `${soldTicketRatio}%` }}>
            <div>
                <strong>{formatNumber(soldTickets)}</strong>
                <span>Vé thành công</span>
            </div>
        </div>
        <div className="admin-status-list">
            {statuses.length ? (
                statuses.map((item, index) => (
                    <div key={read(item, 'status', 'Status') || index}>
                        <span className={`status-color status-${index}`}></span>
                        <p>
                            {read(item, 'label', 'Label')}
                            <strong>{formatNumber(read(item, 'totalTickets', 'TotalTickets'))}</strong>
                        </p>
                    </div>
                ))
            ) : (
                <div className="admin-empty-inline">Chưa có dữ liệu vé trong kỳ.</div>
            )}
        </div>
    </div>
);

export default TicketStatusPanel;

