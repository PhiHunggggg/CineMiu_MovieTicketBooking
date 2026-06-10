export default function LoyaltyCard({ membership }) {
    return (
        <div className="loyalty-card">
            <span>Thẻ thành viên CineMiu</span>
            <h2>{membership?.tierName || 'Thành viên'}</h2>
            <strong>{(membership?.totalPoints ?? 0).toLocaleString('vi-VN')} điểm</strong>
            <p>{membership?.benefits || 'Tích điểm sau mỗi giao dịch thành công.'}</p>
        </div>
    );
}
