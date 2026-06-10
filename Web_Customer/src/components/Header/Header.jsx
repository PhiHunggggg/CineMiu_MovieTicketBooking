import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
    const { user, isLoggedIn, logout } = useAuth();

    return (
        <header className="site-header">
            <div className="container site-header__inner">
                <Link to="/" className="site-logo">CineMiu</Link>
                <nav className="site-nav" aria-label="Điều hướng chính">
                    <NavLink to="/">Trang chủ</NavLink>
                    <NavLink to="/movies">Phim</NavLink>
                    <NavLink to="/bookings">Đặt vé</NavLink>
                    <NavLink to="/promotions">Khuyến mãi</NavLink>
                </nav>
                <div className="site-account">
                    {isLoggedIn ? (
                        <>
                            <NavLink to="/profile">{user.fullName || user.email}</NavLink>
                            <button type="button" onClick={logout}>Đăng xuất</button>
                        </>
                    ) : (
                        <Link className="site-account__login" to="/login">Đăng nhập</Link>
                    )}
                </div>
            </div>
        </header>
    );
}
