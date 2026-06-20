import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);
const STORAGE_KEY = 'cineverse_auth';

function normalizeUser(payload = {}) {
  return {
    userId: payload.userId ?? payload.UserId ?? payload.id ?? payload.Id,
    id: payload.id ?? payload.Id ?? payload.userId ?? payload.UserId,
    roleId: payload.roleId ?? payload.RoleId,
    cinemaId: payload.cinemaId ?? payload.CinemaId,
    role: payload.role ?? payload.Role,
    fullName: payload.fullName ?? payload.FullName,
    email: payload.email ?? payload.Email,
    phone: payload.phone ?? payload.Phone,
    avatarUrl: payload.avatarUrl ?? payload.AvatarUrl,
    dateOfBirth: payload.dateOfBirth ?? payload.DateOfBirth,
    gender: payload.gender ?? payload.Gender,
  };
}

function normalizeAuthResult(result = {}) {
  const token = result.token ?? result.Token ?? result.accessToken ?? result.AccessToken ?? null;
  const userPayload = result.user ?? result.User ?? result;
  return {
    ...result,
    token,
    user: normalizeUser(userPayload),
  };
}

function getStoredAuth() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (stored?.token || stored?.Token) {
      return normalizeAuthResult(stored);
    }
  } catch {
    // Fall back to legacy keys below.
  }

  const legacyToken = localStorage.getItem('token');
  const legacyUser = localStorage.getItem('user');
  if (!legacyToken || !legacyUser) return null;

  try {
    return normalizeAuthResult({
      token: legacyToken,
      user: JSON.parse(legacyUser),
    });
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredAuth()?.user || null);
  const [token, setToken] = useState(() => getStoredAuth()?.token || null);
  const [loading, setLoading] = useState(true);

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
    const auth = normalizeAuthResult(await authApi.login({ email, password }));
    storeAuth(auth);
    setToken(auth.token);
    setUser(auth.user);
    return auth;
  }, []);

  const register = useCallback(async (data) => {
    const auth = normalizeAuthResult(await authApi.register(data));
    storeAuth(auth);
    setToken(auth.token);
    setUser(auth.user);
    return auth;
  }, []);

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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
