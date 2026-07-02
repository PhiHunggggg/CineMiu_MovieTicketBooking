import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false, managerOnly = false, branchOperator = false, checkInOnly = false }) => {
    const { isAuthenticated, isAdmin, isCinemaManager, canManageCinemaOperations, canCheckInTickets, loading } = useAuth();

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Đang tải...</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !isAdmin()) {
        return <Navigate to="/" replace />;
    }

    if (managerOnly && !canManageCinemaOperations()) {
        return <Navigate to="/" replace />;
    }

    if (branchOperator && !isAdmin() && !isCinemaManager()) {
        return <Navigate to="/" replace />;
    }

    if (checkInOnly && !canCheckInTickets()) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
