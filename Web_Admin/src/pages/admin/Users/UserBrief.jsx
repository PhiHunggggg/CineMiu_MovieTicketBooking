const UserBrief = ({ activeCustomerCount, customerCount, lockedCustomerCount }) => (
    <div className="admin-management-brief">
        <div>
            <i className="fas fa-users"></i>
            <p>
                <span>Tổng khách hàng</span>
                <strong>{customerCount.toLocaleString('vi-VN')}</strong>
            </p>
        </div>
        <div>
            <i className="fas fa-user-check"></i>
            <p>
                <span>Đang hoạt động</span>
                <strong>{activeCustomerCount.toLocaleString('vi-VN')}</strong>
            </p>
        </div>
        <div>
            <i className="fas fa-user-lock"></i>
            <p>
                <span>Đã khóa</span>
                <strong>{lockedCustomerCount.toLocaleString('vi-VN')}</strong>
            </p>
        </div>
        <div>
            <i className="fas fa-clock-rotate-left"></i>
            <p>
                <span>Lịch sử đặt vé</span>
                <strong>Chi tiết</strong>
            </p>
        </div>
    </div>
);

export default UserBrief;
