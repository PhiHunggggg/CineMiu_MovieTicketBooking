const QuickCheckInCard = ({ checkingIn, onSubmit, quickQrCode, setQuickQrCode }) => (
    <div className="card admin-quick-checkin-card">
        <div className="card-body">
            <form className="form-inline align-items-end" onSubmit={onSubmit}>
                <div className="mr-2 mb-2 flex-grow-1">
                    <label className="d-block mb-1">Check-in nhanh bằng QR</label>
                    <input
                        className="form-control w-100"
                        value={quickQrCode}
                        onChange={(e) => setQuickQrCode(e.target.value)}
                        placeholder="Dán hoặc quét QR code của vé"
                    />
                </div>
                <button className="btn btn-success mb-2" type="submit" disabled={checkingIn || !quickQrCode.trim()}>
                    <i className="fas fa-qrcode mr-1"></i> Check-in
                </button>
            </form>
        </div>
    </div>
);

export default QuickCheckInCard;
