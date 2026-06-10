import { useEffect, useState } from 'react';
import { promotionApi } from '../../services/api';

const discountTypes = [
    { value: 'percent', label: 'Phần trăm' },
    { value: 'fixed', label: 'Giảm tiền' },
    { value: 'free_combo', label: 'Tặng combo' },
];

const toDateTimeInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).substring(0, 16);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().substring(0, 16);
};

const defaultDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return toDateTimeInput(date);
};

const emptyPromotion = {
    promoCode: '',
    description: '',
    discountType: 'percent',
    discountValue: 10,
    minOrderAmt: 0,
    maxDiscount: '',
    usageLimit: '',
    perUserLimit: 1,
    validFrom: defaultDate(0),
    validTo: defaultDate(30),
    isActive: true,
};

const getItems = (data) => data?.items || data?.data || data || [];
const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '-');

const discountLabel = (promotion) => {
    if (promotion.discountType === 'percent') return `${promotion.discountValue}%`;
    if (promotion.discountType === 'free_combo') return `Combo ${formatCurrency(promotion.discountValue)}`;
    return formatCurrency(promotion.discountValue);
};

const AdminPromotions = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState(null);
    const [formData, setFormData] = useState(emptyPromotion);
    const [error, setError] = useState('');

    useEffect(() => {
        loadPromotions();
    }, []);

    const loadPromotions = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await promotionApi.getAll({ activeOnly: false });
            setPromotions(getItems(response.data));
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được danh sách khuyến mãi');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (promotion = null) => {
        setEditingPromotion(promotion);
        setError('');
        setFormData(promotion ? {
            promoCode: promotion.promoCode || '',
            description: promotion.description || '',
            discountType: promotion.discountType || 'percent',
            discountValue: promotion.discountValue || 0,
            minOrderAmt: promotion.minOrderAmt || 0,
            maxDiscount: promotion.maxDiscount ?? '',
            usageLimit: promotion.usageLimit ?? '',
            perUserLimit: promotion.perUserLimit || 1,
            validFrom: toDateTimeInput(promotion.validFrom),
            validTo: toDateTimeInput(promotion.validTo),
            isActive: promotion.isActive ?? true,
        } : emptyPromotion);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPromotion(null);
        setError('');
    };

    const submitPromotion = async (event) => {
        event.preventDefault();
        setError('');

        const payload = {
            ...formData,
            promoCode: formData.promoCode.trim().toUpperCase(),
            discountValue: Number(formData.discountValue || 0),
            minOrderAmt: Number(formData.minOrderAmt || 0),
            maxDiscount: formData.maxDiscount === '' ? null : Number(formData.maxDiscount),
            usageLimit: formData.usageLimit === '' ? null : Number(formData.usageLimit),
            perUserLimit: Number(formData.perUserLimit || 1),
            validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
            validTo: formData.validTo ? new Date(formData.validTo).toISOString() : null,
        };

        try {
            if (editingPromotion) {
                await promotionApi.update(editingPromotion.promoId, payload);
            } else {
                await promotionApi.create(payload);
            }
            closeModal();
            await loadPromotions();
        } catch (err) {
            setError(err.response?.data?.message || 'Lưu khuyến mãi thất bại');
        }
    };

    const deletePromotion = async (promotion) => {
        if (!window.confirm(`Ngừng mã "${promotion.promoCode}"?`)) return;

        setError('');
        try {
            await promotionApi.delete(promotion.promoId);
            await loadPromotions();
        } catch (err) {
            setError(err.response?.data?.message || 'Ngừng khuyến mãi thất bại');
        }
    };

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <h1 className="m-0">Quản lý khuyến mãi</h1>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {error && !showModal && <div className="alert alert-warning">{error}</div>}

                    <div className="card">
                        <div className="card-header text-right">
                            <button className="btn btn-success" type="button" onClick={() => openModal()}>
                                <i className="fas fa-plus mr-1"></i> Thêm mã
                            </button>
                        </div>
                        <div className="card-body">
                            {loading ? (
                                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped">
                                        <thead>
                                            <tr>
                                                <th>Mã</th>
                                                <th>Mô tả</th>
                                                <th>Giảm</th>
                                                <th>Điều kiện</th>
                                                <th>Thời hạn</th>
                                                <th>Lượt dùng</th>
                                                <th>Trạng thái</th>
                                                <th style={{ width: '105px' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {promotions.length === 0 ? (
                                                <tr><td colSpan="8" className="text-center">Chưa có khuyến mãi</td></tr>
                                            ) : promotions.map((promotion) => (
                                                <tr key={promotion.promoId}>
                                                    <td><strong>{promotion.promoCode}</strong></td>
                                                    <td>{promotion.description || '-'}</td>
                                                    <td>{discountLabel(promotion)}</td>
                                                    <td>
                                                        Tối thiểu {formatCurrency(promotion.minOrderAmt)}
                                                        {promotion.maxDiscount ? <div className="small text-muted">Tối đa {formatCurrency(promotion.maxDiscount)}</div> : null}
                                                    </td>
                                                    <td>
                                                        {formatDateTime(promotion.validFrom)}
                                                        <div className="small text-muted">đến {formatDateTime(promotion.validTo)}</div>
                                                    </td>
                                                    <td>{promotion.totalUses || 0}/{promotion.usageLimit || '∞'}</td>
                                                    <td>
                                                        <span className={`badge ${promotion.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                                            {promotion.isActive ? 'Đang bật' : 'Đã tắt'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <button className="btn btn-sm btn-info mr-1" type="button" onClick={() => openModal(promotion)}>
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button className="btn btn-sm btn-danger" type="button" onClick={() => deletePromotion(promotion)} disabled={!promotion.isActive}>
                                                            <i className="fas fa-ban"></i>
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
                <div className="modal fade show" style={{ display: 'block', overflowY: 'auto' }} tabIndex="-1">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <form onSubmit={submitPromotion}>
                                <div className="modal-header">
                                    <h5 className="modal-title">{editingPromotion ? 'Cập nhật khuyến mãi' : 'Thêm khuyến mãi'}</h5>
                                    <button type="button" className="close" onClick={closeModal}><span>&times;</span></button>
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger">{error}</div>}
                                    <div className="row">
                                        <div className="col-md-4 form-group">
                                            <label>Mã khuyến mãi</label>
                                            <input className="form-control text-uppercase" value={formData.promoCode} onChange={(e) => setFormData({ ...formData, promoCode: e.target.value })} required />
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>Loại giảm</label>
                                            <select className="form-control" value={formData.discountType} onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}>
                                                {discountTypes.map((type) => (
                                                    <option key={type.value} value={type.value}>{type.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>Giá trị</label>
                                            <input type="number" min="0" className="form-control" value={formData.discountValue} onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })} required />
                                        </div>
                                        <div className="col-md-12 form-group">
                                            <label>Mô tả</label>
                                            <textarea className="form-control" rows="2" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>Đơn tối thiểu</label>
                                            <input type="number" min="0" className="form-control" value={formData.minOrderAmt} onChange={(e) => setFormData({ ...formData, minOrderAmt: e.target.value })} />
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>Giảm tối đa</label>
                                            <input type="number" min="0" className="form-control" value={formData.maxDiscount} onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })} />
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>Lượt dùng tối đa</label>
                                            <input type="number" min="0" className="form-control" value={formData.usageLimit} onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })} />
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>Giới hạn / người</label>
                                            <input type="number" min="1" className="form-control" value={formData.perUserLimit} onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })} required />
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>Bắt đầu</label>
                                            <input type="datetime-local" className="form-control" value={formData.validFrom} onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })} required />
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>Kết thúc</label>
                                            <input type="datetime-local" className="form-control" value={formData.validTo} onChange={(e) => setFormData({ ...formData, validTo: e.target.value })} required />
                                        </div>
                                        <div className="col-md-4 form-group">
                                            <label>Trạng thái</label>
                                            <select className="form-control" value={String(formData.isActive)} onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}>
                                                <option value="true">Đang bật</option>
                                                <option value="false">Đã tắt</option>
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
            {showModal && <div className="modal-backdrop fade show"></div>}
        </div>
    );
};

export default AdminPromotions;
