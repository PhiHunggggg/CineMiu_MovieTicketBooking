import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await register({ ...form, roleId: 1 });
            navigate('/login', { replace: true });
        } catch (err) {
            setError(err.message || 'Đăng ký thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            <form className="auth-card" onSubmit={handleSubmit}>
                <p className="auth-card__eyebrow">Thành viên mới</p>
                <h1>Đăng ký</h1>
                <label>
                    Họ và tên
                    <input
                        required
                        value={form.fullName}
                        onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                    />
                </label>
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
                    Số điện thoại
                    <input
                        value={form.phone}
                        onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    />
                </label>
                <label>
                    Mật khẩu
                    <input
                        type="password"
                        minLength="6"
                        required
                        value={form.password}
                        onChange={(event) => setForm({ ...form, password: event.target.value })}
                    />
                </label>
                {error && <p className="form-error">{error}</p>}
                <button type="submit" disabled={submitting}>
                    {submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
                </button>
                <p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
            </form>
        </div>
    );
}
