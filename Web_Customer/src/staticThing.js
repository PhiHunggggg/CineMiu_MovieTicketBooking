export const BANK_ID = 'MB'; // Military Bank
export const ACCOUNT_NO = '0693913018888';
export const ACCOUNT_NAME = 'NGUYEN PHI HUNG';
const TEMPLATE = 'compact';

/**
 * Generates a VietQR URL for payment
 * @param {number} amount - The amount to be paid
 * @param {string} bookingCode - The unique booking code to be used as description
 * @returns {string} The QR code image URL
 */
export const generateQrCodeUrl = (amount, bookingCode) => {
  return `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.png?amount=${amount}&addInfo=${encodeURIComponent(bookingCode)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
};
