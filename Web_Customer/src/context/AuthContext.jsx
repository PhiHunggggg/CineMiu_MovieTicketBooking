import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import { STORAGE_KEY, getStoredAuth } from './AuthStorage';

export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}

function storeAuth(auth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  localStorage.setItem('token', auth.token || '');
  localStorage.setItem('user', JSON.stringify(auth.user));
}

function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function normalizeUser(value, fallbackRole = null) {
  if (!value) return null;
  return {
    userId: value.userId ?? value.UserId,
    roleId: value.roleId ?? value.RoleId,
    cinemaId: value.cinemaId ?? value.CinemaId ?? null,
    fullName: value.fullName ?? value.FullName,
    email: value.email ?? value.Email,
    phone: value.phone ?? value.Phone ?? null,
    avatarUrl: value.avatarUrl ?? value.AvatarUrl ?? null,
    dateOfBirth: value.dateOfBirth ?? value.DateOfBirth ?? null,
    gender: value.gender ?? value.Gender ?? null,
    isActive: value.isActive ?? value.IsActive ?? true,
    role: value.role ?? value.Role ?? fallbackRole,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredAuth()?.user || null);
  const [token, setToken] = useState(() => getStoredAuth()?.token || null);
  const [loading, setLoading] = useState(true);

  const normalizeAuthResult = useCallback((result) => {
    const tokenValue = result?.token ?? result?.Token ?? null;
    const roleValue = result?.role ?? result?.Role ?? null;
    const userValue = normalizeUser(result?.user ?? result, roleValue);

    return {
      ...result,
      token: tokenValue,
      user: userValue,
    };
  }, []);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
        setLoading(false);
        return;
    }

    authApi.getProfile()
      .then(profile => {
        const nextUser = normalizeUser(profile);
        const nextAuth = { token, user: nextUser };
        storeAuth(nextAuth);
        setUser(nextUser);
      })
      .catch(() => {
        clearStoredAuth();
        setUser(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    const result = await authApi.login({ email, password });
    const auth = normalizeAuthResult(result);
    const roleName = String(auth.user?.role || auth.role || '').trim().toLowerCase();
    if (!['customer', 'user', 'member'].includes(roleName)) {
      throw new Error('Tài khoản này không phải tài khoản khách hàng.');
    }
    storeAuth(auth);
    setToken(auth.token);
    setUser(auth.user);
    return auth;
  }, [normalizeAuthResult]);

  const register = useCallback(async (data) => {
    await authApi.register(data);
    return login(data.email, data.password);
  }, [login]);

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  const loginSocial = useCallback((userData, tokenData = 'social_token') => {
    const auth = normalizeAuthResult({ user: userData, token: tokenData });
    storeAuth(auth);
    setToken(auth.token);
    setUser(auth.user);
  }, [normalizeAuthResult]);

  const updateProfile = useCallback(async (data) => {
    const nextUser = {
      ...user,
      ...normalizeUser(await authApi.updateProfile(data), user?.role),
    };
    const nextAuth = { token, user: nextUser };
    storeAuth(nextAuth);
    setUser(nextUser);
    return nextUser;
  }, [token, user]);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isLoggedIn: Boolean(user),
      login,
      loginSocial,
      register,
      logout,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
