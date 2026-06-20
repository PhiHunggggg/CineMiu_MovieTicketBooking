import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cinemaApi, cinemaLookupApi, ticketPriceApi } from '../../services/api';

const emptyForm = {
    cinemaId: '',
    hallTypeId: '',
    seatTypeId: '',
    dayTypeId: '',
    timeSlot: 'all_day',
    basePrice: 90000,
    effectiveFrom: '',
    effectiveTo: '',
};

const timeSlots = [
    { value: 'all_day', label: 'Cả ngày' },
    { value: 'morning', label: 'Buổi sáng (trước 12:00)' },
    { value: 'afternoon', label: 'Buổi chiều (12:00 - 17:59)' },
    { value: 'evening', label: 'Buổi tối (18:00 - 22:59)' },
    { value: 'late_night', label: 'Suất khuya (từ 23:00)' },
];

const getItems = (data) => data?.items || data?.data || data || [];
const toDateInput = (value) => value ? String(value).slice(0, 10) : '';
const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Không giới hạn';
const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

function normalizePrice(item) {
    const price = item?.price || item?.Price || item || {};
    return {
        ...price,
        cinema: item?.cinema || item?.Cinema || {},
        hallType: item?.hallType || item?.HallType || {},
        seatType: item?.seatType || item?.SeatType || {},
        dayType: item?.dayType || item?.DayType || {},
    };
}

function getPriceId(item) {
    return item?.priceId || item?.id;
}

function getTimeSlotLabel(value) {
    return timeSlots.find((item) => item.value === value)?.label || value || '-';
}

