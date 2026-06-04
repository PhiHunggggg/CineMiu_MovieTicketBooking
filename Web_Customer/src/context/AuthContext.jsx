import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'cineverse_auth';

function getStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredAuth()?.user || null);
  const [token, setToken] = useState(() => getStoredAuth()?.token || null);
  const [loading, setLoading] = useState(true);

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    setToken(result.token);
    setUser(result.user);
    return result;
  }, []);

  const register = useCallback(async (data) => {
    const result = await authApi.register(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    setToken(result.token);
    setUser(result.user);
    return result;
  }, []);

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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
