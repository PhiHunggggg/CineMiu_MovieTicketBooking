import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { showtimeApi, bookingApi } from '../services/api';
import { useAuth } from './AuthContext';
import { getUserId } from '../utils/authUser';
const BookingContext = createContext(null);

function getOrderStatus(order) {
  return (order?.status ?? order?.Status ?? '').toString().toLowerCase();
}

function shouldCancelOrder(order) {
  const status = getOrderStatus(order);
  return !status || status === 'pending';
}

function getShowtimeId(showtime) {
  return showtime?.showtimeId ?? showtime?.ShowtimeId ?? showtime?.id ?? showtime?.Id ?? null;
}

function postKeepalive(endpoint, body) {
  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  });
}

const initialState = {
  step: 1, // 1-6 depending on flow
  bookingFlow: 'cinema_first', // 'cinema_first' | 'movie_first'
  cinema: null,
  movie: null,
  showDate: null,
  showtime: null,
  hall: null,
  selectedSeats: [],
  selectedProducts: [], // { product, quantity }
  voucherCode: '',
  voucher: null,
  subtotalTickets: 0,
  subtotalProducts: 0,
  discountAmount: 0,
  totalAmount: 0,
  order: null,
  timeLeft: 300, // 5 minutes in seconds
  isTimerActive: false,
  sessionId: null,
  isPaymentWaiting: false, // true when QR payment screen is active
};

function bookingReducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
    case 'SET_BOOKING_FLOW':
      return { ...initialState, bookingFlow: action.payload };
    case 'SELECT_CINEMA':
      return {
        ...state,
        cinema: action.payload,
        step: 2,
        movie: null,
        showDate: null,
        showtime: null,
        hall: null,
        selectedSeats: [],
        selectedProducts: [],
        voucher: null,
        voucherCode: '',
        sessionId: null,
        timeLeft: 300,
        isTimerActive: false,
      };
    case 'SELECT_MOVIE':
      return {
        ...state,
        movie: action.payload,
        step: 3,
        showDate: null,
        showtime: null,
        hall: null,
        selectedSeats: [],
        sessionId: null,
        timeLeft: 300,
        isTimerActive: false,
      };
    // Movie-first flow: select movie first (step 1 → step 2)
    case 'SELECT_MOVIE_FIRST':
      return {
        ...state,
        movie: action.payload,
        step: 2,
        cinema: null,
        showDate: null,
        showtime: null,
        hall: null,
        selectedSeats: [],
        selectedProducts: [],
        voucher: null,
        voucherCode: '',
        sessionId: null,
        timeLeft: 300,
        isTimerActive: false,
      };
    // Movie-first flow: select cinema after movie (step 2 → step 3)
    case 'SELECT_CINEMA_FOR_MOVIE':
      return {
        ...state,
        cinema: action.payload,
        step: 3,
        showDate: null,
        showtime: null,
        hall: null,
        selectedSeats: [],
        sessionId: null,
        timeLeft: 300,
        isTimerActive: false,
      };
    case 'SELECT_SHOWDATE':
      return { ...state, showDate: action.payload, showtime: null, hall: null, selectedSeats: [], sessionId: null, timeLeft: 300, isTimerActive: false };
    case 'SELECT_SHOWTIME':
      return {
        ...state,
        showtime: action.payload.showtime,
        hall: action.payload.hall,
        step: 4,
        selectedSeats: [],
        sessionId: null,
        timeLeft: 300,
        isTimerActive: false,
      };
    case 'TOGGLE_SEAT': {
      const seat = action.payload;
      const exists = state.selectedSeats.find(s => s.id === seat.id);
      const selectedSeats = exists
        ? state.selectedSeats.filter(s => s.id !== seat.id)
        : [...state.selectedSeats, seat];
      const subtotalTickets = selectedSeats.reduce((sum, s) => sum + (s.finalPrice || 0), 0);
      return {
        ...state,
        selectedSeats,
        subtotalTickets,
        voucher: null,
        voucherCode: '',
        discountAmount: 0,
        totalAmount: 0,
        isTimerActive: selectedSeats.length > 0 // Start timer when first seat is selected
      };
    }
    case 'TICK_TIMER':
      return { ...state, timeLeft: Math.max(0, state.timeLeft - 1) };
    case 'CONFIRM_SEATS':
      return { ...state, step: 5 };
    case 'SET_PRODUCT_QTY': {
      const { product, quantity } = action.payload;
      let selectedProducts;
      if (quantity <= 0) {
        selectedProducts = state.selectedProducts.filter(p => p.product.itemId !== product.itemId);
      } else {
        const exists = state.selectedProducts.find(p => p.product.itemId === product.itemId);
        if (exists) {
          selectedProducts = state.selectedProducts.map(p =>
            p.product.itemId === product.itemId ? { ...p, quantity } : p
          );
        } else {
          selectedProducts = [...state.selectedProducts, { product, quantity }];
        }
      }
      const subtotalProducts = selectedProducts.reduce(
        (sum, p) => sum + p.product.price * p.quantity,
        0
      );
      return {
        ...state,
        selectedProducts,
        subtotalProducts,
        voucher: null,
        voucherCode: '',
        discountAmount: 0,
        totalAmount: 0
      };
    }
    case 'SET_VOUCHER':
      return { ...state, voucher: action.payload.voucher, voucherCode: action.payload.code, discountAmount: action.payload.discount };
    case 'CLEAR_VOUCHER':
      return { ...state, voucher: null, voucherCode: '', discountAmount: 0 };
    case 'CONFIRM_FOOD':
      return {
        ...state,
        step: 6,
        totalAmount: Math.max(0, state.subtotalTickets + state.subtotalProducts - state.discountAmount)
      };
    case 'SET_ORDER':
      return { ...state, order: action.payload };
    case 'REMOVE_SEATS': {
      const seatIdsToRemove = action.payload; // Array of seat IDs
      const selectedSeats = state.selectedSeats.filter(s => !seatIdsToRemove.includes(s.seatId));
      const subtotalTickets = selectedSeats.reduce((sum, s) => sum + (s.finalPrice || 0), 0);
      return {
        ...state,
        selectedSeats,
        subtotalTickets,
        isTimerActive: selectedSeats.length > 0
      };
    }
    case 'RESET_TIMER':
      return { ...state, timeLeft: 300, isTimerActive: false };
    case 'UNLOCK_SEATS_AND_RESET':
      // Unlock local state: clear selected seats, sessionId, and stop the timer
      return {
        ...state,
        selectedSeats: [],
        subtotalTickets: 0,
        sessionId: null,
        timeLeft: 300,
        isTimerActive: false,
      };
    case 'STOP_TIMER':
      return { ...state, isTimerActive: false };
    case 'SET_PAYMENT_WAITING':
      return { ...state, isPaymentWaiting: action.payload };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export function BookingProvider({ children }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  const setSessionId = useCallback((id) => {
    sessionIdRef.current = id;
    dispatch({ type: 'SET_SESSION_ID', payload: id });
  }, []);

  const unlockSeats = useCallback(async () => {
    const showtimeId = getShowtimeId(state.showtime);
    if (state.sessionId && showtimeId) {
      try {
        const userId = getUserId(user);
        await showtimeApi.unlockSeats(showtimeId, userId
          ? { userId, sessionId: state.sessionId }
          : { sessionId: state.sessionId });
        dispatch({ type: 'SET_SESSION_ID', payload: null });
      } catch (err) {
        console.error('[BookingContext] Unlock failed:', err);
      }
    }
  }, [state.sessionId, state.showtime, user]);

  const removeSeats = useCallback((seatIds) => dispatch({ type: 'REMOVE_SEATS', payload: seatIds }), []);

  const cancelPendingOrder = useCallback(async () => {
    if (state.order && shouldCancelOrder(state.order)) {
      const orderId = state.order.bookingId ?? state.order.BookingId;
      if (orderId) {
        try {
          await bookingApi.cancel(orderId, 'Người dùng hủy hoặc chuyển hướng');
          dispatch({ type: 'SET_ORDER', payload: null });
          dispatch({ type: 'SET_PAYMENT_WAITING', payload: false });
        } catch (err) {
          console.error('[BookingContext] Cancel order failed:', err);
        }
      }
    }
  }, [state.order]);

  const reset = useCallback(() => {
    unlockSeats();
    cancelPendingOrder();
    dispatch({ type: 'RESET' });
  }, [unlockSeats, cancelPendingOrder]);

  const sessionIdRef = useRef(state.sessionId);
  const showtimeIdRef = useRef(getShowtimeId(state.showtime));
  const userRef = useRef(user);
  const orderRef = useRef(state.order);

  useEffect(() => {
    sessionIdRef.current = state.sessionId;
    showtimeIdRef.current = getShowtimeId(state.showtime);
    orderRef.current = state.order;
  }, [state.sessionId, state.showtime, state.order]);

  // Keep userRef always up-to-date without re-creating the unmount effect
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Best-effort cleanup on tab close/refresh
      if (orderRef.current && shouldCancelOrder(orderRef.current)) {
        const orderId = orderRef.current.bookingId ?? orderRef.current.BookingId;
        if (orderId) {
          // Use fetch with keepalive for exit cleanup
          fetch(`/api/bookings/${orderId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Người dùng đóng trình duyệt' }),
            keepalive: true
          });
        }
      }
      if (sessionIdRef.current && showtimeIdRef.current) {
        const userId = userRef.current?.userId || userRef.current?.UserId || 1;
        fetch(`/api/showtimes/${showtimeIdRef.current}/unlocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, sessionId: sessionIdRef.current }),
          keepalive: true
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Unmount cleanup: fires when user navigates away from the booking page entirely
      // (clicking header, home page, browser back, etc.)
      // Uses refs so values are always current at the time of unmount.

      // 1. Cancel any pending order
      const pendingOrder = orderRef.current;
      if (pendingOrder && shouldCancelOrder(pendingOrder)) {
        const orderId = pendingOrder.bookingId ?? pendingOrder.BookingId;
        if (orderId) {
          bookingApi
            .cancel(orderId, 'Người dùng rời khỏi trang đặt vé')
            .catch(err => console.error('[BookingContext] Unmount order cancel failed:', err));
        }
      }

      // 2. Unlock any remaining seat locks
      if (sessionIdRef.current && showtimeIdRef.current) {
        const userId = userRef.current?.userId || userRef.current?.UserId || 1;
        showtimeApi.unlockSeats(showtimeIdRef.current, {
          userId,
          sessionId: sessionIdRef.current
        }).catch(err => console.error('[BookingContext] Unmount unlock failed:', err));
      }
    };
  }, []); // empty deps → only runs on true component unmount

  useEffect(() => {
    const cleanupLocksAndPendingOrder = (reason) => {
      const pendingOrder = orderRef.current;
      if (pendingOrder && shouldCancelOrder(pendingOrder)) {
        const orderId = pendingOrder.bookingId ?? pendingOrder.BookingId;
        if (orderId) {
          postKeepalive(`/api/bookings/${orderId}/cancel`, { reason });
        }
      }

      if (sessionIdRef.current && showtimeIdRef.current) {
        const userId = getUserId(userRef.current);
        postKeepalive(
          `/api/showtimes/${showtimeIdRef.current}/unlocks`,
          userId ? { userId, sessionId: sessionIdRef.current } : { sessionId: sessionIdRef.current }
        );
      }
    };

    const handlePageHide = () => cleanupLocksAndPendingOrder('User left booking page');
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      cleanupLocksAndPendingOrder('User navigated away from booking page');
    };
  }, []);

  // Timer Effect
  useEffect(() => {
    let interval;
    if (state.isTimerActive && state.timeLeft > 0) {
      interval = setInterval(() => {
        dispatch({ type: 'TICK_TIMER' });
      }, 1000);
    } else if (state.isTimerActive && state.timeLeft === 0) {
      alert('Hết thời gian giữ ghế! Vui lòng thực hiện lại từ đầu.');
      unlockSeats();
      reset();
    }
    return () => clearInterval(interval);
  }, [state.isTimerActive, state.timeLeft, reset]);

  const setBookingFlow = useCallback((flow) => {
    if (state.sessionId) unlockSeats();
    cancelPendingOrder();
    dispatch({ type: 'RESET_TIMER' });
    dispatch({ type: 'SET_BOOKING_FLOW', payload: flow });
  }, [state.sessionId, unlockSeats, cancelPendingOrder]);

  const selectCinema = useCallback((cinema) => {
    if (state.sessionId) unlockSeats();
    cancelPendingOrder();
    dispatch({ type: 'RESET_TIMER' });
    dispatch({ type: 'SELECT_CINEMA', payload: cinema });
  }, [state.sessionId, unlockSeats, cancelPendingOrder]);

  const selectMovie = useCallback((movie) => {
    if (state.sessionId) unlockSeats();
    cancelPendingOrder();
    dispatch({ type: 'RESET_TIMER' });
    dispatch({ type: 'SELECT_MOVIE', payload: movie });
  }, [state.sessionId, unlockSeats, cancelPendingOrder]);

  const selectMovieFirst = useCallback((movie) => {
    if (state.sessionId) unlockSeats();
    cancelPendingOrder();
    dispatch({ type: 'RESET_TIMER' });
    dispatch({ type: 'SELECT_MOVIE_FIRST', payload: movie });
  }, [state.sessionId, unlockSeats, cancelPendingOrder]);

  const selectCinemaForMovie = useCallback((cinema) => {
    if (state.sessionId) unlockSeats();
    cancelPendingOrder();
    dispatch({ type: 'RESET_TIMER' });
    dispatch({ type: 'SELECT_CINEMA_FOR_MOVIE', payload: cinema });
  }, [state.sessionId, unlockSeats, cancelPendingOrder]);

  const selectShowDate = useCallback((date) => {
    if (state.sessionId) unlockSeats();
    cancelPendingOrder();
    dispatch({ type: 'RESET_TIMER' });
    dispatch({ type: 'SELECT_SHOWDATE', payload: date });
  }, [state.sessionId, unlockSeats, cancelPendingOrder]);

  const selectShowtime = useCallback((showtime, hall) => {
    if (state.sessionId) unlockSeats();
    cancelPendingOrder();
    dispatch({ type: 'RESET_TIMER' });
    dispatch({ type: 'SELECT_SHOWTIME', payload: { showtime, hall } });
  }, [state.sessionId, unlockSeats, cancelPendingOrder]);
  const toggleSeat = useCallback((seat) => dispatch({ type: 'TOGGLE_SEAT', payload: seat }), []);
  const confirmSeats = useCallback(() => dispatch({ type: 'CONFIRM_SEATS' }), []);
  const setProductQty = useCallback((product, quantity) => dispatch({ type: 'SET_PRODUCT_QTY', payload: { product, quantity } }), []);
  const setVoucher = useCallback((voucher, code, discount) => dispatch({ type: 'SET_VOUCHER', payload: { voucher, code, discount } }), []);
  const clearVoucher = useCallback(() => dispatch({ type: 'CLEAR_VOUCHER' }), []);
  const confirmFood = useCallback(() => dispatch({ type: 'CONFIRM_FOOD' }), []);
  const stopTimer = useCallback(() => dispatch({ type: 'STOP_TIMER' }), []);
  const setPaymentWaiting = useCallback((flag) => dispatch({ type: 'SET_PAYMENT_WAITING', payload: flag }), []);
  const setOrder = useCallback((order) => {
    orderRef.current = order;
    dispatch({ type: 'SET_ORDER', payload: order });
  }, []);
  const setStep = useCallback((targetStep) => {
    // Case 1: seats are still locked (sessionId set) and navigating back to seat/earlier step → unlock
    if (state.sessionId && targetStep <= 4) {
      unlockSeats(); // fire-and-forget API call to unlock on server
      dispatch({ type: 'UNLOCK_SEATS_AND_RESET' }); // clear selectedSeats, sessionId, timer locally
    }

    // Case 2: an order was created (booking exists) and user navigates back before payment completes
    // → cancel the pending order so seats are freed on the server
    if (state.order && shouldCancelOrder(state.order) && targetStep <= 5) {
      const orderId = state.order.bookingId ?? state.order.BookingId;
      if (orderId) {
        bookingApi
          .cancel(orderId, 'Người dùng quay lại trong quá trình thanh toán')
          .catch(err => console.error('[BookingContext] Cancel order on back-navigate failed:', err));
      }
      // Clear the payment waiting flag and order locally
      dispatch({ type: 'SET_PAYMENT_WAITING', payload: false });
      dispatch({ type: 'SET_ORDER', payload: null });
    }

    dispatch({ type: 'SET_STEP', payload: targetStep });
  }, [state.sessionId, state.order, unlockSeats]);

  return (
    <BookingContext.Provider
      value={{
        ...state,
        setBookingFlow,
        selectCinema,
        selectMovie,
        selectMovieFirst,
        selectCinemaForMovie,
        selectShowDate,
        selectShowtime,
        toggleSeat,
        removeSeats,
        confirmSeats,
        setProductQty,
        setVoucher,
        clearVoucher,
        confirmFood,
        setOrder,
        setStep,
        setSessionId,
        unlockSeats,
        stopTimer,
        setPaymentWaiting,
        reset,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
