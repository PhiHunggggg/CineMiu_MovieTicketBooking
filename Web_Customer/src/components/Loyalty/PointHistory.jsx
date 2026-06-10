export default function PointHistory({ transactions }) {
    return (
        <section className="point-history">
            <h2>Lịch sử điểm</h2>
            {transactions.length === 0 ? (
                <p>Chưa có giao dịch điểm.</p>
            ) : (
                <div className="point-history__list">
                    {transactions.map((item) => (
                        <div key={item.transactionId} className="point-history__item">
                            <div>
                                <strong>{item.description || 'Giao dịch điểm'}</strong>
                                <span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
                            </div>
                            <b className={item.points >= 0 ? 'is-positive' : ''}>
                                {item.points > 0 ? '+' : ''}{item.points}
                            </b>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
