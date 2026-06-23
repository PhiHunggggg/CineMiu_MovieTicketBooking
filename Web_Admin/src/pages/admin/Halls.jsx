import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { cinemaApi, cinemaLookupApi, showtimeApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

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
const getShowtimeInfo = (item) => item?.showtime || item?.Showtime || item || {};

const displayStatusOptions = [
    statusOptions[0],
    { value: 'showing', label: 'Đang chiếu', icon: 'fa-circle-play' },
    statusOptions[1],
    statusOptions[2],
];

function getTodayValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getSeatTypeKey(typeName) {
    const normalizedName = String(typeName || '').toLowerCase();
    if (normalizedName.includes('vip')) return 'vip';
    if (normalizedName.includes('couple')) return 'couple';
    return 'standard';
}

function getSeatTypeLabel(typeName) {
    const key = getSeatTypeKey(typeName);
    if (key === 'vip') return 'Ghế VIP';
    if (key === 'couple') return 'Ghế Couple';
    return 'Ghế thường';
}

function getStatusLabel(status) {
    return statusOptions.find((item) => item.value === status)?.label || status || '-';
}

export default function Halls() {
    const { user, isCinemaManager } = useAuth();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const isManagerScoped = isCinemaManager();
    const isSeatManagement = location.pathname.includes('/admin/seats');
    const assignedCinemaId = isManagerScoped ? String(user?.cinemaId || '') : '';
    const queryAppliedRef = useRef(false);
    const [cinemas, setCinemas] = useState([]);
    const [hallTypes, setHallTypes] = useState([]);
    const [seatTypes, setSeatTypes] = useState([]);
    const [halls, setHalls] = useState([]);
    const [cinemaFilter, setCinemaFilter] = useState(assignedCinemaId);
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
    const [seatEditMode, setSeatEditMode] = useState('type');
    const [showingHallIds, setShowingHallIds] = useState(new Set());
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
            const cinemaItems = getItems(cinemaResponse.data).filter((cinema) => (
                !isManagerScoped || (assignedCinemaId && String(cinema.cinemaId || cinema.id) === assignedCinemaId)
            ));
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
            const hallItems = hallResponses.flat();
            const showingResponses = await Promise.all(
                cinemaItems.map(async (cinema) => {
                    try {
                        const response = await showtimeApi.getAll({
                            cinemaId: cinema.cinemaId || cinema.id,
                            date: getTodayValue(),
                            status: 'showing',
                            page: 1,
                            pageSize: 200,
                        });
                        return getItems(response.data);
                    } catch {
                        return [];
                    }
                }),
            );
            const showingIds = new Set(
                showingResponses
                    .flat()
                    .map((item) => Number(getShowtimeInfo(item).hallId || getShowtimeInfo(item).HallId))
                    .filter(Boolean),
            );

            setCinemas(cinemaItems);
            setHallTypes(lookupData.hallTypes || []);
            setSeatTypes(lookupData.seatTypes || []);
            setHalls(hallItems);
            setShowingHallIds(showingIds);
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Không tải được dữ liệu phòng chiếu.'));
            setShowingHallIds(new Set());
        } finally {
            setLoading(false);
        }
    }, [assignedCinemaId, isManagerScoped]);

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
            && (!statusFilter || (hall.status === 'active' && showingHallIds.has(Number(getHallId(hall))) ? 'showing' : hall.status) === statusFilter)
        )),
        [cinemaFilter, halls, showingHallIds, statusFilter],
    );

    const summary = useMemo(() => ({
        total: halls.length,
        active: halls.filter((hall) => hall.status === 'active').length,
        showing: halls.filter((hall) => hall.status === 'active' && showingHallIds.has(Number(getHallId(hall)))).length,
        maintenance: halls.filter((hall) => hall.status === 'maintenance').length,
        inactive: halls.filter((hall) => hall.status === 'inactive').length,
    }), [halls, showingHallIds]);

    const getHallDisplayStatus = (hall) => (
        hall.status === 'active' && showingHallIds.has(Number(getHallId(hall)))
            ? 'showing'
            : hall.status || 'inactive'
    );

    const openCreate = useCallback((cinemaId = '') => {
        setEditingHall(null);
        setForm({
            ...emptyForm,
            cinemaId: assignedCinemaId || cinemaId || cinemaFilter || String(cinemas[0]?.cinemaId || cinemas[0]?.id || ''),
            hallTypeId: String(hallTypes[0]?.hallTypeId || ''),
        });
        setError('');
        setNotice('');
        setShowModal(true);
    }, [assignedCinemaId, cinemaFilter, cinemas, hallTypes]);

    useEffect(() => {
        if (loading || queryAppliedRef.current || searchParams.get('create') !== '1') return;

        queryAppliedRef.current = true;
        const cinemaId = isManagerScoped ? assignedCinemaId : searchParams.get('cinemaId') || '';
        const validCinemaId = cinemas.some((cinema) => String(cinema.cinemaId || cinema.id) === cinemaId)
            ? cinemaId
            : '';
        if (validCinemaId) setCinemaFilter(validCinemaId);
        openCreate(validCinemaId);
    }, [assignedCinemaId, cinemas, isManagerScoped, loading, openCreate, searchParams]);

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
        setSeatEditMode('type');

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
        setSeatEditMode('type');
    };

    const changeSeatType = (seatId) => {
        if (seatEditMode === 'lock') {
            setSeatLayout((currentSeats) => currentSeats.map((seat) => (
                Number(seat.seatId || seat.id) === Number(seatId)
                    ? { ...seat, isActive: seat.isActive === false }
                    : seat
            )));
            return;
        }

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
            setNotice(`Đã cập nhật sơ đồ ghế cho ${seatEditorHall.hallName || seatEditorHall.name}.`);
            setSeatEditorHall(null);
            setSeatLayout([]);
            await loadData();
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
                    <p className="section-kicker">{isSeatManagement ? 'Ghế ngồi' : 'Quản lý rạp'}</p>
                    <h1>{isSeatManagement ? 'Sơ đồ ghế từng phòng' : 'Trạng thái phòng chiếu'}</h1>
                    <p>
                        {isSeatManagement
                            ? 'Thiết lập ghế thường, VIP, Couple và khóa ghế hỏng hoặc bảo trì.'
                            : 'Theo dõi sức chứa, loại phòng và tình trạng vận hành tại từng chi nhánh.'}
                    </p>
                </div>
                <div className="management-header-actions">
                    {isSeatManagement ? (
                        <Link className="btn btn-outline-secondary" to="/admin/halls">
                            <i className="fas fa-door-open" /> Phòng chiếu
                        </Link>
                    ) : (
                        <button className="btn btn-primary" type="button" onClick={() => openCreate()}>
                            <i className="fas fa-plus" /> Thêm phòng
                        </button>
                    )}
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
                <article className="theater-summary-card blue">
                    <span><i className="fas fa-circle-play" /></span>
                    <div><strong>{summary.showing}</strong><small>Đang chiếu</small></div>
                </article>
                <article className="theater-summary-card amber">
                    <span><i className="fas fa-screwdriver-wrench" /></span>
                    <div><strong>{summary.maintenance}</strong><small>Đang bảo trì</small></div>
                </article>
            </section>

            <section className="card">
                <div className="card-header theater-filter-bar">
                    <div>
                        <h2>Danh sách phòng</h2>
                        <small>{visibleHalls.length} phòng phù hợp</small>
                    </div>
                    <div className="theater-filter-controls">
                        <select className="form-control" value={cinemaFilter} onChange={(event) => setCinemaFilter(event.target.value)} disabled={isManagerScoped}>
                            {!isManagerScoped && <option value="">Tất cả chi nhánh</option>}
                            {cinemas.map((cinema) => (
                                <option key={cinema.cinemaId || cinema.id} value={cinema.cinemaId || cinema.id}>
                                    {cinema.cinemaName || cinema.name}
                                </option>
                            ))}
                        </select>
                        <select className="form-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                            <option value="">Tất cả trạng thái</option>
                            {displayStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
                                            <td>
                                                <span className={`hall-status status-${getHallDisplayStatus(hall)}`}>
                                                    {displayStatusOptions.find((item) => item.value === getHallDisplayStatus(hall))?.label || getStatusLabel(hall.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="row-actions">
                                                    {!isSeatManagement ? (
                                                        <button className="icon-button" type="button" onClick={() => openEdit(hall)} title="Sửa phòng">
                                                            <i className="fas fa-pen" />
                                                        </button>
                                                    ) : null}
                                                    <button className="icon-button seat-action" type="button" onClick={() => openSeatEditor(hall)} title="Chọn ghế thường, VIP hoặc Couple">
                                                        <i className="fas fa-chair" />
                                                    </button>
                                                    {!isSeatManagement ? (
                                                        <button className="icon-button danger" type="button" onClick={() => deleteHall(hall)} title="Xóa phòng">
                                                            <i className="fas fa-trash" />
                                                        </button>
                                                    ) : null}
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
                                                <select value={form.cinemaId} onChange={(event) => setForm({ ...form, cinemaId: event.target.value })} disabled={Boolean(editingHall) || isManagerScoped}>
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
                                        <small>Chọn loại ghế hoặc chế độ khóa, sau đó bấm vào từng ghế để thay đổi.</small>
                                    </div>
                                    <button className="close" type="button" onClick={closeSeatEditor}>&times;</button>
                                </div>
                                <div className="modal-body seat-layout-body">
                                    {seatError ? <div className="alert alert-danger">{seatError}</div> : null}

                                    <div className="seat-type-toolbar">
                                        {seatTypes.map((type) => {
                                            const typeId = String(type.seatTypeId);
                                            const typeKey = getSeatTypeKey(type.typeName);
                                            const count = seatLayout.filter((seat) => (
                                                seat.isActive !== false
                                                && Number(seat.seatTypeId) === Number(type.seatTypeId)
                                            )).length;
                                            return (
                                                <button
                                                    key={type.seatTypeId}
                                                    className={`seat-type-option seat-${typeKey} ${seatEditMode === 'type' && selectedSeatTypeId === typeId ? 'selected' : ''}`}
                                                    type="button"
                                                    onClick={() => {
                                                        setSeatEditMode('type');
                                                        setSelectedSeatTypeId(typeId);
                                                    }}
                                                >
                                                    <i className="fas fa-chair" />
                                                    <span>{getSeatTypeLabel(type.typeName)}</span>
                                                    <strong>{count}</strong>
                                                </button>
                                            );
                                        })}
                                        <button
                                            className={`seat-type-option seat-locked ${seatEditMode === 'lock' ? 'selected' : ''}`}
                                            type="button"
                                            onClick={() => setSeatEditMode('lock')}
                                        >
                                            <i className="fas fa-ban" />
                                            <span>Khóa ghế</span>
                                            <strong>{seatLayout.filter((seat) => seat.isActive === false).length}</strong>
                                        </button>
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
                                                                        className={`seat-layout-seat seat-${typeKey} ${seat.isActive === false ? 'seat-inactive' : ''}`}
                                                                        type="button"
                                                                        title={`${seat.seatCode} - ${seat.isActive === false ? 'Đã khóa do hỏng/bảo trì' : getSeatTypeLabel(type?.typeName)}`}
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
