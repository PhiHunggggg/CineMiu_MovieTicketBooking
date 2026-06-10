import { Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import HomePage from './pages/HomePage/HomePage';
import BookingPage from './pages/BookingPage/BookingPage';
import MoviesPage from './pages/MoviesPage/MoviesPage';
import MovieDetailPage from './pages/MovieDetailPage/MovieDetailPage';
import CinemasPage from './pages/CinemasPage/CinemasPage';
import PromotionsPage from './pages/PromotionsPage/PromotionsPage';
import LoginPage from './pages/AuthPages/LoginPage';
import RegisterPage from './pages/AuthPages/RegisterPage';
import LoginSuccess from './pages/AuthPages/LoginSuccess';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import MyTicketsPage from './pages/MyTicketsPage/MyTicketsPage';
import './App.css';

function App() {
  return (
    <div className="app">
      <Header />
      <main className="app__main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/bookings" element={<BookingPage />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/movies/:movieId" element={<MovieDetailPage />} />
          <Route path="/cinemas" element={<CinemasPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login-success" element={<LoginSuccess />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/my-tickets" element={<MyTicketsPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
