import { writable, get } from 'svelte/store';
import type { Models } from 'appwrite';

interface AuthState {
    user: Models.User<Models.Preferences> | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isLocal: boolean;
}

const createAuthStore = () => {
    const { subscribe, set, update } = writable<AuthState>({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        isLocal: false
    });

    return {
        subscribe,
        setUser: (user: Models.User<Models.Preferences> | null) => update(state => ({
            ...state,
            user,
            isAuthenticated: !!user,
            isLoading: false
        })),
        setLocal: (isLocal: boolean) => update(state => ({
            ...state,
            isLocal
        })),
        setLoading: (isLoading: boolean) => update(state => ({
            ...state,
            isLoading
        })),
        reset: () => set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isLocal: false
        }),
        getUser: () => get({ subscribe }).user
    };
};

export const auth = createAuthStore(); 