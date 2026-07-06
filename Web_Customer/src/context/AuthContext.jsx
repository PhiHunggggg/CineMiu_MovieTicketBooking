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

function normalizeUser(profile) {
  return {
    userId: profile?.userId ?? profile?.UserId,
    roleId: profile?.roleId ?? profile?.RoleId,
    cinemaId: profile?.cinemaId ?? profile?.CinemaId,
    fullName: profile?.fullName ?? profile?.FullName,
    email: profile?.email ?? profile?.Email,
    phone: profile?.phone ?? profile?.Phone,
    avatarUrl: profile?.avatarUrl ?? profile?.AvatarUrl,
    dateOfBirth: profile?.dateOfBirth ?? profile?.DateOfBirth,
    gender: profile?.gender ?? profile?.Gender,
    isActive: profile?.isActive ?? profile?.IsActive,
    role: profile?.role ?? profile?.Role,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredAuth()?.user || null);
  const [token, setToken] = useState(() => getStoredAuth()?.token || null);
  const [loading, setLoading] = useState(true);

  const normalizeAuthResult = useCallback((result) => {
    const tokenValue = result?.token ?? result?.Token ?? null;
    const userValue = result?.user ?? {
      userId: result?.userId ?? result?.UserId,
      roleId: result?.roleId ?? result?.RoleId,
      cinemaId: result?.cinemaId ?? result?.CinemaId,
      fullName: result?.fullName ?? result?.FullName,
      email: result?.email ?? result?.Email,
      phone: result?.phone ?? result?.Phone,
      avatarUrl: result?.avatarUrl ?? result?.AvatarUrl,
      role: result?.role ?? result?.Role,
    };

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
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
  }, []);

  const updateProfile = useCallback(async (data) => {
    const nextUser = normalizeUser(await authApi.updateProfile(data));
    const nextAuth = { token, user: nextUser };
    storeAuth(nextAuth);
    setUser(nextUser);
    return nextUser;
  }, [token]);

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
