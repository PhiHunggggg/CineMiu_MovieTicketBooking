import { Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import HomePage from './pages/HomePage/HomePage';
import MoviesPage from './pages/MoviesPage/MoviesPage';
import MovieDetailPage from './pages/MovieDetailPage/MovieDetailPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import MyTicketsPage from './pages/MyTicketsPage/MyTicketsPage';
import BookingPage from './pages/BookingPage/BookingPage';
import './App.css';

function App() {
    return (
        <div className="app">
            <Header />
            <main className="app__main">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/movies" element={<MoviesPage />} />
                    <Route path="/movies/:movieId" element={<MovieDetailPage />} />
                    <Route path="/bookings" element={<BookingPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/my-tickets" element={<MyTicketsPage />} />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}

export default App;
