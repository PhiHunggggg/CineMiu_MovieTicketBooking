import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loyaltyApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoyaltyCard from '../../components/Loyalty/LoyaltyCard';
import PointHistory from '../../components/Loyalty/PointHistory';
import { getUserEmail, getUserId } from '../../utils/authUser';
import './ProfilePage.css';

export default function ProfilePage() {
    const { user, isLoggedIn } = useAuth();
    const [membership, setMembership] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const userId = getUserId(user);
    const email = getUserEmail(user);

    useEffect(() => {
        if (!isLoggedIn || (!userId && !email)) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        const membershipRequest = userId ? loyaltyApi.getByUser(userId) : loyaltyApi.getByEmail(email);
        const transactionsRequest = userId ? loyaltyApi.getTransactions(userId) : loyaltyApi.getTransactionsByEmail(email);

        Promise.all([membershipRequest, transactionsRequest])
            .then(([membershipData, transactionData]) => {
                setMembership(membershipData);
                setTransactions(Array.isArray(transactionData) ? transactionData : []);
            })
            .catch(err => {
                setError(err.message || 'Không thể tải thông tin thành viên.');
            })
            .finally(() => setLoading(false));
    }, [isLoggedIn, userId, email]);

    if (loading) {
        return <div className="profile-page container">Đang tải...</div>;
    }

    return (
        <div className="profile-page container">
            <div className="profile-page__header">
                <div>
                    <h1>Tài khoản của tôi</h1>
                    <p>{user?.fullName || user?.email || 'Khách hàng CineMIU'}</p>
                </div>
                <Link to="/my-tickets" className="profile-page__tickets-link">
                    Vé của tôi
                </Link>
            </div>

            {error && <p className="profile-page__error">{error}</p>}

            <section className="profile-page__grid">
                <LoyaltyCard membership={membership} />

                <div className="profile-page__summary">
                    <h2>Thông tin thành viên</h2>
                    <dl>
                        <div>
                            <dt>Email</dt>
                            <dd>{user?.email || '-'}</dd>
                        </div>
                        <div>
                            <dt>Hạng hiện tại</dt>
                            <dd>{membership?.tierName || '-'}</dd>
                        </div>
                        <div>
                            <dt>Điểm hiện tại</dt>
                            <dd>{(membership?.totalPoints ?? 0).toLocaleString('vi-VN')}</dd>
                        </div>
                        <div>
                            <dt>Ưu đãi</dt>
                            <dd>{membership?.benefits || 'Chưa có ưu đãi'}</dd>
                        </div>
                    </dl>
                </div>
            </section>

            <PointHistory transactions={transactions} />
        </div>
    );
}
