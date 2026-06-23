// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
// Sửa lại đường dẫn này - MainLayout đang ở components, không phải layouts
import MainLayout from './components/MainLayout';  // <-- Sửa lại thành components
//import Login from './pages/Login';

// Import từ pages/admin/
import Dashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import AdminMovies from './pages/admin/Movies';
import AdminCinemas from './pages/admin/Cinemas';
import AdminBookings from './pages/admin/Bookings';
import AdminConcessions from './pages/admin/Concession';
import AdminPromotions from './pages/admin/Vouchers';
import RevenueReports from './pages/admin/RevenueReport';
import Showtimes from './pages/admin/Showtimes';
import Halls from './pages/admin/Halls';
import TicketPrices from './pages/admin/TicketPrices';
import Reviews from './pages/admin/Reviews';
import AdminNotifications from './pages/admin/Notification';
import System from './pages/admin/System';
import Login from './pages/admin/Login';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="admin/dashboard" element={<Dashboard />} />
            <Route path="admin/users" element={<Users />} />
            <Route path="admin/movies" element={<AdminMovies />} />
            <Route path="admin/cinemas" element={<AdminCinemas />} />
            <Route path="admin/bookings" element={<AdminBookings />} />
            <Route path="admin/concessions" element={<AdminConcessions />} />
            <Route path="admin/vouchers" element={<AdminPromotions />} />
            <Route path="admin/revenue" element={<RevenueReports />} />
            <Route path="admin/showtimes" element={<Showtimes />} />
            <Route path="admin/halls" element={<Halls />} />
            <Route path="admin/ticket-prices" element={<TicketPrices />} />
            <Route path="admin/reviews" element={<Reviews />} />
            <Route path="admin/notifications" element={<AdminNotifications />} />
            <Route path="admin/system" element={<System />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
