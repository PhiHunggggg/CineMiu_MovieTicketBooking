import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Bookings from './pages/admin/Bookings'
import Cinemas from './pages/admin/Cinemas'
import Movies from './pages/admin/Movies'
import Users from './pages/admin/Users'
import './App.css'
import Halls from './pages/admin/Halls'
import Showtimes from './pages/admin/Showtimes'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="movies" element={<Movies />} />
          <Route path="cinemas" element={<Cinemas />} />
          <Route path="halls" element={<Halls />} />
          <Route path="showtimes" element={<Showtimes />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="users" element={<Users />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
