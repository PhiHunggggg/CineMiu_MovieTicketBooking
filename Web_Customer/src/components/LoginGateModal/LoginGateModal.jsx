import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './LoginGateModal.css';

export default function LoginGateModal() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      // After successful login, the BookingContent will re-render
      // and show the ShowtimeSelect step automatically
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-gate" id="login-gate">
      <div className="login-gate__card">
        <div className="login-gate__icon">
          <span>🔐</span>
        </div>
        <h2 className="login-gate__title">Đăng nhập để tiếp tục</h2>
        <p className="login-gate__desc">
          Vui lòng đăng nhập để chọn suất chiếu và hoàn tất đặt vé
        </p>

        <form className="login-gate__form" onSubmit={handleSubmit} id="login-gate-form">
          <div className="login-gate__field">
            <label className="login-gate__label" htmlFor="gate-email">Email</label>
            <div className="login-gate__input-wrap">
              <span className="login-gate__input-icon">📧</span>
              <input
                type="email"
                id="gate-email"
                className="login-gate__input"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="login-gate__field">
            <label className="login-gate__label" htmlFor="gate-password">Mật khẩu</label>
            <div className="login-gate__input-wrap">
              <span className="login-gate__input-icon">🔒</span>
              <input
                type={showPw ? 'text' : 'password'}
                id="gate-password"
                className="login-gate__input"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-gate__pw-toggle"
                onClick={() => setShowPw(!showPw)}
                tabIndex={-1}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="login-gate__error" id="gate-error">{error}</div>}

          <button
            type="submit"
            className="login-gate__submit"
            disabled={loading}
            id="gate-submit"
          >
            {loading ? (
              <span className="login-gate__loading">
                <span className="login-gate__spinner" />
                Đang đăng nhập...
              </span>
            ) : (
              '🔓 Đăng nhập & Tiếp tục đặt vé'
            )}
          </button>
        </form>

        <p className="login-gate__register">
          Chưa có tài khoản? <Link to="/register" className="login-gate__register-link">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}
