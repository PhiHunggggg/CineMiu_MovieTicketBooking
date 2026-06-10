import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
    const [cinema, setCinema] = useState(null);
    const [movie, setMovie] = useState(null);
    const [showDate, setShowDate] = useState('');
    const [showtime, setShowtime] = useState(null);
    const [hall, setHall] = useState(null);

    const resetAfterMovie = useCallback(() => {
        setShowDate('');
        setShowtime(null);
        setHall(null);
    }, []);

    const selectCinema = useCallback((value) => {
        setCinema(value);
        setShowtime(null);
        setHall(null);
    }, []);

    const selectMovie = useCallback((value) => {
        setMovie(value);
        resetAfterMovie();
    }, [resetAfterMovie]);

    const selectShowtime = useCallback((value, selectedHall) => {
        setShowtime(value);
        setHall(selectedHall);
    }, []);

    const resetBooking = useCallback(() => {
        setCinema(null);
        setMovie(null);
        setShowDate('');
        setShowtime(null);
        setHall(null);
    }, []);

    const value = useMemo(() => ({
        cinema,
        movie,
        showDate,
        showtime,
        hall,
        selectCinema,
        selectMovie,
        selectShowDate: setShowDate,
        selectShowtime,
        resetBooking,
    }), [
        cinema,
        movie,
        showDate,
        showtime,
        hall,
        selectCinema,
        selectMovie,
        selectShowtime,
        resetBooking,
    ]);

    return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
    const value = useContext(BookingContext);
    if (!value) throw new Error('useBooking must be used within BookingProvider');
    return value;
}
