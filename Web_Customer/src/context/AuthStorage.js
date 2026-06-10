export const STORAGE_KEY = 'cineverse_auth';

export function getStoredAuth() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
        return null;
    }
}