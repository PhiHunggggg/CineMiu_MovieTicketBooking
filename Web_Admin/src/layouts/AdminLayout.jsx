import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

const pageTitles = {
  '/admin/dashboard': 'Tổng quan',
  '/admin/movies': 'Quản lý phim',
  '/admin/bookings': 'Quản lý đặt vé',
  '/admin/users': 'Quản lý người dùng',
}

function AdminLayout() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] ?? 'Tổng quan'

  return (
    <div className="admin-shell">
      <Sidebar />
      <div className="admin-main">
        <Header title={title} />
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
