import { createContext, useContext, useMemo, useState } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

function readStoredUser() {
    const token = localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');
    if (!token || !rawUser) return null;

    try {
        return JSON.parse(rawUser);
    } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
    }
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(readStoredUser);

    const login = async (email, password) => {
        try {
            const response = await authApi.login(email, password);
            const authData = response.data;
            const payload = authData.user || authData;
            const userData = {
                userId: Number(payload.userId ?? payload.UserId ?? payload.id ?? authData.userId),
                roleId: payload.roleId ?? payload.RoleId ?? authData.roleId,
                cinemaId: payload.cinemaId ?? payload.CinemaId ?? authData.cinemaId,
                role: payload.role ?? payload.Role ?? authData.role,
                fullName: payload.fullName ?? payload.FullName ?? authData.fullName,
                email: payload.email ?? payload.Email ?? authData.email,
                phone: payload.phone ?? payload.Phone ?? authData.phone,
                avatarUrl: payload.avatarUrl ?? payload.AvatarUrl ?? authData.avatarUrl,
            };

            localStorage.setItem('token', authData.token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return { success: true, user: userData };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Đăng nhập thất bại',
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const getRole = () => (user?.role || '').toString().toLowerCase();
    const getRoleId = () => Number(user?.roleId || 0);
    const isAdmin = () => getRoleId() === 4 || getRole().includes('admin');
    const isCinemaManager = () => !isAdmin() && (getRoleId() === 3 || getRole().includes('manager'));
    const isTicketStaff = () => getRoleId() === 2 || getRole().includes('staff');
    const canManageCinemaOperations = () => isAdmin() || isCinemaManager();
    const canCheckInTickets = () => isAdmin() || isCinemaManager() || isTicketStaff();

    const value = useMemo(() => ({
        user,
        login,
        logout,
        isAdmin,
        isCinemaManager,
        isTicketStaff,
        canManageCinemaOperations,
        canCheckInTickets,
        isAuthenticated: Boolean(user),
        loading: false,
    }), [user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
