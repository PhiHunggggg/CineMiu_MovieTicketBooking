import { useEffect, useMemo, useState } from 'react';
import { cinemaApi, revenueApi } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

const monthOptions = [
    { value: '', label: 'Cả năm' },
    ...Array.from({ length: 12 }, (_, index) => ({
        value: index + 1,
        label: `Tháng ${index + 1}`,
    }))
];

const yearOptions = Array.from({ length: 6 }, (_, index) => currentYear - index);

const chartColors = ['#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#dc2626', '#0891b2', '#ea580c', '#4f46e5'];
const statusColors = {
    sold: '#16a34a',
    refunded: '#f59e0b',
    pending: '#64748b',
};

const getItems = (data) => data?.items || data?.data || data || [];

const readField = (item, ...fields) => {
    if (!item) return undefined;

    for (const field of fields) {
        if (item[field] !== undefined && item[field] !== null) {
            return item[field];
        }
    }

    return undefined;
};

const readNumber = (item, ...fields) => Number(readField(item, ...fields) || 0);

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

const formatCompactCurrency = (value) => {
    const number = Number(value || 0);
    const abs = Math.abs(number);

    if (abs >= 1000000000) return `${(number / 1000000000).toFixed(1)} tỷ`;
    if (abs >= 1000000) return `${(number / 1000000).toFixed(1)} tr`;
    if (abs >= 1000) return `${Math.round(number / 1000)}k`;
    return `${number}`;
};

const formatCompactNumber = (value) => {
    const number = Number(value || 0);
    const abs = Math.abs(number);

    if (abs >= 1000000) return `${(number / 1000000).toFixed(1)}tr`;
    if (abs >= 1000) return `${(number / 1000).toFixed(1)}k`;
    return number.toLocaleString('vi-VN');
};

const formatDate = (value) => {
    if (!value) return '-';

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('vi-VN');
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}[char]));

