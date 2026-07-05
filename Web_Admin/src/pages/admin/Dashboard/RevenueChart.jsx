import { formatCurrency, read } from './dashboardUtils';

const RevenueChart = ({ rows }) => {
    const width = 760;
    const height = 230;
    const padding = { top: 18, right: 18, bottom: 34, left: 18 };
    const values = rows.map((row) => Number(read(row, 'totalRevenue', 'TotalRevenue') || 0));
    const maximum = Math.max(...values, 1);
    const step = (width - padding.left - padding.right) / Math.max(rows.length - 1, 1);
    const points = values.map((value, index) => ({
        x: padding.left + index * step,
        y: padding.top + (height - padding.top - padding.bottom) * (1 - value / maximum),
        value,
    }));
    const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const area = points.length
        ? `${line} L ${points.at(-1).x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
        : '';

    return (
        <div className="admin-revenue-chart">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ doanh thu 12 tháng">
                <defs>
                    <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#ec193f" stopOpacity=".24" />
                        <stop offset="1" stopColor="#ec193f" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75, 1].map((ratio) => (
                    <line
                        key={ratio}
                        x1={padding.left}
                        x2={width - padding.right}
                        y1={padding.top + (height - padding.top - padding.bottom) * ratio}
                        y2={padding.top + (height - padding.top - padding.bottom) * ratio}
                        className="chart-grid-line"
                    />
                ))}
                <path d={area} fill="url(#revenueArea)" />
                <path d={line} className="chart-line" />
                {points.map((point, index) => (
                    <g key={index}>
                        <circle cx={point.x} cy={point.y} r="4" className="chart-point">
                            <title>{`Tháng ${index + 1}: ${formatCurrency(point.value)}`}</title>
                        </circle>
                        <text x={point.x} y={height - 10} textAnchor="middle" className="chart-label">
                            T{index + 1}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

export default RevenueChart;

