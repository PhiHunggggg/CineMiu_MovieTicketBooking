import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage/HomePage';
import MoviesPage from './pages/MoviesPage/MoviesPage';
import MovieDetailPage from './pages/MovieDetailPage/MovieDetailPage';
import BookingPage from './pages/BookingPage/BookingPage';
import PromotionsPage from './pages/PromotionsPage/PromotionsPage';
import CinemasPage from './pages/CinemasPage/CinemasPage';
import LoginPage from './pages/AuthPages/LoginPage';
import RegisterPage from './pages/AuthPages/RegisterPage';
import LoginSuccess from './pages/AuthPages/LoginSuccess';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import MyTicketsPage from './pages/MyTicketsPage/MyTicketsPage';
import './App.css';

export default function App() {
    return (
        <div className="app">
            <Header />
            <main className="app__main">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/movies" element={<MoviesPage />} />
                    <Route path="/movies/:movieId" element={<MovieDetailPage />} />
                    <Route path="/bookings" element={<BookingPage />} />
                    <Route path="/cinemas" element={<CinemasPage />} />
                    <Route path="/promotions" element={<PromotionsPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/login-success" element={<LoginSuccess />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/my-tickets" element={<ProtectedRoute><MyTicketsPage /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}
