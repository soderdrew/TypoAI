import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { Client, Account, Databases } from 'appwrite';
import { env } from '$env/dynamic/private';

const client = new Client()
    .setEndpoint(env.VITE_APPWRITE_ENDPOINT)
    .setProject(env.VITE_APPWRITE_PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

// Database constants
const DATABASE_ID = env.VITE_APPWRITE_DATABASE_ID;
const DOCUMENTS_COLLECTION_ID = 'documents';

export const load: PageServerLoad = async ({ params, url }) => {
    const { id } = params;
    
    try {
        // Check if user is logged in
        let session;
        try {
            session = await account.getSession('current');
        } catch (sessionError) {
            // If no session, redirect to login with return URL
            const returnTo = url.pathname;
            throw redirect(303, `/login?returnTo=${returnTo}`);
        }

        if (!session) {
            const returnTo = url.pathname;
            throw redirect(303, `/login?returnTo=${returnTo}`);
        }

        // Get the current user
        const user = await account.get();
        
        try {
            // Get the document
            const document = await databases.getDocument(
                DATABASE_ID,
                DOCUMENTS_COLLECTION_ID,
                id
            );
            
            // If user is not a collaborator, add them
            if (!document.collaborators.includes(user.$id)) {
                await databases.updateDocument(
                    DATABASE_ID,
                    DOCUMENTS_COLLECTION_ID,
                    id,
                    {
                        collaborators: [...document.collaborators, user.$id]
                    }
                );
            }

            // Redirect to the main page with the document loaded
            throw redirect(303, `/?doc=${id}`);
        } catch (docError) {
            console.error('Error accessing document:', docError);
            throw error(404, 'Document not found or access denied');
        }
    } catch (e) {
        if (e instanceof Error) {
            console.error('Share route error:', e);
            if (e.message.includes('Session not found')) {
                const returnTo = url.pathname;
                throw redirect(303, `/login?returnTo=${returnTo}`);
            }
        }
        throw e;
    }
}; 