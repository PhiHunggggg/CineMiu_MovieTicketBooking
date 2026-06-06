export const BANK_ID = 'MB';
export const ACCOUNT_NO = '0000000000';
export const ACCOUNT_NAME = 'CINEMIU';

export function generateQrCodeUrl(amount, content) {
  const params = new URLSearchParams({
    amount: Math.max(0, Number(amount || 0)).toString(),
    addInfo: content || 'CINEMIU',
    accountName: ACCOUNT_NAME,
  });

  return `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?${params.toString()}`;
}
