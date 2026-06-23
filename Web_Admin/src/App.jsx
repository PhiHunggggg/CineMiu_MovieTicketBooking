import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';

import Dashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import AdminMovies from './pages/admin/Movies';
import AdminCinemas from './pages/admin/Cinemas';
import AdminCinemaManagers from './pages/admin/CinemaManagers';
import AdminBookings from './pages/admin/Bookings';
import AdminConcessions from './pages/admin/Concession';
import AdminPromotions from './pages/admin/Vouchers';
import RevenueReports from './pages/admin/RevenueReport';
import BranchOverview from './pages/admin/BranchOverview';
import Showtimes from './pages/admin/Showtimes';
import Halls from './pages/admin/Halls';
import TicketPrices from './pages/admin/TicketPrices';
import Reviews from './pages/admin/Reviews';
import AdminNotifications from './pages/admin/Notification';
import System from './pages/admin/System';
import Login from './pages/admin/Login';

function HomeRedirect() {
  const { isAdmin, isCinemaManager, canCheckInTickets } = useAuth();

  if (isAdmin()) return <Navigate to="/admin/dashboard" replace />;
  if (isCinemaManager()) return <Navigate to="/admin/branch" replace />;
  if (canCheckInTickets()) return <Navigate to="/admin/bookings" replace />;

  return <Navigate to="/login" replace />;
}

const adminOnly = (element) => (
  <ProtectedRoute adminOnly>{element}</ProtectedRoute>
);

const managerOnly = (element) => (
  <ProtectedRoute managerOnly>{element}</ProtectedRoute>
);

const branchOperator = (element) => (
  <ProtectedRoute branchOperator>{element}</ProtectedRoute>
);

const checkInOnly = (element) => (
  <ProtectedRoute checkInOnly>{element}</ProtectedRoute>
);

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
            <Route path="admin/movies" element={adminOnly(<AdminMovies />)} />
            <Route path="admin/cinemas" element={adminOnly(<AdminCinemas />)} />
            <Route path="admin/managers" element={adminOnly(<AdminCinemaManagers />)} />
            <Route path="admin/users" element={adminOnly(<Users />)} />
            <Route path="admin/vouchers" element={adminOnly(<AdminPromotions />)} />
            <Route path="admin/promotions" element={adminOnly(<AdminPromotions />)} />
            <Route path="admin/reviews" element={adminOnly(<Reviews />)} />
            <Route path="admin/notifications" element={adminOnly(<AdminNotifications />)} />
            <Route path="admin/system" element={adminOnly(<System />)} />

            <Route path="admin/branch" element={managerOnly(<BranchOverview />)} />
            <Route path="admin/showtimes" element={managerOnly(<Showtimes />)} />
            <Route path="admin/halls" element={managerOnly(<Halls />)} />
            <Route path="admin/seats" element={managerOnly(<Halls />)} />
            <Route path="admin/ticket-prices" element={managerOnly(<TicketPrices />)} />
            <Route path="admin/concessions" element={branchOperator(<AdminConcessions />)} />
            <Route path="admin/revenue" element={branchOperator(<RevenueReports />)} />
            <Route path="admin/reports" element={branchOperator(<RevenueReports />)} />
            <Route path="admin/bookings" element={checkInOnly(<AdminBookings />)} />

            <Route path="*" element={<HomeRedirect />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
