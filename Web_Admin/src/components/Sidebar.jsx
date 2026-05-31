import { NavLink } from 'react-router-dom'
import Icon from './Icon'

const navigationItems = [
  { to: '/admin/dashboard', label: 'Tổng quan', icon: 'dashboard' },
  { to: '/admin/movies', label: 'Phim', icon: 'movies' },
  { to: '/admin/bookings', label: 'Đặt vé', icon: 'bookings' },
  { to: '/admin/users', label: 'Người dùng', icon: 'users' },
]

function Sidebar() {
  const handleLogout = () => {
    localStorage.removeItem('token')
    sessionStorage.clear()
  }

  return (
    <aside className="admin-sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          CM
        </div>
        <div>
          <span className="brand-name">CineMiu</span>
          <span className="brand-label">Bảng quản trị</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Điều hướng quản trị">
        {navigationItems.map((item) =>
          <NavLink
            className={({ isActive }) =>
              isActive ? 'nav-item is-active' : 'nav-item'
            }
            key={item.to}
            to={item.to}
          >
            <span className="nav-icon" aria-hidden="true">
              <Icon name={item.icon} />
            </span>
            {item.label}
          </NavLink>
        )}
      </nav>

      <button className="logout-button" type="button" onClick={handleLogout}>
        <span className="nav-icon" aria-hidden="true">
          <Icon name="logout" />
        </span>
        Đăng xuất
      </button>
    </aside>
  )
}

export default Sidebar
