export const read = (value, ...keys) =>
    keys.map((key) => value?.[key]).find((item) => item !== undefined && item !== null);

export const getItems = (data) => data?.items || data?.data || data || [];

export const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');

export const formatCurrency = (value) =>
    Number(value || 0).toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    });

export const compactCurrency = (value) => {
    const amount = Number(value || 0);
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} tr`;
    return formatCurrency(amount);
};
