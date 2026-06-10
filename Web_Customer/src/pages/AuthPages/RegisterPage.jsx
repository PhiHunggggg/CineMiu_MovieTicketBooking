import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AuthPages.css';

export default function RegisterPage() {
  const { register, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: '',
    dateOfBirth: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const authBridgeUrl = (import.meta.env.VITE_AUTH_BRIDGE_URL || 'http://localhost:5000').replace(/\/$/, '');

  if (isLoggedIn) {
    navigate('/', { replace: true });
    return null;
  }

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const validate = () => {
    if (!form.fullName.trim()) return 'Vui lòng nhập họ tên';
    if (!form.email.trim()) return 'Vui lòng nhập email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email không hợp lệ';
    if (!form.password) return 'Vui lòng nhập mật khẩu';
    if (form.password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
    if (form.password !== form.confirmPassword) return 'Mật khẩu nhập lại không khớp';
    if (!agreed) return 'Vui lòng đồng ý với điều khoản sử dụng';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || null,
        password: form.password,
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" id="register-page">
      <div className="auth-page__bg" />
      <div className="auth-card auth-card--wide">
        <div className="auth-card__header">
          <Link to="/" className="auth-card__logo">
            <span>🎬</span> CINE<span className="auth-card__accent">VERSE</span>
          </Link>
          <h1 className="auth-card__title">Tạo tài khoản</h1>
          <p className="auth-card__subtitle">Tham gia CineVerse để trải nghiệm điện ảnh tuyệt vời</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          <div className="auth-form__row">
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-name">Họ và tên *</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">👤</span>
                <input
                  type="text"
                  id="reg-name"
                  className="auth-input"
                  placeholder="Nguyễn Văn A"
                  value={form.fullName}
                  onChange={e => updateField('fullName', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-email">Email *</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">📧</span>
                <input
                  type="email"
                  id="reg-email"
                  className="auth-input"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>
          </div>

          <div className="auth-form__row">
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-phone">Số điện thoại</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">📱</span>
                <input
                  type="tel"
                  id="reg-phone"
                  className="auth-input"
                  placeholder="0912 345 678"
                  value={form.phone}
                  onChange={e => updateField('phone', e.target.value)}
                />
              </div>
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-dob">Ngày sinh</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🎂</span>
                <input
                  type="date"
                  id="reg-dob"
                  className="auth-input"
                  value={form.dateOfBirth}
                  onChange={e => updateField('dateOfBirth', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Giới tính</label>
            <div className="auth-gender-group">
              {[
                { value: 'male', label: 'Nam', icon: '👨' },
                { value: 'female', label: 'Nữ', icon: '👩' },
                { value: 'other', label: 'Khác', icon: '🧑' },
              ].map(g => (
                <button
                  key={g.value}
                  type="button"
                  className={`auth-gender-btn ${form.gender === g.value ? 'auth-gender-btn--active' : ''}`}
                  onClick={() => updateField('gender', g.value)}
                >
                  <span>{g.icon}</span> {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="auth-form__row">
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-password">Mật khẩu *</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔒</span>
                <input
                  type={showPw ? 'text' : 'password'}
                  id="reg-password"
                  className="auth-input"
                  placeholder="Ít nhất 6 ký tự"
                  value={form.password}
                  onChange={e => updateField('password', e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
              {form.password && (
                <div className="auth-pw-strength">
                  <div className={`auth-pw-bar ${form.password.length >= 8 ? 'auth-pw-bar--strong' : form.password.length >= 6 ? 'auth-pw-bar--medium' : 'auth-pw-bar--weak'}`} />
                  <span>{form.password.length >= 8 ? 'Mạnh' : form.password.length >= 6 ? 'Trung bình' : 'Yếu'}</span>
                </div>
              )}
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-confirm">Nhập lại mật khẩu *</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔒</span>
                <input
                  type={showPw ? 'text' : 'password'}
                  id="reg-confirm"
                  className="auth-input"
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword}
                  onChange={e => updateField('confirmPassword', e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <span className="auth-input-status auth-input-status--error">✗</span>
                )}
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <span className="auth-input-status auth-input-status--ok">✓</span>
                )}
              </div>
            </div>
          </div>

          <label className="auth-agree">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span>
              Tôi đồng ý với <a href="#">Điều khoản sử dụng</a> và <a href="#">Chính sách bảo mật</a> của CineVerse
            </span>
          </label>

          {error && <div className="auth-error" id="register-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading} id="register-submit">
            {loading ? (
              <span className="auth-submit__loading">
                <span className="auth-spinner" />
                Đang tạo tài khoản...
              </span>
            ) : (
              'Tạo tài khoản'
            )}
          </button>
        </form>

        <div className="auth-divider"><span>hoặc đăng ký bằng</span></div>

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
          Đã có tài khoản? <Link to="/login" className="auth-switch__link">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
