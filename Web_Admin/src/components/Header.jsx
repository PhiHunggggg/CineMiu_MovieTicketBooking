import Icon from './Icon'

function Header({ title = 'Tổng quan' }) {
  return (
    <header className="admin-header">
      <div>
        <p className="page-kicker">Quản trị</p>
        <h1>{title}</h1>
      </div>

      <div className="header-actions" aria-label="Thao tác đầu trang">
        <button className="icon-button" type="button" aria-label="Tìm kiếm">
          <Icon name="search" />
        </button>
        <button className="icon-button" type="button" aria-label="Thông báo">
          <Icon name="bell" />
        </button>
        <div className="admin-avatar" aria-label="Tài khoản quản trị">
          AD
        </div>
      </div>
    </header>
  )
}

export default Header
