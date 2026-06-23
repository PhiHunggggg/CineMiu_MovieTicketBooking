import { useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookingProvider, useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { cinemaApi, movieApi } from '../../services/api';
import BookingStepper from '../../components/BookingStepper/BookingStepper';
import CinemaSelect from '../../components/Steps/CinemaSelect/CinemaSelect';
import MovieSelect from '../../components/Steps/MovieSelect/MovieSelect';
import MovieSelectFirst from '../../components/Steps/MovieSelectFirst/MovieSelectFirst';
import CinemaForMovieSelect from '../../components/Steps/CinemaForMovieSelect/CinemaForMovieSelect';
import ShowtimeSelect from '../../components/Steps/ShowtimeSelect/ShowtimeSelect';
import SeatSelect from '../../components/Steps/SeatSelect/SeatSelect';
import FoodSelect from '../../components/Steps/FoodSelect/FoodSelect';
import Invoice from '../../components/Steps/Invoice/Invoice';
import LoginGateModal from '../../components/LoginGateModal/LoginGateModal';
import './BookingPage.css';

function BookingContent() {
  const { step, bookingFlow, setBookingFlow, selectCinema, selectMovieFirst, selectCinemaForMovie } = useBooking();
  const { isLoggedIn } = useAuth();
  const [searchParams] = useSearchParams();
  const initializedRef = useRef(false);

  // Handle URL params for deep linking
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const flowParam = searchParams.get('flow');
    const movieIdParam = searchParams.get('movieId');
    const cinemaIdParam = searchParams.get('cinemaId');

    if (flowParam === 'movie_first') {
      setBookingFlow('movie_first');
      // If a movieId is provided, auto-select the movie
      if (movieIdParam) {
        movieApi.getById(parseInt(movieIdParam))
          .then(movieData => {
            if (movieData) {
              // Normalize the movie data
              const movie = movieData.movie || movieData;
              selectMovieFirst({
                movieId: movie.movieId || movie.id,
                title: movie.title,
                posterUrl: movie.posterUrl,
                durationMins: movie.durationMins || movie.durationMin,
                ageRating: movie.ageRating,
                imdbRating: movie.imdbRating,
                releaseDate: movie.releaseDate,
              });
              if (cinemaIdParam) {
                cinemaApi.getById(parseInt(cinemaIdParam))
                  .then(data => {
                    const cinema = data.cinema || data;
                    selectCinemaForMovie({
                      cinemaId: cinema.cinemaId || cinema.id,
                      cinemaName: cinema.cinemaName || cinema.name,
                      name: cinema.cinemaName || cinema.name,
                      address: cinema.address,
                      city: cinema.city,
                      district: cinema.district,
                      imageUrl: cinema.imageUrl,
                    });
                  })
                  .catch(console.error);
              }
            }
          })
          .catch(console.error);
      }
    } else if (cinemaIdParam) {
      // Cinema-first with pre-selected cinema
      setBookingFlow('cinema_first');
      cinemaApi.getById(parseInt(cinemaIdParam))
        .then(data => {
          const cinema = data.cinema || data;
          selectCinema({
            cinemaId: cinema.cinemaId || cinema.id,
            cinemaName: cinema.cinemaName || cinema.name,
            name: cinema.cinemaName || cinema.name,
            address: cinema.address,
            city: cinema.city,
            district: cinema.district,
            imageUrl: cinema.imageUrl,
          });
        })
        .catch(console.error);
    }

 }, [searchParams, setBookingFlow, selectMovieFirst, selectCinema, selectCinemaForMovie]);

  // Require login before choosing a showtime and continuing the booking flow.
  const needsLogin = step >= 3 && !isLoggedIn;
  const renderStep = () => {
    if (needsLogin) {
      return <LoginGateModal />;
    }

    if (bookingFlow === 'movie_first') {
      switch (step) {
        case 1: return <MovieSelectFirst />;
        case 2: return <CinemaForMovieSelect />;
        case 3: return <ShowtimeSelect />;
        case 4: return <SeatSelect />;
        case 5: return <FoodSelect />;
        case 6: return <Invoice />;
        default: return <MovieSelectFirst />;
      }
    } else {
      switch (step) {
        case 1: return <CinemaSelect />;
        case 2: return <MovieSelect />;
        case 3: return <ShowtimeSelect />;
        case 4: return <SeatSelect />;
        case 5: return <FoodSelect />;
        case 6: return <Invoice />;
        default: return <CinemaSelect />;
      }
    }
  };

  return (
    <div className="booking-page" id="booking-page">
      <div className="booking-page__container container">
        {/* Flow selector — only show at step 1 */}
        {step === 1 && (
          <div className="booking-flow-selector" id="booking-flow-selector">
            <button
              className={`booking-flow-selector__btn ${bookingFlow === 'cinema_first' ? 'booking-flow-selector__btn--active' : ''}`}
              onClick={() => setBookingFlow('cinema_first')}
            >
              <span className="booking-flow-selector__icon">🏛️</span>
              <span className="booking-flow-selector__label">Chọn rạp trước</span>
            </button>
            <button
              className={`booking-flow-selector__btn ${bookingFlow === 'movie_first' ? 'booking-flow-selector__btn--active' : ''}`}
              onClick={() => setBookingFlow('movie_first')}
            >
              <span className="booking-flow-selector__icon">🎬</span>
              <span className="booking-flow-selector__label">Chọn phim trước</span>
            </button>
          </div>
        )}
        <BookingStepper />
        <div className="booking-page__step" key={needsLogin ? 'login-gate' : step}>
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <BookingProvider>
      <BookingContent />
    </BookingProvider>
  );
}
