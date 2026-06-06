import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
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

function normalizeMovie(movieData) {
  const movie = movieData?.movie || movieData;
  if (!movie) return null;

  return {
    ...movie,
    movieId: movie.movieId || movie.id,
    durationMins: movie.durationMins || movie.durationMin,
  };
}

function normalizeCinema(cinemaData) {
  const cinema = cinemaData?.cinema || cinemaData;
  if (!cinema) return null;

  return {
    ...cinema,
    cinemaId: cinema.cinemaId || cinema.id,
    cinemaName: cinema.cinemaName || cinema.name,
    name: cinema.name || cinema.cinemaName,
  };
}

export default function BookingPage() {
  const {
    step,
    bookingFlow,
    setBookingFlow,
    selectCinema,
    selectMovieFirst,
    selectCinemaForMovie,
  } = useBooking();
  const { isLoggedIn } = useAuth();
  const [searchParams] = useSearchParams();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    const flowParam = searchParams.get('flow');
    const movieIdParam = searchParams.get('movieId');
    const cinemaIdParam = searchParams.get('cinemaId');

    if (flowParam === 'movie_first') {
      setBookingFlow('movie_first');

      if (movieIdParam) {
        movieApi
          .getById(Number(movieIdParam))
          .then(movieData => {
            const movie = normalizeMovie(movieData);
            if (movie) {
              selectMovieFirst(movie);
            }

            if (cinemaIdParam) {
              cinemaApi
                .getById(Number(cinemaIdParam))
                .then(cinemaData => {
                  const cinema = normalizeCinema(cinemaData);
                  if (cinema) {
                    selectCinemaForMovie(cinema);
                  }
                })
                .catch(console.error);
            }
          })
          .catch(console.error);
      }
    } else if (cinemaIdParam) {
      setBookingFlow('cinema_first');

      cinemaApi
        .getById(Number(cinemaIdParam))
        .then(cinemaData => {
          const cinema = normalizeCinema(cinemaData);
          if (cinema) {
            selectCinema(cinema);
          }
        })
        .catch(console.error);
    }

    setInitialized(true);
  }, [searchParams, initialized, setBookingFlow, selectMovieFirst, selectCinema, selectCinemaForMovie]);

  const needsLogin = step >= 3 && !isLoggedIn;

  const renderStep = () => {
    if (needsLogin) {
      return <LoginGateModal />;
    }

    if (bookingFlow === 'movie_first') {
      switch (step) {
        case 1:
          return <MovieSelectFirst />;
        case 2:
          return <CinemaForMovieSelect />;
        case 3:
          return <ShowtimeSelect />;
        case 4:
          return <SeatSelect />;
        case 5:
          return <FoodSelect />;
        case 6:
          return <Invoice />;
        default:
          return <MovieSelectFirst />;
      }
    }

    switch (step) {
      case 1:
        return <CinemaSelect />;
      case 2:
        return <MovieSelect />;
      case 3:
        return <ShowtimeSelect />;
      case 4:
        return <SeatSelect />;
      case 5:
        return <FoodSelect />;
      case 6:
        return <Invoice />;
      default:
        return <CinemaSelect />;
    }
  };

  return (
    <div className="booking-page" id="booking-page">
      <div className="booking-page__container container">
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
