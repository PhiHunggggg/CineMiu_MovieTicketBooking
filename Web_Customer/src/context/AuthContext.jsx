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

export function AuthProvider({ children }) {
    const [user, setUser] = useState(readStoredUser);

    const login = async (email, password) => {
        const data = await authApi.login(email, password);
        const userData = {
            userId: Number(data.userId),
            roleId: data.roleId,
            role: data.role,
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            avatarUrl: data.avatarUrl,
        };
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const register = (data) => authApi.register(data);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const value = useMemo(() => ({
        user,
        isLoggedIn: Boolean(user),
        login,
        register,
        logout,
    }), [user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) throw new Error('useAuth must be used within AuthProvider');
    return value;
}
