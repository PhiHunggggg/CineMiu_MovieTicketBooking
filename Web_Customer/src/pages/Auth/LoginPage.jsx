import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
    const { login, isLoggedIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (isLoggedIn) return <Navigate to="/" replace />;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await login(form.email, form.password);
            navigate(location.state?.from || '/', { replace: true });
        } catch (err) {
            setError(err.message || 'Đăng nhập thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            <form className="auth-card" onSubmit={handleSubmit}>
                <p className="auth-card__eyebrow">CineMiu</p>
                <h1>Đăng nhập</h1>
                <label>
                    Email
                    <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(event) => setForm({ ...form, email: event.target.value })}
                    />
                </label>
                <label>
                    Mật khẩu
                    <input
                        type="password"
                        required
                        value={form.password}
                        onChange={(event) => setForm({ ...form, password: event.target.value })}
                    />
                </label>
                {error && <p className="form-error">{error}</p>}
                <button type="submit" disabled={submitting}>
                    {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
                <p>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></p>
            </form>
        </div>
    );
}
