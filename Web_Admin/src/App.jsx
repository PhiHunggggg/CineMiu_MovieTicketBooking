// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
// Sửa lại đường dẫn này - MainLayout đang ở components, không phải layouts
import MainLayout from './components/MainLayout';  // <-- Sửa lại thành components
//import Login from './pages/Login';

import Dashboard from './pages/admin/Dashboard/Dashboard';
import Users from './pages/admin/Users/Users';
import AdminMovies from './pages/admin/Movies/Movies';
import AdminCinemas from './pages/admin/Cinemas/Cinemas';
import AdminBookings from './pages/admin/Bookings/Bookings';
import AdminConcessions from './pages/admin/Concession/Concession';
import AdminPromotions from './pages/admin/Vouchers/Vouchers';
import RevenueReports from './pages/admin/RevenueReport/RevenueReport';
import Showtimes from './pages/admin/Showtimes/Showtimes';
import Halls from './pages/admin/Halls/Halls';
import TicketPrices from './pages/admin/TicketPrices/TicketPrices';
import Reviews from './pages/admin/Reviews/Reviews';
import AdminNotifications from './pages/admin/Notification/Notification';
import System from './pages/admin/System/System';
import Login from './pages/admin/Login/Login';

function HomeRedirect() {
  const { isAdmin, isCinemaManager } = useAuth();
  if (isAdmin()) return <Navigate to="/admin/dashboard" replace />;
  if (isCinemaManager()) return <Navigate to="/admin/showtimes" replace />;
  return <Navigate to="/admin/bookings" replace />;
}

const adminOnly = (element) => <ProtectedRoute adminOnly>{element}</ProtectedRoute>;
const managerOnly = (element) => <ProtectedRoute managerOnly>{element}</ProtectedRoute>;
const checkInOnly = (element) => <ProtectedRoute checkInOnly>{element}</ProtectedRoute>;

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
            <Route index element={<HomeRedirect />} />
            <Route path="admin/dashboard" element={adminOnly(<Dashboard />)} />
            <Route path="admin/users" element={adminOnly(<Users />)} />
            <Route path="admin/movies" element={adminOnly(<AdminMovies />)} />
            <Route path="admin/cinemas" element={adminOnly(<AdminCinemas />)} />
            <Route path="admin/bookings" element={checkInOnly(<AdminBookings />)} />
            <Route path="admin/concessions" element={managerOnly(<AdminConcessions />)} />
            <Route path="admin/vouchers" element={adminOnly(<AdminPromotions />)} />
            <Route path="admin/revenue" element={managerOnly(<RevenueReports />)} />
            <Route path="admin/showtimes" element={managerOnly(<Showtimes />)} />
            <Route path="admin/halls" element={managerOnly(<Halls />)} />
            <Route path="admin/ticket-prices" element={managerOnly(<TicketPrices />)} />
            <Route path="admin/reviews" element={adminOnly(<Reviews />)} />
            <Route path="admin/notifications" element={adminOnly(<AdminNotifications />)} />
            <Route path="admin/system" element={adminOnly(<System />)} />
            <Route path="*" element={<HomeRedirect />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
