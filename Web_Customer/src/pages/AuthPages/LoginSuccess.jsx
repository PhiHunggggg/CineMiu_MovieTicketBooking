import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginSuccess() {
  const { loginSocial } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const user = {
      id: params.get('id'),
      fullName: params.get('name'),
      email: params.get('email'),
      avatarUrl: params.get('avatar'),
    };

    if (user.id) {
      // Gọi hàm loginSocial để lưu thông tin vào context và localStorage
      loginSocial(user);

      // Chuyển hướng về trang chủ
      navigate('/', { replace: true });
    } else {
      // Nếu không thấy ID, quay lại trang login
      const error = params.get('error');
      navigate('/login', { state: { error }, replace: true });
    }
  }, [location, navigate, loginSocial]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '50vh',
      flexDirection: 'column',
      gap: '15px'
    }}>
      <div className="auth-spinner" style={{ width: '40px', height: '40px', border: '3px solid #fb7185', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <p>Đang xác thực tài khoản ...</p>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
