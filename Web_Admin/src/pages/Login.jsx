import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: 'admin@basecore.local', password: 'admin123' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (isAuthenticated) return <Navigate to="/admin/dashboard" replace />;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError('');
        const result = await login(form.email, form.password);
        setSubmitting(false);
        if (!result.success) {
            setError(result.message);
            return;
        }
        navigate('/admin/dashboard', { replace: true });
    };

    return (
        <main className="staff-login-page">
            <div className="staff-login-shell">
                <h1 className="staff-login-title">CineMiu Admin</h1>
                <form className="staff-login-card" onSubmit={handleSubmit}>
                    <p className="staff-login-message">Đăng nhập hệ thống quản trị</p>
                    {error && <div className="alert alert-danger staff-login-alert">{error}</div>}
                    <label className="staff-login-field">
                        <input
                            className="staff-login-input"
                            type="email"
                            required
                            placeholder="Email"
                            value={form.email}
                            onChange={(event) => setForm({ ...form, email: event.target.value })}
                        />
                    </label>
                    <label className="staff-login-field">
                        <input
                            className="staff-login-input"
                            type="password"
                            required
                            placeholder="Mật khẩu"
                            value={form.password}
                            onChange={(event) => setForm({ ...form, password: event.target.value })}
                        />
                    </label>
                    <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
                        {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>
            </div>
        </main>
    );
}