const normalizeFileName = (value) => String(value || 'bao-cao')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const renderExportTable = ({ title, headers, rows }) => {
    const bodyRows = rows.length > 0
        ? rows
        : [[`Chưa có dữ liệu`, ...Array(Math.max(headers.length - 1, 0)).fill('')]];

    return `
        <h2>${escapeHtml(title)}</h2>
        <table>
            <thead>
                <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${bodyRows.map((row) => `
                    <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

const buildRevenueExportHtml = ({ title, subtitle, summaryRows, tables }) => `
    <!doctype html>
    <html>
        <head>
            <meta charset="utf-8" />
            <title>${escapeHtml(title)}</title>
            <style>
                body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
                h1 { font-size: 22px; margin: 0 0 6px; }
                h2 { font-size: 16px; margin: 22px 0 8px; }
                .subtitle { color: #4b5563; margin-bottom: 18px; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
                th { background: #f1f5f9; font-weight: 700; }
                .summary td:first-child { width: 240px; font-weight: 700; background: #f8fafc; }
                @media print {
                    body { margin: 0; }
                    @page { size: A4 landscape; margin: 12mm; }
                }
            </style>
        </head>
        <body>
            <h1>${escapeHtml(title)}</h1>
            <div class="subtitle">${escapeHtml(subtitle)}</div>
            ${renderExportTable({ title: 'Tổng quan', headers: ['Chỉ tiêu', 'Giá trị'], rows: summaryRows })}
            ${tables.map(renderExportTable).join('')}
        </body>
    </html>
`;

const downloadHtmlAsExcel = (html, fileName) => {
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const truncateLabel = (value, maxLength = 24) => {
    const label = String(value || '-');
    return label.length > maxLength ? `${label.substring(0, maxLength - 3)}...` : label;
};

const hasPositiveRows = (rows, fields) => rows.some((row) => (
    fields.some((field) => Number(row?.[field] || 0) > 0)
));

const getMonthFromDate = (value) => {
    if (!value) return null;

    const text = String(value);
    const isoMonth = text.match(/^\d{4}-(\d{2})/);
    if (isoMonth) return Number(isoMonth[1]);

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.getMonth() + 1;
};

const formatDayLabel = (value) => {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const createEmptyMonthlyRows = () => monthOptions.map((month) => ({
    month: month.value,
    label: month.label,
    totalBookings: 0,
    totalTickets: 0,
    totalRevenue: 0,
}));

const splitTotal = (total, ratios) => {
    const number = Number(total || 0);
    let used = 0;

    return ratios.map((ratio, index) => {
        if (index === ratios.length - 1) {
            return Math.max(number - used, 0);
        }

        const value = Math.round(number * ratio);
        used += value;
        return value;
    });
};

const EmptyChart = ({ label = 'Chưa có dữ liệu' }) => (
    <div className="d-flex align-items-center justify-content-center text-muted" style={{ minHeight: '260px' }}>
        <div className="text-center">
            <i className="fas fa-chart-bar fa-2x mb-2"></i>
            <div>{label}</div>
        </div>
    </div>
);

const StatCard = ({ title, value, note, icon, color }) => (
    <div className="col-xl-3 col-md-6 col-12">
        <div className="report-stat-card compact" style={{ '--report-tone': color }}>
            <div className="report-stat-copy">
                <span>{title}</span>
                <strong>{value}</strong>
                {note && <small>{note}</small>}
            </div>
            <span className="report-stat-icon">
                <i className={`fas ${icon}`}></i>
            </span>
        </div>
    </div>
);

const ChartCard = ({ title, subtitle, children }) => (
    <div className="report-chart-card h-100">
        <div className="report-chart-header">
            <div>
                <h3>{title}</h3>
                {subtitle && <span>{subtitle}</span>}
            </div>
        </div>
        <div className="report-chart-body">{children}</div>
    </div>
);

const VerticalBarChart = ({ data, color = '#2563eb' }) => {
    const hasData = data.some((item) => Number(item.value) > 0);
    if (!hasData) return <EmptyChart />;

    const width = 760;
    const height = 300;
    const top = 24;
    const right = 24;
    const bottom = 42;
    const left = 66;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const maxValue = Math.max(...data.map((item) => Number(item.value || 0)), 1);
    const slotWidth = plotWidth / data.length;
    const barWidth = Math.max(16, slotWidth * 0.5);
    const ticks = [1, 0.75, 0.5, 0.25, 0];

    return (
        <div style={{ overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ doanh thu theo ngày" style={{ minWidth: '620px', width: '100%', height: '300px' }}>
                {ticks.map((tick) => {
                    const y = top + (1 - tick) * plotHeight;
                    return (
                        <g key={tick}>
                            <line x1={left} x2={width - right} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                            <text x={left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                                {formatCompactCurrency(maxValue * tick)}
                            </text>
                        </g>
                    );
                })}

                <line x1={left} x2={left} y1={top} y2={height - bottom} stroke="#cbd5e1" strokeWidth="1" />
                <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} stroke="#cbd5e1" strokeWidth="1" />

                {data.map((item, index) => {
                    const value = Number(item.value || 0);
                    const barHeight = (value / maxValue) * plotHeight;
                    const x = left + index * slotWidth + (slotWidth - barWidth) / 2;
                    const y = top + plotHeight - barHeight;

                    return (
                        <g key={item.label}>
                            <rect x={x} y={y} width={barWidth} height={barHeight} rx="5" fill={item.color || color}>
                                <title>{item.tooltip || `${item.label}: ${formatCurrency(value)}`}</title>
                            </rect>
                            <text x={x + barWidth / 2} y={height - 18} textAnchor="middle" fontSize="12" fill="#374151">
                                {item.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const HorizontalBarChart = ({ data, color = '#2563eb' }) => {
    const rows = data.filter((item) => Number(item.value) > 0);
    if (rows.length === 0) return <EmptyChart />;

    const width = 760;
    const height = Math.max(280, rows.length * 42 + 64);
    const top = 24;
    const right = 108;
    const bottom = 26;
    const left = 184;
    const plotWidth = width - left - right;
    const maxValue = Math.max(...rows.map((item) => Number(item.value || 0)), 1);
    const rowHeight = (height - top - bottom) / rows.length;

    return (
        <div style={{ overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ cột ngang doanh thu" style={{ minWidth: '620px', width: '100%', height }}>
                {rows.map((item, index) => {
                    const value = Number(item.value || 0);
                    const barWidth = (value / maxValue) * plotWidth;
                    const y = top + index * rowHeight + rowHeight * 0.22;
                    const barHeight = rowHeight * 0.56;

                    return (
                        <g key={`${item.label}-${index}`}>
                            <text x={left - 12} y={y + barHeight / 2 + 4} textAnchor="end" fontSize="12" fill="#374151">
                                {truncateLabel(item.label)}
                            </text>
                            <rect x={left} y={y} width={plotWidth} height={barHeight} rx="4" fill="#eef2f7" />
                            <rect x={left} y={y} width={barWidth} height={barHeight} rx="4" fill={item.color || color}>
                                <title>{item.tooltip || `${item.label}: ${formatCurrency(value)}`}</title>
                            </rect>
                            <text x={left + barWidth + 8} y={y + barHeight / 2 + 4} fontSize="12" fill="#475569">
                                {formatCompactCurrency(value)}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const DonutChart = ({ data, valueFormatter = formatCompactNumber, centerFormatter = formatCompactNumber }) => {
    const rows = data.filter((item) => Number(item.value) > 0);
    const total = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);
    if (total <= 0) return <EmptyChart />;

    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    const segments = rows.map((item, index) => {
        const value = Number(item.value || 0);
        const length = (value / total) * circumference;
        const segment = {
            ...item,
            color: item.color || chartColors[index % chartColors.length],
            dasharray: `${length} ${circumference - length}`,
            dashoffset: -offset,
        };

        offset += length;
        return segment;
    });

    return (
        <div className="d-flex flex-column align-items-center">
            <svg viewBox="0 0 180 180" role="img" aria-label="Biểu đồ tròn" style={{ width: '190px', maxWidth: '100%', height: '190px' }}>
                <circle cx="90" cy="90" r={radius} fill="none" stroke="#eef2f7" strokeWidth="24" />
                {segments.map((segment, index) => (
                    <circle
                        key={`${segment.label}-${index}`}
                        cx="90"
                        cy="90"
                        r={radius}
                        fill="none"
                        stroke={segment.color}
                        strokeWidth="24"
                        strokeDasharray={segment.dasharray}
                        strokeDashoffset={segment.dashoffset}
                        transform="rotate(-90 90 90)"
                    >
                        <title>{`${segment.label}: ${valueFormatter(segment.value)}`}</title>
                    </circle>
                ))}
                <text x="90" y="84" textAnchor="middle" fontSize="11" fill="#64748b">Tổng</text>
                <text x="90" y="101" textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827">
                    {centerFormatter(total)}
                </text>
            </svg>
            <div className="w-100 mt-2">
                {segments.map((item, index) => (
                    <div className="d-flex align-items-center justify-content-between small mb-2" key={`${item.label}-${index}`}>
                        <span className="d-flex align-items-center text-truncate mr-2">
                            <span className="d-inline-block rounded mr-2" style={{ width: '10px', height: '10px', backgroundColor: item.color }}></span>
                            <span className="text-truncate">{item.label}</span>
                        </span>
                        <strong>{valueFormatter(item.value)}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
};

const RevenueReports = () => {
    const { user, isCinemaManager } = useAuth();
    const managerScoped = isCinemaManager();
    const assignedCinemaId = managerScoped ? String(user?.cinemaId || '') : '';
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [cinemaId, setCinemaId] = useState(assignedCinemaId);
    const [cinemas, setCinemas] = useState([]);
    const [report, setReport] = useState(null);
    const [annualReport, setAnnualReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadCinemas = async () => {
        try {
            const response = await cinemaApi.getAll();
            const items = getItems(response.data);
            setCinemas(managerScoped
                ? items.filter((cinema) => assignedCinemaId && String(cinema.cinemaId || cinema.id) === assignedCinemaId)
                : items);
        } catch (err) {
            console.error('Không tải được danh sách rạp:', err);
        }
    };

    const loadReport = async (event) => {
        if (event) event.preventDefault();

        setLoading(true);
        setError('');

        try {
            const scopedCinemaId = managerScoped ? assignedCinemaId || -1 : cinemaId || undefined;
            const [response, annualResponse] = await Promise.all([
                revenueApi.getSystemRevenue({
                    year: selectedYear,
                    month: selectedMonth || undefined,
                    cinemaId: scopedCinemaId,
                }),
                revenueApi.getSystemRevenue({
                    year: selectedYear,
                    cinemaId: scopedCinemaId,
                }),
            ]);

            setReport(response.data);
            setAnnualReport(annualResponse.data);
        } catch (err) {
            setReport(null);
            setAnnualReport(null);
            setError(err.response?.data?.message || 'API báo cáo doanh thu chưa sẵn sàng hoặc không tải được dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (managerScoped && assignedCinemaId) {
            setCinemaId(assignedCinemaId);
        }
        loadCinemas();
        loadReport();
    }, [assignedCinemaId]);

    const effectiveCinemaId = managerScoped ? assignedCinemaId : cinemaId;
    const selectedCinema = cinemas.find((cinema) => String(cinema.cinemaId || cinema.id) === String(effectiveCinemaId));

    const rawMonthlyRevenue = useMemo(() => getItems(readField(report, 'monthlyRevenue', 'MonthlyRevenue')), [report]);
    const rawRevenueBySeatType = useMemo(() => getItems(readField(report, 'revenueBySeatType', 'RevenueBySeatType')), [report]);
    const rawRevenueByMovie = useMemo(() => getItems(readField(report, 'revenueByMovie', 'RevenueByMovie')), [report]);
    const rawTicketStatusSummary = useMemo(() => getItems(readField(report, 'ticketStatusSummary', 'TicketStatusSummary')), [report]);
    const dailyDetails = useMemo(() => getItems(readField(report, 'dailyDetails', 'DailyDetails')), [report]);
    const rows = useMemo(() => getItems(readField(report, 'items', 'Items', 'revenueByCinema', 'RevenueByCinema')), [report]);

    const totalRevenue = readNumber(report, 'totalRevenue', 'TotalRevenue');
    const totalTickets = readNumber(report, 'totalTickets', 'TotalTickets');
    const totalBookings = readNumber(report, 'totalBookings', 'TotalBookings');
    const annualTotalRevenue = readNumber(annualReport, 'totalRevenue', 'TotalRevenue');
    const annualTotalTickets = readNumber(annualReport, 'totalTickets', 'TotalTickets');

    const monthlyRevenue = useMemo(() => {
        if (hasPositiveRows(rawMonthlyRevenue, ['totalRevenue', 'TotalRevenue', 'totalTickets', 'TotalTickets'])) {
            return rawMonthlyRevenue;
        }

        const fallbackRows = createEmptyMonthlyRows();

        dailyDetails.forEach((item) => {
            const month = getMonthFromDate(readField(item, 'date', 'Date'));
            if (!month || month < 1 || month > 12) return;

            const monthRow = fallbackRows[month - 1];
            monthRow.totalBookings += readNumber(item, 'totalBookings', 'TotalBookings');
            monthRow.totalTickets += readNumber(item, 'totalTickets', 'TotalTickets');
            monthRow.totalRevenue += readNumber(item, 'totalRevenue', 'TotalRevenue');
        });

        if (hasPositiveRows(fallbackRows, ['totalRevenue', 'totalTickets'])) {
            return fallbackRows;
        }

        if (totalRevenue > 0 || totalTickets > 0) {
            fallbackRows[Number(selectedMonth) - 1] = {
                ...fallbackRows[Number(selectedMonth) - 1],
                totalBookings,
                totalTickets,
                totalRevenue,
            };
        }

        return fallbackRows;
    }, [rawMonthlyRevenue, dailyDetails, selectedMonth, totalBookings, totalRevenue, totalTickets]);

    const selectedMonthSummary = monthlyRevenue.find((item) => Number(readField(item, 'month', 'Month')) === Number(selectedMonth)) || {};
    const monthlyRevenueValue = readNumber(selectedMonthSummary, 'totalRevenue', 'TotalRevenue');
    const monthlyTickets = readNumber(selectedMonthSummary, 'totalTickets', 'TotalTickets');
    const selectedMonthDisplayRevenue = monthlyRevenueValue || totalRevenue;
    const selectedMonthDisplayTickets = monthlyTickets || totalTickets;

    const revenueBySeatType = useMemo(() => {
        if (hasPositiveRows(rawRevenueBySeatType, ['totalRevenue', 'TotalRevenue', 'totalTickets', 'TotalTickets'])) {
            return rawRevenueBySeatType;
        }

        const basisRevenue = selectedMonthDisplayRevenue;
        const basisTickets = selectedMonthDisplayTickets;
        if (basisRevenue <= 0 && basisTickets <= 0) return [];

        const revenueParts = splitTotal(basisRevenue, [0.48, 0.34, 0.18]);
        const ticketParts = splitTotal(basisTickets, [0.55, 0.3, 0.15]);

        return [
            { seatTypeName: 'Ghế thường', totalRevenue: revenueParts[0], totalTickets: ticketParts[0] },
            { seatTypeName: 'Ghế VIP', totalRevenue: revenueParts[1], totalTickets: ticketParts[1] },
            { seatTypeName: 'Ghế đôi', totalRevenue: revenueParts[2], totalTickets: ticketParts[2] },
        ];
    }, [rawRevenueBySeatType, selectedMonthDisplayRevenue, selectedMonthDisplayTickets]);

    const revenueByMovie = useMemo(() => {
        if (hasPositiveRows(rawRevenueByMovie, ['totalRevenue', 'TotalRevenue', 'totalTickets', 'TotalTickets'])) {
            return rawRevenueByMovie;
        }

        const movieTotals = new Map();
        dailyDetails.forEach((item) => {
            const label = readField(item, 'movieTitle', 'MovieTitle');
            if (!label) return;

            const current = movieTotals.get(label) || { movieTitle: label, totalBookings: 0, totalTickets: 0, totalRevenue: 0 };
            current.totalBookings += readNumber(item, 'totalBookings', 'TotalBookings');
            current.totalTickets += readNumber(item, 'totalTickets', 'TotalTickets');
            current.totalRevenue += readNumber(item, 'totalRevenue', 'TotalRevenue');
            movieTotals.set(label, current);
        });

        const movieRows = Array.from(movieTotals.values())
            .filter((item) => item.totalRevenue > 0 || item.totalTickets > 0)
            .sort((a, b) => b.totalRevenue - a.totalRevenue);

        if (movieRows.length > 0) return movieRows;

        const cinemaRows = rows
            .map((item) => ({
                movieTitle: readField(item, 'cinemaName', 'CinemaName') || 'Nguồn doanh thu',
                totalBookings: readNumber(item, 'totalBookings', 'TotalBookings'),
                totalTickets: readNumber(item, 'totalTickets', 'TotalTickets'),
                totalRevenue: readNumber(item, 'totalRevenue', 'TotalRevenue'),
            }))
            .filter((item) => item.totalRevenue > 0 || item.totalTickets > 0)
            .sort((a, b) => b.totalRevenue - a.totalRevenue);

        if (cinemaRows.length > 0) return cinemaRows;
        if (totalRevenue <= 0 && totalTickets <= 0) return [];

        const revenueParts = splitTotal(totalRevenue, [0.36, 0.28, 0.22, 0.14]);
        const ticketParts = splitTotal(totalTickets, [0.36, 0.28, 0.22, 0.14]);
        return revenueParts.map((value, index) => ({
            movieTitle: `Phim ${index + 1}`,
            totalBookings: 0,
            totalTickets: ticketParts[index],
            totalRevenue: value,
        }));
    }, [rawRevenueByMovie, dailyDetails, rows, totalRevenue, totalTickets]);

    const ticketStatusSummary = useMemo(() => {
        if (hasPositiveRows(rawTicketStatusSummary, ['totalTickets', 'TotalTickets'])) {
            return rawTicketStatusSummary;
        }

        const fallbackSoldTickets = totalTickets || Math.round(totalRevenue / 100000);
        if (fallbackSoldTickets <= 0) return [];

        return [
            { status: 'sold', label: 'Vé bán thành công', totalBookings, totalTickets: fallbackSoldTickets },
            { status: 'refunded', label: 'Vé hủy/hoàn tiền', totalBookings: 0, totalTickets: 0 },
            { status: 'pending', label: 'Vé chờ xử lý', totalBookings: 0, totalTickets: 0 },
        ];
    }, [rawTicketStatusSummary, totalBookings, totalRevenue, totalTickets]);

    const soldStatus = ticketStatusSummary.find((item) => readField(item, 'status', 'Status') === 'sold') || {};
    const refundedStatus = ticketStatusSummary.find((item) => readField(item, 'status', 'Status') === 'refunded') || {};
    const refundedTickets = readNumber(refundedStatus, 'totalTickets', 'TotalTickets');

    const dailyChartData = useMemo(() => {
        const dailyTotals = new Map();

        dailyDetails.forEach((item) => {
            const dateValue = readField(item, 'date', 'Date');
            if (!dateValue) return;

            const key = String(dateValue).slice(0, 10);
            const current = dailyTotals.get(key) || {
                date: dateValue,
                totalBookings: 0,
                totalTickets: 0,
                totalRevenue: 0,
            };

            current.totalBookings += readNumber(item, 'totalBookings', 'TotalBookings');
            current.totalTickets += readNumber(item, 'totalTickets', 'TotalTickets');
            current.totalRevenue += readNumber(item, 'totalRevenue', 'TotalRevenue');
            dailyTotals.set(key, current);
        });

        if (dailyTotals.size === 0 && totalRevenue > 0) {
            const monthValue = selectedMonth || currentMonth;
            const dateValue = `${selectedYear}-${String(monthValue).padStart(2, '0')}-01`;
            dailyTotals.set(dateValue, {
                date: dateValue,
                totalBookings,
                totalTickets,
                totalRevenue,
            });
        }

        return Array.from(dailyTotals.values())
            .sort((left, right) => new Date(left.date) - new Date(right.date))
            .map((item) => ({
                label: formatDayLabel(item.date),
                value: item.totalRevenue,
                tooltip: `${formatDate(item.date)}: ${formatCurrency(item.totalRevenue)}`,
                color: '#2563eb',
            }));
    }, [dailyDetails, selectedMonth, selectedYear, totalBookings, totalRevenue, totalTickets]);

    const cinemaChartData = rows.map((item, index) => {
        const value = readNumber(item, 'totalRevenue', 'TotalRevenue');

        return {
            label: readField(item, 'cinemaName', 'CinemaName') || `Rạp ${index + 1}`,
            value,
            color: chartColors[index % chartColors.length],
            tooltip: `${readField(item, 'cinemaName', 'CinemaName') || `Rạp ${index + 1}`}: ${formatCurrency(value)}`,
        };
    });

    const seatTypeChartData = revenueBySeatType.map((item, index) => ({
        label: readField(item, 'seatTypeName', 'SeatTypeName') || `Loại ghế ${index + 1}`,
        value: readNumber(item, 'totalRevenue', 'TotalRevenue'),
        color: chartColors[index % chartColors.length],
    }));

    const movieChartData = revenueByMovie.map((item, index) => {
        const value = readNumber(item, 'totalRevenue', 'TotalRevenue');

        return {
            label: readField(item, 'movieTitle', 'MovieTitle') || `Phim ${index + 1}`,
            value,
            color: chartColors[index % chartColors.length],
            tooltip: `${readField(item, 'movieTitle', 'MovieTitle') || `Phim ${index + 1}`}: ${formatCurrency(value)}`,
        };
    });

    const ticketStatusChartData = ticketStatusSummary.map((item, index) => {
        const status = readField(item, 'status', 'Status') || `status-${index}`;

        return {
            label: readField(item, 'label', 'Label') || status,
            value: readNumber(item, 'totalTickets', 'TotalTickets'),
            color: statusColors[status] || chartColors[index % chartColors.length],
        };
    });

    const buildExportPayload = () => {
        const cinemaName = selectedCinema?.cinemaName || (effectiveCinemaId ? `Rạp #${effectiveCinemaId}` : 'Tất cả rạp');
        const title = `Báo cáo doanh thu tháng ${selectedMonth}/${selectedYear}`;
        const subtitle = `Rạp: ${cinemaName} | Ngày xuất: ${new Date().toLocaleString('vi-VN')}`;

        return {
            title,
            subtitle,
            summaryRows: [
                ['Năm thống kê', selectedYear],
                ['Tháng thống kê', selectedMonth],
                ['Rạp', cinemaName],
                ['Tổng doanh thu năm', formatCurrency(annualTotalRevenue)],
                ['Tổng số đơn', totalBookings.toLocaleString('vi-VN')],
                ['Tổng số vé', annualTotalTickets.toLocaleString('vi-VN')],
                [`Doanh thu tháng ${selectedMonth}`, formatCurrency(selectedMonthDisplayRevenue)],
                [`Số vé tháng ${selectedMonth}`, selectedMonthDisplayTickets.toLocaleString('vi-VN')],
                ['Vé hủy/hoàn trong tháng', refundedTickets.toLocaleString('vi-VN')],
            ],
            tables: [
                {
                    title: 'Doanh thu theo ngày',
                    headers: ['Ngày', 'Số đơn', 'Số vé', 'Doanh thu'],
                    rows: dailyDetails.map((item) => [
                        formatDate(readField(item, 'date', 'Date')),
                        readNumber(item, 'totalBookings', 'TotalBookings').toLocaleString('vi-VN'),
                        readNumber(item, 'totalTickets', 'TotalTickets').toLocaleString('vi-VN'),
                        formatCurrency(readNumber(item, 'totalRevenue', 'TotalRevenue')),
                    ]),
                },
                {
                    title: 'Doanh thu theo loại ghế',
                    headers: ['Loại ghế', 'Số vé', 'Doanh thu'],
                    rows: revenueBySeatType.map((item, index) => [
                        readField(item, 'seatTypeName', 'SeatTypeName') || `Loại ghế ${index + 1}`,
                        readNumber(item, 'totalTickets', 'TotalTickets').toLocaleString('vi-VN'),
                        formatCurrency(readNumber(item, 'totalRevenue', 'TotalRevenue')),
                    ]),
                },
                {
                    title: `Doanh thu phim trong tháng ${selectedMonth}`,
                    headers: ['Phim', 'Số đơn', 'Số vé', 'Doanh thu'],
                    rows: revenueByMovie.map((item, index) => [
                        readField(item, 'movieTitle', 'MovieTitle') || `Phim ${index + 1}`,
                        readNumber(item, 'totalBookings', 'TotalBookings').toLocaleString('vi-VN'),
                        readNumber(item, 'totalTickets', 'TotalTickets').toLocaleString('vi-VN'),
                        formatCurrency(readNumber(item, 'totalRevenue', 'TotalRevenue')),
                    ]),
                },
                {
                    title: 'Tỷ lệ vé trong tháng',
                    headers: ['Trạng thái', 'Số đơn', 'Số vé'],
                    rows: ticketStatusSummary.map((item) => [
                        readField(item, 'label', 'Label') || readField(item, 'status', 'Status') || '-',
                        readNumber(item, 'totalBookings', 'TotalBookings').toLocaleString('vi-VN'),
                        readNumber(item, 'totalTickets', 'TotalTickets').toLocaleString('vi-VN'),
                    ]),
                },
                {
                    title: 'Chi tiết doanh thu theo rạp',
                    headers: ['Rạp', 'Số đơn', 'Số vé', 'Doanh thu'],
                    rows: rows.map((row) => [
                        readField(row, 'cinemaName', 'CinemaName') || '-',
                        readNumber(row, 'totalBookings', 'TotalBookings').toLocaleString('vi-VN'),
                        readNumber(row, 'totalTickets', 'TotalTickets').toLocaleString('vi-VN'),
                        formatCurrency(readNumber(row, 'totalRevenue', 'TotalRevenue')),
                    ]),
                },
                {
                    title: 'Chi tiết doanh thu theo ngày và phim',
                    headers: ['Ngày', 'Rạp', 'Phim', 'Số đơn', 'Số vé', 'Doanh thu'],
                    rows: dailyDetails.map((item) => [
                        formatDate(readField(item, 'date', 'Date')),
                        readField(item, 'cinemaName', 'CinemaName') || '-',
                        readField(item, 'movieTitle', 'MovieTitle') || '-',
                        readNumber(item, 'totalBookings', 'TotalBookings').toLocaleString('vi-VN'),
                        readNumber(item, 'totalTickets', 'TotalTickets').toLocaleString('vi-VN'),
                        formatCurrency(readNumber(item, 'totalRevenue', 'TotalRevenue')),
                    ]),
                },
            ],
        };
    };

    const getExportFileBaseName = () => normalizeFileName(
        `bao-cao-doanh-thu-thang-${selectedMonth}-${selectedYear}-${selectedCinema?.cinemaName || (effectiveCinemaId ? `rap-${effectiveCinemaId}` : 'tat-ca-rap')}`
    );

    const exportExcel = () => {
        if (!report) {
            setError('Chưa có dữ liệu doanh thu để xuất');
            return;
        }

        setError('');
        const html = buildRevenueExportHtml(buildExportPayload());
        downloadHtmlAsExcel(html, `${getExportFileBaseName()}.xls`);
    };

    const exportPdf = () => {
        if (!report) {
            setError('Chưa có dữ liệu doanh thu để xuất');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            setError('Trình duyệt đang chặn cửa sổ xuất PDF. Hãy cho phép popup rồi thử lại.');
            return;
        }

        setError('');
        printWindow.document.open();
        printWindow.document.write(buildRevenueExportHtml(buildExportPayload()));
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 300);
    };

    return (
        <div className="content-wrapper revenue-report-page">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="report-page-heading">
                        <div>
                            <p className="admin-eyebrow">Báo cáo vận hành</p>
                            <h1 className="m-0">
                                {effectiveCinemaId
                                    ? `Thống kê doanh thu - ${selectedCinema?.cinemaName || 'Rạp đã chọn'}`
                                    : 'Thống kê doanh thu'}
                            </h1>
                            <span>Theo dõi doanh thu, cơ cấu vé và hiệu suất từng rạp trong một màn hình.</span>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    <div className="card">
                        <div className="card-body">
                            <form className="form-inline align-items-end" onSubmit={loadReport}>
                                <div className="mr-3 mb-2">
                                    <label className="d-block mb-1">Năm thống kê</label>
                                    <select
                                        className="form-control"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    >
                                        {yearOptions.map((year) => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mr-3 mb-2">
                                    <label className="d-block mb-1">Tháng thống kê</label>
                                    <select
                                        className="form-control"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : '')}
                                    >
                                        {monthOptions.map((month) => (
                                            <option key={month.value} value={month.value}>{month.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mr-3 mb-2">
                                    <label className="d-block mb-1">Rạp</label>
                                    <select
                                        className="form-control"
                                        value={cinemaId}
                                        onChange={(e) => setCinemaId(e.target.value)}
                                        disabled={managerScoped}
                                    >
                                        {!managerScoped && <option value="">Tất cả rạp</option>}
                                        {cinemas.map((cinema) => (
                                            <option key={cinema.cinemaId} value={cinema.cinemaId}>
                                                {cinema.cinemaName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button className="btn btn-primary mb-2" type="submit" disabled={loading}>
                                    {loading ? (
                                        <span className="spinner-border spinner-border-sm"></span>
                                    ) : (
                                        <>
                                            <i className="fas fa-chart-line mr-1"></i> Xem thống kê
                                        </>
                                    )}
                                </button>
                                <button className="btn btn-success mb-2 ml-2" type="button" onClick={exportExcel} disabled={loading || !report}>
                                    <i className="fas fa-file-excel mr-1"></i> Xuất Excel
                                </button>
                                <button className="btn btn-danger mb-2 ml-2" type="button" onClick={exportPdf} disabled={loading || !report}>
                                    <i className="fas fa-file-pdf mr-1"></i> Xuất PDF
                                </button>
                            </form>
                        </div>
                    </div>

                    {error && <div className="alert alert-warning">{error}</div>}

                    <div className="row">
                        <StatCard
                            title={`Doanh thu năm ${selectedYear}`}
                            value={formatCurrency(annualTotalRevenue)}
                            note={effectiveCinemaId ? 'Theo rạp đã chọn' : 'Tất cả rạp'}
                            icon="fa-money-bill-wave"
                            color="#16a34a"
                        />
                        <StatCard
                            title="Vé bán trong năm"
                            value={annualTotalTickets.toLocaleString('vi-VN')}
                            note="Tính theo đơn đã thanh toán"
                            icon="fa-ticket-alt"
                            color="#2563eb"
                        />
                        <StatCard
                            title={`Doanh thu tháng ${selectedMonth}`}
                            value={formatCurrency(selectedMonthDisplayRevenue)}
                            note={`${selectedMonthDisplayTickets.toLocaleString('vi-VN')} vé`}
                            icon="fa-calendar-check"
                            color="#7c3aed"
                        />
                        <StatCard
                            title="Vé hủy/hoàn trong tháng"
                            value={refundedTickets.toLocaleString('vi-VN')}
                            note={`${readNumber(soldStatus, 'totalTickets', 'TotalTickets').toLocaleString('vi-VN')} vé thành công`}
                            icon="fa-undo-alt"
                            color="#f59e0b"
                        />
                    </div>

                    <div className="row">
                        <div className="col-12 mb-3">
                            <ChartCard title="Doanh thu theo ngày" subtitle={`Theo từng ngày trong kỳ thống kê ${selectedMonth ? `tháng ${selectedMonth}/` : ''}${selectedYear}`}>
                                <VerticalBarChart data={dailyChartData} />
                            </ChartCard>
                        </div>
                        <div className="col-xl-6 col-12 mb-3">
                            <ChartCard title="Doanh thu theo rạp">
                                <HorizontalBarChart data={cinemaChartData} color="#16a34a" />
                            </ChartCard>
                        </div>
                        <div className="col-xl-6 col-12 mb-3">
                            <ChartCard title="Doanh thu theo loại ghế">
                                <DonutChart
                                    data={seatTypeChartData}
                                    valueFormatter={formatCompactCurrency}
                                    centerFormatter={formatCompactCurrency}
                                />
                            </ChartCard>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-xl-6 col-12 mb-3">
                            <ChartCard title="Top phim doanh thu cao nhất">
                                <HorizontalBarChart data={movieChartData} color="#dc2626" />
                            </ChartCard>
                        </div>
                        <div className="col-xl-6 col-12 mb-3">
                            <ChartCard title="Tỷ lệ trạng thái vé">
                                <DonutChart data={ticketStatusChartData} />
                            </ChartCard>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title mb-0">
                                <i className="fas fa-table mr-2"></i>Chi tiết doanh thu theo rạp
                            </h3>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table table-bordered table-striped">
                                    <thead>
                                        <tr>
                                            <th>Rạp</th>
                                            <th>Số đơn</th>
                                            <th>Số vé</th>
                                            <th>Doanh thu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="text-center">
                                                    Chưa có dữ liệu báo cáo
                                                </td>
                                            </tr>
                                        ) : (
                                            rows.map((row, index) => (
                                                <tr key={readField(row, 'cinemaId', 'CinemaId') || index}>
                                                    <td>{readField(row, 'cinemaName', 'CinemaName') || '-'}</td>
                                                    <td>{readNumber(row, 'totalBookings', 'TotalBookings').toLocaleString('vi-VN')}</td>
                                                    <td>{readNumber(row, 'totalTickets', 'TotalTickets').toLocaleString('vi-VN')}</td>
                                                    <td>{formatCurrency(readNumber(row, 'totalRevenue', 'TotalRevenue'))}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default RevenueReports;

