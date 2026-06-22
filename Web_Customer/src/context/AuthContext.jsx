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
        setUser(profile);
        const stored = getStoredAuth();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, user: profile }));
      })
      .catch(() => {
        // Token expired or invalid
        localStorage.removeItem(STORAGE_KEY);
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
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const loginSocial = useCallback((userData, tokenData = 'social_token') => {
    const result = { user: userData, token: tokenData };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    setToken(tokenData);
    setUser(userData);
  }, []);

  const updateProfile = useCallback(async (data) => {
    const profile = await authApi.updateProfile(data);
    setUser(profile);
    const stored = getStoredAuth();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, user: profile }));
    return profile;
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isLoggedIn: !!user,
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
