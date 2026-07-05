import { createContext, useContext, useState } from 'react';
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
            const account = authData.user || authData;
            const userData = {
                userId: Number(account.userId),
                roleId: account.roleId,
                role: authData.role,
                cinemaId: account.cinemaId ?? null,
                fullName: account.fullName,
                email: account.email,
                phone: account.phone,
                avatarUrl: account.avatarUrl,
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
    const isAdmin = () => getRole().includes('admin');
    const isCinemaManager = () => isAdmin() || getRole().includes('manager');
    const isTicketStaff = () => getRole().includes('staff');
    const canCheckInTickets = () => isAdmin() || isCinemaManager() || isTicketStaff();

    const value = {
        user,
        login,
        logout,
        isAdmin,
        isCinemaManager,
        isTicketStaff,
        canCheckInTickets,
        isAuthenticated: Boolean(user),
        loading: false,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
