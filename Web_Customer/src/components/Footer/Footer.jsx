import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" id="main-footer">
      <div className="footer__container container">
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="footer__logo">
                          <span className="footer__logo-icon" aria-hidden="true">🐱</span>
              <span className="footer__logo-text">CINE<span className="footer__logo-accent">MIU</span></span>
            </div>
            <p className="footer__desc">
              Hệ thống đặt vé xem phim trực tuyến hàng đầu Việt Nam. Trải nghiệm điện ảnh tuyệt vời với công nghệ hiện đại.
            </p>
          </div>

          <div className="footer__col">
            <h4 className="footer__title">Giới thiệu</h4>
            <ul className="footer__links">
              <li><a href="#">Về CineVerse</a></li>
              <li><a href="#">Tuyển dụng</a></li>
              <li><a href="#">Liên hệ quảng cáo</a></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__title">Điều khoản</h4>
            <ul className="footer__links">
              <li><a href="#">Chính sách bảo mật</a></li>
              <li><a href="#">Điều khoản sử dụng</a></li>
              <li><a href="#">Hướng dẫn đặt vé</a></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__title">Chăm sóc khách hàng</h4>
            <ul className="footer__links">
              <li><a href="#">Hotline: 1900 xxxx</a></li>
              <li><a href="#">Email: support@cineverse.vn</a></li>
              <li><a href="#">FAQ</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© 2026 CineVerse. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
