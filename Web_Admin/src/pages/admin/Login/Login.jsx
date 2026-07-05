import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            navigate('/');
        } else {
            setError(result.message);
        }

        setLoading(false);
    };

    return (
        <main className="staff-login-page">
            <section className="staff-login-shell" aria-label="Đăng nhập hệ thống">
                <h1 className="staff-login-title">Đặt Vé Rạp Phim</h1>

                <div className="staff-login-card">
                    <p className="staff-login-message">Đăng nhập để bắt đầu phiên làm việc</p>

                    {error && (
                        <div className="alert alert-danger staff-login-alert">
                            <button type="button" className="close" onClick={() => setError('')} aria-label="Đóng">
                                &times;
                            </button>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="staff-login-field">
                            <input
                                type="email"
                                className="staff-login-input"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete={remember ? 'email' : 'off'}
                                required
                            />
                            <span className="staff-login-icon" aria-hidden="true">
                                <i className="fas fa-user"></i>
                            </span>
                        </div>

                        <div className="staff-login-field">
                            <input
                                type="password"
                                className="staff-login-input"
                                placeholder="Mật khẩu"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete={remember ? 'current-password' : 'off'}
                                required
                            />
                            <span className="staff-login-icon" aria-hidden="true">
                                <i className="fas fa-lock"></i>
                            </span>
                        </div>

                        <div className="staff-login-actions">
                            <label className="staff-login-remember" htmlFor="remember">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                />
                                <span>Ghi nhớ đăng nhập</span>
                            </label>

                            <button type="submit" className="staff-login-submit" disabled={loading}>
                                {loading ? <span className="spinner-border spinner-border-sm"></span> : 'Đăng nhập'}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
};

export default Login;

