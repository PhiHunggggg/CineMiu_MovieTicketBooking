import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cinemaApi, cinemaLookupApi } from '../../../services/api';

const emptyForm = {
    cinemaId: '',
    hallTypeId: '',
    hallName: '',
    totalRows: 8,
    totalCols: 12,
    status: 'active',
};

const statusOptions = [
    { value: 'active', label: 'Đang hoạt động', icon: 'fa-circle-check' },
    { value: 'maintenance', label: 'Đang bảo trì', icon: 'fa-screwdriver-wrench' },
    { value: 'inactive', label: 'Ngừng hoạt động', icon: 'fa-circle-pause' },
];

const getItems = (data) => data?.items || data?.data || data || [];
const getHallId = (hall) => hall?.hallId || hall?.id;
const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

function getSeatTypeKey(typeName) {
    const normalizedName = String(typeName || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    if (normalizedName.includes('sweetbox') || normalizedName.includes('couple') || normalizedName.includes('doi')) return 'couple';
    if (normalizedName.includes('vip')) return 'vip';
    if (normalizedName.includes('premium')) return 'premium';
    return 'standard';
}

function getSeatTypeLabel(typeName) {
    const key = getSeatTypeKey(typeName);
    if (key === 'vip') return 'Ghế VIP';
    if (key === 'couple') return 'Ghế Couple';
    if (key === 'premium') return 'Ghế Premium';
    return 'Ghế thường';
}

function getStatusLabel(status) {
    return statusOptions.find((item) => item.value === status)?.label || status || '-';
}

export default function Halls() {
    const [searchParams] = useSearchParams();
    const queryAppliedRef = useRef(false);
    const [cinemas, setCinemas] = useState([]);
    const [hallTypes, setHallTypes] = useState([]);
    const [seatTypes, setSeatTypes] = useState([]);
    const [halls, setHalls] = useState([]);
    const [cinemaFilter, setCinemaFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingHall, setEditingHall] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [seatEditorHall, setSeatEditorHall] = useState(null);
    const [seatLayout, setSeatLayout] = useState([]);
    const [selectedSeatTypeId, setSelectedSeatTypeId] = useState('');
    const [seatLoading, setSeatLoading] = useState(false);
    const [seatSaving, setSeatSaving] = useState(false);
    const [seatError, setSeatError] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const [cinemaResponse, lookupResponse] = await Promise.all([
                cinemaApi.getAll({ activeOnly: false }),
                cinemaLookupApi.getAll(),
            ]);
            const cinemaItems = getItems(cinemaResponse.data);
            const lookupData = lookupResponse.data || {};
            const hallResponses = await Promise.all(
                cinemaItems.map(async (cinema) => {
                    try {
                        const response = await cinemaApi.getHalls(cinema.cinemaId || cinema.id);
                        return getItems(response.data).map((hall) => ({
                            ...hall,
                            cinemaName: cinema.cinemaName || cinema.name,
                            cinemaCity: cinema.city,
                        }));
                    } catch {
                        return [];
                    }
                }),
            );

            setCinemas(cinemaItems);
            setHallTypes(lookupData.hallTypes || []);
            setSeatTypes(lookupData.seatTypes || []);
            setHalls(hallResponses.flat());
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Không tải được dữ liệu phòng chiếu.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const hallTypeById = useMemo(
        () => new Map(hallTypes.map((item) => [Number(item.hallTypeId), item])),
        [hallTypes],
    );

    const seatTypeById = useMemo(
        () => new Map(seatTypes.map((item) => [Number(item.seatTypeId), item])),
        [seatTypes],
    );

    const seatRows = useMemo(() => {
        const rows = new Map();
        seatLayout.forEach((seat) => {
            const rowLabel = seat.rowLabel || '';
            if (!rows.has(rowLabel)) rows.set(rowLabel, []);
            rows.get(rowLabel).push(seat);
        });

        return [...rows.entries()].map(([rowLabel, seats]) => ({
            rowLabel,
            seats: seats.sort((left, right) => Number(left.colNumber) - Number(right.colNumber)),
        }));
    }, [seatLayout]);

    const visibleHalls = useMemo(
        () => halls.filter((hall) => (
            (!cinemaFilter || String(hall.cinemaId) === cinemaFilter)
            && (!statusFilter || hall.status === statusFilter)
        )),
        [cinemaFilter, halls, statusFilter],
    );

    const summary = useMemo(() => ({
        total: halls.length,
        active: halls.filter((hall) => hall.status === 'active').length,
        maintenance: halls.filter((hall) => hall.status === 'maintenance').length,
        inactive: halls.filter((hall) => hall.status === 'inactive').length,
    }), [halls]);

    const openCreate = useCallback((cinemaId = '') => {
        setEditingHall(null);
        setForm({
            ...emptyForm,
            cinemaId: cinemaId || cinemaFilter || String(cinemas[0]?.cinemaId || cinemas[0]?.id || ''),
            hallTypeId: String(hallTypes[0]?.hallTypeId || ''),
        });
        setError('');
        setNotice('');
        setShowModal(true);
    }, [cinemaFilter, cinemas, hallTypes]);

    useEffect(() => {
        if (loading || queryAppliedRef.current || searchParams.get('create') !== '1') return;

        queryAppliedRef.current = true;
        const cinemaId = searchParams.get('cinemaId') || '';
        const validCinemaId = cinemas.some((cinema) => String(cinema.cinemaId || cinema.id) === cinemaId)
            ? cinemaId
            : '';
        if (validCinemaId) setCinemaFilter(validCinemaId);
        openCreate(validCinemaId);
    }, [cinemas, loading, openCreate, searchParams]);

    const openEdit = (hall) => {
        setEditingHall(hall);
        setForm({
            cinemaId: String(hall.cinemaId || ''),
            hallTypeId: String(hall.hallTypeId || ''),
            hallName: hall.hallName || hall.name || '',
            totalRows: Number(hall.totalRows || 1),
            totalCols: Number(hall.totalCols || 1),
            status: hall.status || 'active',
        });
        setError('');
        setNotice('');
        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) return;
        setShowModal(false);
        setEditingHall(null);
    };

    const submitHall = async (event) => {
        event.preventDefault();
        const totalRows = Number(form.totalRows);
        const totalCols = Number(form.totalCols);
        const payload = {
            hallTypeId: Number(form.hallTypeId),
            hallName: form.hallName.trim(),
            totalRows,
            totalCols,
            totalSeats: totalRows * totalCols,
            status: form.status,
        };

        if (!Number(form.cinemaId) || !payload.hallTypeId || !payload.hallName || totalRows < 1 || totalCols < 1) {
            setError('Vui lòng nhập đầy đủ thông tin phòng chiếu.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            if (editingHall) {
                await cinemaApi.updateHall(getHallId(editingHall), payload);
                setNotice('Đã cập nhật phòng chiếu.');
            } else {
                await cinemaApi.createHall(Number(form.cinemaId), payload);
                setNotice('Đã thêm phòng chiếu mới.');
            }
            setShowModal(false);
            await loadData();
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Không lưu được phòng chiếu.'));
        } finally {
            setSaving(false);
        }
    };

    const deleteHall = async (hall) => {
        if (!window.confirm(`Xóa phòng "${hall.hallName || hall.name}"? Phòng đã có lịch chiếu sẽ không thể xóa.`)) return;

        setError('');
        setNotice('');
        try {
            await cinemaApi.deleteHall(getHallId(hall));
            setNotice('Đã xóa phòng chiếu.');
            await loadData();
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Không xóa được phòng. Phòng có thể đang được sử dụng trong lịch chiếu.'));
        }
    };

    const openSeatEditor = async (hall) => {
        setSeatEditorHall(hall);
        setSeatLayout([]);
        setSeatError('');
        setSeatLoading(true);
        setSelectedSeatTypeId(String(seatTypes[0]?.seatTypeId || ''));

        try {
            const response = await cinemaApi.getHallSeats(getHallId(hall));
            const seats = getItems(response.data);
            setSeatLayout(seats);
            setSelectedSeatTypeId(String(seats[0]?.seatTypeId || seatTypes[0]?.seatTypeId || ''));
        } catch (requestError) {
            setSeatError(getErrorMessage(requestError, 'Không tải được sơ đồ ghế.'));
        } finally {
            setSeatLoading(false);
        }
    };

    const closeSeatEditor = () => {
        if (seatSaving) return;
        setSeatEditorHall(null);
        setSeatLayout([]);
        setSeatError('');
    };

    const changeSeatType = (seatId) => {
        if (!selectedSeatTypeId) return;
        setSeatLayout((currentSeats) => currentSeats.map((seat) => (
            Number(seat.seatId || seat.id) === Number(seatId)
                ? { ...seat, seatTypeId: Number(selectedSeatTypeId) }
                : seat
        )));
    };

    const saveSeatLayout = async () => {
        if (!seatEditorHall || seatLayout.length === 0) return;

        setSeatSaving(true);
        setSeatError('');
        try {
            await cinemaApi.updateHallSeats(getHallId(seatEditorHall), seatLayout.map((seat) => ({
                seatTypeId: Number(seat.seatTypeId),
                rowLabel: seat.rowLabel,
                colNumber: Number(seat.colNumber),
                seatCode: seat.seatCode,
                isActive: seat.isActive !== false,
            })));
            setNotice(`Đã cập nhật loại ghế cho ${seatEditorHall.hallName || seatEditorHall.name}.`);
            setSeatEditorHall(null);
            setSeatLayout([]);
        } catch (requestError) {
            setSeatError(getErrorMessage(requestError, 'Không lưu được sơ đồ ghế.'));
        } finally {
            setSeatSaving(false);
        }
    };

    return (
        <div className="theater-page">
            <header className="management-page-header">
                <div>
                    <p className="section-kicker">Quản lý rạp</p>
                    <h1>Trạng thái phòng chiếu</h1>
                    <p>Theo dõi sức chứa, loại phòng và tình trạng vận hành tại từng chi nhánh.</p>
                </div>
                <div className="management-header-actions">
                    <Link className="btn btn-outline-secondary" to="/admin/cinemas">
                        <i className="fas fa-building" /> Chi nhánh
                    </Link>
                    <button className="btn btn-primary" type="button" onClick={() => openCreate()}>
                        <i className="fas fa-plus" /> Thêm phòng
                    </button>
                </div>
            </header>

            <section className="theater-summary-grid">
                <article className="theater-summary-card blue">
                    <span><i className="fas fa-door-open" /></span>
                    <div><strong>{summary.total}</strong><small>Tổng số phòng</small></div>
                </article>
                <article className="theater-summary-card green">
                    <span><i className="fas fa-circle-check" /></span>
                    <div><strong>{summary.active}</strong><small>Đang hoạt động</small></div>
                </article>
                <article className="theater-summary-card amber">
                    <span><i className="fas fa-screwdriver-wrench" /></span>
                    <div><strong>{summary.maintenance}</strong><small>Đang bảo trì</small></div>
                </article>
                <article className="theater-summary-card gray">
                    <span><i className="fas fa-circle-pause" /></span>
                    <div><strong>{summary.inactive}</strong><small>Ngừng hoạt động</small></div>
                </article>
            </section>

            <section className="card">
                <div className="card-header theater-filter-bar">
                    <div>
                        <h2>Danh sách phòng</h2>
                        <small>{visibleHalls.length} phòng phù hợp</small>
                    </div>
                    <div className="theater-filter-controls">
                        <select className="form-control" value={cinemaFilter} onChange={(event) => setCinemaFilter(event.target.value)}>
                            <option value="">Tất cả chi nhánh</option>
                            {cinemas.map((cinema) => (
                                <option key={cinema.cinemaId || cinema.id} value={cinema.cinemaId || cinema.id}>
                                    {cinema.cinemaName || cinema.name}
                                </option>
                            ))}
                        </select>
                        <select className="form-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                            <option value="">Tất cả trạng thái</option>
                            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </div>
                </div>

                {error && !showModal ? <div className="alert alert-warning theater-alert">{error}</div> : null}
                {notice ? <div className="alert alert-success theater-alert">{notice}</div> : null}

                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table theater-table">
                            <thead>
                                <tr>
                                    <th>Phòng chiếu</th>
                                    <th>Chi nhánh</th>
                                    <th>Loại phòng</th>
                                    <th>Sơ đồ ghế</th>
                                    <th>Sức chứa</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="table-state">Đang tải danh sách phòng...</td></tr>
                                ) : visibleHalls.length === 0 ? (
                                    <tr><td colSpan="7" className="table-state">Chưa có phòng chiếu phù hợp.</td></tr>
                                ) : visibleHalls.map((hall) => {
                                    const hallType = hallTypeById.get(Number(hall.hallTypeId));
                                    return (
                                        <tr key={getHallId(hall)}>
                                            <td>
                                                <div className="hall-name-cell">
                                                    <span><i className="fas fa-door-open" /></span>
                                                    <div><strong>{hall.hallName || hall.name}</strong></div>
                                                </div>
                                            </td>
                                            <td><strong>{hall.cinemaName}</strong><div className="small text-muted">{hall.cinemaCity || '-'}</div></td>
                                            <td>{hall.hallTypeName || hallType?.typeName || '-'}</td>
                                            <td>{hall.totalRows} hàng × {hall.totalCols} cột</td>
                                            <td>
                                                <strong>{Number(hall.activeSeatCount ?? hall.totalSeats ?? 0).toLocaleString('vi-VN')} ghế hoạt động</strong>
                                                {Number(hall.upcomingShowtimeCount || 0) > 0 ? (
                                                    <Link
                                                        className="hall-showtime-link"
                                                        to={`/admin/showtimes?cinemaId=${hall.cinemaId}&hallId=${getHallId(hall)}&upcoming=1`}
                                                        title={`Xem lịch chiếu sắp tới của ${hall.hallName || hall.name}`}
                                                    >
                                                        {Number(hall.upcomingShowtimeCount).toLocaleString('vi-VN')} lịch chiếu sắp tới
                                                    </Link>
                                                ) : (
                                                    <div className="small text-muted">Chưa có lịch chiếu sắp tới</div>
                                                )}
                                            </td>
                                            <td><span className={`hall-status status-${hall.status || 'inactive'}`}>{getStatusLabel(hall.status)}</span></td>
                                            <td>
                                                <div className="row-actions">
                                                    <button className="icon-button" type="button" onClick={() => openEdit(hall)} title="Sửa phòng">
                                                        <i className="fas fa-pen" />
                                                    </button>
                                                    <button className="icon-button seat-action" type="button" onClick={() => openSeatEditor(hall)} title="Chọn ghế thường, VIP hoặc Couple">
                                                        <i className="fas fa-chair" />
                                                    </button>
                                                    <button className="icon-button danger" type="button" onClick={() => deleteHall(hall)} title="Xóa phòng">
                                                        <i className="fas fa-trash" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
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
                                <form onSubmit={submitHall}>
                                    <div className="modal-header">
                                        <h2>{editingHall ? 'Cập nhật phòng chiếu' : 'Thêm phòng chiếu'}</h2>
                                        <button className="close" type="button" onClick={closeModal}>&times;</button>
                                    </div>
                                    <div className="modal-body">
                                        {error ? <div className="alert alert-danger">{error}</div> : null}
                                        <div className="form-grid theater-form-grid">
                                            <label className="form-field">
                                                <span>Chi nhánh rạp</span>
                                                <select value={form.cinemaId} onChange={(event) => setForm({ ...form, cinemaId: event.target.value })} disabled={Boolean(editingHall)}>
                                                    <option value="">Chọn chi nhánh</option>
                                                    {cinemas.map((cinema) => <option key={cinema.cinemaId || cinema.id} value={cinema.cinemaId || cinema.id}>{cinema.cinemaName || cinema.name}</option>)}
                                                </select>
                                            </label>
                                            <label className="form-field">
                                                <span>Loại phòng</span>
                                                <select value={form.hallTypeId} onChange={(event) => setForm({ ...form, hallTypeId: event.target.value })}>
                                                    <option value="">Chọn loại phòng</option>
                                                    {hallTypes.map((type) => <option key={type.hallTypeId} value={type.hallTypeId}>{type.typeName}</option>)}
                                                </select>
                                            </label>
                                            <label className="form-field">
                                                <span>Tên phòng</span>
                                                <input value={form.hallName} onChange={(event) => setForm({ ...form, hallName: event.target.value })} placeholder="Ví dụ: Phòng 01" />
                                            </label>
                                            <label className="form-field">
                                                <span>Trạng thái</span>
                                                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                                                    {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                                </select>
                                            </label>
                                            <label className="form-field">
                                                <span>Số hàng ghế</span>
                                                <input type="number" min="1" max="26" value={form.totalRows} onChange={(event) => setForm({ ...form, totalRows: event.target.value })} disabled={Boolean(editingHall)} />
                                            </label>
                                            <label className="form-field">
                                                <span>Số ghế mỗi hàng</span>
                                                <input type="number" min="1" max="50" value={form.totalCols} onChange={(event) => setForm({ ...form, totalCols: event.target.value })} disabled={Boolean(editingHall)} />
                                                {editingHall ? <small className="form-hint">Kích thước được khóa để giữ nguyên sơ đồ ghế hiện tại.</small> : null}
                                            </label>
                                            <div className="hall-capacity-preview">
                                                <i className="fas fa-chair" />
                                                <span>Sức chứa dự kiến</span>
                                                <strong>{Number(form.totalRows || 0) * Number(form.totalCols || 0)} ghế</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button className="btn btn-secondary" type="button" onClick={closeModal}>Đóng</button>
                                        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu phòng'}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop show" />
                </>
            ) : null}

            {seatEditorHall ? (
                <>
                    <div className="modal d-block">
                        <div className="modal-dialog seat-layout-dialog">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <div>
                                        <h2>Sơ đồ ghế - {seatEditorHall.hallName || seatEditorHall.name}</h2>
                                        <small>Chọn loại ghế, sau đó bấm vào từng ghế để thay đổi.</small>
                                    </div>
                                    <button className="close" type="button" onClick={closeSeatEditor}>&times;</button>
                                </div>
                                <div className="modal-body seat-layout-body">
                                    {seatError ? <div className="alert alert-danger">{seatError}</div> : null}

                                    <div className="seat-type-toolbar">
                                        {seatTypes.map((type) => {
                                            const typeId = String(type.seatTypeId);
                                            const typeKey = getSeatTypeKey(type.typeName);
                                            const count = seatLayout.filter((seat) => Number(seat.seatTypeId) === Number(type.seatTypeId)).length;
                                            return (
                                                <button
                                                    key={type.seatTypeId}
                                                    className={`seat-type-option seat-${typeKey} ${selectedSeatTypeId === typeId ? 'selected' : ''}`}
                                                    type="button"
                                                    onClick={() => setSelectedSeatTypeId(typeId)}
                                                >
                                                    <i className="fas fa-chair" />
                                                    <span>{getSeatTypeLabel(type.typeName)}</span>
                                                    <strong>{count}</strong>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {seatLoading ? (
                                        <div className="seat-layout-state">
                                            <div className="spinner-border text-primary" />
                                            <span>Đang tải sơ đồ ghế...</span>
                                        </div>
                                    ) : (
                                        <div className="seat-layout-editor">
                                            <div className="cinema-screen">MÀN HÌNH</div>
                                            <div className="seat-layout-grid">
                                                {seatRows.map((row) => (
                                                    <div className="seat-layout-row" key={row.rowLabel}>
                                                        <strong className="seat-row-label">{row.rowLabel}</strong>
                                                        <div className="seat-layout-seats">
                                                            {row.seats.map((seat) => {
                                                                const type = seatTypeById.get(Number(seat.seatTypeId));
                                                                const typeKey = getSeatTypeKey(type?.typeName);
                                                                return (
                                                                    <button
                                                                        key={seat.seatId || seat.id || seat.seatCode}
                                                                        className={`seat-layout-seat seat-${typeKey}`}
                                                                        type="button"
                                                                        title={`${seat.seatCode} - ${getSeatTypeLabel(type?.typeName)}`}
                                                                        onClick={() => changeSeatType(seat.seatId || seat.id)}
                                                                    >
                                                                        {seat.seatCode}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-secondary" type="button" onClick={closeSeatEditor}>Đóng</button>
                                    <button className="btn btn-primary" type="button" onClick={saveSeatLayout} disabled={seatSaving || seatLoading || seatLayout.length === 0}>
                                        {seatSaving ? 'Đang lưu...' : 'Lưu sơ đồ ghế'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop show" />
                </>
            ) : null}
        </div>
    );
}

