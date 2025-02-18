import { Client, Account, ID } from 'appwrite';
import { auth } from '$lib/stores/auth';

// Initialize Appwrite
const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const account = new Account(client);

// Authentication service
export const authService = {
    // Check current session
    async checkSession() {
        try {
            const session = await account.get();
            auth.setUser(session);
            return session;
        } catch (error) {
            auth.reset();
            return null;
        }
    },

    // Create a new account
    async createAccount(email: string, password: string, name: string) {
        try {
            console.log('Creating account for:', { email, name });
            const user = await account.create(ID.unique(), email, password, name);
            console.log('Account created successfully:', user);
            return user;
        } catch (error) {
            console.error('Account creation error:', error);
            throw error;
        }
    },

    // Login with email and password
    async login(email: string, password: string) {
        try {
            console.log('Attempting to create session for:', { email });
            const session = await account.createEmailPasswordSession(email, password);
            console.log('Session created successfully:', session);
            const user = await account.get();
            auth.setUser(user);
            return session;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    // Get current user
    async getCurrentUser() {
        try {
            return await account.get();
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    },

    // Delete current session (logout)
    async deleteSession() {
        try {
            await account.deleteSession('current');
            auth.reset();
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    },

    // Delete all sessions
    async deleteAllSessions() {
        try {
            await account.deleteSessions();
            auth.reset();
        } catch (error) {
            console.error('Delete all sessions error:', error);
            throw error;
        }
    }
}; 