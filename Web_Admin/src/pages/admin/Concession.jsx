import { useEffect, useMemo, useState } from 'react';
import { concessionApi } from '../../services/api';

const emptyItem = {
    catId: '',
    itemName: '',
    description: '',
    price: 0,
    imageUrl: '',
    isAvailable: true,
};

const emptyCategory = {
    catName: '',
};

const getItems = (data) => data?.items || data?.data || data || [];
const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

const AdminConcessions = () => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [showItemModal, setShowItemModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [itemForm, setItemForm] = useState(emptyItem);
    const [categoryForm, setCategoryForm] = useState(emptyCategory);
    const [error, setError] = useState('');

    const categoryNameById = useMemo(() => {
        const map = new Map();
        categories.forEach((category) => map.set(Number(category.catId), category.catName));
        return map;
    }, [categories]);

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        setError('');
        try {
            const [categoryRes, itemRes] = await Promise.all([
                concessionApi.getCategories(),
                concessionApi.getAll({ activeOnly: false }),
            ]);
            setCategories(getItems(categoryRes.data));
            setItems(getItems(itemRes.data));
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được dữ liệu bắp nước');
        } finally {
            setLoading(false);
        }
    };

    const openItemModal = (item = null) => {
        setEditingItem(item);
        setError('');
        setItemForm(item ? {
            catId: item.catId || '',
            itemName: item.itemName || '',
            description: item.description || '',
            price: item.price || 0,
            imageUrl: item.imageUrl || '',
            isAvailable: item.isAvailable ?? true,
        } : {
            ...emptyItem,
            catId: categories[0]?.catId || '',
        });
        setShowItemModal(true);
    };

    const openCategoryModal = (category = null) => {
        setEditingCategory(category);
        setError('');
        setCategoryForm(category ? { catName: category.catName || '' } : emptyCategory);
        setShowCategoryModal(true);
    };

    const closeModals = () => {
        setShowItemModal(false);
        setShowCategoryModal(false);
        setEditingItem(null);
        setEditingCategory(null);
        setError('');
    };

    const submitItem = async (event) => {
        event.preventDefault();
        setError('');

        const payload = {
            ...itemForm,
            catId: Number(itemForm.catId),
            price: Number(itemForm.price || 0),
        };

        try {
            if (editingItem) {
                await concessionApi.update(editingItem.itemId, payload);
            } else {
                await concessionApi.create(payload);
            }
            closeModals();
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Lưu món bắp nước thất bại');
        }
    };

    const submitCategory = async (event) => {
        event.preventDefault();
        setError('');

        try {
            if (editingCategory) {
                await concessionApi.updateCategory(editingCategory.catId, categoryForm);
            } else {
                await concessionApi.createCategory(categoryForm);
            }
            closeModals();
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Lưu danh mục thất bại');
        }
    };

    const deleteItem = async (item) => {
        if (!window.confirm(`Ngừng bán "${item.itemName}"?`)) return;

        setError('');
        try {
            await concessionApi.delete(item.itemId);
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Ngừng bán món thất bại');
        }
    };

    const deleteCategory = async (category) => {
        if (!window.confirm(`Xóa danh mục "${category.catName}"?`)) return;

        setError('');
        try {
            await concessionApi.deleteCategory(category.catId);
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Xóa danh mục thất bại');
        }
    };

    const visibleItems = categoryFilter
        ? items.filter((item) => String(item.catId) === String(categoryFilter))
        : items;

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <h1 className="m-0">Quản lý bắp nước</h1>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {error && !showItemModal && !showCategoryModal && <div className="alert alert-warning">{error}</div>}

                    <div className="row">
                        <div className="col-lg-4 mb-3">
                            <div className="card h-100">
                                <div className="card-header d-flex justify-content-between align-items-center">
                                    <h3 className="card-title mb-0">Danh mục</h3>
                                    <button className="btn btn-sm btn-primary" type="button" onClick={() => openCategoryModal()}>
                                        <i className="fas fa-plus"></i>
                                    </button>
                                </div>
                                <div className="card-body p-0">
                                    <table className="table table-hover mb-0">
                                        <tbody>
                                            {categories.length === 0 ? (
                                                <tr><td className="text-center">Chưa có danh mục</td></tr>
                                            ) : categories.map((category) => (
                                                <tr key={category.catId}>
                                                    <td>
                                                        <strong>{category.catName}</strong>
                                                        <div className="small text-muted">{items.filter((item) => item.catId === category.catId).length} món</div>
                                                    </td>
                                                    <td className="text-right">
                                                        <button className="btn btn-sm btn-info mr-1" type="button" onClick={() => openCategoryModal(category)}>
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button className="btn btn-sm btn-danger" type="button" onClick={() => deleteCategory(category)}>
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-8 mb-3">
                            <div className="card">
                                <div className="card-header">
                                    <div className="d-flex flex-wrap justify-content-between align-items-center">
                                        <div className="form-inline">
                                            <label className="mr-2">Lọc danh mục</label>
                                            <select className="form-control" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                                                <option value="">Tất cả</option>
                                                {categories.map((category) => (
                                                    <option key={category.catId} value={category.catId}>{category.catName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button className="btn btn-success" type="button" onClick={() => openItemModal()}>
                                            <i className="fas fa-plus mr-1"></i> Thêm món
                                        </button>
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
                                                        <th>Món</th>
                                                        <th>Danh mục</th>
                                                        <th>Giá</th>
                                                        <th>Trạng thái</th>
                                                        <th style={{ width: '105px' }}>Thao tác</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {visibleItems.length === 0 ? (
                                                        <tr><td colSpan="5" className="text-center">Chưa có món phù hợp</td></tr>
                                                    ) : visibleItems.map((item) => (
                                                        <tr key={item.itemId}>
                                                            <td>
                                                                <strong>{item.itemName}</strong>
                                                                <div className="small text-muted">{item.description || '-'}</div>
                                                            </td>
                                                            <td>{categoryNameById.get(Number(item.catId)) || item.catId}</td>
                                                            <td>{formatCurrency(item.price)}</td>
                                                            <td>
                                                                <span className={`badge ${item.isAvailable ? 'badge-success' : 'badge-secondary'}`}>
                                                                    {item.isAvailable ? 'Đang bán' : 'Ngừng bán'}
                                                                </span>
                                                            </td>
                                                            <td className="text-center">
                                                                <button className="btn btn-sm btn-info mr-1" type="button" onClick={() => openItemModal(item)}>
                                                                    <i className="fas fa-edit"></i>
                                                                </button>
                                                                <button className="btn btn-sm btn-danger" type="button" onClick={() => deleteItem(item)} disabled={!item.isAvailable}>
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
                    </div>
                </div>
            </section>

            {showItemModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <form onSubmit={submitItem}>
                                <div className="modal-header">
                                    <h5 className="modal-title">{editingItem ? 'Cập nhật món' : 'Thêm món'}</h5>
                                    <button type="button" className="close" onClick={closeModals}><span>&times;</span></button>
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger">{error}</div>}
                                    <div className="form-group">
                                        <label>Danh mục</label>
                                        <select className="form-control" value={itemForm.catId} onChange={(e) => setItemForm({ ...itemForm, catId: e.target.value })} required>
                                            <option value="">Chọn danh mục</option>
                                            {categories.map((category) => (
                                                <option key={category.catId} value={category.catId}>{category.catName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Tên món</label>
                                        <input className="form-control" value={itemForm.itemName} onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Mô tả</label>
                                        <textarea className="form-control" rows="3" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label>Giá</label>
                                        <input type="number" min="0" className="form-control" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Link ảnh</label>
                                        <input className="form-control" value={itemForm.imageUrl} onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Trạng thái</label>
                                        <select className="form-control" value={String(itemForm.isAvailable)} onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.value === 'true' })}>
                                            <option value="true">Đang bán</option>
                                            <option value="false">Ngừng bán</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeModals}>Đóng</button>
                                    <button type="submit" className="btn btn-primary">Lưu</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showCategoryModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <form onSubmit={submitCategory}>
                                <div className="modal-header">
                                    <h5 className="modal-title">{editingCategory ? 'Cập nhật danh mục' : 'Thêm danh mục'}</h5>
                                    <button type="button" className="close" onClick={closeModals}><span>&times;</span></button>
                                </div>
                                <div className="modal-body">
                                    {error && <div className="alert alert-danger">{error}</div>}
                                    <div className="form-group">
                                        <label>Tên danh mục</label>
                                        <input className="form-control" value={categoryForm.catName} onChange={(e) => setCategoryForm({ catName: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeModals}>Đóng</button>
                                    <button type="submit" className="btn btn-primary">Lưu</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {(showItemModal || showCategoryModal) && <div className="modal-backdrop fade show"></div>}
        </div>
    );
};

export default AdminConcessions;
