import { useEffect, useState } from 'react';
import { bookingAdminApi, cinemaLookupApi, userApi } from '../../../services/api';
import BookingHistoryModal from './BookingHistoryModal';
import UserBrief from './UserBrief';
import UserFormModal from './UserFormModal';
import UserTableCard from './UserTableCard';
import { createUserFormData, emptyUser, getCustomerStats, getUserId } from './usersUtils';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState(emptyUser);
    const [error, setError] = useState('');
    const [historyUser, setHistoryUser] = useState(null);
    const [bookingHistory, setBookingHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        loadLookups();
        loadUsers();
    }, []);

    const loadLookups = async () => {
        try {
            const response = await cinemaLookupApi.getAll();
            setRoles(response.data?.roles || []);
        } catch (err) {
            console.error('Failed to load roles:', err);
        }
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await userApi.getAll({ keyword: keyword || undefined });
            setUsers(response.data?.items || response.data?.data || response.data || []);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        loadUsers();
    };

    const openModal = (user = null) => {
        setEditingUser(user);
        setFormData(createUserFormData(user, roles));
        setError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const payload = {
                ...formData,
                roleId: formData.roleId ? Number(formData.roleId) : null,
                dateOfBirth: formData.dateOfBirth || null,
            };

            if (editingUser && !payload.password) {
                delete payload.password;
            }

            if (editingUser) {
                await userApi.update(getUserId(editingUser), payload);
            } else {
                await userApi.create(payload);
            }
            closeModal();
            loadUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Lưu người dùng thất bại');
        }
    };

    const handleToggleStatus = async (user) => {
        setError('');
        try {
            await userApi.update(getUserId(user), {
                roleId: user.roleId,
                cinemaId: user.cinemaId || null,
                fullName: user.fullName || user.name || '',
                email: user.email,
                phone: user.phone || null,
                avatarUrl: user.avatarUrl || null,
                dateOfBirth: user.dateOfBirth || null,
                gender: user.gender || null,
                isActive: !user.isActive,
            });
            loadUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Thay đổi trạng thái khách hàng thất bại');
        }
    };

    const openBookingHistory = async (user) => {
        setHistoryUser(user);
        setBookingHistory([]);
        setHistoryLoading(true);
        try {
            const response = await bookingAdminApi.getByUser(getUserId(user));
            setBookingHistory(response.data?.items || response.data?.data || response.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được lịch sử đặt vé');
        } finally {
            setHistoryLoading(false);
        }
    };

    const closeBookingHistory = () => {
        setHistoryUser(null);
    };

    const { customerUsers, activeCustomerCount, lockedCustomerCount } = getCustomerStats(users);

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="admin-page-title">
                        <div>
                            <p className="admin-eyebrow">Khách hàng</p>
                            <h1>Quản lý người dùng</h1>
                            <span>Xem tài khoản, lịch sử đặt vé và kiểm soát truy cập.</span>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    <UserBrief
                        activeCustomerCount={activeCustomerCount}
                        customerCount={customerUsers.length}
                        lockedCustomerCount={lockedCustomerCount}
                    />
                    <UserTableCard
                        customerUsers={customerUsers}
                        error={error}
                        keyword={keyword}
                        loading={loading}
                        onCreate={() => openModal()}
                        onEdit={openModal}
                        onHistory={openBookingHistory}
                        onSearch={handleSearch}
                        onToggleStatus={handleToggleStatus}
                        roles={roles}
                        setKeyword={setKeyword}
                        showModal={showModal}
                    />
                </div>
            </section>

            <UserFormModal
                editingUser={editingUser}
                error={error}
                formData={formData}
                onClose={closeModal}
                onSubmit={handleSubmit}
                roles={roles}
                setFormData={setFormData}
                show={showModal}
            />
            <BookingHistoryModal
                bookingHistory={bookingHistory}
                historyLoading={historyLoading}
                historyUser={historyUser}
                onClose={closeBookingHistory}
            />
        </div>
    );
};

export default Users;