export default function TicketPrices() {
    const [searchParams] = useSearchParams();
    const queryAppliedRef = useRef(false);
    const [prices, setPrices] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [halls, setHalls] = useState([]);
    const [lookups, setLookups] = useState({ hallTypes: [], seatTypes: [], dayTypes: [] });
    const [cinemaFilter, setCinemaFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingPrice, setEditingPrice] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [priceResponse, cinemaResponse, lookupResponse] = await Promise.all([
                ticketPriceApi.getAll({ cinemaId: cinemaFilter || undefined }),
                cinemaApi.getAll({ activeOnly: false }),
                cinemaLookupApi.getAll(),
            ]);
            const cinemaItems = getItems(cinemaResponse.data);
            const hallResponses = await Promise.all(
                cinemaItems.map(async (cinema) => {
                    const cinemaId = cinema.cinemaId || cinema.id;
                    try {
                        const response = await cinemaApi.getHalls(cinemaId);
                        return getItems(response.data).map((hall) => ({
                            ...hall,
                            cinemaId,
                            cinemaName: cinema.cinemaName || cinema.name,
                        }));
                    } catch {
                        return [];
                    }
                }),
            );

            setPrices(getItems(priceResponse.data).map(normalizePrice));
            setCinemas(cinemaItems);
            setHalls(hallResponses.flat());
            setLookups({
                hallTypes: lookupResponse.data?.hallTypes || [],
                seatTypes: lookupResponse.data?.seatTypes || [],
                dayTypes: lookupResponse.data?.dayTypes || [],
            });
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Không tải được bảng giá vé.'));
        } finally {
            setLoading(false);
        }
    }, [cinemaFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const summary = useMemo(() => {
        const values = prices.map((item) => Number(item.basePrice || 0)).filter((value) => value > 0);
        return {
            total: prices.length,
            min: values.length ? Math.min(...values) : 0,
            max: values.length ? Math.max(...values) : 0,
            cinemas: new Set(prices.map((item) => item.cinemaId)).size,
        };
    }, [prices]);

    const availableHallTypes = useMemo(() => {
        if (!form.cinemaId) return lookups.hallTypes;

        const typeIds = new Set(
            halls
                .filter((hall) => String(hall.cinemaId) === form.cinemaId)
                .map((hall) => Number(hall.hallTypeId)),
        );
        return lookups.hallTypes.filter((item) => typeIds.has(Number(item.hallTypeId)));
    }, [form.cinemaId, halls, lookups.hallTypes]);

    const openCreate = useCallback((overrides = {}) => {
        const cinemaId = overrides.cinemaId
            || cinemaFilter
            || String(cinemas[0]?.cinemaId || cinemas[0]?.id || '');
        const typeIds = new Set(
            halls
                .filter((hall) => String(hall.cinemaId) === cinemaId)
                .map((hall) => Number(hall.hallTypeId)),
        );
        const hallTypeId = overrides.hallTypeId
            || String(lookups.hallTypes.find((item) => typeIds.has(Number(item.hallTypeId)))?.hallTypeId || '');

        setEditingPrice(null);
        setForm({
            ...emptyForm,
            cinemaId,
            hallTypeId,
            seatTypeId: String(lookups.seatTypes[0]?.seatTypeId || ''),
            dayTypeId: String(lookups.dayTypes[0]?.dayTypeId || ''),
            effectiveFrom: new Date().toISOString().slice(0, 10),
        });
        setError('');
        setNotice('');
        setShowModal(true);
    }, [cinemaFilter, cinemas, halls, lookups.dayTypes, lookups.hallTypes, lookups.seatTypes]);

    useEffect(() => {
        if (loading || queryAppliedRef.current || searchParams.get('create') !== '1') return;

        queryAppliedRef.current = true;
        const cinemaId = searchParams.get('cinemaId') || '';
        const hallTypeId = searchParams.get('hallTypeId') || '';
        const validCinemaId = cinemas.some((cinema) => String(cinema.cinemaId || cinema.id) === cinemaId)
            ? cinemaId
            : '';
        const hasHallType = halls.some((hall) => (
            String(hall.cinemaId) === validCinemaId
            && String(hall.hallTypeId) === hallTypeId
        ));
        if (validCinemaId) setCinemaFilter(validCinemaId);
        openCreate({
            cinemaId: validCinemaId,
            hallTypeId: hasHallType ? hallTypeId : '',
        });
    }, [cinemas, halls, loading, openCreate, searchParams]);

    const openEdit = (item) => {
        setEditingPrice(item);
        setForm({
            cinemaId: String(item.cinemaId || ''),
            hallTypeId: String(item.hallTypeId || ''),
            seatTypeId: String(item.seatTypeId || ''),
            dayTypeId: String(item.dayTypeId || ''),
            timeSlot: item.timeSlot || 'all_day',
            basePrice: Number(item.basePrice || 0),
            effectiveFrom: toDateInput(item.effectiveFrom),
            effectiveTo: toDateInput(item.effectiveTo),
        });
        setError('');
        setNotice('');
        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) return;
        setShowModal(false);
        setEditingPrice(null);
    };

    const submitPrice = async (event) => {
        event.preventDefault();
        const payload = {
            cinemaId: Number(form.cinemaId),
            hallTypeId: Number(form.hallTypeId),
            seatTypeId: Number(form.seatTypeId),
            dayTypeId: Number(form.dayTypeId),
            timeSlot: form.timeSlot,
            basePrice: Number(form.basePrice),
            effectiveFrom: form.effectiveFrom || null,
            effectiveTo: form.effectiveTo || null,
        };

        if (!payload.cinemaId || !payload.hallTypeId || !payload.seatTypeId || !payload.dayTypeId || payload.basePrice < 0) {
            setError('Vui lòng nhập đầy đủ thông tin bảng giá.');
            return;
        }

        if (form.effectiveTo && form.effectiveFrom && new Date(form.effectiveTo) < new Date(form.effectiveFrom)) {
            setError('Ngày kết thúc phải sau ngày bắt đầu.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            if (editingPrice) {
                await ticketPriceApi.update(getPriceId(editingPrice), payload);
                setNotice('Đã cập nhật quy tắc giá vé.');
            } else {
                await ticketPriceApi.create(payload);
                setNotice('Đã thêm quy tắc giá vé mới.');
            }
            setShowModal(false);
            await loadData();
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Không lưu được giá vé.'));
        } finally {
            setSaving(false);
        }
    };

    const deletePrice = async (item) => {
        if (!window.confirm(`Xóa mức giá ${formatCurrency(item.basePrice)} này?`)) return;
        setError('');
        setNotice('');
        try {
            await ticketPriceApi.delete(getPriceId(item));
            setNotice('Đã xóa quy tắc giá vé.');
            await loadData();
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Không xóa được giá vé.'));
        }
    };

    return (
        <div className="theater-page">
            <header className="management-page-header">
                <div>
                    <p className="section-kicker">Quản lý rạp</p>
                    <h1>Bảng giá vé</h1>
                    <p>Thiết lập giá theo chi nhánh, loại phòng, loại ghế, ngày và khung giờ.</p>
                </div>
                <div className="management-header-actions">
                    <Link className="btn btn-outline-secondary" to="/admin/halls">
                        <i className="fas fa-door-open" /> Phòng chiếu
                    </Link>
                    <button className="btn btn-primary" type="button" onClick={() => openCreate()}>
                        <i className="fas fa-plus" /> Thêm mức giá
                    </button>
                </div>
            </header>

            <section className="theater-summary-grid">
                <article className="theater-summary-card blue">
                    <span><i className="fas fa-tags" /></span>
                    <div><strong>{summary.total}</strong><small>Quy tắc giá</small></div>
                </article>
                <article className="theater-summary-card green">
                    <span><i className="fas fa-arrow-trend-down" /></span>
                    <div><strong>{formatCurrency(summary.min)}</strong><small>Giá thấp nhất</small></div>
                </article>
                <article className="theater-summary-card amber">
                    <span><i className="fas fa-arrow-trend-up" /></span>
                    <div><strong>{formatCurrency(summary.max)}</strong><small>Giá cao nhất</small></div>
                </article>
                <article className="theater-summary-card gray">
                    <span><i className="fas fa-building" /></span>
                    <div><strong>{summary.cinemas}</strong><small>Chi nhánh có bảng giá</small></div>
                </article>
            </section>

            <section className="card">
                <div className="card-header theater-filter-bar">
                    <div>
                        <h2>Danh sách mức giá</h2>
                        <small>Các mức giá đang áp dụng trong hệ thống</small>
                    </div>
                    <div className="theater-filter-controls">
                        <select className="form-control" value={cinemaFilter} onChange={(event) => setCinemaFilter(event.target.value)}>
                            <option value="">Tất cả chi nhánh</option>
                            {cinemas.map((cinema) => <option key={cinema.cinemaId || cinema.id} value={cinema.cinemaId || cinema.id}>{cinema.cinemaName || cinema.name}</option>)}
                        </select>
                    </div>
                </div>

                {error && !showModal ? <div className="alert alert-warning theater-alert">{error}</div> : null}
                {notice ? <div className="alert alert-success theater-alert">{notice}</div> : null}

                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table theater-table price-table">
                            <thead>
                                <tr>
                                    <th>Chi nhánh</th>
                                    <th>Phòng / Ghế</th>
                                    <th>Loại ngày</th>
                                    <th>Khung giờ</th>
                                    <th>Giá vé</th>
                                    <th>Hiệu lực</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="table-state">Đang tải bảng giá...</td></tr>
                                ) : prices.length === 0 ? (
                                    <tr><td colSpan="7" className="table-state">Chưa có mức giá phù hợp.</td></tr>
                                ) : prices.map((item) => (
                                    <tr key={getPriceId(item)}>
                                        <td><strong>{item.cinema?.cinemaName || item.cinema?.name || '-'}</strong><div className="small text-muted">{item.cinema?.city || ''}</div></td>
                                        <td><strong>{item.hallType?.typeName || '-'}</strong><div className="small text-muted">{item.seatType?.typeName || '-'}</div></td>
                                        <td>{item.dayType?.typeName || '-'}</td>
                                        <td><span className="price-slot-badge">{getTimeSlotLabel(item.timeSlot)}</span></td>
                                        <td><strong className="price-value">{formatCurrency(item.basePrice)}</strong></td>
                                        <td><strong>{formatDate(item.effectiveFrom)}</strong><div className="small text-muted">đến {formatDate(item.effectiveTo)}</div></td>
                                        <td>
                                            <div className="row-actions">
                                                <button className="icon-button" type="button" onClick={() => openEdit(item)} title="Sửa giá"><i className="fas fa-pen" /></button>
                                                <button className="icon-button danger" type="button" onClick={() => deletePrice(item)} title="Xóa giá"><i className="fas fa-trash" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {showModal ? (
                <>
                    <div className="modal d-block">
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <form onSubmit={submitPrice}>
                                    <div className="modal-header">
                                        <h2>{editingPrice ? 'Cập nhật giá vé' : 'Thêm mức giá vé'}</h2>
                                        <button className="close" type="button" onClick={closeModal}>&times;</button>
                                    </div>
                                    <div className="modal-body">
                                        {error ? <div className="alert alert-danger">{error}</div> : null}
                                        <div className="form-grid theater-form-grid">
                                            <label className="form-field">
                                                <span>Chi nhánh</span>
                                                <select
                                                    value={form.cinemaId}
                                                    onChange={(event) => {
                                                        const cinemaId = event.target.value;
                                                        const typeIds = new Set(
                                                            halls
                                                                .filter((hall) => String(hall.cinemaId) === cinemaId)
                                                                .map((hall) => Number(hall.hallTypeId)),
                                                        );
                                                        const firstHallType = lookups.hallTypes.find((item) => typeIds.has(Number(item.hallTypeId)));
                                                        setForm({
                                                            ...form,
                                                            cinemaId,
                                                            hallTypeId: firstHallType ? String(firstHallType.hallTypeId) : '',
                                                        });
                                                    }}
                                                >
                                                    <option value="">Chọn chi nhánh</option>
                                                    {cinemas.map((cinema) => <option key={cinema.cinemaId || cinema.id} value={cinema.cinemaId || cinema.id}>{cinema.cinemaName || cinema.name}</option>)}
                                                </select>
                                            </label>
                                            <label className="form-field">
                                                <span>Loại phòng</span>
                                                <select value={form.hallTypeId} onChange={(event) => setForm({ ...form, hallTypeId: event.target.value })}>
                                                    <option value="">Chọn loại phòng</option>
                                                    {availableHallTypes.map((item) => <option key={item.hallTypeId} value={item.hallTypeId}>{item.typeName}</option>)}
                                                </select>
                                                {form.cinemaId && availableHallTypes.length === 0 ? (
                                                    <Link className="form-create-link" to={`/admin/halls?create=1&cinemaId=${form.cinemaId}`}>
                                                        <i className="fas fa-plus" /> Tạo phòng cho chi nhánh trước
                                                    </Link>
                                                ) : null}
                                            </label>
                                            <label className="form-field">
                                                <span>Loại ghế</span>
                                                <select value={form.seatTypeId} onChange={(event) => setForm({ ...form, seatTypeId: event.target.value })}>
                                                    <option value="">Chọn loại ghế</option>
                                                    {lookups.seatTypes.map((item) => <option key={item.seatTypeId} value={item.seatTypeId}>{item.typeName}</option>)}
                                                </select>
                                            </label>
                                            <label className="form-field">
                                                <span>Loại ngày</span>
                                                <select value={form.dayTypeId} onChange={(event) => setForm({ ...form, dayTypeId: event.target.value })}>
                                                    <option value="">Chọn loại ngày</option>
                                                    {lookups.dayTypes.map((item) => <option key={item.dayTypeId} value={item.dayTypeId}>{item.typeName}</option>)}
                                                </select>
                                            </label>
                                            <label className="form-field">
                                                <span>Khung giờ</span>
                                                <select value={form.timeSlot} onChange={(event) => setForm({ ...form, timeSlot: event.target.value })}>
                                                    {timeSlots.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                                </select>
                                            </label>
                                            <label className="form-field">
                                                <span>Giá vé cơ bản</span>
                                                <input type="number" min="0" step="1000" value={form.basePrice} onChange={(event) => setForm({ ...form, basePrice: event.target.value })} />
                                            </label>
                                            <label className="form-field">
                                                <span>Hiệu lực từ ngày</span>
                                                <input type="date" value={form.effectiveFrom} onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })} />
                                            </label>
                                            <label className="form-field">
                                                <span>Hiệu lực đến ngày</span>
                                                <input type="date" value={form.effectiveTo} onChange={(event) => setForm({ ...form, effectiveTo: event.target.value })} />
                                                <small className="form-hint">Để trống nếu không giới hạn thời gian.</small>
                                            </label>
                                            <div className="price-preview">
                                                <span>Mức giá hiển thị</span>
                                                <strong>{formatCurrency(form.basePrice)}</strong>
                                                <small>{getTimeSlotLabel(form.timeSlot)}</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button className="btn btn-secondary" type="button" onClick={closeModal}>Đóng</button>
                                        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu mức giá'}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop show" />
                </>
            ) : null}
        </div>
    );
}
