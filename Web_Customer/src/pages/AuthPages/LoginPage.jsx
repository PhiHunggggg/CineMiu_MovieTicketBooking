import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import './AuthPages.css';

export default function LoginPage() {
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const authBridgeUrl = (import.meta.env.VITE_AUTH_BRIDGE_URL || 'http://localhost:5000').replace(/\/$/, '');

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  if (isLoggedIn) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" id="login-page">
      <div className="auth-page__bg" />
      <div className="auth-card">
        <div className="auth-card__header">
          <Link to="/" className="auth-card__logo">
            <span>🎬</span> CINE<span className="auth-card__accent">VERSE</span>
          </Link>
          <h1 className="auth-card__title">Đăng nhập</h1>
          <p className="auth-card__subtitle">Chào mừng bạn trở lại CineVerse</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} id="login-form">
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-email">Email</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">📧</span>
              <input
                type="email"
                id="login-email"
                className="auth-input"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="login-password">Mật khẩu</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">🔒</span>
              <input
                type={showPw ? 'text' : 'password'}
                id="login-password"
                className="auth-input"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPw(!showPw)}
                tabIndex={-1}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="auth-options">
            <label className="auth-remember">
              <input type="checkbox" />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <a href="#" className="auth-forgot">Quên mật khẩu?</a>
          </div>

          {error && <div className="auth-error" id="login-error">{error}</div>}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
            id="login-submit"
          >
            {loading ? (
              <span className="auth-submit__loading">
                <span className="auth-spinner" />
                Đang đăng nhập...
              </span>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>hoặc đăng nhập bằng</span>
        </div>

        <div className="auth-social">
          <button
            className="auth-social-btn auth-social-btn--google"
            type="button"
            onClick={() => window.location.href = `${authBridgeUrl}/auth/google`}
          >
            <span>G</span> Google
          </button>
          <button
            className="auth-social-btn auth-social-btn--facebook"
            type="button"
            onClick={() => window.location.href = `${authBridgeUrl}/auth/facebook`}
          >
            <span>f</span> Facebook
          </button>
        </div>

        <p className="auth-switch">
          Chưa có tài khoản? <Link to="/register" className="auth-switch__link">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}
