import { browser } from '$app/environment';

export const getBaseURL = () => {
    if (!browser) return '';
    return window.location.origin;
}; 