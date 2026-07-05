import { useEffect, useState } from 'react';
import { cinemaApi, cinemaLookupApi } from '../../../services/api';

const emptyCinema = {
    chainId: '',
    cinemaName: '',
    address: '',
    city: '',
    district: '',
    phone: '',
    email: '',
    mapUrl: '',
    imageUrl: '',
    openingTime: '08:00',
    closingTime: '23:30',
    isActive: true,
};

const getItems = (data) => data?.items || data?.data || data || [];

const AdminCinemas = () => {
    const [cinemas, setCinemas] = useState([]);
    const [chains, setChains] = useState([]);
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCinema, setEditingCinema] = useState(null);
    const [formData, setFormData] = useState(emptyCinema);
    const [error, setError] = useState('');

    useEffect(() => {
        loadLookups();
        loadCinemas();
    }, []);

    const loadLookups = async () => {
        try {
            const response = await cinemaLookupApi.getAll();
            setChains(response.data?.chains || []);
        } catch (err) {
            console.error('Failed to load cinema lookups:', err);
        }
    };

    const loadCinemas = async () => {
        setLoading(true);
        try {
            const response = await cinemaApi.getAll({ city: city || undefined, activeOnly: false });
            setCinemas(getItems(response.data));
        } catch {
            setError('Không tải được danh sách chi nhánh rạp');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (cinema = null) => {
        setEditingCinema(cinema);
        setError('');

        if (cinema) {
            setFormData({
                chainId: cinema.chainId || '',
                cinemaName: cinema.cinemaName || '',
                address: cinema.address || '',
                city: cinema.city || '',
                district: cinema.district || '',
                phone: cinema.phone || '',
                email: cinema.email || '',
                mapUrl: cinema.mapUrl || '',
                imageUrl: cinema.imageUrl || '',
                openingTime: String(cinema.openingTime || '08:00').substring(0, 5),
                closingTime: String(cinema.closingTime || '23:30').substring(0, 5),
                isActive: cinema.isActive ?? true,
            });
        } else {
            setFormData({ ...emptyCinema, chainId: chains[0]?.chainId || '' });
        }

        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingCinema(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const payload = {
            ...formData,
            chainId: Number(formData.chainId),
            latitude: null,
            longitude: null,
        };

        try {
            if (editingCinema) {
                await cinemaApi.update(editingCinema.cinemaId || editingCinema.id, payload);
            } else {
                await cinemaApi.create(payload);
            }

            closeModal();
            loadCinemas();
        } catch (err) {
            setError(err.response?.data?.message || 'Lưu chi nhánh rạp thất bại');
        }
    };

    const handleDelete = async (cinema) => {
        if (!window.confirm(`Xóa chi nhánh "${cinema.cinemaName}"?`)) return;

        try {
            await cinemaApi.delete(cinema.cinemaId || cinema.id);
            loadCinemas();
        } catch (err) {
            setError(err.response?.data?.message || 'Xóa chi nhánh rạp thất bại');
        }
    };
    const activeCinemaCount = cinemas.filter((cinema) => cinema.isActive !== false).length;
    const inactiveCinemaCount = cinemas.length - activeCinemaCount;
    const cityCount = new Set(cinemas.map((cinema) => cinema.city).filter(Boolean)).size;

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <h1 className="m-0">Quản lý chi nhánh rạp</h1>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    <div className="admin-management-brief">
                        <div><i className="fas fa-building"></i><p><span>Tổng chi nhánh</span><strong>{cinemas.length.toLocaleString('vi-VN')}</strong></p></div>
                        <div><i className="fas fa-door-open"></i><p><span>Đang hoạt động</span><strong>{activeCinemaCount.toLocaleString('vi-VN')}</strong></p></div>
                        <div><i className="fas fa-power-off"></i><p><span>Ngừng hoạt động</span><strong>{inactiveCinemaCount.toLocaleString('vi-VN')}</strong></p></div>
                        <div><i className="fas fa-map-location-dot"></i><p><span>Thành phố</span><strong>{cityCount.toLocaleString('vi-VN')}</strong></p></div>
                    </div>

                    {error && !showModal && <div className="alert alert-warning">{error}</div>}
                    <div className="card">
                        <div className="card-header">
                            <div className="row">
                                <div className="col-md-8">
                                    <form className="form-inline" onSubmit={(e) => { e.preventDefault(); loadCinemas(); }}>
                                        <input className="form-control mr-2 mb-2" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lọc theo thành phố..." />
                                        <button className="btn btn-primary mb-2" type="submit">
                                            <i className="fas fa-filter"></i> Lọc
                                        </button>
                                    </form>
                                </div>
                                <div className="col-md-4 text-right">
                                    <button className="btn btn-success" onClick={() => openModal()}>
                                        <i className="fas fa-plus"></i> Thêm chi nhánh
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="card-body">
                            {loading ? (
                                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped">
                                        <thead>
                                            <tr>
                                                <th>Tên rạp</th>
                                                <th>Địa chỉ</th>
                                                <th>Thành phố</th>
                                                 <th>Liên hệ</th>
                                                 <th>Giờ hoạt động</th>
                                                 <th>Trạng thái</th>
                                                <th style={{ width: '105px' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cinemas.length === 0 ? (
                                                 <tr><td colSpan="7" className="text-center">Không tìm thấy chi nhánh</td></tr>
                                            ) : cinemas.map((cinema) => (
                                                <tr key={cinema.cinemaId || cinema.id}>
                                                    <td><strong>{cinema.cinemaName}</strong></td>
                                                    <td>{cinema.address}</td>
                                                    <td>{cinema.city}</td>
                                                     <td>{cinema.phone || cinema.email || '-'}</td>
                                                     <td><i className="far fa-clock text-muted mr-1"></i>{String(cinema.openingTime || '08:00').substring(0, 5)} – {String(cinema.closingTime || '23:30').substring(0, 5)}</td>
                                                    <td>
                                                        <span className={`badge ${cinema.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                                            {cinema.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-sm btn-info mr-1" onClick={() => openModal(cinema)}>
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cinema)}>
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {showModal && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <form onSubmit={handleSubmit}>
                                <div className="modal-header">
                                    <h5 className="modal-title">{editingCinema ? 'Cập nhật chi nhánh rạp' : 'Thêm chi nhánh rạp'}</h5>
                                    <button type="button" className="close" onClick={closeModal}>&times;</button>
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger">{error}</div>}
                                    <div className="row">
                                        <div className="col-md-6 form-group">
                                            <label>Chuỗi rạp</label>
                                            <select className="form-control" value={formData.chainId} onChange={(e) => setFormData({ ...formData, chainId: e.target.value })} required>
                                                <option value="">Chọn chuỗi rạp</option>
                                                {chains.map((chain) => (
                                                    <option key={chain.chainId} value={chain.chainId}>{chain.chainName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-6 form-group">
                                            <label>Tên rạp</label>
                                            <input className="form-control" value={formData.cinemaName} onChange={(e) => setFormData({ ...formData, cinemaName: e.target.value })} required />
                                        </div>
                                        <div className="col-md-12 form-group">
                                            <label>Địa chỉ</label>
                                            <input className="form-control" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>Thành phố</label>
                                            <input className="form-control" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>Xã/Phường</label>
                                            <input className="form-control" value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} />
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>Điện thoại</label>
                                            <input className="form-control" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                        </div>
                                        <div className="col-md-6 form-group">
                                            <label>Email</label>
                                            <input type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                        </div>
                                         <div className="col-md-6 form-group">
                                             <label>Ảnh</label>
                                             <input className="form-control" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
                                         </div>
                                         <div className="col-md-3 form-group">
                                             <label>Giờ mở cửa</label>
                                             <input type="time" className="form-control" value={formData.openingTime} onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })} required />
                                         </div>
                                         <div className="col-md-3 form-group">
                                             <label>Giờ đóng cửa</label>
                                             <input type="time" className="form-control" value={formData.closingTime} onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })} required />
                                         </div>
                                         <div className="col-md-6 form-group">
                                            <label>Trạng thái</label>
                                            <select className="form-control" value={String(formData.isActive)} onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}>
                                                <option value="true">Hoạt động</option>
                                                <option value="false">Ngừng hoạt động</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Đóng</button>
                                    <button type="submit" className="btn btn-primary">Lưu</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCinemas;

