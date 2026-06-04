import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { movieApi, promotionApi } from '../../services/api';
import MovieCard from '../../components/MovieCard/MovieCard';
import './HomePage.css';

export default function HomePage() {
    const [nowShowing, setNowShowing] = useState([]);
    const [comingSoon, setComingSoon] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [heroIndex, setHeroIndex] = useState(0);

    useEffect(() => {
        Promise.all([
            movieApi.getAll({ status: 'now_showing', pageSize: 8 }),
            movieApi.getAll({ status: 'coming_soon', pageSize: 8 }),
            promotionApi.getAll().catch(() => []),
        ])
            .then(([ns, cs, promos]) => {
                setNowShowing(ns.items || []);
                setComingSoon(cs.items || []);
                setPromotions(Array.isArray(promos) ? promos : []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Auto-rotate hero banner
    useEffect(() => {
        if (nowShowing.length <= 1) return;
        const timer = setInterval(() => {
            setHeroIndex(prev => (prev + 1) % Math.min(nowShowing.length, 5));
        }, 5000);
        return () => clearInterval(timer);
    }, [nowShowing]);

    const heroMovies = nowShowing.slice(0, 5);
    const heroMovie = heroMovies[heroIndex];

    const formatPrice = (p) => new Intl.NumberFormat('vi-VN').format(p) + 'đ';

    return (
        <div className="home" id="home-page">
            {/* Hero Banner */}
            <section className="hero" id="hero-banner">
                {heroMovie ? (
                    <div className="hero__slide" key={heroMovie.id}>
                        <div
                            className="hero__bg"
                            style={{ backgroundImage: heroMovie.bannerUrl ? `url(${heroMovie.bannerUrl})` : heroMovie.posterUrl ? `url(${heroMovie.posterUrl})` : 'none' }}
                        />
                        <div className="hero__overlay" />
                        <div className="hero__content container">
                            <div className="hero__info">
                                {heroMovie.ageRating && <span className="hero__rated">{heroMovie.ageRating}</span>}
                                <h1 className="hero__title">{heroMovie.title}</h1>
                                {heroMovie.titleEn && (
                                    <p className="hero__original-title">{heroMovie.titleEn}</p>
                                )}
                                <div className="hero__meta">
                                    {heroMovie.durationMins && <span>⏱ {heroMovie.durationMins} phút</span>}
                                    {heroMovie.imdbRating && <span>⭐ {Number(heroMovie.imdbRating).toFixed(1)}</span>}
                                    {heroMovie.language && <span>🌍 {heroMovie.language}</span>}
                                </div>
                                {heroMovie.synopsis && (
                                    <p className="hero__synopsis">{heroMovie.synopsis.substring(0, 200)}...</p>
                                )}
                                <div className="hero__actions">
                                    <Link to={`/bookings?flow=movie_first&movieId=${heroMovie.id || heroMovie.movieId}`} className="hero__btn hero__btn--primary">
                                        🎟️ Đặt vé ngay
                                    </Link>
                                    <Link to={`/movies/${heroMovie.id || heroMovie.movieId}`} className="hero__btn hero__btn--secondary">
                                        Chi tiết phim
                                    </Link>
                                    {heroMovie.trailerUrl && (
                                        <a href={heroMovie.trailerUrl} target="_blank" rel="noopener noreferrer" className="hero__btn hero__btn--secondary">
                                            ▶ Xem trailer
                                        </a>
                                    )}
                                </div>
                            </div>
                            {heroMovie.posterUrl && (
                                <div className="hero__poster-wrapper">
                                    <img src={heroMovie.posterUrl} alt={heroMovie.title} className="hero__poster" />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="hero__empty">
                        <div className="hero__overlay" />
                        <div className="hero__content container">
                            <div className="hero__info">
                                <h1 className="hero__title">Chào mừng đến CineMiu</h1>
                                <p className="hero__synopsis">Hệ thống đặt vé xem phim trực tuyến hàng đầu Việt Nam</p>
                                <Link to="/bookings" className="hero__btn hero__btn--primary">
                                    🎟️ Đặt vé ngay
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {heroMovies.length > 1 && (
                    <div className="hero__dots">
                        {heroMovies.map((_, i) => (
                            <button
                                key={i}
                                className={`hero__dot ${i === heroIndex ? 'hero__dot--active' : ''}`}
                                onClick={() => setHeroIndex(i)}
                                aria-label={`Slide ${i + 1}`}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Quick Booking */}
            <section className="home-quick container" id="quick-booking">
                <Link to="/bookings" className="home-quick__card">
                    <div className="home-quick__icon">🏛️</div>
                    <div>
                        <h3>Đặt vé theo rạp</h3>
                        <p>Chọn rạp gần bạn nhất</p>
                    </div>
                    <span className="home-quick__arrow">→</span>
                </Link>
                <Link to="/bookings?flow=movie_first" className="home-quick__card">
                    <div className="home-quick__icon">🎬</div>
                    <div>
                        <h3>Đặt vé theo phim</h3>
                        <p>Chọn phim trước, tìm rạp sau</p>
                    </div>
                    <span className="home-quick__arrow">→</span>
                </Link>
                <Link to="/promotions" className="home-quick__card">
                    <div className="home-quick__icon">🎁</div>
                    <div>
                        <h3>Khuyến mãi hot</h3>
                        <p>Ưu đãi đặc biệt hôm nay</p>
                    </div>
                    <span className="home-quick__arrow">→</span>
                </Link>
            </section>

            {/* Now Showing */}
            <section className="home-section container" id="now-showing-section">
                <div className="home-section__header">
                    <h2 className="section-title">Phim đang chiếu</h2>
                    <Link to="/movies" className="home-section__view-all">Xem tất cả →</Link>
                </div>
                {loading ? (
                    <div className="home-movie-grid">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i}>
                                <div className="skeleton" style={{ paddingTop: '150%', borderRadius: 16 }} />
                                <div className="skeleton" style={{ height: 16, marginTop: 10, width: '70%' }} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="home-movie-grid">
                        {nowShowing.map(movie => (
                            <MovieCard key={movie.id} movie={movie} />
                        ))}
                    </div>
                )}
            </section>

            {/* Coming Soon */}
            <section className="home-section container" id="coming-soon-section">
                <div className="home-section__header">
                    <h2 className="section-title">Phim sắp chiếu</h2>
                    <Link to="/movies" className="home-section__view-all">Xem tất cả →</Link>
                </div>
                {loading ? (
                    <div className="home-movie-grid">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i}>
                                <div className="skeleton" style={{ paddingTop: '150%', borderRadius: 16 }} />
                                <div className="skeleton" style={{ height: 16, marginTop: 10, width: '70%' }} />
                            </div>
                        ))}
                    </div>
                ) : comingSoon.length > 0 ? (
                    <div className="home-movie-grid">
                        {comingSoon.map(movie => (
                            <MovieCard key={movie.id} movie={movie} />
                        ))}
                    </div>
                ) : (
                    <p className="home-section__empty">Chưa có phim sắp chiếu</p>
                )}
            </section>

            {/* Promotions */}
            {promotions.length > 0 && (
                <section className="home-section container" id="promotions-section">
                    <div className="home-section__header">
                        <h2 className="section-title">Khuyến mãi</h2>
                        <Link to="/promotions" className="home-section__view-all">Xem tất cả →</Link>
                    </div>
                    <div className="home-promo-grid">
                        {promotions.slice(0, 4).map(promo => (
                            <div key={promo.promoId} className="home-promo-card" id={`promo-${promo.promoId}`}>
                                <div className="home-promo-card__body">
                                    <h3>{promo.promoCode}</h3>
                                    <p>{promo.description}</p>
                                    <div className="home-promo-card__meta">
                                        <span className="home-promo-card__discount">
                                            {promo.discountType === 'percent' ? `Giảm ${promo.discountValue}%` : `Giảm ${formatPrice(promo.discountValue)}`}
                                        </span>
                                        <span className="home-promo-card__period">
                                            {new Date(promo.validTo).toLocaleDateString('vi-VN')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}


